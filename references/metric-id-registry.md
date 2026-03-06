# MetricId レジストリ

型定義: `domain/models/Explanation.ts`
Explanation 生成: `application/usecases/explanation/ExplanationService.ts`
計算ソース: `domain/calculations/` + `application/usecases/calculation/storeAssembler.ts`

---

## MetricMeta アーキテクチャ

MetricId は**安定した識別子**。構造的な意味は `MetricMeta.tokens` で外付けする。

### 設計原則

- **ID は識別子**: 一意・不変・意味を持ちすぎない。camelCase で命名。
- **構造はメタデータ**: entity/domain/measure の分類は tokens に格納。
- **利点**: グルーピング・フィルタ・売上⇔粗利の対称生成がトークンで機械的にできる。

### 型定義（実装先: `domain/models/Explanation.ts`）

```typescript
/** トークン: 指標の分類構造 */
export interface MetricTokens {
  /** 主体: 何の指標か */
  readonly entity: 'sales' | 'purchase' | 'cogs' | 'discount' | 'markup' | 'gp' | 'inventory' | 'customer' | 'costInclusion'
  /** 領域: データの確度 */
  readonly domain: 'actual' | 'budget' | 'estimated' | 'forecast'
  /** 測定: 何を測るか */
  readonly measure: 'value' | 'rate' | 'achievement' | 'progress' | 'gap' | 'variance' | 'required' | 'average'
}

/** 指標メタデータ */
export interface MetricMeta {
  readonly label: string
  readonly unit: MetricUnit
  readonly tokens: MetricTokens
  /** StoreResult の対応フィールド名（あれば） */
  readonly storeResultField?: string
}
```

### METRIC_DEFS 一覧

以下に全指標の tokens を定義する。

| MetricId | entity | domain | measure | label |
|---|---|---|---|---|
| `salesTotal` | sales | actual | value | 総売上 |
| `coreSales` | sales | actual | value | コア売上 |
| `grossSales` | sales | actual | value | 粗売上 |
| `purchaseCost` | purchase | actual | value | 総仕入原価 |
| `inventoryCost` | purchase | actual | value | 在庫仕入原価 |
| `deliverySalesCost` | purchase | actual | value | 売上納品原価 |
| `discountTotal` | discount | actual | value | 売変額合計 |
| `discountRate` | discount | actual | rate | 売変率 |
| `discountLossCost` | discount | actual | value | 売変ロス原価 |
| `averageMarkupRate` | markup | actual | average | 平均値入率 |
| `coreMarkupRate` | markup | actual | rate | コア値入率 |
| `invMethodCogs` | cogs | actual | value | 売上原価（在庫法） |
| `invMethodGrossProfit` | gp | actual | value | 実績粗利益（在庫法） |
| `invMethodGrossProfitRate` | gp | actual | rate | 実績粗利率（在庫法） |
| `estMethodCogs` | cogs | estimated | value | 推定原価（値入率ベース） |
| `estMethodMargin` | gp | estimated | value | 推定粗利（値入率ベース） |
| `estMethodMarginRate` | gp | estimated | rate | 推定粗利率（値入率ベース） |
| `estMethodClosingInventory` | inventory | estimated | value | 推定期末在庫 |
| `inventoryGap` | gp | actual | gap | 在庫差異（在庫法−推定法） |
| `totalCustomers` | customer | actual | value | 来店客数 |
| `averageSpendPerCustomer` | customer | actual | average | 客単価 |
| `itemsPerCustomer` | customer | actual | average | 一人当たり点数 |
| `averagePricePerItem` | sales | actual | average | 点単価 |
| `totalCostInclusion` | consumable | actual | value | 原価算入費 |
| `budget` | sales | budget | value | 売上予算 |
| `budgetAchievementRate` | sales | budget | achievement | 売上予算達成率 |
| `budgetProgressRate` | sales | budget | progress | 売上予算消化率 |
| `budgetElapsedRate` | sales | budget | rate | 経過予算率 |
| `budgetProgressGap` | sales | budget | gap | 売上進捗ギャップ |
| `budgetVariance` | sales | budget | variance | 売上予算差異 |
| `projectedSales` | sales | forecast | value | 月末予測売上 |
| `projectedAchievement` | sales | forecast | achievement | 着地予測達成率 |
| `requiredDailySales` | sales | budget | required | 必要日次売上 |
| `averageDailySales` | sales | actual | average | 日平均売上 |
| `remainingBudget` | sales | budget | value | 残余予算 |
| `grossProfitBudget` | gp | budget | value | 粗利予算 |
| `grossProfitRateBudget` | gp | budget | rate | 粗利率予算 |
| `grossProfitBudgetAchievement` | gp | budget | achievement | 粗利予算達成率 |
| `grossProfitBudgetVariance` | gp | budget | variance | 粗利予算差異 |
| `grossProfitProgressGap` | gp | budget | gap | 粗利進捗ギャップ |
| `projectedGrossProfit` | gp | forecast | value | 粗利着地予測 |
| `projectedGPAchievement` | gp | forecast | achievement | 粗利着地予測達成率 |
| `requiredDailyGrossProfit` | gp | budget | required | 必要日次粗利 |
| `purchaseBudget` | purchase | budget | value | 仕入予算 |
| `purchaseBudgetAchievement` | purchase | budget | achievement | 仕入予算達成率 |
| `purchaseBudgetVariance` | purchase | budget | variance | 仕入予算差異 |
| `requiredDailyPurchase` | purchase | budget | required | 必要日次仕入 |
| `prevYearSameDowBudgetRatio` | sales | budget | achievement | 前年同曜日予算比 |
| `prevYearSameDateBudgetRatio` | sales | budget | achievement | 前年同日予算比 |
| `dowGapImpact` | sales | estimated | variance | 曜日ギャップ影響額 |

### トークン活用例

```typescript
// 予算系の全指標を抽出
const budgetMetrics = Object.entries(METRIC_DEFS)
  .filter(([, m]) => m.tokens.domain === 'budget')

// 売上⇔粗利の対称ペア
const salesBudget = findByTokens({ entity: 'sales', domain: 'budget', measure: 'achievement' })
const gpBudget    = findByTokens({ entity: 'gp',    domain: 'budget', measure: 'achievement' })
```

---

## 売上系

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `salesTotal` | 総売上 | yen | 分類別売上の合計 | `totalSales` |
| `coreSales` | コア売上 | yen | 総売上 − 特殊売上（花・産直） | `totalCoreSales` |
| `grossSales` | 粗売上 | yen | 総売上 + 売変額（定価ベース売上） | `grossSales` |

## 仕入系

仕入データは以下の経路に分かれる:

```
仕入（総額）
├── 在庫仕入 ─── 在庫に計上 ─── 在庫法で原価算出
├── 売上納品 ─── 花・産直 ─── 在庫を経由せず直接売上原価
├── 原価算入費 ── 消耗品 ──── 推定原価に加算（値入率計算の外）
├── 店間移動 ─── 店舗間の在庫移動（純増減）
└── 部門間移動 ── 部門間の在庫移動
```

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `purchaseCost` | 総仕入原価 | yen | 仕入データの合計 | `totalCost` |
| `inventoryCost` | 在庫仕入原価 | yen | 総仕入 − 売上納品原価 | `inventoryCost` |
| `deliverySalesCost` | 売上納品原価 | yen | 花 + 産直の仕入原価 | `deliverySalesCost` |

**売上納品の内訳:**
花と産直は在庫を経由せず、仕入と同時に売上原価となる。
掛け率（`flowerCostRate`, `directProduceCostRate`）は Settings で管理。

- `flowerSalesPrice` / `directProduceSalesPrice` — 売価（StoreResult に計算済み）
- 仕入原価 = 売価 × 掛け率（日別に `inventoryCalc.ts` で計算）

**原価算入費（消耗品）:**
消耗品は値入率の計算には含まれないが、推定原価には加算される。
`estCogs = grossSales × (1 − markupRate) + costInclusionCost`
→ MetricId は `totalCostInclusion` として別セクションで管理。

**店間移動・部門間移動:**
`TransferDetails` で集約（in/out/net）。現在 MetricId 未登録。
`categoryTotals` の `interStore` / `interDepartment` カテゴリとして集計済み。

## 売変系

売変は4種別で管理される。定義は `DISCOUNT_TYPES`（`domain/models/ClassifiedSales.ts`）を参照。

| 売変種別 | type | label | field |
|---|---|---|---|
| 政策売変 | `71` | 政策売変 | `discount71` |
| レジ値引 | `72` | レジ値引 | `discount72` |
| 廃棄売変 | `73` | 廃棄売変 | `discount73` |
| 試食売変 | `74` | 試食売変 | `discount74` |

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `discountTotal` | 売変額合計 | yen | 71 + 72 + 73 + 74 の合計 | `totalDiscount` |
| `discountRate` | 売変率 | rate | 売変額 ÷ 粗売上 | `discountRate` |
| `discountLossCost` | 売変ロス原価 | yen | 売変額 × (1 − 値入率) | `discountLossCost` |

## 値入率（仕入時点の計画利幅）

**値入 ≠ 粗利。** 値入は仕入時に設定する「予定利幅」、粗利は販売後の「実績利益」。

```
値入率 = (売価 − 原価) ÷ 売価     … 仕入時点の計画
粗利率 = (売上 − 売上原価) ÷ 売上 … 販売後の実績
```

値入率 > 粗利率 となる主な原因: 売変（値引・廃棄）、在庫ロス、原価算入費。

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `averageMarkupRate` | 平均値入率 | rate | (粗売上 − 仕入原価) ÷ 粗売上 | `averageMarkupRate` |
| `coreMarkupRate` | コア値入率 | rate | (コア粗売上 − コア仕入原価) ÷ コア粗売上 | `coreMarkupRate` |

## 粗利（在庫法 — 実績 P/L）

在庫実績があるときのみ有効（`null` = 在庫未設定）。
**実在庫データに基づく確定値。** 粗利の権威的ソース。

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `invMethodCogs` | 売上原価 | yen | 期首在庫 + 仕入 − 期末在庫 | `invMethodCogs` |
| `invMethodGrossProfit` | 実績粗利益 | yen | 総売上 − 売上原価 | `invMethodGrossProfit` |
| `invMethodGrossProfitRate` | 実績粗利率 | rate | 粗利益 ÷ 総売上 | `invMethodGrossProfitRate` |

## 粗利（推定法 — 値入率ベースの推定）

**値入率から粗利を推定する手法。** 在庫法が使えないときのフォールバック。
常に計算される。在庫法との差異（GAP値）が在庫ロスの検知に使われる。

```
推定原価 = 粗売上 × (1 − 値入率) + 原価算入費
推定粗利 = 総売上 − 推定原価
```

※ 原価算入費は値入率の外で加算される（原価算入費）。

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `estMethodCogs` | 推定原価 | yen | 粗売上 × (1 − 値入率) + 原価算入費 | `estMethodCogs` |
| `estMethodMargin` | 推定粗利 | yen | 総売上 − 推定原価 | `estMethodMargin` |
| `estMethodMarginRate` | 推定粗利率 | rate | 推定粗利 ÷ 総売上 | `estMethodMarginRate` |
| `estMethodClosingInventory` | 推定期末在庫 | yen | 期首在庫 + 仕入 − 推定原価 | `estMethodClosingInventory` |

## GAP値（差異分析）

GAP値は「2つの関連指標の差」を取る一般的な分析パターン。
`measure: 'gap'` トークンで統一的に表現できる。

| GAP 種別 | 計算式 | 検知対象 |
|---|---|---|
| **在庫差異GAP** | 在庫法粗利率 − 推定粗利率 | 在庫ロス・計上漏れ |
| **客数GAP** | 客数前年比 − 売上前年比 | 客単価の変動方向 |
| **予算進捗GAP** | 消化率 − 経過予算率 | ペースの前倒し/遅れ |
| **粗利進捗GAP** | 粗利達成率 − 経過予算率 | 粗利ペースのズレ |

### 在庫差異GAP

2つの計算エンジンの差異。

```
在庫差異GAP = invMethodGrossProfitRate − estMethodMarginRate
```

- GAP ≈ 0: 在庫管理が正常
- GAP < 0: 在庫ロス・廃棄が値入で想定した以上に発生
- GAP > 0: 計上漏れまたは推定前提の誤り

| MetricId | 指標名 | 単位 | 計算式 | 実装状況 |
|---|---|---|---|---|
| `inventoryGap` | 在庫差異 | rate | 在庫法粗利率 − 推定粗利率 | **未計算 / 未登録** |

### 客数GAP

```
客数GAP = 客数前年比 − 売上前年比
```

- GAP > 0: 客数は増えたが売上が追いつかない → 客単価低下
- GAP < 0: 客数は減ったが売上は維持 → 客単価上昇
- GAP ≈ 0: 客数と売上が同方向に変動

**注:** 前年比を使うため、要因分解系（Shapley decomposition）の領域に近い。
`decompose2` の `custEffect` / `ticketEffect` が構造的にこれを分解している。
MetricId として個別登録するかは要因分解との役割分担で決定。

### トークン的性質

GAP値は全て `measure: 'gap'` で統一できる。各 GAP は:
1. 同一 entity 内の2指標比較（予算進捗GAP: `sales.budget.progress` vs `sales.budget.rate`）
2. domain をまたぐ比較（在庫差異GAP: `gp.actual` vs `gp.estimated`）
3. 時系列比較（客数GAP: 前年比同士の差）

実装方式は MetricId 個別登録 or トークンクエリによる動的算出のどちらも可能。

## 客数・客生産性

| MetricId | 指標名 | 単位 | 計算式 | データソース |
|---|---|---|---|---|
| `totalCustomers` | 来店客数 | count | 分類別売上の客数合計 | StoreResult: `totalCustomers` |
| `averageSpendPerCustomer` | 客単価 | yen | 総売上 ÷ 来店客数 | StoreResult から導出 |
| `itemsPerCustomer` | 一人当たり点数 | count | 総点数 ÷ 来店客数 | CTS（CategoryTimeSalesRecord） |
| `averagePricePerItem` | 点単価 | yen | 総売上 ÷ 総点数 | CTS（CategoryTimeSalesRecord） |

**PI値・点単価について:**
`itemsPerCustomer`（PI値）と `averagePricePerItem`（点単価）は
要因分解（`decompose3`: S = C × Q × P̄）の構成要素として使用される。

- Q = totalQty ÷ customers（一人当たり点数 = PI値）
- P̄ = sales ÷ totalQty（点単価 = カテゴリ平均単価）

データソースは CTS（DuckDB 探索エンジン側）であり、StoreResult には含まれない。
二重実装禁止の原則に従い、集約は CTS からのみ行う。

## 原価算入費（消耗品）

消耗品は値入率の計算には含まれないが、推定原価に加算される。
→ 仕入系セクションの「原価算入費」も参照。

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `totalCostInclusion` | 原価算入費 | yen | 原価算入費データの合計 | `totalCostInclusion` |

---

## 売上予算系

**用語定義:**

| 用語 | 定義 |
|---|---|
| **全体予算** | 月間（or 期間全体）の売上予算額。設定値。 |
| **累計予算** | 経過日までの日別予算の合計（日別予算が曜日で異なる場合、加重合計）。 |
| **経過予算** | 全体予算 × 経過予算率。日別予算が均一なら累計予算と一致。 |
| **累計実績** | 経過日までの実績売上合計。 |

**現行コード（`budgetAnalysis.ts`）の計算定義:**

```
budgetAchievementRate = totalSales / budget                    … 全体予算対比
budgetProgressRate    = totalSales / cumulativeBudget           … 経過予算対比（加重）
budgetElapsedRate     = cumulativeBudget / budget               … 予算時間進捗
```

※ `cumulativeBudget` = Σ budgetDaily[d] (d=1..elapsedDays) → 日別予算の加重合計を使用。

| MetricId | 指標名 | 単位 | 計算式 | 実装状況 |
|---|---|---|---|---|
| `budget` | 売上予算（全体） | yen | 設定値 | **✅ 実装済み** |
| `budgetAchievementRate` | 売上予算達成率 | rate | 累計実績 ÷ 全体予算 | **✅ 実装済み** |
| `budgetProgressRate` | 売上予算消化率 | rate | 累計実績 ÷ 累計予算 | **✅ 実装済み** |
| `budgetElapsedRate` | 経過予算率 | rate | 累計予算 ÷ 全体予算 | **✅ 実装済み** |
| `budgetProgressGap` | 売上進捗ギャップ | rate | 消化率 − 経過予算率 | **✅ 実装済み** |
| `budgetVariance` | 売上予算差異 | yen | 累計実績 − 累計予算 | **✅ 実装済み** |
| `projectedSales` | 月末予測売上 | yen | 実績 + 日平均売上 × 残日数 | **✅ 実装済み** |
| `projectedAchievement` | 着地予測達成率 | rate | 予測売上 ÷ 全体予算 | **✅ 実装済み** |
| `requiredDailySales` | 必要日次売上 | yen | 残余予算 ÷ 残日数 | **✅ 実装済み** |
| `averageDailySales` | 日平均売上 | yen | 累計実績 ÷ 営業日数 | **✅ 実装済み** |
| `remainingBudget` | 残余予算 | yen | 全体予算 − 累計実績 | **✅ 実装済み** |

**意味の補足:**

- **消化率** (`budgetProgressRate`): 累計予算に対する実績消化の進み具合。100%超 = 予算超過ペース。
- **達成率** (`budgetAchievementRate`): 全体予算に対する達成度。月末に100%なら予算達成。
- **経過予算率** (`budgetElapsedRate`): 時間進捗。実績は関係なし。
- **進捗ギャップ** (`budgetProgressGap`): 消化率 − 経過予算率。正 = 前倒し、負 = 遅れ。
- **必要日次売上** (`requiredDailySales`): 残りの日数で予算達成に必要な1日あたりの売上。

---

## 粗利予算系

**前提:** 粗利額予算（`grossProfitBudget`）と粗利率予算（`grossProfitRateBudget`）は
在庫設定ファイルから取得。StoreResult にフィールドは存在するが、MetricId 未登録。

**粗利実績の2つの算出法:**
- 在庫法: `invMethodGrossProfit`（実在庫データに基づく確定値。権威ソース）
- 推定法: `estMethodMargin`（値入率ベースの推定値。在庫法が使えないときのフォールバック）
- 有効粗利率: `getEffectiveGrossProfitRate()` で在庫法優先→推定法フォールバック
- **注意:** `estMethodMargin` は「推定粗利」であり、値入率から計算されるが粗利の推定値。
  値入率そのものではない。

| MetricId | 指標名 | 単位 | 計算式 | 実装状況 |
|---|---|---|---|---|
| `grossProfitBudget` | 粗利予算（全体） | yen | 設定値 | **✅ MetricId + Explanation** |
| `grossProfitRateBudget` | 粗利率予算 | rate | 粗利予算 ÷ 売上予算 | **✅ MetricId + Explanation** |
| `grossProfitBudgetAchievement` | 粗利予算達成率 | rate | 粗利実績 ÷ 粗利予算 | **✅ MetricId + Explanation** |
| `grossProfitBudgetVariance` | 粗利予算差異 | yen | 粗利実績 − 経過粗利予算 | **MetricId ✅ / 計算未実装** |
| `grossProfitProgressGap` | 粗利進捗ギャップ | rate | 粗利達成率 − 経過予算率 | **MetricId ✅ / 計算未実装** |
| `projectedGrossProfit` | 粗利着地予測 | yen | 予測売上 × 有効粗利率 | **MetricId ✅ / Presentation で計算中** |
| `projectedGPAchievement` | 粗利着地予測達成率 | rate | 粗利着地予測 ÷ 粗利予算 | **MetricId ✅ / Presentation で計算中** |
| `requiredDailyGrossProfit` | 必要日次粗利 | yen | (粗利予算 − 粗利実績) ÷ 残日数 | **MetricId ✅ / 計算未実装** |

**注意:**
- 粗利予算の経過按分は売上予算の `budgetElapsedRate` と同じ経過率を使う。
- 粗利実績には在庫法粗利（`invMethodGrossProfit`）を優先使用する。
  在庫法が `null` の場合は推定マージン（`estMethodMargin`）をフォールバックに使う。
- `projectedGrossProfit` / `projectedGPAchievement` は現在 Presentation 層
  （`PlanActualForecast.tsx`）でインライン計算されている。
  → Domain/Application 層に移行すべき（禁止事項 #6: UI が生データソースを直接参照しない）。

---

## 仕入予算系

**前提:** 仕入予算は現時点では未使用だが、MetricId として予約しておく。
将来的に仕入予算設定が追加された際に、売上予算・粗利予算と対称的に扱える。

| MetricId | 指標名 | 単位 | 計算式 | 実装状況 |
|---|---|---|---|---|
| `purchaseBudget` | 仕入予算 | yen | 設定値 | **MetricId ✅ / 未使用** |
| `purchaseBudgetAchievement` | 仕入予算達成率 | rate | 仕入実績 ÷ 仕入予算 | **MetricId ✅ / 未使用** |
| `purchaseBudgetVariance` | 仕入予算差異 | yen | 仕入実績 − 経過仕入予算 | **MetricId ✅ / 未使用** |
| `requiredDailyPurchase` | 必要日次仕入 | yen | 残余仕入予算 ÷ 残日数 | **MetricId ✅ / 未使用** |

---

## 前年予算比較系

**前提:** ダッシュボードKPIカードで前年売上（同曜日/同日）÷ 当年月間予算を表示する。
クリックすると日別対応テーブル・週間小計・曜日ギャップ分析を含む詳細パネルが開く。

| MetricId | 指標名 | 単位 | 計算式 | 実装状況 |
|---|---|---|---|---|
| `prevYearSameDowBudgetRatio` | 前年同曜日予算比 | rate | 前年同曜日売上 ÷ 当年月間予算 | **✅ MetricId + KPIカード** |
| `prevYearSameDateBudgetRatio` | 前年同日予算比 | rate | 前年同日売上 ÷ 当年月間予算 | **✅ MetricId + KPIカード** |
| `dowGapImpact` | 曜日ギャップ影響額 | yen | Σ(曜日別売上差 × 日数差) | **✅ MetricId + KPIカード** |

---

## 実装状況サマリ

| カテゴリ | MetricId 登録済み | 計算+Explanation済み | 計算未実装 |
|---|---|---|---|
| 売上系 | 3 | 3 | 0 |
| 仕入系 | 3 | 3 | 0 |
| 売変系 | 3 | 3 | 0 |
| 値入率 | 2 | 2 | 0 |
| 粗利（在庫法） | 3 | 3 | 0 |
| 粗利（推定法） | 4 | 4 | 0 |
| 在庫差異 | 1 | 0 | 1 |
| 客数・客生産性 | 4 | 1 | 3 |
| 原価算入費 | 1 | 1 | 0 |
| 売上予算系 | 11 | 11 | 0 |
| 粗利予算系 | 8 | 3 | 5 |
| 仕入予算系 | 4 | 0 | 4 |
| 前年予算比較系 | 3 | 3 | 0 |
| **合計** | **50** | **37** | **13** |

→ 全 50 MetricId 登録済み。うち 37 指標は計算 + Explanation 実装完了。

### 概念の区別

| 概念 | 定義 | タイミング | 例 |
|---|---|---|---|
| **仕入** | 商品を仕入先から購入すること | 購買時 | 総仕入原価、在庫仕入、売上納品 |
| **値入** | 仕入時に設定する計画利幅 | 購買時（計画値） | 平均値入率、コア値入率 |
| **売上原価** | 売上に対応する原価（期首在庫+仕入−期末在庫） | 販売後（実績） | 在庫法売上原価 |
| **粗利** | 売上から売上原価を差し引いた利益 | 販売後（実績） | 在庫法粗利益 |
| **在庫法** | 実在庫データに基づく確定計算 | 販売後（実績） | 在庫法売上原価、在庫法粗利益、在庫法粗利率 |
| **推定法** | 値入率から間接的に原価・粗利を推定する手法 | 計算時（推定） | 推定原価、推定粗利、推定期末在庫 |
| **予測** | 現在のペースから将来値を予測 | 計算時 | 月末予測売上、着地予測達成率 |

**鉄則:** 在庫法は実績（確定値）、推定法は推定値。両者を混同しない。
粗利の権威的ソースは在庫法。推定法は在庫法が使えないときのフォールバック。

**鉄則:** 値入率を粗利率と呼ばない。推定粗利を実績粗利と混同しない。

---

## Explanation 対応ページ

| ページ | 対応状況 |
|---|---|
| Dashboard | WidgetContext.onExplain 経由で全ウィジェットから利用可能 |
| Daily | KpiCard 6枚に接続 |
| Insight | Tab 1: KpiCard 6枚 / Tab 2: 在庫法・推定法13指標 |
| Reports | 概況 + 目標 + 仕入売変 + 損益構造 |
| Category | KpiCard 4枚 |
| CostDetail | KpiCard 2枚 |
