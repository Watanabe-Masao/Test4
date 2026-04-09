# 次セッション計画

## 前提: 現在のリポジトリ状態（2026-04-09 実施後）

| 指標 | 実施前 | 実施後 | 目標 |
|------|--------|--------|------|
| Hard Gate | **FAIL** | **PASS** | PASS |
| Active-debt | 1 | **0** | 0 |
| Principle coverage | 42/50 | **50/50** | 50/50 |
| totalCustomers allowlist | 7 | **0** | 0 |
| Allowlist active | 6 | 5 | 可能な限り削減 |

### 完了済み（P0-P3）

- **P0:** docs:generate で Hard Gate 修復。原因: AAG v3.1.0 マージ後に docs:generate 未実行
- **P1:** 8原則の principleRefs を既存ルールに追加（全て guardTags に存在していた）
- **P2:** useCostDetailData の useMemo 9→2。transfer/costInclusion を sub-hook に分離
- **P3:** totalCustomers 7 allowlist 全解消。extractPrevYearCustomerCount を features/comparison に移動

## Priority 4: Design Principles 所有権移行（AAG v4.0 計画）

CLAUDE.md の設計原則（A1-Q4）を AAG が正式に所有する体制への移行を計画する。
P1 で 50/50 達成済みのため、Phase 1（調査）は実質完了。

**Phase 2: 構造設計**
- `docs/contracts/principles.json` を AAG の正本として位置づけ
- CLAUDE.md は参照・要約のみ、詳細は AAG 文書群に委譲

**Phase 3: 実装**
- principleRefs の双方向リンク検証テスト
- 原則変更 → ルール影響分析の自動化

## Priority 5: Phase 5 残接続

AAG Phase 4-6 計画の残り作業。

### 具体タスク

| タスク | 内容 | 規模 |
|--------|------|------|
| Pre-commit hook 改善 | slice 別のガード結果サマリを表示。現在は全体 PASS/FAIL のみ | Small（hook スクリプト修正） |
| Certificate fix hints | architecture-health-certificate.md の推奨アクションに具体的なファイルパスと修正手順を含める | Medium（collector/renderer 改修） |
| Discovery Review 制度化 | 月次チェックリストをテンプレート化。heuristic ルールの reviewPolicy.lastReviewedAt を更新するスクリプト | Medium（ツール + ドキュメント） |

### 検証手順の除外理由

`test:observation`（WASM 二重実行テスト）は以下の理由で P4-P5 の検証手順に含めない:
- P4-P5 は WASM モジュールに変更を加えない
- observation テストは WASM build artifact が必要で、CI の wasm-build ジョブが提供する
- ローカル検証では `test:guards` + `lint` + `build` + `docs:check` で十分

## 検証手順

各 Priority 完了時:
1. `npm run test:guards` — ガードテスト通過
2. `npm run lint && npm run build` — 型チェック + lint
3. `npm run docs:generate && npm run docs:check` — health 更新
4. `npm run health:check` — Hard Gate PASS
5. コミット + プッシュ

**注:** `test:observation` は WASM 変更がないため除外（上記「除外理由」参照）

## 見積もり

| Priority | 規模 | セッション数 | 状態 |
|----------|------|-------------|------|
| P0 | Small | — | **完了** |
| P1 | Medium | — | **完了** |
| P2 | Small | — | **完了** |
| P3 | Medium | — | **完了** |
| P4 | Large | 2-3（計画 + 実装） | 未着手 |
| P5 | Medium | 1 | 未着手 |
