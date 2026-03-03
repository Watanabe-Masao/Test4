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
  readonly entity: 'sales' | 'cost' | 'discount' | 'markup' | 'gp' | 'inventory' | 'customer' | 'consumable'
  /** 領域: どの文脈か */
  readonly domain: 'actual' | 'budget' | 'forecast' | 'invMethod' | 'estMethod'
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
| `purchaseCost` | cost | actual | value | 総仕入原価 |
| `inventoryCost` | cost | actual | value | 在庫仕入原価 |
| `deliverySalesCost` | cost | actual | value | 売上納品原価 |
| `discountTotal` | discount | actual | value | 売変額合計 |
| `discountRate` | discount | actual | rate | 売変率 |
| `discountLossCost` | discount | actual | value | 売変ロス原価 |
| `averageMarkupRate` | markup | actual | average | 平均値入率 |
| `coreMarkupRate` | markup | actual | rate | コア値入率 |
| `invMethodCogs` | cost | invMethod | value | 売上原価 |
| `invMethodGrossProfit` | gp | invMethod | value | 実績粗利益 |
| `invMethodGrossProfitRate` | gp | invMethod | rate | 実績粗利率 |
| `estMethodCogs` | cost | estMethod | value | 推定原価 |
| `estMethodMargin` | gp | estMethod | value | 推定マージン |
| `estMethodMarginRate` | gp | estMethod | rate | 推定マージン率 |
| `estMethodClosingInventory` | inventory | estMethod | value | 推定期末在庫 |
| `totalCustomers` | customer | actual | value | 来店客数 |
| `totalConsumable` | consumable | actual | value | 消耗品費 |
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

## 原価系

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `purchaseCost` | 総仕入原価 | yen | 仕入データの合計 | `totalCost` |
| `inventoryCost` | 在庫仕入原価 | yen | 総仕入 − 売上納品原価 | `inventoryCost` |
| `deliverySalesCost` | 売上納品原価 | yen | 花 + 産直の仕入原価 | `deliverySalesCost` |

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

## 値入率

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `averageMarkupRate` | 平均値入率 | rate | (粗売上 − 仕入原価) ÷ 粗売上 | `averageMarkupRate` |
| `coreMarkupRate` | コア値入率 | rate | (コア粗売上 − コア仕入原価) ÷ コア粗売上 | `coreMarkupRate` |

## 在庫法（実績 P/L）

在庫実績があるときのみ有効（`null` = 在庫未設定）。

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `invMethodCogs` | 売上原価 | yen | 期首在庫 + 仕入 − 期末在庫 | `invMethodCogs` |
| `invMethodGrossProfit` | 実績粗利益 | yen | 総売上 − 売上原価 | `invMethodGrossProfit` |
| `invMethodGrossProfitRate` | 実績粗利率 | rate | 粗利益 ÷ 総売上 | `invMethodGrossProfitRate` |

## 推定法（在庫差異検知）

常に計算される（在庫法のフォールバック）。

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `estMethodCogs` | 推定原価 | yen | 売上 × (1 − 推定マージン率) | `estMethodCogs` |
| `estMethodMargin` | 推定マージン | yen | 総売上 − 推定原価 | `estMethodMargin` |
| `estMethodMarginRate` | 推定マージン率 | rate | (粗売上 − 仕入原価) ÷ 粗売上 に基づく | `estMethodMarginRate` |
| `estMethodClosingInventory` | 推定期末在庫 | yen | 期首在庫 + 仕入 − 推定原価 | `estMethodClosingInventory` |

## 客数・消耗品

| MetricId | 指標名 | 単位 | 計算式 | StoreResult フィールド |
|---|---|---|---|---|
| `totalCustomers` | 来店客数 | count | 分類別売上の客数合計 | `totalCustomers` |
| `totalConsumable` | 消耗品費 | yen | 消耗品データの合計 | `totalConsumable` |

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
| `budget` | 売上予算（全体） | yen | 設定値 | **MetricId ✅ / Explanation ✅** |
| `budgetAchievementRate` | 売上予算達成率 | rate | 累計実績 ÷ 全体予算 | **MetricId ✅ / Explanation ✅** |
| `budgetProgressRate` | 売上予算消化率 | rate | 累計実績 ÷ 累計予算 | **MetricId ✅ / Explanation ✅** |
| `budgetElapsedRate` | 経過予算率 | rate | 累計予算 ÷ 全体予算 | 計算済み / **MetricId 未登録** |
| `budgetProgressGap` | 売上進捗ギャップ | rate | 消化率 − 経過予算率 | **未計算 / 未登録** |
| `budgetVariance` | 売上予算差異 | yen | 累計実績 − 累計予算 | **未計算 / 未登録** |
| `projectedSales` | 月末予測売上 | yen | 実績 + 日平均売上 × 残日数 | **MetricId ✅ / Explanation ✅** |
| `projectedAchievement` | 着地予測達成率 | rate | 予測売上 ÷ 全体予算 | 計算済み / **MetricId 未登録** |
| `requiredDailySales` | 必要日次売上 | yen | 残余予算 ÷ 残日数 | **未計算 / 未登録** |
| `averageDailySales` | 日平均売上 | yen | 累計実績 ÷ 営業日数 | 計算済み / **MetricId 未登録** |
| `remainingBudget` | 残余予算 | yen | 全体予算 − 累計実績 | **MetricId ✅ / Explanation ✅** |

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
- 在庫法: `invMethodGrossProfit`（在庫実績あり時のみ、より信頼性が高い）
- 推定法: `estMethodMargin`（常時利用可能、フォールバック）
- 有効粗利率: `getEffectiveGrossProfitRate()` で在庫法優先→推定法フォールバック

| MetricId | 指標名 | 単位 | 計算式 | 実装状況 |
|---|---|---|---|---|
| `grossProfitBudget` | 粗利予算（全体） | yen | 設定値 | StoreResult に値あり / **MetricId 未登録** |
| `grossProfitRateBudget` | 粗利率予算 | rate | 粗利予算 ÷ 売上予算 | StoreResult に値あり / **MetricId 未登録** |
| `grossProfitBudgetAchievement` | 粗利予算達成率 | rate | 粗利実績 ÷ 粗利予算 | **未計算 / 未登録** |
| `grossProfitBudgetVariance` | 粗利予算差異 | yen | 粗利実績 − 経過粗利予算 | **未計算 / 未登録** |
| `grossProfitProgressGap` | 粗利進捗ギャップ | rate | 粗利達成率 − 経過予算率 | **未計算 / 未登録** |
| `projectedGrossProfit` | 粗利着地予測 | yen | 予測売上 × 有効粗利率 | Presentation で計算中 / **MetricId 未登録** |
| `projectedGPAchievement` | 粗利着地予測達成率 | rate | 粗利着地予測 ÷ 粗利予算 | Presentation で計算中 / **MetricId 未登録** |
| `requiredDailyGrossProfit` | 必要日次粗利 | yen | (粗利予算 − 粗利実績) ÷ 残日数 | **未計算 / 未登録** |

**注意:**
- 粗利予算の経過按分は売上予算の `budgetElapsedRate` と同じ経過率を使う。
- 粗利実績には在庫法粗利（`invMethodGrossProfit`）を優先使用する。
  在庫法が `null` の場合は推定マージン（`estMethodMargin`）をフォールバックに使う。
- `projectedGrossProfit` / `projectedGPAchievement` は現在 Presentation 層
  （`PlanActualForecast.tsx`）でインライン計算されている。
  → Domain/Application 層に移行すべき（禁止事項 #6: UI が生データソースを直接参照しない）。

---

## 実装状況サマリ

| カテゴリ | MetricId 登録済み | 計算済み(未登録) | 未実装 |
|---|---|---|---|
| 売上系 | 3 | 0 | 0 |
| 原価系 | 3 | 0 | 0 |
| 売変系 | 3 | 0 | 0 |
| 値入率 | 2 | 0 | 0 |
| 在庫法 | 3 | 0 | 0 |
| 推定法 | 4 | 0 | 0 |
| 客数・消耗品 | 2 | 0 | 0 |
| 売上予算系 | 5 | 4 | 2 |
| 粗利予算系 | 0 | 4 | 4 |
| **合計** | **25** | **8** | **6** |

→ 登録済み 25 + 計算済み(未登録) 8 + 未実装 6 = **39 指標**（目標）

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
