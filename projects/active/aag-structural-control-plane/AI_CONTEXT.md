# AI_CONTEXT — aag-structural-control-plane

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Structural Control Plane — repo tree / document contract / temporal scope を AAG 統制下に置く（aag-structural-control-plane）

## Purpose

AAG を **guard collection** から **repository structural control plane** に進化させる。
具体的には以下を AAG 統制下に置く:

1. **repo tree の意味** — 親ディレクトリ境界 + 子ディレクトリ集合体の Tree Contract
2. **ドキュメントの型・粒度・記載範囲** — Document Kind Registry + Document Contract
3. **時間軸分離** — 製本 = 現在 / archive = 過去 / project = 未来 / generated report = 計算済み現在
4. **AI ドキュメント執筆** — Document Kind ごとの AI Instruction Pack（post-write validation）
5. **未管理 artifact の禁止** — Artifact Coverage Gate
6. **例外の所有者・理由・期限** — Exception Policy

合言葉は **Plan → Contract → Rule → Gate**。計画・意図・判断を YAML 宣言 → 正規化 JSON → Detector → pre-push / CI gate に変換する。

`reposteward-ai-ops-platform`（active、Wave 1〜5、Task Capsule + AAG Parameters + SourceFacts + DetectorResult を確立中）の **substrate を入力として消費する別動線**。reposteward が「AI navigation surface」を提供するのに対し、本 program は「repo structure / document / temporal の構造統制」を提供する。両者は scope と読者が異なるため独立 project として articulate する。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位 + ハマりポイント）
3. `projectization.md`（AAG-COA 判定 = L3 governance-hardening / requiresHumanApproval=true / nonGoals）
4. `plan.md`（不可侵原則 + Phase 0〜10 構造 + やってはいけないこと）
5. `checklist.md`（completion 判定の入力 — Phase 0 のみ ticked-out、Phase 1+ は landing 時に追記）
6. `decision-audit.md`（DA-α-000 進行モデル + ADR-SCP-001〜009 mapping）
7. `discovery-log.md`（scope 外発見の蓄積 inventory）
8. `inquiry/01〜06`（Phase 0 で確定すべき既存資産マッピング項目）
9. 必要に応じて `aag/_internal/strategy.md` / `architecture.md` / `evolution.md`（AAG 戦略 + 5 層構造 + 進化方針）
10. 必要に応じて `references/05-aag-interface/operations/project-checklist-governance.md` / `projectization-policy.md`（AAG Layer 4A 共通運用）
11. 必要に応じて `projects/active/reposteward-ai-ops-platform/AI_CONTEXT.md`（substrate 提供 program、Task Capsule / Parameters / SourceFacts / DetectorResult の入力）

## Why this project exists

**reposteward-ai-ops-platform の延長ではなく独立 project にする理由**:

- reposteward は **AI navigation surface** (= where-am-i / context / changed --explain / rule locate / detector refs / Task Capsule) の構築が主軸
- 本 program は **repo structural control** (= Tree Contract / Document Contract / Temporal Scope / Artifact Coverage / AI Doc Authoring) が主軸
- 両者は補完関係にあるが、scope と読者と進行 phase が異なる。同一 checklist に混ぜると「いま何の作業をしているか」が混線する（`project-checklist-governance.md` §0「1 project = 1 一貫した task scope」）
- reposteward が確立する Task Capsule / Parameters / SourceFacts / DetectorResult を **入力として消費** する後段 program として位置付け

**既存 active project と scope が混ざらない理由**:

- `reposteward-ai-ops-platform`: AI navigation command surface（substrate 提供） → 本 program はその上に structural contract を載せる別動線（消費側）
- `presentation-quality-hardening`: presentation 層テスト・E2E 強化 → 本 program は app/ 配下を touch しない（nonGoal）
- `pure-calculation-reorg`: domain/calculations 再編 → 本 program は業務 logic に触れない（nonGoal）
- `taxonomy-v2`: 責務軸 / テスト軸 vocabulary 運用 → 本 program は taxonomy を扱わず、tree / document / temporal の構造統制に focus
- `quick-fixes`: 単発 fix collection → 本 program は複数 phase（0〜10）/ 不可侵原則を独自に持つ / Reading Pass + Shadow Detection + Ratchet という長期戦が必要

## Scope

含む:

- **Tree Contract** — 親ディレクトリ境界宣言 + 子ディレクトリ集合体宣言（top-level + `app/src/{domain,application,infrastructure,presentation,features}` + `references/{01..99}` + `docs/contracts` + `aag` + `aag-engine` + `projects` + `tools` を Phase 1 MVP 対象）
- **Document Kind Registry** — `canonical-doc` / `domain-definition` / `implementation-guide` / `operation-protocol` / `project-plan` / `project-checklist` / `generated-report` / `archive-doc` / `index` / `ai-entrypoint` 等の文書型定義
- **Document Contract** — 既存 `doc-registry.json` を base registry とした拡張層（kind / temporalScope / requiredSections / forbiddenContent / owner / audience / granularity / lifecycle）
- **Temporal Scope Contract** — 製本 = 現在 / archive = 過去 / project = 未来 / generated report = 計算済み現在の機械検証
- **AI Document Instruction Pack** — Document Kind ごとの JSON 指示書生成（post-write validation 限定、pre-write 強制はしない）
- **Required Docs Matrix** — repo 構造から必要 doc を導出（feature-slice → feature-contract、wasm-module → calculation-contract、active-project → plan/checklist/handoff 等）
- **Artifact Coverage Gate** — 未管理 artifact 検出（Markdown / generated JSON / scripts / guard tests / schemas / fixtures）
- **Generated Artifacts Registry** — generated file の producer / sourceJson / manualEdit policy 宣言
- **Obligation / Required Reads YAML 移行** — 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS`（`tools/architecture-health/src/collectors/obligation-collector.ts`）の YAML authoring source 化（3 段階 shadow migration）
- **Runner Parity Contract** — pre-push / CI / npm scripts / aag-engine advisory checks の同期検証
- **Existing Documentation Reading Pass** — Phase 2.5、既存 Markdown を zone 単位で読み proposedKind / temporalScope / disposition を確定
- **Finding-first migration** — Schema → Inventory → Reading Pass → Shadow → Triage → Declaration → Ratchet → Gate

含まない（詳細 nonGoals は `projectization.md` §4 / `config/project.json` `projectization.nonGoals`）:

- app/src/ 配下の touch
- 業務 logic / domain calculations / readModels の変更
- 既存 `doc-registry.json` の置換（拡張のみ）
- 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` の即時切替（3 段階 shadow migration で慎重に）
- 既存 `references/99-archive/` への大量 docs 移動（Phase 5 Finding group PR で個別実施）
- AI 執筆の pre-write 強制（ADR-SCP-006: post-write validation のみ）
- Wave 1 milestone（reposteward Task Capsule v1）到達前の Hard Gate 追加
- 新規 YAML を AAG machine truth として採用（ADR-SCP-001: YAML は authoring source、generated JSON が machine truth）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/05-aag-interface/operations/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA 判定（Level / changeType / required artifacts） |
| `aag/_internal/strategy.md` | AAG 戦略 + 文化論 + AI 対話の根拠 |
| `aag/_internal/architecture.md` | AAG 5 層構造（本 program は Layer 2 Schema + Layer 3 Execution + Layer 4A System Operations を additive 拡張） |
| `aag/_internal/evolution.md` | AAG 進化方針 |
| `aag/_internal/source-of-truth.md` | 正本ポリシー（既存 doc-registry / calculationCanonRegistry / readModels の正本性は不変、本 program は上層 contract のみ） |
| `aag/CHANGELOG.md` | AAG version 履歴 + バージョンアップ判定基準（versionImpact field の根拠） |
| `projects/active/reposteward-ai-ops-platform/AI_CONTEXT.md` | substrate 提供 program（Task Capsule / Parameters / SourceFacts / DetectorResult を本 program が消費） |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` 正本（Phase 8 で YAML authoring source へ 3 段階移行） |
| `docs/contracts/doc-registry.json` | 既存 document registry（Phase 5 で kind / temporalScope / requiredSections を additive 拡張） |
| `docs/contracts/aag/*.schema.json` | 既存 AAG contract schema（本 program は同階層に新 schema を additive 追加、`docs/contracts/schema/` に集約再配置はしない = ADR-SCP-002） |
