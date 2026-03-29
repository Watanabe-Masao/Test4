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
1. **正本未定義**: 「仕入原価」に2つの異なる定義が混在（IN方向のみ vs 全方向）
2. **取得経路の分裂**: 同じ定義内でも3本の別クエリが別々に集計
3. **runtime 契約なし**: 型はあるが値の意味を runtime で検証していない

### 目的

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

| 定義 | ラベル | 移動の扱い | 用途 |
|------|--------|-----------|------|
| 定義A | 仕入原価（purchaseCost） | IN 方向のみ | 仕入分析ページ |
| 定義B | 総仕入原価（totalCost） | 全方向 | 在庫法・粗利計算 |

### 棚卸し結果

現在のコードベースで仕入原価に関わる取得経路は **34箇所**。
内訳: インフラ層11クエリ、KPI/比較ビルダー6関数、日別計算4関数、
表示層13コンポーネント。

---

## 3. 実施計画

### Phase 0: 仕入原価の正本定義 + Zod 契約（最優先）

**目的:** 仕入原価の意味を型と文書で固定し、runtime でも検証可能にする。

#### タスク

1. ~~仕入原価棚卸し表を作成~~ → 完了
2. ~~正式定義を文書化~~ → `purchase-cost-definition.md` 完了
3. **Zod スキーマで正本契約を定義**
   - `application/readModels/purchaseCost/PurchaseCostTypes.ts`
   - `PurchaseCostQueryInput` + `PurchaseCostReadModel`（意味メタデータ含む）
   - parse 方針: 正本 read は DEV/PROD とも `.parse()`（fail fast）
4. **唯一の read 関数を新設**
   - `application/readModels/purchaseCost/readPurchaseCost.ts`
   - `queryPurchaseDailyBySupplier` + `querySpecialSalesDaily` + `queryTransfersDaily` を統合
   - 1関数から KPI / カテゴリ / ピボットの全ビューを JS 集計で導出
5. **facade hook を新設**
   - `application/readModels/purchaseCost/usePurchaseCost.ts`
   - `useQueryWithHandler` 経由で `readPurchaseCost` を呼び出し
6. **既存の usePurchaseComparisonQuery を readPurchaseCost に切替**
   - Phase 1 KPI（高速表示）は維持、Phase 2 で readPurchaseCost に上書き

#### 修正対象ファイル

- 新規: `application/readModels/purchaseCost/PurchaseCostTypes.ts`
- 新規: `application/readModels/purchaseCost/readPurchaseCost.ts`
- 新規: `application/readModels/purchaseCost/usePurchaseCost.ts`
- 修正: `application/hooks/duckdb/usePurchaseComparisonQuery.ts`
- 修正: `application/hooks/duckdb/purchaseComparisonDaily.ts`
- 修正: `application/hooks/duckdb/purchaseComparisonCategory.ts`
- 修正: `application/hooks/duckdb/purchaseComparisonKpi.ts`

#### 完了条件

- 仕入原価の意味が Zod スキーマと文書で固定されている
- KPI / カテゴリ明細 / ピボットの合計が数学的に一致する
- 既存の一貫性テストがパスする

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

#### 3層防御

1. **import 経路ガード:** presentation 層が購買系クエリを直接 import していないこと
2. **集計経路ガード:** application 層で `readPurchaseCost()` 以外が cost/price 合計を組み立てていないこと
3. **旧 helper 利用ガード:** deprecated 化した旧関数の新規利用がないこと

#### 冗長クエリの統合

- `queryPurchaseTotal` → 廃止（dailyBySupplier の集計で代替）
- `queryPurchaseBySupplier` → 取引先名解決専用に限定

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
