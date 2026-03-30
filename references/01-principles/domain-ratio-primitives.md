# ドメイン比率プリミティブ登録簿

> 本ドキュメントは `domain/calculations/` に登録される比率・割合関数の
> **意味的分類・登録手続き・安全性保証** を定義する。

## 問題の本質

`a / b`（ゼロ除算ガード付き）は数式として同一だが、**意味が異なる**。

```
売上 / 予算 = 達成率        → "目標に対する進捗"
売上 / 前年売上 = 前年比    → "前年に対する変化"
部分 / 全体 = 構成比        → "全体に占める割合"
粗利 / 売上 = 粗利率        → "収益性の指標"
```

数式が同じだからといって同一関数で扱うと、**意味が消える**。
呼び出し側が何のために割り算しているかが型・名前から読み取れなくなる。

**原則:** ドメイン関数は数式ではなく意味を表現する。

---

## 意味的分類（Semantic Taxonomy）

### カテゴリ一覧

| ID | 名称 | 定義 | 数式 | 値域 | ゼロ除算 | 不変条件 |
|---|---|---|---|---|---|---|
| **ACH** | 達成率 | 実績の目標に対する割合 | actual / target | [0, ∞) | target=0 → 0 | — |
| **YOY** | 前年比 | 当期の前年同期に対する割合 | current / previous | [0, ∞) | previous=0 → 0 | — |
| **GRW** | 成長率 | 前期からの変化率 | (current - previous) / previous | (-∞, ∞) | previous=0 → 0 | current = previous × (1 + rate) |
| **WOW** | 前週比 | 当日の前週同曜日に対する割合 | current / previous | [0, ∞) | previous=0 → 0 | — |
| **SHR** | 構成比 | 部分の全体に対する割合 | part / whole | [0, 1] | whole=0 → 0 | Σ parts = whole → Σ ratios = 1 |
| **GPR** | 粗利率 | 粗利の売上に対する割合 | grossProfit / sales | (-∞, 1] | sales=0 → 0 | GP = sales × GPR |
| **DSC** | 売変率 | 売変額の粗売上に対する割合 | discount / (sales + discount) | [0, 1) | denom=0 → 0 | salesRate + discountRate = 1 |
| **MKP** | 値入率 | 値入額の売価に対する割合 | markup / salesPrice | [0, 1] | salesPrice=0 → 0 | costRate + markupRate = 1 |
| **TXV** | 客単価 | 1客あたり売上（単位値） | sales / customers | [0, ∞) 整数 | customers=0 → 0 | TV × C ≈ S (丸め誤差内) |
| **PIC** | PI値 | 1客あたり点数 | totalQty / customers | [0, ∞) | customers=0 → 0 | — |
| **PPU** | 点単価 | 1点あたり売上 | sales / totalQty | [0, ∞) | totalQty=0 → 0 | S = C × Q × P̄ |

### YOY と GRW の違い

**重要:** 前年比（YOY）と成長率（GRW）は異なる指標である。

| 指標 | 数式 | 例: 当期120万/前年100万 | 意味 |
|---|---|---|---|
| 前年比 (YOY) | current / previous | 1.2（120%） | 前年を1とした倍率 |
| 成長率 (GRW) | (current - previous) / previous | 0.2（20%増） | 前年からの変化割合 |

**関係式:** `growthRate = yoyRatio - 1`

使い分け:
- 表で「前年比 120%」と表示する場合 → `calculateYoYRatio` (1.2)
- チャートで「+20%」と表示する場合 → `calculateGrowthRate` (0.2)

### 意味の違いが実装に影響する例

| 観点 | 達成率 (ACH) | 構成比 (SHR) | 粗利率 (GPR) |
|---|---|---|---|
| 100% 超 | 正常（目標超過） | 異常（合計超過） | 異常（粗利 > 売上） |
| 負の値 | 異常 | 異常 | 正常（赤字） |
| 合計制約 | なし | Σ = 1 | なし |
| 表示形式 | `123.45%` | `12.34%` | `34.56%` |

---

## 現行の関数登録状況

### 登録済み（domain/calculations/ に存在）

| 関数名 | カテゴリ | 定義ファイル | 数学的厳密性 | 不変条件テスト |
|---|---|---|---|---|
| `calculateAchievementRate(actual, target)` | ACH | utils.ts | pragmatic | ✅ reconstruction, identity, monotonicity, zero-safety |
| `calculateYoYRatio(current, previous)` | YOY | utils.ts | pragmatic | ✅ reconstruction, identity, monotonicity, zero-safety |
| `calculateGrowthRate(current, previous)` | GRW | utils.ts | pragmatic | ✅ reconstruction, YoY関係式, identity, monotonicity, zero-safety |
| `calculateShare(part, whole)` | SHR | utils.ts | pragmatic | ✅ sum constraint, range, reconstruction, parametric |
| `calculateGrossProfitRate(grossProfit, sales)` | GPR | utils.ts | pragmatic | ✅ reconstruction, range, monotonicity, zero-safety |
| `calculateMarkupRate(grossProfit, salesPrice)` | MKP（単品） | utils.ts | pragmatic | ✅ complementarity, reconstruction, range, monotonicity, zero-safety |
| `calculateTransactionValue(sales, customers)` | TXV | utils.ts | pragmatic | ✅ rounding bound, integrality, zero-safety |
| `calculateItemsPerCustomer(totalQty, customers)` | PIC | utils.ts | 正式 | ✅ C×Q×P̄=S (cross-validation) |
| `calculateAveragePricePerItem(sales, totalQty)` | PPU | utils.ts | 正式 | ✅ C×Q×P̄=S (cross-validation) |
| `calculateDiscountRate(salesAmount, discountAmount)` | DSC | estMethod.ts | pragmatic | ✅ reconstruction, range, complementarity, monotonicity, zero-safety |
| `calculateMarkupRates(input)` | MKP（複合） | markupRate.ts | 正式 | ✅ (markupRate.test.ts) |
| `calculateBudgetAnalysis(input)` | ACH（複合） | budgetAnalysis.ts | 正式 | ✅ (Rust invariants B-INV-1〜8) |

### safeDivide の残存が適切な場合

| 用途 | 例 | 理由 |
|---|---|---|
| 日商平均 | `safeDivide(budget, daysInMonth, 0)` | 比率ではなく単位値の算出 |
| 原価算入率 | `safeDivide(costInclusion, sales, 0)` | 専用プリミティブ未定義（将来検討） |
| 予算進捗率 | `safeDivide(sales, cumulativeBudget, 0)` | 達成率とは異なる（消化ペース） |
| 予算経過率 | `safeDivide(cumulativeBudget, budget, 0)` | 時間経過の割合 |
| ペース比率 | `safeDivide(requiredDaily, actualDaily, 0)` | 必要ペースの比率 |
| 標準誤差 | `safeDivide(stdDev, sqrt(n), stdDev)` | 統計計算 |

---

## ドメインプリミティブ登録手続き

### 登録基準

domain/calculations/ に関数を登録するには、以下の **5条件** を満たすこと。

| # | 条件 | 検証方法 |
|---|---|---|
| 1 | **意味的名称** — 数式ではなく業務上の意味を関数名で表現する | レビュー |
| 2 | **引数の意味宣言** — 引数名が業務上の役割を示す（`a, b` ではなく `actual, target`） | レビュー |
| 3 | **値域の定義** — 戻り値の取りうる範囲を JSDoc に明記する | レビュー |
| 4 | **ゼロ除算の意味定義** — 分母ゼロ時の戻り値とその業務的理由を JSDoc に明記する | レビュー |
| 5 | **不変条件テスト** — 数学的性質をテストコードで証明する | CI ゲート |

### JSDoc テンプレート

```typescript
/**
 * 【業務上の意味を1行で】
 *
 * @category 【ACH | YOY | WOW | SHR | GPR | DSC | MKP | TXV | PIC | PPU】
 * @param paramName — 【この引数が業務上何を表すか】
 * @returns 【戻り値の業務的意味】
 * @range 【値域: [0, ∞), [0, 1], (-∞, 1] 等】
 * @zero 【分母ゼロ時の挙動と理由】
 * @invariant 【数学的不変条件があれば記載】
 *
 * NOTE(pragmatic): 【該当する場合のみ】数学的に厳密な不変条件を持たない実用プリミティブ。
 */
```

### 登録フロー

```
1. 意味的カテゴリの判定（上記 Taxonomy を参照）
   ↓
2. 既存関数で意味が一致するか確認
   ├→ 一致する → 既存関数を使用（新規登録不要）
   └→ 一致しない → 新規登録へ
      ↓
3. JSDoc テンプレートに従い関数を定義
   ↓
4. 不変条件テストを追加
   ├→ 数学的不変条件がある → 正式関数として登録
   └→ 不変条件がない → NOTE(pragmatic) を付与して登録
      ↓
5. レビュー（5条件チェック）
   ↓
6. 本ドキュメントの「登録済み」テーブルに追記
```

---

## 不変条件テストの要件

### pragmatic 関数の最低限テスト（5条件）

| # | テスト | 内容 | 例 |
|---|---|---|---|
| 1 | **ゼロ安全性** | 分母ゼロで例外を投げない | `f(100, 0) === 0` |
| 2 | **自己同一性** | 同値入力で期待値を返す | `achievementRate(x, x) === 1` |
| 3 | **単調性** | 分子増加で結果が非減少 | `f(a₁, b) ≤ f(a₂, b)` if `a₁ ≤ a₂` |
| 4 | **再構成性** | 結果から入力を復元できる | `rate × target ≈ actual` |
| 5 | **パラメトリック** | 乱数入力で性質が保持される | 100ケースの自動検証 |

### 正式関数の追加テスト

| # | テスト | 内容 |
|---|---|---|
| 6 | **値域検証** | 戻り値が宣言された値域内 |
| 7 | **合計制約** | 構成比の合計が1になる等 |
| 8 | **相補性** | `salesRate + discountRate === 1` 等 |
| 9 | **クロスバリデーション** | Rust WASM 実装との一致 |

---

## 意味的に正しい使用パターン

### ✅ 正しい使用

```typescript
// 達成率: 売上実績 vs 予算
const ach = calculateAchievementRate(totalSales, budget)

// 前年比: 当期売上 vs 前年売上（将来的に専用関数に分離予定）
const yoy = calculateYoYRatio(currentSales, prevYearSales)

// 構成比: カテゴリ売上 vs 全体売上（将来的に専用関数に分離予定）
const share = calculateShare(categorySales, totalSales)

// 客単価: 売上 vs 客数
const txVal = calculateTransactionValue(sales, customers)

// 売変率: 売変額 vs 粗売上
const discRate = calculateDiscountRate(salesAmount, discountAmount)
```

### ❌ 誤った使用

```typescript
// NG: 達成率関数で構成比を計算（意味が異なる）
const share = calculateAchievementRate(partSales, totalSales)

// NG: 達成率関数で前年比を計算（意味が異なる）
const yoy = calculateAchievementRate(currentSales, prevSales)

// NG: safeDivide で意味不明な割り算（何を計算しているか不明）
const rate = safeDivide(a, b, 0)

// NG: インラインでゼロ除算ガード（domain に吸収すべき）
const ach = budget > 0 ? sales / budget : 0
```

---

## 集約時の除算ルール（丸め誤差防止）

### 原則: 額の積み上げ → 最後に1回だけ除算

率・比率の集約（月次・全店・カテゴリ合計等）では、**率を足し合わせず、額を積み上げてから最後に1回だけ除算する**。

```
✅ 正しい（額の積み上げ → 最後に1回除算）:
  cumSales += dailySales
  cumBudget += dailyBudget
  cumAchievementRate = calculateAchievementRate(cumSales, cumBudget)

❌ 誤り（率の合算 — 丸め誤差が蓄積）:
  cumAchievementRate += dailyAchievementRate
  cumAchievementRate /= dayCount
```

### 理由

率の加算・平均は**加重平均が崩壊する**。日商100万円の日と日商10万円の日の達成率を単純平均すると、100万円の日の重みが1/10に縮小される。額を積み上げてから割れば、自然に売上額による加重平均になる。

### 適用対象

| 率 | 分子（額を積み上げ） | 分母（額を積み上げ） |
|------|------|------|
| 達成率 (ACH) | cumActualSales | cumBudget |
| 前年比 (YOY) | cumCurrentSales | cumPrevSales |
| 粗利率 (GPR) | cumGrossProfit | cumSales |
| 売変率 (DSC) | cumDiscount | cumGrossSales |
| 値入率 (MKP) | cumMarkup | cumSalesPrice |
| 構成比 (SHR) | partAmount | wholeAmount |

### 既存実装の確認

`conditionSummaryDailyBuilders.ts` の累計計算はこの原則に従っている:
- 売上: `cumActual += dailyActual` → `calculateAchievementRate(cumActual, cumBudget)`
- 値入率: `cumCost/cumPrice` → `calculateMarkupRates({...cumAmounts})`
- 売変率: `cumSales/cumDiscount` → `calculateDiscountRate(cumSales, cumDiscount)`

### ガード

`purityGuard.test.ts` の INV-RATE-01（presentation 層での率の直接計算禁止）が
この原則を間接的に保護している。率の直接計算を禁止することで、
必然的に domain 関数を通じた正しい除算パターンに誘導される。

---

## 移行計画

### Phase 1: 意味的関数の追加（現在）

`calculateAchievementRate` を残しつつ、以下の意味的関数を `domain/calculations/utils.ts` に追加する。

| 関数名 | カテゴリ | 実装 |
|---|---|---|
| `calculateYoYRatio(current, previous)` | YOY | `safeDivide(current, previous, 0)` |
| `calculateShare(part, whole)` | SHR | `safeDivide(part, whole, 0)` |
| `calculateGrossProfitRate(grossProfit, sales)` | GPR | `safeDivide(grossProfit, sales, 0)` |

数式は同一でも、**関数名が意味を伝える**。

### Phase 2: 呼び出し側の置換

`calculateAchievementRate` を意味的に正しい関数に置換する。

| 現行 | 置換先 | 対象箇所 |
|---|---|---|
| `calculateAchievementRate(current, prev)` (YOY用途) | `calculateYoYRatio` | 11箇所 |
| `calculateAchievementRate(part, total)` (SHR用途) | `calculateShare` | 4箇所 |
| `calculateAchievementRate(gp, sales)` (GPR用途) | `calculateGrossProfitRate` | 2箇所 |
| `calculateAchievementRate(actual, budget)` (ACH用途) | そのまま | 20箇所 |

### Phase 3: RULE-P4 ガードテストの拡張

意味的に不正な使用を検出するガードテストを追加（将来）。

### Phase 4: 型レベル保証（将来検討）

Branded Type による引数の意味的区別（例: `BudgetAmount`, `ActualAmount`）。
コストと効果のバランスを見て判断する。

---

## 使用箇所マップ（現行）

### calculateAchievementRate — 79箇所

**ACH（達成率）** — 20箇所:
- `KpiTableWidgets.vm.ts` — 月間売上達成率 (×2)
- `StoreKpiTableInner.tsx` — 店舗月間達成率 (×2)
- `DayDetailModal.vm.ts` — 日次達成率、累積達成率
- `DayDetailModal.tsx` — 日次達成率、累積達成率
- `MonthlyCalendar.tsx` — 期間達成率、日次達成率、累積達成率
- `conditionPanelSalesDetail.vm.ts` — 店舗達成率、日次累積達成率、全体達成率
- `ForecastTools.tsx` — 着地達成率、予測達成率、目標達成率、GP達成率 (×5)
- `useDrilldownData.ts` — 予算達成率

**YOY（前年比）** — 11箇所:
- `DayDetailModal.vm.ts` — 売上前年比、客数前年比、客単価前年比
- `DayDetailModal.tsx` — 売上前年比、客数前年比、客単価前年比
- `MonthlyCalendar.tsx` — 期間前年比
- `CategoryBarSection.tsx` — カテゴリ前年比
- `ForecastTools.tsx` — 着地前年比、目標前年比
- `useDrilldownData.ts` — 前年比

**SHR（構成比）** — 4箇所:
- `conditionPanelMarkupCost.vm.ts` — 原価構成比(店舗内)、原価構成比(全体)
- `HourlyChart.tsx` — 時間帯構成比
- `CategoryBarSection.tsx` — カテゴリ構成比

**GPR（粗利率）** — 2箇所:
- `ForecastTools.tsx` — 着地粗利率、残予算必要粗利率

**WOW（前週比）** — 1箇所:
- `useDrilldownData.ts` — 前週比

**その他（残予算消化率）** — 2箇所:
- `ForecastTools.tsx` — 残予算消化率 (×2)

### safeDivide — Presentation/Application 層の比率用途（主要箇所）

- `conditionPanelSalesDetail.vm.ts` — 日商平均（予算÷日数）
- `conditionPanelYoY.vm.ts` — 前年比（売上・客数）
- `ConditionSummaryEnhanced.vm.ts` — 達成率、粗利率
- `PlanActualForecast.tsx` — 達成率、進捗率
- `PrevYearBudgetDetailPanel.tsx` — 予算比率
- `categoryData.ts` — 値入率、構成比
- `collectionAggregator.ts` — 達成率、進捗率、粗利率
- `storeAssembler.ts` — 原価算入率、日商平均

---

## safeDivide の位置づけ

`safeDivide` は**意味を持たない**汎用除算ユーティリティである。

| 用途 | 適切か | 理由 |
|---|---|---|
| 比率・率の計算 | ⚠️ 非推奨 | 意味的関数を使うべき |
| 日商平均（予算÷日数） | ✅ 適切 | 比率ではなく単位値の算出 |
| 移動平均の内部計算 | ✅ 適切 | 低レベルの算術 |
| 外部データのフォールバック | ✅ 適切 | データクレンジング |

**原則:** `safeDivide` は比率プリミティブの **実装詳細** であり、呼び出し側が直接使うべきではない（比率計算の場合）。

---

## 変更履歴

| 日付 | 内容 |
|---|---|
| 2026-03-16 | 初版作成。意味的分類・登録手続き・使用箇所マップを定義 |
