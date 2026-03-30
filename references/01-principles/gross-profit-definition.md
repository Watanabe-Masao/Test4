# 粗利の正本定義

## 1. 背景

粗利（gross profit）は複数の計算方法・表示モードが混在している。
仕入原価の正本化（`readPurchaseCost`）に続き、粗利についても
**計算の正本化**を行い、同じ条件なら同じ粗利が得られる状態を作る。

仕入原価は「取得の正本化」、粗利は「計算の正本化」。形が異なる。

## 2. 粗利の4種

粗利は2軸（method × inclusionMode）で4種に分かれる。

| method | inclusionMode | 意味 | 備考 |
|--------|---------------|------|------|
| inventory | before_cost_inclusion | 在庫法・原価算入費前 | 実績。期首/期末在庫が必要 |
| inventory | after_cost_inclusion | 在庫法・原価算入費後 | 実績。原価算入費を事後控除 |
| estimated | before_cost_inclusion | 推定法・原価算入費前 | ※推定法のCOGSに原価算入費が内包済みなので、before = 原価算入費反映済みの値 |
| estimated | after_cost_inclusion | 推定法・原価算入費後 | ※before と同値（追加控除不要） |

### 推定法の特殊性

推定法の `cogs = 粗売上 × (1 - 値入率) + 原価算入費` のため、
原価算入費は COGS に内包されている。したがって:
- 推定法の `before_cost_inclusion` は既に原価算入費を含む
- 推定法の `after_cost_inclusion` は追加控除不要（before と同値）

これは在庫法と異なる挙動であり、定義書で明示する。

## 3. 計算式

### 在庫法（inventory method）

```
売上原価(COGS) = 期首在庫 + 総仕入原価 - 期末在庫
粗利益 = 総売上 - COGS

原価算入費前粗利率 = 粗利益 / 総売上
原価算入費後粗利率 = (粗利益 - 原価算入費) / 総売上
```

- `総仕入原価` = `PurchaseCostReadModel.grandTotalCost`（3正本全部）
- 原価算入費は COGS に含まれない → 事後控除

### 推定法（estimated method）

```
粗売上 = コア売上 / (1 - 売変率)
推定原価 = 粗売上 × (1 - 値入率) + 原価算入費
推定マージン = コア売上 - 推定原価
推定マージン率 = 推定マージン / コア売上

推定期末在庫 = 期首在庫 + 期中仕入原価 - 推定原価
```

- `コア売上` = 総売上 - 花売価 - 産直売価
- `期中仕入原価` = `PurchaseCostReadModel.inventoryPurchaseCost`（売上納品除外）
- 原価算入費は推定原価に内包 → 追加控除不要

## 4. purchaseCost 入力の意味（method ごとに異なる）

| method | purchaseCost の意味 | PurchaseCostReadModel のフィールド |
|--------|--------------------|---------------------------------|
| inventory | 総仕入原価（3正本全部） | `grandTotalCost` |
| estimated | 期中仕入原価（売上納品除外） | `inventoryPurchaseCost` |

この区別は `calculateGrossProfit()` の呼び出し元が責任を持つ。
入力側で正しいフィールドを渡さなければ結果は不正確になる。

## 5. フォールバック規則

### 信頼階層

```
在庫法（実績）> 推定法（推定値）
```

在庫法は期首/期末在庫が必要。在庫データがない場合は推定法にフォールバック。

### KPI 表示でのフォールバック

- `invMethodGrossProfitRate != null` → 在庫法の値を使用
- `invMethodGrossProfitRate == null` → `estMethodMarginRate` にフォールバック
- フォールバック時は `meta.usedFallback = true` を記録

### 表示名ルール

| フォールバック状態 | 表示名 | バッジ |
|------------------|--------|--------|
| 在庫法が使用可能 | 「粗利率」 | 「実績」 |
| 推定法にフォールバック | 「推定粗利率」 | 「推定」 |

KPI と詳細画面で同じ表示名ルールを適用する。

## 6. 唯一の計算関数

```ts
calculateGrossProfit(input: GrossProfitInput): GrossProfitResult & { meta: GrossProfitMeta }
```

### 入力契約

```ts
type GrossProfitInput = {
  sales: number              // 総売上（在庫法）or コア売上（推定法）
  purchaseCost: number       // grandTotalCost（在庫法）or inventoryPurchaseCost（推定法）
  openingInventory?: number | null
  closingInventory?: number | null
  costInclusion?: number     // 原価算入費（在庫法で事後控除、推定法は入力不要）
  method: 'inventory' | 'estimated'
  inclusionMode: 'before_cost_inclusion' | 'after_cost_inclusion'
  // 推定法固有
  discountRate?: number      // 売変率
  markupRate?: number        // 値入率
}
```

### 出力契約

```ts
type GrossProfitResult = {
  grossProfit: number
  grossProfitRate: number
  method: 'inventory' | 'estimated'
  inclusionMode: 'before_cost_inclusion' | 'after_cost_inclusion'
}

type GrossProfitMeta = {
  usedFallback: boolean
  source: 'inventory' | 'estimated'
  inclusionApplied: boolean   // 原価算入費が反映済みかどうか（監査用）
  rounding: { amountMethod: 'round'; amountPrecision: 0; rateMethod: 'raw' }
}
```

### 禁止事項

- 画面側で独自に gross profit を組み立てる
- `conditionSummaryUtils.ts` のように before/after を局所再実装する
- KPI が独自に fallback 規則を持つ

## 7. StoreResult の粗利関連フィールド（14フィールド）

### 計算結果（6フィールド）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| invMethodCogs | number \| null | 在庫法: 売上原価 |
| invMethodGrossProfit | number \| null | 在庫法: 粗利益（原価算入費前） |
| invMethodGrossProfitRate | number \| null | 在庫法: 粗利率（原価算入費前） |
| estMethodCogs | number | 推定法: 推定原価（原価算入費内包） |
| estMethodMargin | number | 推定法: 推定マージン |
| estMethodMarginRate | number | 推定法: 推定マージン率 |

### 予算・予測（8フィールド）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| estMethodClosingInventory | number \| null | 推定法: 推定期末在庫 |
| grossProfitBudget | number | 粗利額予算 |
| grossProfitRateBudget | number | 粗利率予算 |
| grossProfitBudgetVariance | number | 粗利予算差異 |
| grossProfitProgressGap | number | 粗利進捗ギャップ |
| requiredDailyGrossProfit | number | 必要日次粗利 |
| projectedGrossProfit | number | 粗利着地予測 |
| projectedGPAchievement | number | 粗利着地予測達成率 |

## 8. 2層構造: 計算層 vs 利用層

### 計算層（StoreResult 組み立て）

```
grossProfitBridge → invMethod / estMethod（Rust dispatch）
  ↓
storeAssembler → 両方法の結果を StoreResult に格納
  invMethodGrossProfit / invMethodGrossProfitRate
  estMethodMargin / estMethodMarginRate
```

- 在庫法と推定法を**両方とも独立に計算**して StoreResult に格納
- フォールバック選択は行わない（両方の結果を保持）
- grossProfitBridge は Rust/WASM の dispatch 層

### 利用層（表示・分析）

```
calculateGrossProfitWithFallback / grossProfitFromStoreResult
  → 在庫法が成立すれば在庫法、不足時は推定法にフォールバック
  → meta.usedFallback で使用方法を記録
```

- StoreResult から粗利を取り出す際のフォールバック規則を統一
- conditionSummaryUtils の4関数はこの層を経由済み
- 表示・KPI・分析は全てこの層を通す

### なぜ2層なのか

storeAssembler が `calculateGrossProfitWithFallback` を使うと、
StoreResult に `invMethodGrossProfit` と `estMethodMargin` の**両方を格納できない**。
StoreResult は両方法の結果を個別に保持する必要がある（詳細画面で在庫法/推定法を並べて表示するため）。

したがって:
- **計算層:** 両方法を独立に実行し StoreResult に格納（storeAssembler の責務）
- **利用層:** StoreResult から粗利を取り出す際にフォールバック規則を適用（calculateGrossProfit の責務）

### conditionSummaryUtils.ts（最初の置換対象）

| 関数 | 内容 | 正本化後の扱い |
|------|------|---------------|
| computeGpBeforeConsumable | getEffectiveGrossProfitRate のラッパー | calculateGrossProfit(before) に置換 |
| computeGpAfterConsumable | 在庫法は事後控除、推定法は同値 | calculateGrossProfit(after) に置換 |
| computeGpAmount | invMethodGrossProfit ?? estMethodMargin | calculateGrossProfit().grossProfit に置換 |
| computeGpAfterConsumableAmount | 在庫法は事後控除、推定法は同値 | calculateGrossProfit(after).grossProfit に置換 |

### getEffectiveGrossProfitRate（utils.ts）

- 在庫法→推定法のフォールバック
- `calculateGrossProfit()` に統合

## 9. ガード条件

- `calculateGrossProfit()` 以外で粗利を組み立ててはならない
- 新規の before/after ロジック追加は禁止
- fallback 規則は `calculateGrossProfit()` 内に集約
- presentation 層は結果の表示のみ
