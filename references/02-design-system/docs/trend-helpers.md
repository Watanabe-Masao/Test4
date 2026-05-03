# Trend Helpers — `sc.*`

`app/src/presentation/theme/semanticColors.ts` が export する `sc`
オブジェクト。「トレンド（上/下/横ばい）の色を条件で返す」ヘルパー群です。

---

## なぜ存在するか

`theme` オブジェクトは styled-components の `ThemeProvider` 経由で配布
されるため、styled-components 外のコード（`useMemo` でオブジェクトを
組み立てる場面、ECharts option を作る関数、プレーン TS ロジック）からは
直接触れません。

加えて、trend 色は「値に応じて決まる」ことが多く、`theme.chart.semantic.positive`
と `.negative` を自分で分岐する boilerplate が各所に散ります。

`sc.*` はこの 2 つの問題を解決します。

1. **theme に依存しない**（静的 export なのでどこからでも呼べる）
2. **条件関数を含む**（`sc.cond(isPositive)` で 1 行判定）

---

## 全 API

### 静的定数

```ts
import { sc } from '@/presentation/theme/semanticColors'

sc.positive      // #0ea5e9  (CUD sky blue)
sc.positiveDark  // #0284c7
sc.negative      // #f97316  (CUD orange)
sc.negativeDark  // #ea580c
sc.caution       // #eab308  (CUD yellow)
sc.cautionDark   // #ca8a04
sc.neutral       // #94a3b8  (slate — 中間)
```

### 判定関数

```ts
// positive / negative 2 値
sc.cond(isPositive: boolean): string

// positive / caution / negative 3 値
sc.cond3(isPositive: boolean, isCaution: boolean): string

// 達成率用 — >=1 positive, >=cautionThreshold caution, else negative
sc.achievement(rate: number, cautionThreshold?: number = 0.9): string

// 粗利率用 — target / warning の 2 つの閾値で 3 段階
sc.gpRate(rate: number, target: number, warning: number): string
```

---

## 使い方

### 基本 — trend 色

```tsx
import { sc } from '@/presentation/theme/semanticColors'

function TrendIndicator({ diff }: { diff: number }) {
  return (
    <span style={{ color: sc.cond(diff >= 0) }}>
      {diff >= 0 ? '↑' : '↓'} {Math.abs(diff)}%
    </span>
  )
}
```

### KPI 達成率

```tsx
function BudgetProgress({ actual, budget }: Props) {
  const rate = actual / budget
  return (
    <span style={{ color: sc.achievement(rate, 0.9) }}>
      {(rate * 100).toFixed(1)}%
    </span>
  )
}
```

この例では:
- 100%超 → sky blue (positive)
- 90–100% → yellow (caution)
- 90%未満 → orange (negative)

### 粗利率判定

```tsx
function GpRateBadge({ rate }: { rate: number }) {
  // target = 25%, warning = 20% のような業務ルール
  return (
    <span style={{ color: sc.gpRate(rate, 0.25, 0.20) }}>
      {(rate * 100).toFixed(1)}%
    </span>
  )
}
```

### ECharts option 内

```ts
function useSalesDiffOption(salesDiffs: number[]) {
  return useMemo<EChartsOption>(() => ({
    series: [{
      type: 'bar',
      data: salesDiffs.map(v => ({
        value: v,
        itemStyle: { color: sc.cond(v >= 0) },
      })),
    }],
  }), [salesDiffs])
}
```

ECharts option は純 JS オブジェクトなので `theme` を直接取れませんが、
`sc` は import するだけで使えます。

---

## sc と chart.semantic の使い分け

両者は「正負の色」を持っている点で被って見えますが、役割が違います。

| | `sc.positive` / `sc.negative` | `chart.semantic.positive` / `negative` |
| --- | --- | --- |
| 色 | sky `#0ea5e9` / orange `#f97316` (CUD) | success-dark `#22c55e` / danger-dark `#ef4444` (status) |
| 用途 | **方向性** (↑↓、改善/悪化) | **棒グラフの正負** (値のサイン) |
| 依存 | theme 非依存 | theme 経由 |

棒グラフの「正棒は緑、負棒は赤」は棒の値の符号を表す記号で、色覚多様性の
影響を受けにくい大面積表示。一方 KPI カード上の小さな↑↓トレンドは
CUD で見分けやすい sky/orange を推奨、という住み分けです。

これは Test4 が意図して分けているので、混ぜないのが原則。

---

## なぜ `sc` という短い名前か

`semanticColors.ts` の import を `import { sc } from '...'` で 1 文字級に
短くするため。styled-components 内で頻繁に呼ぶので、タイピングコストと
可読性を優先した設計。

```ts
// 短い
color: sc.cond(diff >= 0)

// もし sc が無かったら
color: diff >= 0 ? palette.positive : palette.negative

// さらに長い (不便)
color: diff >= 0 ? semanticColors.positive : semanticColors.negative
```

---

## 拡張ルール

新しい判定関数を追加するときは、以下を満たすと統一感が保てます:

1. **関数名は業務ドメイン名**（`achievement`, `gpRate` のような）。
   `colorByValue` のような汎用名は避ける
2. **返り値は常に string (hex)**
3. **第 1 引数は被判定値、以降は閾値**
4. **デフォルト閾値を持つ**（呼び出し側の記述を減らす）

例:

```ts
// 追加候補
inventoryLevel: (ratio: number, lowThreshold = 0.2, highThreshold = 0.9): string =>
  ratio < lowThreshold ? palette.negative
  : ratio > highThreshold ? palette.caution
  : palette.positive
```

---

## アンチパターン

### ❌ やらない

```tsx
// 冗長な分岐
const color = diff >= 0 ? '#0ea5e9' : '#f97316'

// theme 経由（styled-components の外では動かない）
const color = diff >= 0 ? theme.chart.semantic.positive : theme.chart.semantic.negative
// ※ trend 用には色が違う (緑/赤 になってしまう)

// caution を手書き
const color = rate >= 1 ? '#0ea5e9' : rate >= 0.9 ? '#eab308' : '#f97316'
```

### ✅ やる

```tsx
const color = sc.cond(diff >= 0)
const color = sc.achievement(rate)  // caution 閾値 default 0.9
```
