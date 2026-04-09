# 次セッション計画

## 前提: 現在のリポジトリ状態（2026-04-08 マージ後）

| 指標 | 現在値 | 目標 |
|------|--------|------|
| Hard Gate | **FAIL** (`docs.obligation.violations = 2`) | PASS (0) |
| Active-debt | 1 | 0 |
| Principle coverage | 42/50 (8 uncovered) | 50/50 |
| Allowlist active | 6 | 可能な限り削減 |
| totalCustomers 残 allowlist | ~7 entries | 0 |

## Priority 0: Hard Gate 修復（即対応）

`docs.obligation.violations = 2` が発生しているため、まず Hard Gate を PASS にする。

```bash
cd app && npm run docs:generate
cd app && npm run docs:check    # 差分ゼロ確認
cd app && npm run health:check  # Hard Gate PASS 確認
```

コミット + プッシュで CI を緑にする。

## Priority 1: Principle Coverage 拡充（8 原則）

principleRefs で未カバーの 8 原則にルールを追加する。

| 原則 | 内容 | 候補ルール |
|------|------|-----------|
| A4 | 契約は Domain 定義 | 既存ルールに principleRef 追加、または新ルール |
| A6 | load 3段階分離 | 新ルール（load/init/render 分離検出） |
| B2 | JS/SQL 二重実装禁止 | 既存 dualRun 系ルールに追加 |
| C4 | 描画純粋 | presentation 内の side-effect 検出 |
| D2 | 引数無視再計算禁止 | domain/calculations の不変条件強化 |
| E2 | 依存配列省略禁止 | eslint で検出済みなら principleRef のみ |
| F7 | View に raw 禁止 | presentation からの raw data import 検出 |
| H5 | visible-only は plan 宣言 | Screen Plan 関連ルール |

**方針:** 既存ルールへの principleRefs 追加を優先（新ルール追加は最小限）

## Priority 2: Active-debt 1→0

残り 1 件の active-debt allowlist エントリを解消する。

**対象:** `useCostDetailData` の useMemo builder extraction
- useMemo 内の大きな builder ロジックを純粋関数に抽出
- allowlist エントリを卒業（createdAt/graduated コメント付き）

## Priority 3: totalCustomers 移行完了

CustomerFact 正本化の残り ~7 allowlist entries を解消する。

**方針:**
- `toStoreCustomerRows()` / `extractPrevYearCustomerCount()` を使って
  StoreResult.totalCustomers → CustomerFactReadModel に移行
- 各 widget の mock に `makeReadModels()` を追加
- storeResultAnalysisInputGuard の allowlist を削減

## Priority 4: Design Principles 所有権移行（AAG v4.0 計画）

CLAUDE.md の設計原則（A1-Q4）を AAG が正式に所有する体制への移行を計画する。

**Phase 1: 調査**
- 現在の 50 原則の参照箇所を調査
- AAG ルール ↔ 原則の対応を完成させる（Priority 1 の結果を利用）

**Phase 2: 構造設計**
- `docs/contracts/principles.json` を AAG の正本として位置づけ
- CLAUDE.md は参照・要約のみ、詳細は AAG 文書群に委譲

**Phase 3: 実装**
- principleRefs の双方向リンク検証テスト
- 原則変更 → ルール影響分析の自動化

## Priority 5: Phase 5 残接続

AAG Phase 4-6 計画の残り作業:
- Pre-commit hook の slice 別サマリ改善
- Certificate renderer の fix hints 精度向上
- Discovery Review の制度化（月次チェックリスト）

## 検証手順

各 Priority 完了時:
1. `npm run test:guards` — ガードテスト通過
2. `npm run lint && npm run build` — 型チェック + lint
3. `npm run docs:generate && npm run docs:check` — health 更新
4. `npm run health:check` — Hard Gate PASS
5. コミット + プッシュ

## 見積もり

| Priority | 規模 | セッション数 |
|----------|------|-------------|
| P0 | Small | 同セッション内 |
| P1 | Medium | 1 |
| P2 | Small | 1 |
| P3 | Medium | 1-2 |
| P4 | Large | 2-3（計画 + 実装） |
| P5 | Medium | 1 |
