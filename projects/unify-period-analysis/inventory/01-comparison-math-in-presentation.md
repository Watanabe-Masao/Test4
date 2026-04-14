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
| _未調査_ | | | | |

## 集計

- 件数: _未集計_
- 影響ファイル数: _未集計_
- 種別内訳: _未集計_
