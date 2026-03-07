# 実装計画: ビジネス用語定数化 + MetricMeta + 指標拡張

> 作成日: 2026-03
> 前提ドキュメント: `references/metric-id-registry.md`
> 管理: pm-business → architecture → implementation

---

## 1. 背景と課題

### 1a. ビジネス用語が定数管理されていない

`CustomCategory` が日本語文字列リテラル型で定義されている:

```typescript
// 現状: domain/models/Settings.ts
type CustomCategory = '市場仕入' | 'LFC' | 'サラダ' | '加工品' | '消耗品' | '直伝' | 'その他'
```

**影響:** リネーム時に126ファイルに波及。色マップ・UI選択・ストアが全て文字列に依存。

### 1b. MetricId レジストリの不足

~~現在25指標が登録済みだが、以下が欠落~~ → **解決済み: 81 MetricId が実装済み**

~~→ 目標 41 指標~~ → **実績: 81 指標（コード定義済み）/ 50 指標（レジストリ文書化済み）**

### 1c. MetricId に構造的分類がない

MetricId は安定した識別子として機能するが、指標のグルーピング・フィルタ・
売上⇔粗利の対称生成を行う手段がない。

→ `MetricMeta.tokens` で構造をメタデータ層に外付けする。

### 1d. 値入と粗利の混同リスク

推定法セクションで `estMethodMarginRate` を「マージン率」と呼んでいるが、
これは値入率から推定した粗利率であり、値入率そのものではない。
レジストリで「値入 ≠ 粗利」を明記済み。コード上のコメントも統一する。

### 1e. 売変タイプのハードコード

`causalChain.ts` で `'71'`〜`'74'` がリテラルで使用されている。
`DISCOUNT_TYPES` 定数は存在するが、全箇所で参照されていない。

---

## 2. 設計判断（確定済み）

### 2a. CustomCategory: enum + user: prefix 方式

```typescript
type PresetCategoryId = 'market_purchase' | 'lfc' | 'salad' | 'processed'
                      | 'consumables' | 'direct_delivery' | 'other'
type UserCategoryId = `user:${string}`
type CustomCategoryId = PresetCategoryId | UserCategoryId
```

- プリセットは固定 enum ID（削除不可）
- ユーザー作成分は `user:xxx` プレフィックス付き string
- ガード関数: `isPresetCategory()` / `isUserCategory()` / `isCustomCategoryId()`
- 既存データは `LEGACY_LABEL_TO_ID` マップで自動マイグレーション

### 2b. MetricMeta: tokens によるメタデータ分類

```typescript
interface MetricTokens {
  readonly entity: 'sales' | 'purchase' | 'cogs' | 'discount' | 'markup'
                 | 'gp' | 'inventory' | 'customer' | 'consumable'
  readonly domain: 'actual' | 'budget' | 'estimated' | 'forecast'
  readonly measure: 'value' | 'rate' | 'achievement' | 'progress'
                  | 'gap' | 'variance' | 'required' | 'average'
}

interface MetricMeta {
  readonly label: string
  readonly unit: MetricUnit
  readonly tokens: MetricTokens
  readonly storeResultField?: string
}
```

- ID は安定識別子（camelCase、意味を持ちすぎない）
- 構造はメタデータ（グルーピング・フィルタはトークンで）
- `entity`: 仕入（purchase）と売上原価（cogs）を分離
- `domain`: 在庫法→actual、推定法→estimated に正規化
- GAP値はトークン的性質（`measure: 'gap'`）を持つ

### 2c. GAP値の扱い

GAP値は「2つの関連指標の差」を取るパターン:
- 在庫差異GAP（domain をまたぐ: actual vs estimated）
- 客数GAP（時系列比較: 前年比同士の差）
- 予算進捗GAP（同一 entity 内: progress vs rate）

MetricId 個別登録とトークンクエリ動的算出の両方が可能。
実装段階で使用パターンに応じて決定。

---

## 3. 実装フェーズ

### Phase A: MetricMeta 型定義 + METRIC_DEFS 定数 ✅ 完了

**規模:** Small（1ファイル追加 + 1ファイル修正）
**前提:** なし（独立して実施可能）
**状態:** 完了（2026-03）。`Explanation.ts` に MetricTokens/MetricMeta 型、`metricDefs.ts` に 81 件の METRIC_DEFS が実装済み。

#### A-1. MetricTokens / MetricMeta 型を追加

**File:** `app/src/domain/models/Explanation.ts`

```typescript
// ─── MetricTokens ─────────────────────────────────────
export interface MetricTokens {
  readonly entity: 'sales' | 'purchase' | 'cogs' | 'discount' | 'markup'
                 | 'gp' | 'inventory' | 'customer' | 'consumable'
  readonly domain: 'actual' | 'budget' | 'estimated' | 'forecast'
  readonly measure: 'value' | 'rate' | 'achievement' | 'progress'
                  | 'gap' | 'variance' | 'required' | 'average'
}

export interface MetricMeta {
  readonly label: string
  readonly unit: MetricUnit
  readonly tokens: MetricTokens
  readonly storeResultField?: string
}
```

#### A-2. METRIC_DEFS 定数を追加

**File:** `app/src/domain/constants/metricDefs.ts` (NEW)

`metric-id-registry.md` の METRIC_DEFS テーブルをコード化。
既存25指標 + 新規16指標 = 41指標分のメタデータ。

```typescript
import type { MetricId, MetricMeta } from '../models/Explanation'

export const METRIC_DEFS: Readonly<Record<MetricId, MetricMeta>> = {
  salesTotal: {
    label: '総売上',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'actual', measure: 'value' },
    storeResultField: 'totalSales',
  },
  // ... 全41指標
} as const
```

#### A-3. barrel 更新

**File:** `app/src/domain/constants/index.ts` — `metricDefs` を export に追加

#### 影響ファイル

| ファイル | 変更 |
|---------|------|
| `domain/models/Explanation.ts` | MetricTokens, MetricMeta 型追加 |
| `domain/constants/metricDefs.ts` | **NEW** METRIC_DEFS 定数 |
| `domain/constants/index.ts` | barrel 更新 |

#### 検証

```bash
cd app && npm run build  # 型チェック通過
```

---

### Phase B: MetricId 型拡張 + budgetAnalysis 計算追加 ✅ 完了

**規模:** Medium（型変更 + 計算 + テスト）
**前提:** Phase A 完了
**状態:** 完了（2026-03）。81 MetricId が型定義済み。売上予算系 11 件は全て計算 + Explanation 実装済み。粗利予算系・仕入予算系の一部は MetricId 登録済み/計算未実装（`metric-id-registry.md` 参照）。

#### B-1. MetricId union 型を拡張

**File:** `app/src/domain/models/Explanation.ts`

追加する MetricId（16個）:

```typescript
// 売上予算系（6）
| 'budgetElapsedRate'
| 'budgetProgressGap'
| 'budgetVariance'
| 'projectedAchievement'
| 'requiredDailySales'
| 'averageDailySales'

// 粗利予算系（8）
| 'grossProfitBudget'
| 'grossProfitRateBudget'
| 'grossProfitBudgetAchievement'
| 'grossProfitBudgetVariance'
| 'grossProfitProgressGap'
| 'projectedGrossProfit'
| 'projectedGPAchievement'
| 'requiredDailyGrossProfit'

// 在庫差異・客数（2）
| 'inventoryGap'
| 'averageSpendPerCustomer'
```

#### B-2. BudgetAnalysisResult にフィールド追加

**File:** `app/src/domain/calculations/budgetAnalysis.ts`

```typescript
// 追加フィールド
readonly budgetProgressGap: number    // 消化率 − 経過率
readonly budgetVariance: number       // 累計実績 − 累計予算
readonly requiredDailySales: number   // 残余予算 / 残日数

// 計算
const budgetProgressGap = budgetProgressRate - budgetElapsedRate
const budgetVariance = totalSales - cumulativeBudget
const requiredDailySales = remainingDays > 0
  ? safeDivide(remainingBudget, remainingDays, 0) : 0
```

#### B-3. テスト追加

**File:** `app/src/domain/calculations/budgetAnalysis.test.ts`

| テストケース | 期待値 |
|------------|--------|
| `budgetProgressGap` 正 | 消化率 > 経過率のとき正値 |
| `budgetProgressGap` 負 | 消化率 < 経過率のとき負値 |
| `budgetVariance` | 実績 − 累計予算に一致 |
| `requiredDailySales` 残日数0 | 0を返す |
| `requiredDailySales` 正常 | 残予算 / 残日数に一致 |

#### B-4. Explanation 生成拡張

**File:** `app/src/application/usecases/explanation/ExplanationService.ts`

新規16 MetricId の Explanation 生成ロジック追加。
パターンは既存の `budgetAchievementRate` / `budgetProgressRate` に準ずる。

#### B-5. aggregateResults 対応

**File:** `app/src/application/usecases/calculation/aggregateResults.ts`

全店合計の `StoreResult` 構築時に新フィールドを正しく集約。

#### 影響ファイル

| ファイル | 変更 |
|---------|------|
| `domain/models/Explanation.ts` | MetricId に16項目追加 |
| `domain/calculations/budgetAnalysis.ts` | 3フィールド追加 + 計算 |
| `domain/calculations/budgetAnalysis.test.ts` | 5テストケース追加 |
| `application/usecases/explanation/ExplanationService.ts` | 16 Explanation 追加 |
| `application/usecases/calculation/aggregateResults.ts` | 新フィールド集約 |
| `domain/constants/metricDefs.ts` | 新MetricId分のメタデータ追加 |

#### 検証

```bash
cd app && npm run lint && npm run build && npm test
```

---

### Phase C: CustomCategory 定数化 ✅ 完了

**規模:** Medium（型変更 + マイグレーション + UI修正）
**前提:** なし（Phase A/B と独立して実施可能）
**状態:** 完了（2026-03）。`domain/constants/customCategories.ts` 実装済み。

#### C-1. 定数レジストリ作成

**File:** `app/src/domain/constants/customCategories.ts` (NEW)

`PresetCategoryId` / `UserCategoryId` / `CustomCategoryId` 型 + ガード関数 + 定数。
（詳細は「設計判断 2a」セクション参照）

#### C-2. Settings.ts を re-export に変更

**File:** `app/src/domain/models/Settings.ts`

```diff
- export type CustomCategory = '市場仕入' | 'LFC' | 'サラダ' | ...
- export const CUSTOM_CATEGORIES = [...] as const
+ export type { CustomCategoryId as CustomCategory } from '../constants/customCategories'
+ export { PRESET_CATEGORY_DEFS as CUSTOM_CATEGORIES } from '../constants/customCategories'
```

#### C-3. 既存データマイグレーション

**File:** `app/src/application/stores/settingsStore.ts`

`supplierCategoryMap` の値を旧ラベル → 新ID に自動変換する関数を追加。
ストア初期化（IndexedDB からの読込時）に適用。

#### C-4. Presentation 層の色マップ・UI 更新

| ファイル | 変更 |
|---------|------|
| `presentation/pages/Category/categoryData.ts` | 色マップキーを `PresetCategoryId` に |
| `presentation/pages/Category/CategoryPage.tsx` | select の value/label 分離 |
| `presentation/pages/Admin/AdminPage.tsx` | 同上 |
| `presentation/pages/CostDetail/CostDetailPage.tsx` | 同上（該当箇所があれば） |

#### 影響ファイル

| ファイル | 変更 |
|---------|------|
| `domain/constants/customCategories.ts` | **NEW** 定数レジストリ |
| `domain/models/Settings.ts` | re-export に変更 |
| `domain/constants/index.ts` | barrel に追加 |
| `application/stores/settingsStore.ts` | マイグレーション関数追加 |
| `presentation/pages/Category/categoryData.ts` | 色マップ変更 |
| `presentation/pages/Category/CategoryPage.tsx` | UI 修正 |
| `presentation/pages/Admin/AdminPage.tsx` | UI 修正 |

#### 検証

```bash
cd app && npm run lint && npm run build && npm test
```

動作確認:
- カテゴリ選択・表示が正常（ラベルが表示されること）
- 既存の `supplierCategoryMap` がマイグレーション後に正常動作
- 色マップが正しいカテゴリに適用されること

---

### Phase D: causalChain.ts ハードコード排除 ✅ 完了

**規模:** Small（1ファイル修正）
**前提:** なし（独立して実施可能）
**状態:** 完了（2026-03）。`DISCOUNT_COLOR_HINTS` 定数に統一済み。

**File:** `app/src/domain/calculations/causalChain.ts`

```diff
+ const DISCOUNT_COLOR_HINTS: Record<string, 'negative' | 'warning' | 'info' | 'secondary'> = {
+   '71': 'negative',
+   '72': 'warning',
+   '73': 'info',
+   '74': 'secondary',
+ }

- colorHint:
-   e.type === '71' ? ('negative' as const)
-   : e.type === '72' ? ('warning' as const)
-   : ...
+ colorHint: DISCOUNT_COLOR_HINTS[e.type] ?? ('secondary' as const),
```

#### 検証

```bash
cd app && npm run lint && npm run build && npm test
```

---

## 4. 実行順序とフェーズ依存関係

```
Phase A (MetricMeta型)     Phase C (CustomCategory)    Phase D (causalChain)
       │                          │                          │
       │ 独立                     │ 独立                     │ 独立
       ▼                          ▼                          ▼
Phase B (MetricId拡張)       (完了)                       (完了)
       │
       ▼
    (完了)
```

**推奨実行順:**
1. **Phase D** — 1ファイル、最小変更、即座にマージ可能
2. **Phase A** — 型定義のみ、既存コードへの影響なし
3. **Phase C** — CustomCategory 定数化、UI修正を含むが独立
4. **Phase B** — Phase A の型を前提に、計算+テスト+Explanation を追加

Phase A/C/D は並行実施可能。Phase B のみ Phase A に依存。

---

## 5. スコープ外

以下はこの計画の対象外。別タスクとして管理する。

| 項目 | 理由 |
|------|------|
| 126ファイルのリネーム | Phase C（CustomCategory 定数化）が先行条件 |
| ユーザー任意カテゴリ作成 UI | `user:xxx` 方式の基盤は Phase C で整うが、UI は別タスク |
| 粗利着地予測の Domain 層移行 | 現在 Presentation 層で計算中。Phase B で MetricId は用意するが、移行は別途 |
| DuckDB クエリの MetricId 統合 | DuckDB エンジンは別責務（`engine-responsibility.md` 参照） |
| 要因分解系の MetricId 化 | Shapley decomposition は `CausalChain` モデルが担う |

---

## 6. CI パイプライン確認

各 Phase 完了時に6段階ゲートを通過すること:

```bash
cd app && npm run lint           # ESLint エラー0
cd app && npm run format:check   # Prettier 準拠
cd app && npm run build          # tsc -b + vite build
cd app && npm run build-storybook # Storybook ビルド
cd app && npx vitest run --coverage # lines 55%
cd app && npm run test:e2e       # Playwright 全シナリオ
```
