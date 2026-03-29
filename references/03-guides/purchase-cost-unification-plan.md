# 仕入原価正本化 + 取得経路統合 計画書

## 1. 背景と目的

### 問題

仕入原価がページによって異なる値を示していた:

| ビュー | 値 | 原因 |
|--------|-----|------|
| 日別ピボット合計 | 29,116,541 | dailyBySupplier + special + transfers(IN) の日別集計 |
| カテゴリ明細合計 | 29,027,536 | bySupplier + special + transfers(IN) の取引先別集計 |
| 在庫法 総仕入原価 | 28,876,446 | classified_sales ベース、transfers は全方向 |

根本原因:
1. **移動原価の扱いが不統一**: 仕入分析は IN のみ、在庫法は全方向（IN + OUT）。移動 IN のみ加算すると二重計上が発生する（詳細は purchase-cost-definition.md §4）
2. **取得経路の分裂**: 同じ定義内でも3本の別クエリが別々に集計
3. **runtime 契約なし**: 型はあるが値の意味を runtime で検証していない

### 目的

- 移動原価を全方向（IN + OUT）に統一し、在庫法との整合性を確保する
- 仕入原価の意味を型・文書・runtime 契約で固定する
- KPI / カテゴリ / ピボットの合計を数学的に一致させる
- 正本以外の取得経路をガードで禁止し再発防止する

### 決定事項

- **TanStack Query は現時点では見送り** — 既存 QueryHandler / useQueryWithHandler / CQRS 境界と重複しやすく、local-first 前提での導入便益が限定的。この判断は TanStack Query 一般の有用性を否定するものではなく、当該コードベースの適合性を優先した結果
- **既存 query architecture を強化**する方が設計思想と整合する
- **Zod を正本契約に昇格**する（既に zod@^4.3.6 がインストール済み、現在は1ファイルのみで使用）

---

## 2. 正本定義

詳細は `references/01-principles/purchase-cost-definition.md` を参照。

### 要約

3つの独立正本（通常仕入・売上納品・移動原価）を複合正本として管理:

```
readPurchaseCost() → PurchaseCostReadModel
  ├→ purchase（通常仕入正本 — 帳合先別 × 日）
  ├→ deliverySales（売上納品正本 — 花・産直 × 日）
  └→ transfers（移動原価正本 — 全方向 × 日）

導出値:
  grandTotalCost       = purchase + deliverySales + transfers（在庫法・仕入分析共通）
  inventoryPurchaseCost = purchase + transfers（推定法用 — 売上納品を除外）
```

各計算スコープでの組み合わせ:

| スコープ | 通常仕入 | 売上納品 | 移動原価 | 原価算入費 |
|---------|---------|---------|---------|-----------|
| 在庫法 | ✅ | ✅ | ✅ 全方向 | 粗利計算時に加算 |
| 推定法 | ✅ | ❌ 除外 | ✅ 全方向 | 粗利計算時に加算 |
| 仕入分析 | ✅ | ✅ | ✅ 全方向 | 不要 |

**是正完了:** 仕入分析の移動を全方向に修正済み（2026-03-29）。

### 棚卸し結果

現在のコードベースで仕入原価に関わる取得経路は **34箇所**。
内訳: インフラ層11クエリ、KPI/比較ビルダー6関数、日別計算4関数、
表示層13コンポーネント。

---

## 3. 実施計画

### Phase 0: 仕入原価の正本定義 + Zod 契約（最優先）

**目的:** 仕入原価の意味を型と文書で固定し、runtime でも検証可能にする。

#### タスク

1. ~~仕入原価棚卸し表を作成~~ → 完了（34箇所特定）
2. ~~正式定義を文書化~~ → `purchase-cost-definition.md` 完了（複合正本構造）
3. ~~移動原価 IN のみフィルタを是正~~ → 完了（3箇所修正、全方向に統一）
4. ~~Zod スキーマで複合正本契約を定義~~ → 完了
   - `application/readModels/purchaseCost/PurchaseCostTypes.ts`
   - 3独立正本: `PurchaseCanonical` + `DeliverySalesCanonical` + `TransfersCanonical`
   - 複合正本: `PurchaseCostReadModel`（grandTotalCost + inventoryPurchaseCost 導出値）
   - parse 方針: 正本 read は DEV/PROD とも `.parse()`（fail fast）
5. ~~唯一の read 関数を新設~~ → 完了
   - `application/readModels/purchaseCost/readPurchaseCost.ts`（177行）
   - 3正本を並列取得 → `PurchaseCostReadModel.parse()` で runtime 検証
   - 変換ヘルパー `toPurchaseDailySupplierRows` / `toCategoryDailyRows` も提供
6. ~~facade hook を新設~~ → 完了
   - `application/readModels/purchaseCost/usePurchaseCost.ts`（65行）
   - `useQueryWithHandler` 経由で `purchaseCostHandler` を実行
7. ~~既存 usePurchaseComparisonQuery を readPurchaseCost に切替~~ → 完了
   - Phase 2 の6クエリ → 2回の `purchaseCostHandler.execute()` に統合
   - 旧経路の直接呼び出しを完全除去（後方互換なし）
   - 複合正本の `grandTotalCost` で KPI を上書き
8. ~~取得経路ガードテスト~~ → 完了
   - `test/guards/purchaseCostPathGuard.test.ts`（5テスト、3層防御）
   - Layer 1: import 経路（presentation → 旧クエリ禁止）
   - Layer 2: 集計経路（正当な集計元以外での独自集計禁止）
   - Layer 3: 複合正本一貫性（3正本取得 + 導出値 + 旧経路不在）

#### 成果物

| ファイル | 行数 | 責務 |
|---------|------|------|
| `PurchaseCostTypes.ts` | 107 | Zod 契約定義 |
| `readPurchaseCost.ts` | 177 | QueryHandler + 変換ヘルパー |
| `usePurchaseCost.ts` | 65 | facade hook |
| `index.ts` | 21 | バレルエクスポート |
| `purchaseCostPathGuard.test.ts` | 127 | 3層防御ガード（5テスト） |

#### 完了条件 → ✅ 全て達成

- ✅ 仕入原価の意味が Zod スキーマと文書で固定されている
- ✅ KPI / カテゴリ明細 / ピボットの合計が数学的に一致する
- ✅ 既存の一貫性テスト + 新規ガード（163テスト）がパスする
- ✅ 旧経路の直接呼び出しが完全除去されガードで保護されている

---

### Phase 1: Zod を取得境界に段階拡大

**目的:** runtime 型検証を高リスク境界から段階的に拡大する。

#### 適用順序

1. **Step 1:** purchase cost 系の DuckDB result のみ（Phase 0 で実現）
2. **Step 2:** 他の DuckDB QueryHandler result
   - 進行ゲート: purchase cost 正本 read が本番データで安定していること
3. **Step 3:** store hydration / backup / IndexedDB（周辺 I/O）

#### parse 方針

- 正本 read model 生成: `.parse()`（fail fast、DEV/PROD 共通）
- 探索系クエリ: `.safeParse()` + DEV ログ
- 周辺 I/O: `.safeParse()` + ログ

---

### Phase 2: 取得経路ガード

**目的:** 正本以外からの仕入原価 read を禁止し再発防止する。

#### ガードテスト（4層9テスト — 完了）

1. **import 経路ガード:** presentation 層が旧購買系クエリ8関数を直接 import していない
2. **集計経路ガード:** 正当な集計元以外で仕入原価の独自集計パターンがない
3. **正本一貫性ガード:** readPurchaseCost の3正本取得・導出値・旧経路不在
4. **正しい手続き保証:** KPI上書き・変換ヘルパー使用・正しい経由ルート

#### 冗長クエリの統合（完了）

- ~~`queryPurchaseBySupplier`~~ → **完全廃止**（`PurchaseSupplierRow` 型も削除）
  - `querySupplierNames` を新設（名前解決専用、SUM なし）
  - `buildSupplierAndCategoryData` を ReadModel ベースに全面書換え
- ~~`queryPurchaseTotal`~~ → **完全廃止**（`PurchaseTotalRow` 型も削除）
- ~~`querySpecialSalesTotal`~~ → **完全廃止**
- ~~`queryTransfersTotal`~~ → **完全廃止**
- ~~`computeKpiTotals`~~ → **完全廃止**
- 2段階表示（暫定KPI→正本上書き）を廃止。単一フェーズ×単一正本に統合

---

### Phase 3: widget orchestrator（別タスク）

**目的:** `widget-coordination-architecture.md` の Phase 3 を実装。規模が大きいため別タスク化。

---

## 4. 検証方法

```bash
# 全フェーズ共通
cd app && npm run build && npm test && npm run test:guards && npm run format:check

# 一貫性テスト（既に追加済み）
npx vitest run src/application/hooks/duckdb/usePurchaseComparisonQuery.test.ts

# 取得経路ガード（Phase 2）
npx vitest run src/test/guards/purchaseCostPathGuard.test.ts
```

---

## 5. リスクと対策

| リスク | 対策 |
|--------|------|
| 正本化前に共有してしまう | Phase 0 を必須化。定義書と Zod スキーマを先に固定 |
| Zod parse のパフォーマンス影響 | purchase cost 系で先に計測。問題なければ拡大 |
| 既存テストが大量に壊れる | readPurchaseCost の公開 API は既存と互換。内部実装の切替 |
| decimal.js の要否 | 現状の Math.round + 整数円は許容範囲。正本化後に再評価 |

---

## 6. 関連文書

- `references/01-principles/purchase-cost-definition.md` — 仕入原価の正本定義
- `references/01-principles/engine-boundary-policy.md` — Engine Boundary Policy
- `references/01-principles/data-flow.md` — データフロー4段階
- `references/03-guides/duckdb-architecture.md` — DuckDB Query Architecture
- `references/03-guides/widget-coordination-architecture.md` — Widget Orchestrator 計画
