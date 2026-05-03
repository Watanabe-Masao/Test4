# Chart Semantic Colors

`theme.chart.semantic.*` は「業務概念 → 色」の中央マッピング。Test4 が
自前で作った最も重要な DS 資産の一つです。新規チャートを書くときに
「売上は何色か」と考える必要がなく、`theme.chart.semantic.sales` を
参照するだけで統一が保たれます。

---

## 設計意図

チャートのハードコード色は、プロダクトが育つほど矛盾を生みます。同じ
「売上」が画面 A では indigo、画面 B では blue、画面 C では緑、のような
事故が起きる。Test4 は概念ごとの色を 1 箇所で決めきることで、この事故を
構造的に防いでいます。

```ts
// theme.ts
interface ChartSemanticColors {
  // 当年 (実線・棒の主色)
  sales: string
  budget: string
  grossProfit: string
  grossProfitRate: string
  customers: string
  transactionValue: string
  quantity: string
  discount: string
  markupRate: string
  purchaseCost: string
  // 売変 subtype (DiscountType 71-74)
  discountPolicy: string
  discountRegister: string
  discountWaste: string
  discountSampling: string
  // 累計売変率ライン
  cumulativeDiscountRate: string
  cumulativeDiscountRatePrev: string
  // 前年 (全 chart で slate にグレー統一)
  salesPrev: string
  budgetPrev: string
  grossProfitPrev: string
  customersPrev: string
  quantityPrev: string
  discountPrev: string
  // 差異・状態
  positive: string
  negative: string
  neutral: string
  // 外部データ
  tempHigh: string
  tempLow: string
  // 分析
  movingAverage: string
  movingAverageMetric: string
}
```

---

## Full concept → color map

### 当年（実線・主系列）

| 概念 | Token | 色 | Hex |
| --- | --- | --- | --- |
| 売上 | `chart.semantic.sales` | primary (indigo) | `#6366f1` |
| 予算 | `chart.semantic.budget` | success-dark (green) | `#22c55e` |
| 粗利 | `chart.semantic.grossProfit` | purple-dark | `#8b5cf6` |
| 粗利率 | `chart.semantic.grossProfitRate` | purple-dark | `#8b5cf6` |
| 客数 | `chart.semantic.customers` | cyan-dark | `#06b6d4` |
| 客単価 | `chart.semantic.transactionValue` | purple-dark | `#8b5cf6` |
| 販売点数 | `chart.semantic.quantity` | info-dark (sky) | `#0ea5e9` |
| 売変（値引き） | `chart.semantic.discount` | danger-dark (red) | `#ef4444` |
| 値入率 | `chart.semantic.markupRate` | warning-dark (amber) | `#f59e0b` |
| 仕入原価 | `chart.semantic.purchaseCost` | orange-dark | `#ea580c` |

### 売変 subtype（DiscountType 71-74）

`DiscountTrendChart` で使用。単一の「売変」ではなく 4 種別の内訳を色分けする
専用トークン。

| 概念 | Token | 色 | Hex |
| --- | --- | --- | --- |
| 政策売変 (71) | `chart.semantic.discountPolicy` | danger-dark | `#ef4444` |
| レジ値引 (72) | `chart.semantic.discountRegister` | orange | `#f97316` |
| 廃棄売変 (73) | `chart.semantic.discountWaste` | caution | `#eab308` |
| 試食売変 (74) | `chart.semantic.discountSampling` | purple-mid | `#a855f7` |

`palette.purpleMid` (`#a855f7`) は本用途専用の新設 palette key。既存 `purple`
(`#a78bfa`) / `purpleDark` (`#8b5cf6`) と区別する。

### 累計売変率ライン

`DiscountTrendChart` の右軸に重ねる累計率ライン。当年 solid / 前年 dashed。

| 概念 | Token | 色 | Hex |
| --- | --- | --- | --- |
| 当年累計売変率 | `chart.semantic.cumulativeDiscountRate` | orange | `#f97316` |
| 前年累計売変率 | `chart.semantic.cumulativeDiscountRatePrev` | slate | `#94a3b8` |

### 前年バー色統一ルール

**全 chart で前年バーは slate (`palette.slate`, `#94a3b8`) に統一する。**

以前は「当年色 + 60% alpha」で chart により薄紫 / 薄緑 / グレー等に分かれて
いたが、chart-color-alignment project 以降フラット slate に統一。これにより:

- 比較 chart の前年系列が一目で区別できる (「灰色 = 前年」を習慣化)
- 販売点数/客数などの多系列チャートで、当年 vs 前年を混同しない
- `chart.previousYear` (直接参照用) と `chart.semantic.*Prev` (業務概念経由) が
  同じ色で矛盾しない

| 概念 | Token | 色 |
| --- | --- | --- |
| 売上 (前年) | `chart.semantic.salesPrev` | slate `#94a3b8` |
| 予算 (前年) | `chart.semantic.budgetPrev` | slate |
| 粗利 (前年) | `chart.semantic.grossProfitPrev` | slate |
| 客数 (前年) | `chart.semantic.customersPrev` | slate |
| 販売点数 (前年) | `chart.semantic.quantityPrev` | slate |
| 売変 (前年) | `chart.semantic.discountPrev` | slate |
| 直接参照用 | `chart.previousYear` | slate (同値) |

> 例外: 半透明 overlay 等で「当年色の淡い版」が必要な場合は、個別 chart の
> ローカル判断で `${theme.chart.semantic.sales}60` のような alpha 合成を使う。
> ただし semantic token としては slate が正本。

### 差異・状態（CUD safe）

| 概念 | Token | 色 |
| --- | --- | --- |
| プラス差異 | `chart.semantic.positive` | success-dark `#22c55e` |
| マイナス差異 | `chart.semantic.negative` | danger-dark `#ef4444` |
| 中立・基準線 | `chart.semantic.neutral` | slate `#94a3b8` |

> 注意: `chart.semantic.positive/negative` は status の緑/赤を使っています。
> これは **棒グラフの正負表示用**の歴史的経緯です。Trend 表示（↑↓ や KPI
> カードのトレンド数値）には `sc.positive` / `sc.negative`（CUD sky/orange）
> を使うのが正解。詳細は `trend-helpers.md` 参照。

### 外部データ

| 概念 | Token | 色 |
| --- | --- | --- |
| 気温（高温） | `chart.semantic.tempHigh` | danger-dark (red) |
| 気温（低温） | `chart.semantic.tempLow` | primary (indigo) |

### 分析

| 概念 | Token | 色 |
| --- | --- | --- |
| 移動平均 (売上) | `chart.semantic.movingAverage` | primary |
| 移動平均 (指標: 点数/客数/売変) | `chart.semantic.movingAverageMetric` | orange |

右軸指標の MA overlay は別色で、左軸 (売上) と重ならないように設計。

---

## 使い方

### ECharts

```ts
import type { EChartsOption } from 'echarts'
import { useTheme } from 'styled-components'

function useSalesChartOption(): EChartsOption {
  const theme = useTheme()
  return {
    series: [
      {
        name: '売上',
        type: 'line',
        lineStyle: { color: theme.chart.semantic.sales, width: theme.chartStyles.lineWidth.standard },
        data: salesData,
      },
      {
        name: '売上（前年）',
        type: 'line',
        lineStyle: {
          color: theme.chart.semantic.salesPrev,
          type: 'dashed',
          width: theme.chartStyles.lineWidth.thin,
        },
        data: prevYearData,
      },
    ],
  }
}
```

### styled-components のトレンド枠

```ts
const DiffBadge = styled.span<{ isPositive: boolean }>`
  color: ${({ theme, isPositive }) =>
    isPositive
      ? theme.chart.semantic.positive
      : theme.chart.semantic.negative};
`
```

ただし trend (↑↓) 用途であれば `sc.cond(isPositive)` を使うのが推奨。
チャート内で bar の正負色を塗り分ける用途のみ、`chart.semantic.positive/
negative` を使ってください。

---

## 拡張ルール

新しい業務概念が現れたら：

1. **まず既存のどれかに当てはまらないか確認**（例: 粗利率は既存の `grossProfit` と同色で十分か？）
2. 当てはまらなければ `ChartSemanticColors` interface に追加
3. `darkColors` / `lightColors` は mode 非依存なので `chartColors` オブジェクトの方に追記
4. TypeScript 型が通ることを確認（`satisfies ChartSemanticColors` が効く）

**基本原則**: hex リテラルをチャート component にインラインで書かない。
全て `theme.chart.semantic.*` を経由する。

---

## アンチパターン

### ❌ やらない

```ts
// ハードコード — 他画面と色がずれる原因
lineStyle: { color: '#6366f1' }

// palette 直接参照 — 概念ではなく hue を書いている
lineStyle: { color: theme.colors.palette.primary }
```

### ✅ やる

```ts
// 概念で書く
lineStyle: { color: theme.chart.semantic.sales }
```

「これは売上です」と言えば、あとは theme が色を決めてくれます。将来的に
色を刷新したくなっても、`theme.ts` の 1 箇所を変えるだけで全画面が
追随します。

---

## CSS 変数での参照（DS preview のみ）

DS preview HTML 内では CSS 変数でアクセスできます:

```css
.sales-line { stroke: var(--chart-sales); }
.discount-bar { fill: var(--chart-discount); }
.prev-year-line { stroke: var(--chart-sales-prev); }
```

本番コードでは CSS 変数は使いません。`theme` オブジェクト経由のみ。

---

## 参考: `chartStyles` との組み合わせ

`theme.chartStyles.*` には opacity / lineWidth / barRadius / barWidth の
共通値があります。色と組み合わせて書式を作る:

```ts
{
  type: 'bar',
  itemStyle: {
    color: theme.chart.semantic.sales,
    borderRadius: theme.chartStyles.barRadius.standard,  // [4,4,0,0]
    opacity: theme.chartStyles.opacity.bar,              // 0.82
  },
  barWidth: theme.chartStyles.barWidth.standard,         // 12
}
```

色だけでなく「描画書式」も theme で共通化されているため、ECharts の
option 自体が読みやすくなります。
