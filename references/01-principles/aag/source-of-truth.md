# AAG Source of Truth — 正本 / 派生物 / 運用物 区分ポリシー

> **位置付け**: AAG architecture pattern の **Layer 2 reference doc** (governance-ops 縦スライス)。「何が正本か」を 1 枚で固定し、`docs:generate` の **派生物自動生成 mechanism** を articulate。
>
> **役割**: AAG 配下の各 file が **正本 / 派生物 / 運用物** のいずれに該当するかを articulate。手編集の許可 / 禁止を明確化し、`AAG-REQ-ANTI-DUPLICATION` (重複と参照の切り分け) を realize する mechanism doc。
>
> **drill-down pointer**:
> - 上位 (back-pointer): [`architecture.md`](./architecture.md) (5 層構造定義) / [`meta.md`](./meta.md) §2 (`AAG-REQ-ANTI-DUPLICATION`)
> - 下位 (drill-down): [`layer-map.md`](./layer-map.md) (各 file の層配置) / [`operational-classification.md`](./operational-classification.md) (now/debt/review)
>
> **5 層位置付け** (本 doc 自身): Layer 2 (設計 reference、governance-ops スライス)
>
> **§1.5 archive 前 mapping 義務**: 旧 `aag-5-source-of-truth-policy.md` の archive 前提は本 doc に「旧 → 新 mapping」が landed 済 (= 本 doc §5)。

## §1 3 区分の定義

| 区分 | 定義 | 手編集 | 変更時の義務 |
|---|---|---|---|
| **正本** (Source of Truth) | 他の情報の導出元になる唯一の情報源 | ✅ 許可 | 連鎖更新義務あり (`docs:generate` 実行 + obligation map に従う) |
| **派生物** (Derived) | 正本から自動導出される情報 | ❌ **禁止** | `docs:generate` 等で再生成 |
| **運用物** (Operational) | 人間と AI の手順書・進行管理 | ✅ 許可 | コード truth の後追い (truth より先走らない) |

## §2 正本一覧

### §2.1 Layer 0 + 1 の正本 (思想 + 要件)

| 正本 | file | 変更トリガー |
|---|---|---|
| AAG の why | [`meta.md`](./meta.md) §1 | 人間判断のみ、Constitution 改訂と同等の慎重さ |
| AAG-REQ-* 要件定義 | [`meta.md`](./meta.md) §2 (12 requirement) | 要件の追加 / 修正 / 廃止 (人間承認必須) |

### §2.2 Layer 2 の正本 (設計)

| 正本 | file | 変更トリガー |
|---|---|---|
| 5 層構造定義 + 旧 → 新 mapping | [`architecture.md`](./architecture.md) | 5 層 / 5 縦スライスの再定義 |
| 戦略マスター + 文化論 | [`strategy.md`](./strategy.md) | 戦略指針の改訂 |
| 進化動学 | [`evolution.md`](./evolution.md) | Discovery / Accumulation / Evaluation mechanism 改訂 |
| now / debt / review 区分 | [`operational-classification.md`](./operational-classification.md) | 運用区分の再定義 |
| ファイル別 5 層マッピング | [`layer-map.md`](./layer-map.md) | 新 file 追加時に inventory update |
| 設計原則 9 カテゴリ | `references/01-principles/design-principles.md` | 原則の追加 / 修正 / 廃止 |
| 意味分類ポリシー | `references/01-principles/semantic-classification-policy.md` | semanticClass / authorityKind 定義変更 |
| エンジン境界 | `references/01-principles/engine-boundary-policy.md` | 3 エンジン (Authoritative / Application / Exploration) 責務変更 |
| 業務値定義書 | `references/01-principles/*-definition.md` (sales / discount / customer / gross-profit ほか) | 業務値の計算方法 / 意味変更 |
| 正本化原則 | `references/01-principles/canonicalization-principles.md` (P1-P7) | 正本化原則改訂 |
| DFR registry | [`display-rule-registry.md`](./display-rule-registry.md) (Project C で landing) | DFR-NNN rule 追加 / 修正 |

### §2.3 Layer 2 + 3 境界の正本 (schema)

| 正本 | file | 変更トリガー |
|---|---|---|
| AR-rule 宣言的仕様 (consumer facade) | `app/src/test/architectureRules.ts` | rule の追加 / 修正 / 廃止 (consumer 経路のみ、物理正本は base-rules.ts) |
| AR-rule 物理正本 (BaseRule 配列) | `app-domain/gross-profit/rule-catalog/base-rules.ts` | rule entry 追加 / binding 記入 |
| Core 型定義 (`SemanticTraceBinding<T>` 等) | `app/src/test/aag-core-types.ts` | 型 family 追加 (Project B Phase 1) |
| RuleBinding 型定義 | `app/src/test/architectureRules/types.ts` | 型 field 追加 (Project B Phase 1) |
| 計算 Master Registry | `app/src/test/calculationCanonRegistry.ts` | 計算 file 追加 / 分類変更 |
| guard タグ定義 | `app/src/test/guardTagRegistry.ts` | タグ追加 / 意味変更 |
| 責務タグ定義 (v2) | `app/src/test/responsibilityTaxonomyRegistryV2.ts` | 責務タグ追加 (review window 経由) |
| テストタグ定義 (v2) | `app/src/test/testTaxonomyRegistryV2.ts` | テストタグ追加 (review window 経由) |
| AllowlistEntry 型 | `app/src/test/allowlists/types.ts` | 例外管理型変更 |
| 文書レジストリ | `docs/contracts/doc-registry.json` | 文書追加 / 廃止 |
| プロジェクトメタデータ | `docs/contracts/project-metadata.json` | WASM crate / CI 構成変更 |
| 原則メタデータ | `docs/contracts/principles.json` | 原則 ID + docRefs + implRefs |
| test-contract | `docs/contracts/test-contract.json` | CLAUDE.md test 契約変更 |

### §2.4 Layer 3 の正本 (実装)

| 正本 | file | 変更トリガー |
|---|---|---|
| guard 実装 | `app/src/test/guards/*.test.ts` | 検出 logic 変更 |
| allowlist データ | `app/src/test/allowlists/*.ts` (types.ts 以外) | 例外追加 / 削除 |
| Health ルール | `tools/architecture-health/src/config/health-rules.ts` | KPI 閾値変更 |
| アーキテクチャ監査 | `app/src/test/audits/*.test.ts` | 監査追加 / 修正 |
| WASM 観測テスト | `app/src/test/observation/*.test.ts` | 観測追加 / 修正 |

## §3 派生物一覧 (手編集禁止)

| 派生物 | 導出元 | 生成コマンド |
|---|---|---|
| `semanticViews.ts` の 3 View | `calculationCanonRegistry.ts` | テスト実行時に自動検証 |
| `references/02-status/generated/architecture-health.json` | guard + health tool | `npm run docs:generate` |
| `references/02-status/generated/architecture-health.md` | 同上 | 同上 |
| `references/02-status/generated/architecture-health-certificate.md` | 同上 | 同上 |
| `references/02-status/generated/project-health.json` | `projects/<id>/checklist.md` + config + AAG-COA | 同上 |
| `references/02-status/generated/project-health.md` | 同上 | 同上 |
| `references/02-status/generated/content-graph.json` | doc-registry + AAG core graph | 同上 |
| `references/02-status/generated/taxonomy-health.json` | taxonomy v2 registry + 適用状況 | 同上 |
| `references/02-status/generated/content-spec-health.json` | content-and-voice + 各種 spec | 同上 |
| `CLAUDE.md` の generated section | architecture-health.json | 同上 |
| `references/02-status/technical-debt-roadmap.md` の generated section | 同上 | 同上 |
| `references/02-status/project-structure.md` の generated section | 同上 | 同上 |
| ~~`references/99-archive/adaptive-architecture-governance.md` の `#aag-rule-stats`~~ | (Phase 5.8 で archive 移管後、generated section 経路を撤去 — archived doc は immutable historical reference のため自動生成 target に不適切。ルール統計は `CLAUDE.md` の `architecture-health-summary` + `architecture-health.md` に集約済) |

**鉄則**: 派生物に現在値を手書きしない。prose に件数を書かない (`docStaticNumberGuard` 適用)。

## §4 運用物一覧 (人間と AI の手順書・進行管理)

| 運用物 | file | 役割 |
|---|---|---|
| 案件起点文書 | `projects/<id>/HANDOFF.md` | 後任者が最初に読む |
| 案件 AI 入口 | `projects/<id>/AI_CONTEXT.md` | AI に最初に読ませる文脈 |
| 案件計画 | `projects/<id>/plan.md` | 案件固有の計画 + 不可侵原則 |
| 案件進行管理 | `projects/<id>/checklist.md` | progress truth (案件固有 verified LIVE 未着手項目のみ) |
| 案件 projectization | `projects/<id>/projectization.md` | AAG-COA 判定結果 |
| 案件 config | `projects/<id>/config/project.json` | 案件定義の構造化データ |
| AAG ガイド | `references/03-guides/*.md` | AAG 運用手順 (promote-ceremony / guard-consolidation / architecture-rule-system 等) |
| 直近の主要変更 | `references/02-status/recent-changes.md` | 各 doc の per-doc 履歴を集約 |
| 技術的負債 | `references/02-status/technical-debt-roadmap.md` (prose part) | 既知の負債 + ロードマップ |
| open issues | `references/02-status/open-issues.md` | active project 索引 |
| AI manifest | `.claude/manifest.json` | AI session の単一エントリ (discovery hint) |

## §5 旧 source-of-truth ポリシー → 新 mapping (`§1.5 archive 前 mapping 義務`)

旧 `aag-5-source-of-truth-policy.md` (旧 4 層 = Constitution / Schema / Execution / Operations) から新 5 層への mapping:

| 旧 4 層分類 | 新 5 層分類 |
|---|---|
| 思想の正本 (Constitution 層) | Layer 0 + 1 + Layer 2 (canonicalization + responsibility-separation スライス) — §2.1 + §2.2 |
| 型の正本 (Schema 層) | Layer 2 + 3 境界 (schema スライス) — §2.3 |
| 実行の正本 (Execution 層) | Layer 3 (実装) — §2.4 |
| 派生物 (4 層共通) | 派生物 (本 doc §3) — 自動生成 mechanism は不変 |
| 運用物 (Operations 4A + 4B) | 運用物 (本 doc §4) — 別 axis (System Operations / Project Operations) |

旧 doc 内 articulate のうち本 doc に inherit しなかった section は [`architecture.md`](./architecture.md) §4 (旧 4 層 → 新 5 層 mapping) に articulate 済。

## §6 obligation map (path → 更新義務)

正本変更時の連鎖更新義務 (`tools/architecture-health/src/collectors/obligation-collector.ts` の `PATH_TO_REQUIRED_READS`):

| 変更パス | 更新義務 |
|---|---|
| `app/src/test/allowlists/` | health regeneration (`docs:generate`) |
| `app/src/application/readModels/` | 定義書リンク確認 |
| `app/src/test/guards/` | health regeneration |
| `app/src/domain/calculations/` | calculationCanonRegistry 確認 |
| `.github/workflows/` | project-metadata.json 確認 |
| `wasm/` | setup docs 確認 |
| `references/01-principles/` | principles.json 確認 |
| `projects/` | project-health 再生成 + checklist format guard 通過 |

## §7 非目的 (Non-goals)

本 doc は次を **articulate しない** (= 別 doc の責務):

- **5 層構造定義** → [`architecture.md`](./architecture.md)
- **戦略 / 文化論** → [`strategy.md`](./strategy.md)
- **進化動学** → [`evolution.md`](./evolution.md)
- **ファイル別 5 層マッピング** (具体配置) → [`layer-map.md`](./layer-map.md)
- **now / debt / review 運用区分** → [`operational-classification.md`](./operational-classification.md)
- **件数 / 現在値** (= 派生物に集約) → `references/02-status/generated/architecture-health.md`

## §8 関連 doc

| doc | 役割 |
|---|---|
| [`architecture.md`](./architecture.md) | 5 層構造定義 (本 doc の上位) |
| [`meta.md`](./meta.md) | AAG Meta charter (Layer 0 目的 + Layer 1 要件) |
| [`layer-map.md`](./layer-map.md) | ファイル別 5 層マッピング (本 doc の §2-§4 と相補) |
| [`operational-classification.md`](./operational-classification.md) | now / debt / review 運用区分 (orthogonal axis) |
| [`README.md`](./README.md) | aag/ ディレクトリ index |
| `references/03-guides/architecture-rule-system.md` | AR-rule 運用ガイド |
| `projects/aag-core-doc-refactor/plan.md` | 本 doc を landing する project の plan |
