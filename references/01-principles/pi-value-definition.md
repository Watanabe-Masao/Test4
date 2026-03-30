# PI値（Purchase Incidence）の正本定義

## 1. PI値とは

PI値は「来店客1,000人あたりの購買指標」。
店舗間・カテゴリ間の比較に使用される標準化指標。

## 2. 2つのPI値

| 指標 | 計算式 | 意味 |
|------|--------|------|
| **点数PI値** | (販売点数 ÷ 来店客数) × 1,000 | 客1,000人あたり何点買うか |
| **金額PI値** | (売上金額 ÷ 来店客数) × 1,000 | 客1,000人あたりいくら買うか |

### 関連指標（PI値ではないが関連）

| 指標 | 計算式 | 意味 |
|------|--------|------|
| 1人あたり買上点数 | 販売点数 ÷ 来店客数 | PI値 ÷ 1,000 |
| 点単価（PPU） | 売上金額 ÷ 販売点数 | 1点あたりの売上 |
| 客単価 | 売上金額 ÷ 来店客数 | 1人あたりの売上 |

### 不変条件

```
客単価 = 1人あたり買上点数 × 点単価
       = (点数PI値 / 1,000) × 点単価
売上 = 客数 × 客単価
     = 客数 × (qty/cust) × (sales/qty)
     = sales  ← 恒等式
```

## 3. 現状の実装経路

| 経路 | ×1000 | 場所 |
|------|-------|------|
| `calculateItemsPerCustomer(qty, cust)` | **なし** | utils.ts（生の比率 = 1人あたり買上点数） |
| `calculateAveragePricePerItem(sales, qty)` | **なし** | utils.ts（点単価） |
| `StoreCategoryPIHandler.piQty` | **あり** | QueryHandler（×1000 = 点数PI値） |
| `StoreCategoryPIHandler.piAmount` | **あり** | QueryHandler（×1000 = 金額PI値） |

### 問題

`calculateItemsPerCustomer` は「1人あたり買上点数」であり「点数PI値」ではない。
×1000 の有無が場所によって異なる。

## 4. 正本化方針

### 計算の正本

| 関数 | 入力 | 出力 | ×1000 |
|------|------|------|-------|
| `calculateQuantityPI(qty, customers)` | 販売点数, 客数 | 点数PI値 | **あり** |
| `calculateAmountPI(sales, customers)` | 売上金額, 客数 | 金額PI値 | **あり** |

これらは `domain/calculations/piValue.ts` に新設する。
既存の `calculateItemsPerCustomer` / `calculateAveragePricePerItem` は
1人あたり買上点数・点単価として残す（PI値とは別の指標）。

### Zod 契約

```ts
const PIValueResult = z.object({
  quantityPI: z.number(),  // 点数PI値（×1000）
  amountPI: z.number(),    // 金額PI値（×1000）
})
```

## 5. ガード条件

- PI値の計算は `calculateQuantityPI` / `calculateAmountPI` のみ
- `StoreCategoryPIHandler` はこれらの関数を使用する
- presentation 層で独自に ×1000 しない
