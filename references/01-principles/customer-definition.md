# 客数の正本定義

## 1. 背景

客数は PI 値（1人あたり買上点数/金額）、客数 GAP（前年比乖離）、客単価の算出に必要な基礎値である。

棚卸しの結果:
- **業務値（月次集約）は StoreResult.totalCustomers** に統一済み
- **分析入力としての canonical read path が未確立** — flowers → dailyBuilder → StoreResult の 1 経路のみ
- DuckDB `store_day_summary.customers` にはデータがあるが、readModel として取得する仕組みがない

## 2. 正本源と唯一入口の分離

### 業務上の正本源

| データ | ソース | 経路 |
|--------|--------|------|
| 客数 | 花ファイル (flowers / SpecialSalesData) | flowers.records → `buildFlowersCustomerIndex()` → dailyBuilder → StoreResult.totalCustomers |

- 花ファイルの `customers` フィールドが一次情報源
- storeId × day = 1 レコードが正規形（last-write-wins）

### 分析用 canonical read path

| 区分 | 入口 | 責務 |
|------|------|------|
| **月次集約（summary result）** | `StoreResult.totalCustomers` | KPI / 予算 / 予測の入力 |
| **分析入力（canonical fact）** | `readCustomerFact()` | PI値 / 客数GAP / 客単価 の唯一入力 |

- `readCustomerFact()` は DuckDB `store_day_summary.customers` から構築する
- StoreResult.totalCustomers は summary result として残すが、分析入力としては使わない

## 3. 粒度

| 粒度 | 可否 | 説明 |
|------|------|------|
| storeId × date | ✅ 正本粒度 | 花ファイルの粒度に一致 |
| store 集約 | ✅ 導出 | `toStoreCustomerRows()` |
| day 集約 | ✅ 導出 | `toDailyCustomerRows()` |
| 時間帯 | ❌ 不可 | 花データに時間帯がない。**時間帯を持たないことを契約として固定** |

## 4. CustomerFactReadModel

```typescript
interface CustomerFactReadModel {
  readonly daily: readonly CustomerFactDailyRow[]
  readonly grandTotalCustomers: number
  readonly meta: {
    readonly usedFallback: boolean
    readonly missingPolicy: 'zero'
    readonly dataVersion: number
  }
}

interface CustomerFactDailyRow {
  readonly storeId: string
  readonly day: number
  readonly customers: number
}
```

## 5. 導出 helper

| helper | 出力 | 用途 |
|--------|------|------|
| `toStoreCustomerRows()` | storeId → customers | 店舗別集約 |
| `toDailyCustomerRows()` | day → customers | 日別集約 |
| `toStoreDayCustomerRows()` | storeId × day → customers | PI handler 入力 |

## 6. 配布

`useWidgetDataOrchestrator` の 4 番目の readModel として配布する。

```
orchestrator → {
  purchaseCost: PurchaseCostReadModel
  salesFact: SalesFactReadModel
  discountFact: DiscountFactReadModel
  customerFact: CustomerFactReadModel   ← 新設
}
```

## 7. ガード

- `customerFactPathGuard.test.ts` で唯一入口性を保証
- presentation から infra query 直接 import を禁止
- 新規分析コードで `StoreResult.totalCustomers` を分析入力に使うことを禁止

## 8. 不変条件

- `grandTotalCustomers = Σ daily[].customers`
- `toStoreCustomerRows()` の合計 = `grandTotalCustomers`
- `toDailyCustomerRows()` の合計 = `grandTotalCustomers`
- 欠損日は 0 として返す（null ではない）

## 9. 既存定義との関係

| 正本 | 関係 |
|------|------|
| `readSalesFact()` | 販売金額・点数の正本。CustomerFact とは独立 |
| `readDiscountFact()` | 値引きの正本。CustomerFact とは独立 |
| `readPurchaseCost()` | 仕入原価の正本。CustomerFact とは無関係 |
| `calculateQuantityPI()` | CustomerFact.customers を分母に使用 |
| `calculateAmountPI()` | 同上 |
| `calculateCustomerGap()` | CustomerFact (当期+前年) を入力に使用 |
