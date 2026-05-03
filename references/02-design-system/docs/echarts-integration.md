# ECharts Integration

ECharts option の中で色を扱うときのパターン集。Test4 の
`colorSystem.ts` と `chartFontSize.ts` / `chartStyles.ts` を組み合わせて
書きます。

---

## ルート判断 — どこから色を引くか

ECharts option は純粋な JS オブジェクトで、内部で styled-components の
`useTheme()` が使えない場面もあります（useMemo 依存配列の外、ハンドラー
内）。状況で取り出し口を変えます。

| 状況 | 使うもの |
| --- | --- |
| React component 内 (hook 可) | `useTheme()` → `theme.chart.semantic.*` |
| 関数の中（theme が届く） | 引数で受け取る: `(theme) => option` |
| theme が届かない / 静的定数 | `sc.*` (semanticColors.ts) |
| **動的 α が必要な rgba** | `statusAlpha(kind, alpha)` (colorSystem.ts) |
| 系列色のインデックス配列 | `theme.chart.series` |

---

## `statusAlpha` — なぜ存在するか

ECharts では「ハイライト時に背景を半透明で塗る」「tooltip の bar を
fade する」ような動的 α 指定が頻出します。rgba を手書きすると色が散り、
token 化の恩恵を失います。`colorSystem.ts` はこのために:

```ts
// colorSystem.ts (抜粋)
const STATUS_RGB_BASES = {
  positive: '34,197,94',     // #22c55e の RGB
  negative: '239,68,68',     // #ef4444
  info:     '59,130,246',    // #3b82f6
  muted:    '156,163,175',   // gray
} as const

export function statusAlpha(kind: StatusKind, alpha: number): string {
  return `rgba(${STATUS_RGB_BASES[kind]},${alpha})`
}
```

`statusAlpha('positive', 0.3)` → `'rgba(34,197,94,0.3)'`。

> ここで使われている色は `chart.semantic.positive/negative`（status 系
> green/red）相当です。CUD trend 色 (`sc.positive/negative` の sky/orange)
> とは別系統。ECharts で棒やバーの塗り分けをする用途を想定しています。

---

## 代表パターン

### 系列色（palette 流用）

```ts
import { useTheme } from 'styled-components'

function useMultiSeriesOption(data: Series[]): EChartsOption {
  const theme = useTheme()
  return {
    color: theme.chart.series,  // ← 10 色固定パレット、自動ローテ
    series: data.map(s => ({ name: s.name, type: 'line', data: s.points })),
  }
}
```

### 業務概念色

```ts
{
  series: [
    {
      name: '売上',
      type: 'bar',
      itemStyle: {
        color: theme.chart.semantic.sales,
        borderRadius: theme.chartStyles.barRadius.standard,  // [4,4,0,0]
        opacity: theme.chartStyles.opacity.bar,              // 0.82
      },
      barWidth: theme.chartStyles.barWidth.standard,         // 12
      data: salesData,
    },
    {
      name: '予算',
      type: 'line',
      lineStyle: {
        color: theme.chart.semantic.budget,
        width: theme.chartStyles.lineWidth.standard,         // 2
      },
      data: budgetData,
    },
  ],
}
```

### 正負で色分け (棒の itemStyle 関数)

```ts
{
  series: [{
    type: 'bar',
    data: diffs.map(v => ({
      value: v,
      itemStyle: {
        color: v >= 0
          ? theme.chart.semantic.positive   // green
          : theme.chart.semantic.negative,  // red
      },
    })),
  }],
}
```

あるいは `sc.cond`:

```ts
import { sc } from '@/presentation/theme/semanticColors'

data: diffs.map(v => ({
  value: v,
  itemStyle: { color: sc.cond(v >= 0) },  // ← CUD sky/orange に変えたい場合
})),
```

棒の中立表現は status 緑/赤、trend は CUD sky/orange、の使い分けを
意識してください。

### ハイライト背景 (markArea)

```ts
import { statusAlpha } from '@/presentation/theme/colorSystem'

{
  markArea: {
    itemStyle: {
      color: statusAlpha('positive', 0.15),  // 15% 緑の帯
    },
    data: [[
      { xAxis: startDate },
      { xAxis: endDate },
    ]],
  },
}
```

`statusAlpha` は**1 箇所だけ α を変えた同系色が欲しい**ときの専用窓口。

### Tooltip の枠/背景

```ts
{
  tooltip: {
    backgroundColor: theme.colors.bg4,
    borderColor: theme.colors.border,
    borderWidth: 1,
    textStyle: {
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.primary,
      fontSize: theme.chartFontSize.tooltip,      // 11
    },
    extraCssText: `box-shadow: ${theme.elevation.tooltip}; border-radius: ${theme.radii.sm};`,
  },
}
```

### 軸 (axis)

```ts
{
  xAxis: {
    axisLine:  { lineStyle: { color: theme.colors.border } },
    axisLabel: {
      color: theme.colors.text3,
      fontSize: theme.chartFontSize.axis,        // 10
      fontFamily: theme.typography.fontFamily.primary,
    },
    splitLine: { lineStyle: { color: theme.colors.border, type: 'dashed' } },
  },
}
```

---

## 前年比較ラインの作り方

`chart.semantic.salesPrev` のような `Prev` サフィックスは 60% alpha
バージョン（`#6366f160`）。これを**破線**で描くのが Test4 の慣習:

```ts
{
  series: [
    {
      name: '売上',
      type: 'line',
      lineStyle: {
        color: theme.chart.semantic.sales,
        width: theme.chartStyles.lineWidth.standard,
      },
      data: currentYearData,
    },
    {
      name: '売上 (前年)',
      type: 'line',
      lineStyle: {
        color: theme.chart.semantic.salesPrev,
        type: 'dashed',
        width: theme.chartStyles.lineWidth.thin,  // 1.5
      },
      data: prevYearData,
      symbol: 'none',  // 前年は点を出さない
    },
  ],
}
```

---

## フォントサイズ（px 整数）

ECharts は CSS `rem` を扱えません。theme には `chartFontSize` に px 整数が
定義されています:

| Token | 値 | 用途 |
| --- | --- | --- |
| `chartFontSize.axis` | `10` | 軸ラベル・凡例 |
| `chartFontSize.tooltip` | `11` | ツールチップ本文 |
| `chartFontSize.title` | `13` | チャートタイトル |
| `chartFontSize.annotation` | `10` | markLine 注釈 |

`caption` ≒ 10, `label` ≒ 11, `body` ≒ 13 という DS スケールに対応しています。

---

## chartStyles の使い分け

| Token | 値 | 用途 |
| --- | --- | --- |
| `chartStyles.opacity.bar` | `0.82` | 通常の棒 |
| `chartStyles.opacity.area` | `0.18` | 塗りエリア |
| `chartStyles.opacity.areaSubtle` | `0.08` | 背景ハイライト |
| `chartStyles.opacity.ghost` | `0.3` | 非活性系列 |
| `chartStyles.lineWidth.thin` | `1.5` | 補助線 |
| `chartStyles.lineWidth.standard` | `2` | 主要系列 |
| `chartStyles.lineWidth.emphasis` | `2.5` | 強調 |
| `chartStyles.barRadius.standard` | `[4,4,0,0]` | 垂直棒の上辺丸め |
| `chartStyles.barRadius.rounded` | `[6,6,0,0]` | 強めの丸め |
| `chartStyles.barRadius.horizontal` | `[0,4,4,0]` | 横棒の右辺丸め |
| `chartStyles.barWidth.narrow/standard/wide` | `6/12/18` | 棒幅 |

---

## アンチパターン

### ❌ やらない

```ts
// ハードコード色
color: '#6366f1'

// rgba 手書き
color: 'rgba(34,197,94,0.3)'

// 10 色パレットをコピペ
color: ['#6366f1', '#22c55e', '#f59e0b', ...]

// CSS 変数を ECharts option に書く (動かない)
color: 'var(--chart-sales)'
```

### ✅ やる

```ts
color: theme.chart.semantic.sales
color: statusAlpha('positive', 0.3)
color: theme.chart.series
color: theme.chart.semantic.sales  // theme 経由、または sc.* / statusAlpha
```

---

## theme が届かない場所のベストプラクティス

関数を theme を引数で受け取る形に設計:

```ts
// Bad
export function buildSalesChartOption(data: number[]): EChartsOption {
  return { series: [{ color: '#6366f1', data }] }  // hex ハードコード
}

// Good
export function buildSalesChartOption(
  data: number[],
  theme: AppTheme,
): EChartsOption {
  return {
    series: [{ color: theme.chart.semantic.sales, data }],
  }
}
```

どうしても theme を引数化しづらい場所（module レベルの静的 option）では
`sc.*` を使います:

```ts
import { sc } from '@/presentation/theme/semanticColors'

export const emptyStateOption: EChartsOption = {
  tooltip: { show: false },
  series: [{
    type: 'bar',
    data: [0, 0, 0],
    itemStyle: { color: sc.neutral },
  }],
}
```
