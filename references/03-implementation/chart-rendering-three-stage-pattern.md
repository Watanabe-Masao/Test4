# Chart Rendering Three-Stage Pattern

> unify-period-analysis Phase 5 で確立した chart 描画側の責務分離パターン。
> Chart Input Builder Pattern (入力側) とセットで使う。

## 目的

chart component を「入力 → 描画」の薄い orchestrator に収斂させるため、
描画側の責務を 3 段に明示的に分離する。

- **ReadModel → ViewModel (data builder)**: query 出力 → 描画用データ変換
- **ViewModel → ECharts Option (option builder)**: 描画用データ → ECharts option
- **Chart Component**: 両者を orchestrate + 状態管理 + view 描画

関連原則: `F7 View に raw 禁止` / `C1 1 ファイル = 1 変更理由` /
`runtime-data-path.md`。関連する入力側ルール:
`chart-input-builder-pattern.md`。

## 4 層の責務分離

```
Query Handler 出力 (ReadModel — XxxOutput.records 等)
  ↓ data builder (*.vm.ts / *Logic.ts の pure function)
ViewModel (描画用の shape — chartData / waterfallData / summary 等)
  ↓ option builder (*OptionBuilder.ts の pure function)
ECharts Option (EChartsOption)
  ↓ Chart Component (*.tsx)
View / DOM (EChart / SummaryRow)
```

| 層 | ファイル名 | 責務 | 禁止 |
|---|---|---|---|
| **data builder** | `*Logic.ts` または `*.vm.ts` | ReadModel → ViewModel 変換、集計、差分、ラベル生成 | React hooks / store / ECharts option 構築 |
| **option builder** | `*OptionBuilder.ts` | ViewModel + theme → ECharts option | data 集計 / query 実行 / React hooks |
| **chart component** | `*.tsx` | 状態管理、data builder + option builder の orchestration、view 描画 | inline での集計 / option literal 構築 / raw row 解釈 |

## 禁止事項 (chart component)

chart component (`presentation/components/charts/*.tsx`) では次を禁止する:

1. **inline 関数定義で option を組み立てる** — `function buildXxxOption(...): EChartsOption { ... }` を chart .tsx の中で定義しない
2. **inline 関数定義で data を組み立てる** — `function buildXxxData(...) { ... }` を chart .tsx の中で定義しない
3. **raw row 配列を直接解釈する** — `.records.reduce((acc, r) => ...)` のような集計を chart .tsx の中で行わない
4. **ECharts option literal を 50 行以上インラインで書く** — `const option = { series: [...], xAxis: ..., ... }` で長大な literal を書かない

## 見本実装

### TimeSlotChart (canonical — フル構造)

```
TimeSlotChart.tsx             — Controller (state + orchestration)
  ↓ imports
TimeSlotChart.vm.ts           — data builder (ReadModel → ViewModel)
TimeSlotChartOptionBuilder.ts — option builder (ViewModel → ECharts option)
TimeSlotChartView.tsx         — View (receives option, renders)
```

### YoYChart (Phase 5 で三段構造に揃えた 2 例目)

```
YoYChart.tsx                  — Controller
  ↓ imports
YoYChartLogic.ts              — data builder (buildYoYChartData / buildYoYWaterfallData / computeYoYSummary)
YoYChartOptionBuilder.ts      — option builder (buildLineOption / buildWaterfallOption)
```

### before / after

**before** (YoYChart.tsx 250+ 行):

```tsx
function buildLineOption(chartData, theme): EChartsOption {
  // 30 行の option literal...
}

function buildWaterfallOption(waterfallData, theme): EChartsOption {
  // 60 行の option literal...
}

export const YoYChart = memo(function YoYChart(...) {
  // ... data builder 呼び出し + option builder 呼び出し + 描画
})
```

**after** (YoYChart.tsx 162 行):

```tsx
// option builder は別ファイルに分離
import { buildLineOption, buildWaterfallOption } from './YoYChartOptionBuilder'

export const YoYChart = memo(function YoYChart(...) {
  // chart は orchestration のみ
  const option = useMemo(
    () => (viewMode === 'line'
      ? buildLineOption(chartData, theme)
      : buildWaterfallOption(waterfallData, theme)),
    [viewMode, chartData, waterfallData, theme],
  )
})
```

### 効果

| 指標 | before | after |
|---|---|---|
| `YoYChart.tsx` 行数 | 約 260 | 162 |
| inline option builder 関数 | 2 (92 行) | 0 |
| import (ECharts option 構築用) | 8 個 | 3 個 |
| option builder の単体テスト容易性 | 困難 (chart を mount) | 容易 (pure function) |

## 5 ステップ移行手順

既存 chart を三段構造化するとき:

1. **data builder の有無を確認** — 既存 `*Logic.ts` / `*.vm.ts` があればそれを使う。なければ新設して `buildXxxData` / `computeXxxSummary` を抽出
2. **option builder ファイルを新設** — `<Name>OptionBuilder.ts`。`@responsibility R:chart-option` を付ける
3. **chart .tsx の inline option 関数を移動** — `function buildXxxOption(...)` を新ファイルに cut & paste
4. **import を更新** — chart .tsx から必要な ECharts option helpers (standardGrid / yenYAxis 等) の import を削除し、option builder 側に移す
5. **guard を更新** — `chartRenderingStructureGuard` の allowlist から対象 chart を削除、baseline を下げる

## 役割分担の 1 行サマリ（Done の形）

各 chart で次の責務を **厳密に** 保つ:

- **`*Logic.ts` / `*.vm.ts`** — pure data transform only（ReadModel 配列の集計、
  ViewModel shape への変換、ラベル生成）。React hooks / store / ECharts 型参照を
  持たない
- **`*OptionBuilder.ts`** — pure ECharts option 生成 only（ViewModel + theme →
  EChartsOption）。data 集計や query 実行を持たない
- **`*.tsx` chart component** — state / plan 呼び出し / data builder と option
  builder の接着 only。`function build*Data` / `function build*Option` を
  inline 定義しない

「接着だけ」の目安: chart .tsx 内で `useMemo(() => build*(...))` の呼び出しは OK、
`function build*(...) { ... return { ...option literal... } }` の定義は NG。

## 残り 3 件の移行完了条件（Phase 5 閉じ込み）

`chartRenderingStructureGuard` allowlist に残っている 3 件を 0 にするときの
Done criteria:

| 対象 chart | 現状の inline 関数 | Done の形 |
|---|---|---|
| `DiscountTrendChart.tsx` | `function buildDiscountData(...)` | `DiscountTrendChartLogic.ts` に移動、chart は `import { buildDiscountData }` |
| `GrossProfitAmountChart.tsx` | `function buildGpData(...)` | `GrossProfitAmountChartLogic.ts` に移動、chart は `import { buildGpData }` |
| `PrevYearComparisonChart.tsx` | `function buildCumulativeData(...)` | `PrevYearComparisonChartLogic.ts` に移動、chart は `import { buildCumulativeData }` |

共通の完了条件:

1. **新 Logic ファイルを作成**: `<ChartName>Logic.ts`（既存命名規則に揃える）
2. **`@responsibility R:calculation`** を付ける
3. **pure function**: React hooks / store / ECharts 型参照を持たない（data 出力型は
   独自 ViewModel interface を `*Logic.ts` 内で export）
4. **chart .tsx は import と `useMemo(() => buildXxxData(...))` のみ**。inline
   関数定義はゼロ
5. **chartRenderingStructureGuard allowlist からエントリを削除**、stale check
   が自動的に通る状態にする
6. **既存の chart 表示動作は非破壊**（純粋な関数移動のみで、挙動変更なし）

移行後、baseline は `3 → 0` になり、guard は `expect(ALLOWLIST.length).toBe(0)`
を assertion として強制する。以後、新規 chart で `function build*Data /
Option` の inline 定義は一切許容されない。

## 関連 guard

| Guard | 責務 | 対象層 |
|---|---|---|
| `chartInputBuilderGuard` | chart は `dateRangeToKeys` を直接呼ばない | 入力側 |
| `presentationComparisonMathGuard` | presentation での `year - 1` 独自計算を禁止 | 入力側 |
| `comparisonResolvedRangeSurfaceGuard` | scope 内部フィールドを直接参照しない | 入力側 |
| `chartRenderingStructureGuard` | chart 内で option builder / data builder を inline 定義しない | 描画側 (本ルール) |

## 関連文書

- `references/03-implementation/chart-input-builder-pattern.md` — 入力側パターン
- `references/03-implementation/chart-data-flow-map.md` — 全 chart のデータフロー一覧
- `references/03-implementation/runtime-data-path.md` — 正本 lane / Screen Plan lane の 2 系統
- `projects/completed/unify-period-analysis/HANDOFF.md` — Phase 5 進捗

## 新規 chart を作るとき

最初から三段構造で実装する:

1. `<Name>.vm.ts` または `<Name>Logic.ts` (data builder) を先に作る
2. `<Name>OptionBuilder.ts` (option builder) を作る
3. `<Name>.tsx` (controller) は `import { build*Data }` + `import { build*Option }` + orchestration のみ
4. chart .tsx 内で inline `function build*Option` / `function build*Data` を定義しない

この順序で作れば `chartRenderingStructureGuard` は最初から fail せず、
既存の guard 群 (`chartInputBuilderGuard` / `comparisonResolvedRangeSurfaceGuard`)
とも衝突しない。
