# inventory 01 — presentation / VM / chart の比較先日付独自計算

> 対応 checklist: Phase 0 #1
> 剥がす Phase: Phase 2（比較解決一本化）
> 完了条件: 全行が Phase 2 で `ComparisonScope` resolver に置換されている

## 棚卸し対象

以下のパターンを対象とする:

- `subYears(date, 1)` / `subMonths(date, 1)` / `subDays(date, n)` を component / VM / chart で直接呼んでいる
- `prevYearDate` / `lastMonthDate` のような変数を presentation 側で構築している
- `dayjs().subtract(1, 'year')` などを ViewModel / chart option builder 内で呼んでいる
- `sameDate` / `sameDow` / `previousPeriod` / `sameRangeLastYear` の独自実装

## 検出方法

```
Grep: \b(subYears|subMonths|subDays|subWeeks)\b
  glob: app/src/presentation/**/*.{ts,tsx}
  glob: app/src/features/**/presentation/**/*.{ts,tsx}
  glob: app/src/**/*.vm.ts
```

## 棚卸し結果

| Path | Lines | 種別 | メモ | Done |
|---|---|---|---|---|
| `app/src/presentation/pages/Dashboard/widgets/YoYWaterfallChart.logic.ts` | L18-L50 | sameDow 計算 (export) | `calculatePrevCtsDateRange()` が `year-1 + dowOffset` で前年同曜日の DateRange を presentation 層で組み立てている。YoY waterfall の主要ロジックで、`ComparisonScope` を経由していない | |
| `app/src/presentation/pages/Dashboard/widgets/YoYWaterfallChart.logic.ts` | L36-L37 | sameDow 計算 (Date 構築) | `new Date(year - 1, month - 1, dayStart + dowOffset)` / `new Date(year - 1, month - 1, dayEnd + dowOffset)` の直接構築。上記 export の内部実装だが、別行として記録 | |
| `app/src/presentation/components/charts/DailySalesChartBodyLogic.ts` | L130-L138 | sameDow 計算 (helper) | `deriveCompStartDateKey(dowOffset, year, month)` が `${year - 1}-${month}-${1 + dowOffset}` の dateKey を生成。daily sales chart の weather mapping 補助 | |
| `app/src/presentation/pages/Dashboard/widgets/types.ts` | L46 | sameRangeLastYear ラベル | `comparisonLabels()` が `prevYear ?? year - 1` のフォールバックで前年ラベルを計算。label のみで集計には影響しないが、presentation 層が「前年=year-1」を前提にしている表明 | |

## 集計

- 件数: 4（うち 3 件が実質的計算、1 件はラベル fallback）
- 影響ファイル数: 3
- 種別内訳:
  - sameDow 計算: 3 件（YoYWaterfallChart.logic.ts × 2、DailySalesChartBodyLogic.ts × 1）
  - sameRangeLastYear ラベル: 1 件（types.ts）
  - sameDate / previousPeriod の独自計算: 0 件（presentation 層からは検出なし）

## 観察

- `subYears` / `subMonths` / `subDays` / `subWeeks` を `app/src/presentation/` 配下で直接呼ぶ箇所は **0 件**。検出された violation は全て `new Date(year - 1, ...)` / 文字列 template リテラル形式
- `YoYWaterfallChart.logic.ts` が主犯であり、このファイルを `ComparisonScope` resolver の出力（`comparisonRange` 等）を受け取る形に切り替えれば、Phase 2 の大半が完了する
- `app/src/test/audits/comparisonSemanticsAudit.test.ts` が `year - 1` 系の参照を **threshold=8** で既に監視しているため、Phase 2 完了時にその threshold を 0 に絞ることでガード化可能
- 除外パス（誤検出）: `MonthlyCalendarFC.tsx` / `WeatherPage.tsx` / `ImportProvenanceModal.tsx` / `weatherSummary.ts` などは `getFullYear()` を単純な値参照用途で使っており、比較先日付の計算ではない
