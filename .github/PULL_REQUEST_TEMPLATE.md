## 概要

<!-- 変更の目的と概要を記載 -->

## 変更種別

- [ ] feat: 新機能
- [ ] fix: バグ修正
- [ ] refactor: リファクタリング
- [ ] docs: ドキュメント
- [ ] test: テスト
- [ ] chore: ビルド・CI・依存関係

## 影響レイヤー

- [ ] Domain（計算ロジック）
- [ ] Application（hooks / stores / usecases）
- [ ] Infrastructure（DuckDB / storage / import）
- [ ] Presentation（components / pages）

## CI チェック

- [ ] `npm run lint` — エラー 0
- [ ] `npm run format:check` — 準拠
- [ ] `npm run build` — 型エラー 0
- [ ] `npm run build-storybook` — ストーリー健全
- [ ] `npx vitest run --coverage` — lines 55% 以上
- [ ] `npm run test:e2e` — 全シナリオ通過

## Taxonomy v2 チェック（責務軸 R:\* + テスト軸 T:\*）

> 詳細: 親 plan §OCS.3 / `references/03-guides/responsibility-taxonomy-operations.md` §6 / `references/03-guides/test-taxonomy-operations.md` §6

- [ ] `npm run taxonomy:check` — PASS（registry / interlock / cognitive load / origin / known vocabulary 全 hard fail 条件クリア）
- [ ] `npm run taxonomy:impact -- --base main --head HEAD` — affected R:tag / T:kind を確認（fail file が無い）
- [ ] high-risk タグ（新 R:tag / T:kind 追加 / 撤退 / Antibody Pair 変更 / Interlock 改訂）は review window で承認済（`references/02-status/taxonomy-review-journal.md` に対応 entry あり）
- [ ] 新規 file には `@responsibility R:*` + 対応 test に `@taxonomyKind T:*` が付与済（タグなし禁止）

## KPI 追加の場合（該当時のみ）

> 詳細: [references/extension-playbook.md](../references/03-guides/extension-playbook.md) セクション A

- [ ] `domain/calculations/` に計算関数を追加
- [ ] MetricId / MetricMeta を登録
- [ ] Explanation（L1/L2/L3）を実装
- [ ] `references/03-guides/metric-id-registry.md` を更新
- [ ] 不変条件テストを追加

## DuckDB クエリ追加の場合（該当時のみ）

> 詳細: [references/extension-playbook.md](../references/03-guides/extension-playbook.md) セクション B

- [ ] `references/01-principles/engine-responsibility.md` で責務重複がないことを確認
- [ ] SQL / Runner を実装
- [ ] チャートコンポーネントを追加
- [ ] パフォーマンス計測を実施

## Doc impact

> 変更がドキュメントに影響する場合はチェックし、対応してください。
> `documentConsistency.test.ts` が CI で整合性を検証します。

- [ ] ドキュメント影響なし
- [ ] README.md / CONTRIBUTING.md 更新
- [ ] CLAUDE.md 更新（設計原則・ルーティング・CI 等）
- [ ] roles/ 更新（ROLE.md / SKILL.md）
- [ ] references/ 更新（原則・ガイド・ステータス）
- [ ] docs/contracts/ 更新（principles.json / project-metadata.json）
- [ ] CHANGELOG.md 更新
- [ ] open-issues.md 更新

**パスベースの更新義務（該当する場合は確認必須）:**

| 変更パス | 確認すべきドキュメント |
|---|---|
| `.github/workflows/**` | CLAUDE.md CI セクション, CONTRIBUTING.md CI セクション |
| `roles/**` | CLAUDE.md ルーティング表 |
| `references/01-principles/**` | docs/contracts/principles.json |
| `app/package.json` (version) | docs/contracts/project-metadata.json, CHANGELOG.md |
| `wasm/**` | README.md, CONTRIBUTING.md（WASM ��提） |

## 禁止事項の確認

- [ ] コンパイラ警告を `_` や `eslint-disable` で黙らせていない
- [ ] 引数を無視して別ソースから再計算していない
- [ ] useMemo/useCallback の依存配列から参照値を省いていない
- [ ] domain/ に外部依存・副作用を持ち込んでいない
- [ ] UI が生データソースを直接参照していない

## AAG Change Impact（AAG 変更時のみ）

> 変更が AAG framework（rule / guard / KPI / health collector / architecture-rules.ts / app-domain/integrity / aag-* doc / projectization policy 等）に touch する場合は本 section を埋める。
> 対象範囲・記入要領: [`references/03-guides/aag-change-impact-template.md`](../references/03-guides/aag-change-impact-template.md)（Phase Q.M-1 deliverable）。
>
> AAG 変更でない場合は「該当なし」とだけ記載してこの section を畳んでください。

**Affected layer**（複数可）:
- [ ] Constitution（principles / 不変条件 / 設計原則）
- [ ] Schema（rule type / KPI schema / health JSON schema / project.json schema）
- [ ] Execution（guard test / health collector / pre-commit hook）
- [ ] Operations（allowlist / generated docs / obligation map / PR template）
- [ ] 該当なし（AAG 変更ではない）

**Affected artifacts**（該当のみ）:
- [ ] `app-domain/gross-profit/rule-catalog/base-rules.ts`（rule 定義）
- [ ] `app/src/test/guards/`（guard test）
- [ ] `tools/architecture-health/`（health metrics / collector）
- [ ] `references/02-status/generated/`（generated docs）
- [ ] `app-domain/integrity/`（整合性 domain primitives）
- [ ] `references/01-principles/aag-*` / `AAG_*.md`（AAG 正本 / 入口 doc）
- [ ] `docs/contracts/*.json`（doc-registry / principles / project-metadata 等の構造化正本）
- [ ] taxonomy（responsibility / test taxonomy registry）

**Risk**（該当のみ、なしなら「なし」と明記）:
- [ ] new Hard Gate を追加する（migration path 必須）
- [ ] new human approval 経路を導入する
- [ ] new generated artifact を導入する（drift 検証必須）
- [ ] new source of truth を導入する（既存正本との重複に注意）
- [ ] 既存 schema の breaking change（移行 PR 必須）
- [ ] Tier 0 rule の追加 / 変更（`AAG_CRITICAL_RULES.md` 更新必須）
- [ ] なし（additive、後方互換）

**Anti-bloat self-test**:
- [ ] この変更は何の事故を防ぐのか 1 文で答えられる
- [ ] 既存 guard / rule / doc では防げないことを確認した
- [ ] false positive リスクを検討した（該当時）
- [ ] 削除可能性を検討した（不要になったら sunset できる経路がある）
