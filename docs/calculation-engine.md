# 計算エンジン仕様書

## 1. 概要

本計算エンジンは、小売業における仕入・粗利管理のコアロジックを提供する。

### モジュール構成

| モジュール | ファイル | 役割 |
|-----------|---------|------|
| 在庫法 | `invMethod.ts` | 実績粗利計算 |
| 推定法 | `estMethod.ts` | 在庫推定指標計算 |
| 予算分析 | `budgetAnalysis.ts` | 予算消化・達成率分析 |
| 予測 | `forecast.ts` | 売上予測・異常値検出 |
| 全店集計 | `aggregation.ts` | 複数店舗の集約ロジック |
| 売変影響分析 | `discountImpact.ts` | 売変ロス原価算出 |
| ピン止め区間 | `pinIntervals.ts` | 区間別在庫法粗利率計算 |
| ユーティリティ | `utils.ts` | 安全除算・数値変換・フォーマット |

### 設計原則

- **全て純粋関数**: 副作用なし、入力から出力を決定的に算出
- **フレームワーク非依存**: React/DOM への依存なし、単体テスト容易
- **配置**: `domain/calculations/` ディレクトリに集約
- **統合フロー**: `CalculationOrchestrator`（`application/services/`）が各モジュールを統合し、`dailyBuilder` による日次レコード構築、`storeAssembler` による `StoreResult` 組み立て、`aggregateResults` による全店集約を制御する

---

## 2. 在庫法 (invMethod.ts) -- 実績粗利

### スコープ

全売上・全仕入（花・産直を含む全体）

### 計算式

```
売上原価 = 期首在庫 + 総仕入高 - 期末在庫
粗利益   = 売上高 - 売上原価
粗利率   = 粗利益 / 売上高
```

### 入力 (`InvMethodInput`)

| フィールド | 型 | 説明 |
|-----------|---|------|
| `openingInventory` | `number \| null` | 期首在庫（実績値） |
| `closingInventory` | `number \| null` | 期末在庫（実績値） |
| `totalPurchaseCost` | `number` | 総仕入原価 |
| `totalSales` | `number` | 総売上高 |

### 出力 (`InvMethodResult`)

| フィールド | 型 | 説明 |
|-----------|---|------|
| `cogs` | `number \| null` | 売上原価 |
| `grossProfit` | `number \| null` | 粗利益 |
| `grossProfitRate` | `number \| null` | 粗利率 |

### 必要データ

- 期首在庫、期末在庫（実績値）。いずれかが `null` の場合は計算不可（全結果が `null`）

### 用途

実際の損益確認。会計的な粗利を正確に算出する。

---

## 3. 推定法 (estMethod.ts) -- 在庫推定指標

### スコープ

在庫販売のみ（花・産直除外）

### 計算式

```
コア売上 = 総売上 - 花売価 - 産直売価
粗売上   = コア売上 / (1 - 売変率)
推定原価 = 粗売上 × (1 - 値入率) + 消耗品費
推定粗利 = コア売上 - 推定原価
推定粗利率 = 推定粗利 / コア売上
推定期末在庫 = 期首在庫 + 期中仕入原価(在庫販売分) - 推定原価
```

### 入力 (`EstMethodInput`)

| フィールド | 型 | 説明 |
|-----------|---|------|
| `coreSales` | `number` | コア売上（花・産直・売上納品除外） |
| `discountRate` | `number` | 売変率 |
| `markupRate` | `number` | 値入率 |
| `consumableCost` | `number` | 消耗品費 |
| `openingInventory` | `number \| null` | 期首在庫（在庫販売分） |
| `inventoryPurchaseCost` | `number` | 期中仕入原価（在庫販売分、花・産直除外） |

### 出力 (`EstMethodResult`)

| フィールド | 型 | 説明 |
|-----------|---|------|
| `grossSales` | `number` | 粗売上（売変前売価） |
| `cogs` | `number` | 推定原価 |
| `margin` | `number` | 推定マージン（実粗利ではない） |
| `marginRate` | `number` | 推定マージン率（実粗利率ではない） |
| `closingInventory` | `number \| null` | 推定期末在庫 |

### 補助関数

- **`calculateCoreSales(totalSales, flowerSalesPrice, directProduceSalesPrice)`**: コア売上を算出。コア売上がマイナスになる場合（売上納品超過）は `0` にクランプし、超過フラグ・超過額を返す
- **`calculateDiscountRate(salesAmount, discountAmount)`**: 売変率 = 売変額 / (売上 + 売変額)

### 用途

在庫差異検知、異常検出。推定在庫と実績在庫を比較し、見えない損失・異常を発見する。

> **重要**: 推定法は実粗利ではない。在庫推定の基礎指標であり、推定在庫と実績在庫の乖離を検知するために使用する。

---

## 4. 在庫法と推定法の違い（最重要）

この2つの計算手法は**目的が根本的に異なる**。混同すると経営判断を誤る原因となるため、違いを正確に理解すること。

| | 在庫法 | 推定法 |
|---|---|---|
| **本質** | 損益計算 | 在庫推定 |
| **対象** | 全売上・全仕入（花・産直含む） | 在庫販売のみ（花・産直除外） |
| **算出根拠** | 実績在庫増減 | 値入率・売変率からの逆算 |
| **必要データ** | 期首/期末在庫（実績値） | 値入率・売変率 |
| **結果の性質** | 会計的に正確な実績粗利 | 推定値（理論上の在庫水準） |
| **利用場面** | 実際の損益確認 | 在庫差異検知・異常検出 |

### 使い分けの指針

- **「今月いくら儲かったか？」** → 在庫法（`invMethod`）
- **「在庫は帳簿通りか？おかしな損失はないか？」** → 推定法（`estMethod`）

---

## 5. 売変影響分析 (discountImpact.ts)

### 計算式

```
売変ロス原価 = (1 - 値入率) × コア売上 × 売変率 / (1 - 売変率)
```

### 入力 (`DiscountImpactInput`)

| フィールド | 型 | 説明 |
|-----------|---|------|
| `coreSales` | `number` | コア売上 |
| `markupRate` | `number` | 値入率 |
| `discountRate` | `number` | 売変率 |

### 出力 (`DiscountImpactResult`)

| フィールド | 型 | 説明 |
|-----------|---|------|
| `discountLossCost` | `number` | 売変ロス原価 |

### 意味

売変（値引）によって失われた売価を、原価換算した金額。値引がどれだけの原価相当の損失を生んでいるかを可視化する。

---

## 6. 予算分析 (budgetAnalysis.ts)

### 計算項目

| 項目 | 計算式 |
|------|--------|
| 予算達成率 | 売上 / 予算 |
| 予算消化率 | 売上 / 経過日までの累計予算（日別累計 vs 予算累計） |
| 予算経過率 | 経過日までの累計予算 / 月間予算 |
| 日平均売上 | 売上 / 営業日数（営業日ベース） |
| 月末予測 | 実績売上 + 日平均売上 × 残日数 |
| 達成率予測 | 月末予測売上 / 予算 |
| 残余予算 | 予算 - 売上 |
| 日別累計 | 日ごとの売上累計・予算累計の `Map` |

### 入力 (`BudgetAnalysisInput`)

| フィールド | 型 | 説明 |
|-----------|---|------|
| `totalSales` | `number` | 実績売上合計 |
| `budget` | `number` | 月間予算 |
| `budgetDaily` | `ReadonlyMap<number, number>` | 日別予算 |
| `salesDaily` | `ReadonlyMap<number, number>` | 日別売上 |
| `elapsedDays` | `number` | 経過日数 |
| `salesDays` | `number` | 営業日数（売上がある日数） |
| `daysInMonth` | `number` | 月の日数 |

### 出力 (`BudgetAnalysisResult`)

| フィールド | 型 | 説明 |
|-----------|---|------|
| `budgetAchievementRate` | `number` | 予算達成率 |
| `budgetProgressRate` | `number` | 予算消化率 |
| `budgetElapsedRate` | `number` | 予算経過率 |
| `averageDailySales` | `number` | 日平均売上 |
| `projectedSales` | `number` | 月末予測売上 |
| `projectedAchievement` | `number` | 予算達成率予測 |
| `remainingBudget` | `number` | 残余予算 |
| `dailyCumulative` | `ReadonlyMap<number, { sales, budget }>` | 日別累計 |

---

## 7. 予測・異常値検出 (forecast.ts)

### 月間カレンダー

- **月曜始まり**のカレンダー形式で週を区切る
- `getWeekRanges(year, month)` が週番号・開始日・終了日を返す

### 週単位集計 (`calculateWeeklySummaries`)

各週について以下を算出:
- 週間売上合計
- 週間粗利合計
- 週間粗利率
- 営業日数（売上 > 0 の日数）

### 曜日別平均 (`calculateDayOfWeekAverages`)

- 曜日ごと（0=日, 1=月, ... 6=土）の平均売上を算出
- 売上がある日のみカウント

### 異常値検出 (`detectAnomalies`)

- 日別売上の平均と標準偏差を計算
- Zスコア = (値 - 平均) / 標準偏差
- デフォルト閾値: `|Zスコア| > 2.0` で異常値判定
- データが3件未満、または標準偏差が0の場合は検出をスキップ

### 統合関数 (`calculateForecast`)

`ForecastInput` を受け取り、週別サマリー・曜日別平均・異常値検出結果をまとめて返す。

---

## 8. 全店集計 (aggregation.ts)

### 集計ルール

| 項目種別 | 集計方法 | 関数 |
|---------|---------|------|
| 金額項目 | 単純合計 | `sumStoreValues` |
| nullable金額項目 | 単純合計（全てnullなら null） | `sumNullableValues` |
| 率項目 | 売上高加重平均 | `weightedAverageBySales` |

### 加重平均の計算

```
加重平均 = Σ(store.rate × store.sales) / Σ(store.sales)
```

- 売上が `> 0` の店舗のみ加重対象
- 分母（総売上）が `0` の場合 → `0` を返す

---

## 9. ピン止め区間計算 (pinIntervals.ts)

### 概要

期中に棚卸を行った日（ピン止め日）を基に、区間ごとの在庫法粗利率を算出する。

### 入力

- `daily`: 日次レコード（`Map<number, DailyRecord>`）
- `openingInventory`: 期首在庫
- `pins`: `[day, closingInventory][]` -- ピン止め日と期末在庫の配列（日付昇順）

### 区間ごとの計算

各区間（前回ピン止め日の翌日 〜 当該ピン止め日）について:
- 区間売上 = 区間内の日次売上合計
- 区間仕入原価 = 区間内の日次仕入原価合計
- 売上原価 = 前区間の期末在庫 + 区間仕入原価 - 当区間の期末在庫
- 粗利益 = 区間売上 - 売上原価
- 粗利率 = 粗利益 / 区間売上

---

## 10. ユーティリティ (utils.ts)

### safeDivide(numerator, denominator, fallback = 0)

ゼロ除算を防止する安全な除算。`denominator` が `0` の場合は `fallback` を返す。

### safeNumber(n)

`null`, `undefined`, `NaN` を `0` に変換する。型不明の値を安全に数値化する。

### フォーマット関数

| 関数 | 説明 | 例 |
|------|------|---|
| `formatCurrency(n)` | 四捨五入 + カンマ区切り | `1234567` → `"1,234,567"` |
| `formatManYen(n)` | 万円表示 | `12340000` → `"+1234万円"` |
| `formatPercent(n, decimals)` | パーセント表示 | `0.2534` → `"25.34%"` |
| `formatPointDiff(n, decimals)` | ポイント差表示 | `0.015` → `"+1.5pt"` |

いずれも `null` / `NaN` の場合は `"-"` を返す。

---

## 11. エッジケース処理

### ゼロ除算ガード

全ての除算に `safeDivide` を適用。粗利率、予算達成率、加重平均など、分母がゼロになりうる全箇所で保護される。

### 期首/期末在庫の欠如

在庫法（`invMethod`）: `openingInventory` または `closingInventory` が `null` の場合、全計算結果を `null` で返す。

### 売上納品超過

`calculateCoreSales`: コア売上がマイナスになる場合（売上納品が総売上を上回る異常ケース）:
- コア売上を `0` にクランプ
- `isOverDelivery = true` フラグを設定
- 超過額 `overDeliveryAmount` を記録

### Null/NaN 統一処理

- `safeNumber`: 型不明の値を安全に `number` へ変換（`null`/`undefined`/`NaN` → `0`）
- フォーマット関数: `null`/`NaN` → `"-"` 表示

### 売変率が1の場合

推定法（`estMethod`）: 売変率が `1`（全額値引）の場合、除数 `(1 - 売変率)` が `0` となるため、コア売上をそのまま粗売上として使用する。

### 売変影響分析の除数ガード

`discountImpact`: `(1 - 売変率)` が `0` 以下の場合、除数を `1` に置換して計算を継続する。

### 異常値検出の最小データ要件

`detectAnomalies`: データが3件未満、または標準偏差が `0` の場合は空配列を返す。
