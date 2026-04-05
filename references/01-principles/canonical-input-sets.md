# 指標入力契約（Canonical Input Sets）

## 1. 目的

複合指標（PI値、客数GAP、客単価、値引率等）が「どの正本を入力にするか」を一意に固定する。
画面・plan・handler で入力をその場で組み立てることを禁止し、canonical input builder 経由に一本化する。

## 2. 原則

- **取得の正本** (readModel) と **計算の正本** (calculateModel) は混ぜない
- 複合指標の入力は **canonical input builder** で粒度合わせまで完了させる
- **presentation での独自比率計算は禁止**
- **StoreResult を分析入力に直結しない**（summary result としてのみ使用）

## 3. 指標入力レジストリ

### 点数PI値 (`calculateQuantityPI`)

| 項目 | 値 |
|------|---|
| 入力正本 | `SalesFactReadModel.totalQuantity` + `CustomerFact.customers` |
| 入力 builder | `buildPICanonicalInput(salesFact, customerFact, scope)` |
| 粒度 | store / store×day / comparison window |
| 前年比較の整列 | ComparisonWindow で scope を固定 |
| fallback | customers=0 → null（0除算防止） |
| **禁止** | presentation での `qty / customers * 1000` 直計算 |

### 金額PI値 (`calculateAmountPI`)

| 項目 | 値 |
|------|---|
| 入力正本 | `SalesFactReadModel.totalAmount` + `CustomerFact.customers` |
| 入力 builder | `buildPICanonicalInput(salesFact, customerFact, scope)` |
| 粒度 | store / store×day / comparison window |
| 前年比較の整列 | 同上 |
| fallback | customers=0 → null |
| **禁止** | presentation での `sales / customers * 1000` 直計算 |

### 点数客数GAP (`calculateCustomerGap`)

| 項目 | 値 |
|------|---|
| 入力正本 | `SalesFactReadModel` + `CustomerFact` (当期+前年) |
| 入力 builder | `buildCustomerGapCanonicalInput(curSales, prevSales, curCustomer, prevCustomer, scope)` |
| 粒度 | comparison window 単位 |
| 前年比較の整列 | ComparisonWindow scope で固定 |
| fallback | 前年=0 → null |
| **禁止** | presentation での独自前年比計算、StoreResult 直結 |

### 金額客数GAP (`calculateCustomerGap`)

同上。curSales / prevSales に金額を使用。

### 客単価

| 項目 | 値 |
|------|---|
| 入力正本 | `SalesFactReadModel.totalAmount` + `CustomerFact.customers` |
| 入力 builder | `buildTransactionValueCanonicalInput(salesFact, customerFact)` |
| 粒度 | store |
| fallback | customers=0 → null |
| **禁止** | presentation での `totalSales / totalCustomers` 直計算 |

### 値引率

| 項目 | 値 |
|------|---|
| 入力正本 | `SalesFactReadModel.totalAmount` + `DiscountFact.discountTotal` |
| 入力 builder | `buildDiscountRateCanonicalInput(salesFact, discountFact)` |
| 粒度 | store / store×day |
| fallback | totalAmount=0 → 0 |
| **禁止** | presentation での独自率計算 |

## 4. Canonical Input Builder

配置: `app/src/application/canonicalInputs/`

| builder | 入力 | 出力 |
|---------|------|------|
| `buildPICanonicalInput` | salesFact + customerFact + scope | `{ quantity, amount, customers }` per granularity |
| `buildCustomerGapCanonicalInput` | cur/prev salesFact + cur/prev customerFact + scope | `CustomerGapInput` |
| `buildTransactionValueCanonicalInput` | salesFact + customerFact | `{ totalSales, totalCustomers }` |
| `buildDiscountRateCanonicalInput` | salesFact + discountFact | `{ totalSales, discountTotal }` |

## 5. ガード

`canonicalInputGuard.test.ts`:
- PI値は `buildPICanonicalInput` 経由のみ
- 客数GAP は `buildCustomerGapCanonicalInput` 経由のみ
- presentation での `qty / customers` や `sales / customers` 直計算禁止
- StoreResult を分析入力に直結しない

## 6. 将来の拡張

新しい複合指標を追加する場合:
1. 本レジストリに入力正本セットを登録
2. canonical input builder を追加
3. guard に追加
4. 定義書を新設または改訂

## 7. 関連ドキュメント

- `customer-definition.md` — CustomerFact の正本定義
- `sales-definition.md` — SalesQuantityFact の正本定義
- `discount-definition.md` — DiscountFact の正本定義
- `pi-value-definition.md` — PI値の計算定義
- `customer-gap-definition.md` — 客数GAPの計算定義
- `canonicalization-principles.md` — 正本化原則
