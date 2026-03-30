# 前年比客数GAP の正本定義

## 1. 定義

前年比客数GAPは「客数変動では説明できない、1人あたり購買行動の変化」を示す指標。

客数が前年と同じでも点数や金額が減っていれば、1人あたりの購買が減少している。
この乖離を数値化する。

## 2. 2つの客数GAP

| 指標 | 計算式 | 意味 |
|------|--------|------|
| **点数客数GAP** | 点数前年比 − 客数前年比 | 1人あたり買上点数の前年比変化分 |
| **金額客数GAP** | 金額前年比 − 客数前年比 | 1人あたり購入金額の前年比変化分 |

### 計算式（詳細）

```
客数前年比    = curCustomers / prevCustomers
点数前年比    = curQuantity / prevQuantity
金額前年比    = curSales / prevSales

点数客数GAP = 点数前年比 − 客数前年比
金額客数GAP = 金額前年比 − 客数前年比
```

### 例

```
客数前年比 = 100%（前年と同じ客数）
点数前年比 = 95%（点数は5%減少）
→ 点数客数GAP = 95% − 100% = ▲5%
  「客数は同じだが、1人あたりの買上点数が5%減少した」
```

## 3. 前年データなしの場合

前年客数・前年点数・前年金額のいずれかが 0 または欠損の場合は null を返す。
0除算を防ぎ、意味のない GAP 値を表示しない。

## 4. 不変条件

```
金額前年比 = 客数前年比 × (1 + 金額客数GAP / 客数前年比)
```

つまり、金額の前年比変動は「客数変動」と「客数GAP（1人あたりの変化）」に分解できる。

## 5. PI値との関係

```
点数客数GAP ≈ (curPI / prevPI − 1) × 客数前年比
  ※ PI値 = 点数 / 客数 × 1000 なので、客数GAPはPI値の前年比変化と密接
```

## 6. 正本関数

```ts
calculateCustomerGap(input: CustomerGapInput): CustomerGapResult | null
```

- **実装:** `domain/calculations/customerGap.ts`
- **Zod 契約:** `CustomerGapInputSchema` / `CustomerGapResultSchema`
- **テスト:** `domain/calculations/__tests__/customerGap.test.ts` (9テスト)
- **利用箇所:** `conditionSummaryCardBuilders.ts` — KPIカード（点数客数GAP / 金額客数GAP）
