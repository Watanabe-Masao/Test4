# AI Instruction Pack (machine view)

> 機械生成。手で編集しない。authoring source = `docs/contracts/src/docs/ai-doc-template-rules.yaml`、
> generator = `tools/governance/build-ai-doc-instructions.mjs`。

- 生成: 2026-05-10T11:26:52.969Z
- generatedAtSha: `b5b9b49c8fd159a5e803db4767bf5f0016dea6cd`
- schemaVersion: `ai-doc-template-rules-v1`
- stage: `pre-articulate`

## Summary

- Total rules articulated: 20
- Total decision entries scanned: 398
- Total observed kinds: 20
- Rules with observations: 20
- Rules without observations: 0
- Unarticulated kinds in use: 0
- Unregistered DOC-FAIL-* in rules: 0

## Rules (sorted by observedCount desc)

### `canonical-doc`

**purpose**: domain knowledge / governance contract / architecture / business definition の正本。 他 doc から canonical reference される source-of-truth role。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 277
- **readers**: `主アプリ改修 AI / user`, `AAG framework 改修者 (= aag/ 配下の場合)`
- **requiredSections**: _(none)_
- **forbiddenContent** (2):
  - live task list (= projects/<id>/checklist.md に分離)
  - 完了済 work を未完了として articulate (= staleness 防止、Wave 2 で 3 例観測)
- **relatedFailurePatterns**: `DOC-FAIL-LOCATION-MISMATCH`, `DOC-FAIL-DUPLICATE-RESPONSIBILITY`, `DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE`, `DOC-FAIL-TEMPORAL-MIXING`, `DOC-FAIL-ARCHIVE-CONTENT-IN-CANONICAL`, `DOC-FAIL-UNEXPLAINED-CANONICAL`
- **examples** (4):
  - `references/01-foundation/gross-profit-definition.md`
  - `references/03-implementation/coding-conventions.md`
  - `aag/_internal/strategy.md`
  - `references/04-tracking/elements/calculations/CALC-001.md`
- **observedPathsSample** (5/277):
  - `references/04-tracking/ar-rule-audit.md`
  - `references/04-tracking/dashboards/README.md`
  - `references/04-tracking/frozen-list.md`
  - `references/04-tracking/open-issues.md`
  - `references/04-tracking/project-structure.md`
  - _...(+272 more)_

**additionalGuidance**:

> Wave 2 Reading Pass で 312 entries 観測 (= 78% of total)。最頻 kind。content drift (=
> staleness) を避けるため、外部 program completion / Phase 完遂後は速やかに rewrite。
> 

### `project-plan`

**purpose**: project の不可侵原則 + Phase 構造 + 判断基準を articulate。project の governance contract source。 AI_CONTEXT.md (= 入口) / HANDOFF.md (= 起点) / plan.md (= 原則) / phase-N/README.md (= phase entry) が同 kind。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 30
- **readers**: `後任 AI session`, `project 担当者`
- **requiredSections**: _(none)_
- **forbiddenContent** (2):
  - live task list (= checklist.md に分離)
  - 完了済 work を未完了として articulate (= staleness 防止)
- **relatedFailurePatterns**: `DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE`, `DOC-FAIL-TEMPORAL-MIXING`
- **examples** (3):
  - `projects/active/quick-fixes/AI_CONTEXT.md`
  - `projects/active/pure-calculation-reorg/plan.md`
  - `projects/active/aag-structural-control-plane/HANDOFF.md`
- **observedPathsSample** (5/30):
  - `projects/active/presentation-quality-hardening/AI_CONTEXT.md`
  - `projects/active/quick-fixes/AI_CONTEXT.md`
  - `projects/active/quick-fixes/HANDOFF.md`
  - `projects/active/quick-fixes/plan.md`
  - `references/04-tracking/aag-doc-audit-report.md`
  - _...(+25 more)_

**additionalGuidance**:

> HANDOFF.md は handoff role (= past + future の併記) のため governance-articulated mixed temporal。
> 'staleness' (= past を present として articulate) は避ける。Phase 完了後は速やかに反映。
> 

### `template-doc`

**purpose**: bootstrap 時 copy + customize 対象 = canonical source。filled-in active doc とは role が異なる (= 前者は bootstrap reference / 後者は project-specific filled artifact)。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 19
- **readers**: `AI session (= bootstrap 時)`, `user (= template review)`
- **requiredSections**: _(none)_
- **forbiddenContent** (1):
  - filled-in project-specific content (= active project 配下に置く)
- **relatedFailurePatterns**: `DOC-FAIL-DUPLICATE-RESPONSIBILITY`
- **examples** (3):
  - `projects/_template/AI_CONTEXT.md`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `references/03-implementation/promote-ceremony-template.md`
- **observedPathsSample** (5/19):
  - `projects/_template/AI_CONTEXT.md`
  - `projects/_template/DERIVED.md`
  - `projects/_template/checklist.md`
  - `projects/_template/decision-audit.md`
  - `projects/_template/derived/acceptance-suite.md`
  - _...(+14 more)_

**additionalGuidance**:

> identical copy を別 location に置くと DOC-FAIL-DUPLICATE-RESPONSIBILITY (= Wave 2 Batch 11 で
> taxonomy-v2 で 8 件観測)。canonical = projects/_template/、project-specific customize 必要時のみ
> copy + 編集。
> 

### `status-snapshot`

**purpose**: ある時点での state / readiness / promotion-readiness を articulate する snapshot。 観測前 + 観測後 entry/exit criteria を併記する場合は mixed temporal。

- **temporalScope**: `mixed`
- **referencePolicy**: `canonical-source`
- **observedCount**: 16
- **readers**: `AI session (= state 確認時)`, `user (= promotion approval 等の判断材料)`
- **requiredSections**: _(none)_
- **forbiddenContent** (1):
  - live task list (= status と task は別 kind)
- **relatedFailurePatterns**: `DOC-FAIL-LOCATION-MISMATCH`, `DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE`
- **examples** (2):
  - `references/04-tracking/promotion-readiness-correlation.md`
  - `references/04-tracking/engine-maturity-matrix.md`
- **observedPathsSample** (5/16):
  - `references/04-tracking/engine-maturity-matrix.md`
  - `references/04-tracking/engine-promotion-matrix.md`
  - `references/04-tracking/features-migration-status.md`
  - `references/04-tracking/promotion-readiness-correlation.md`
  - `references/04-tracking/quality-audit-latest.md`
  - _...(+11 more)_

**additionalGuidance**:

> promotion-readiness-* family のように observed + expected criteria を併記する場合、
> observed (= present/past) と criteria (= future) の articulate mixed temporal。
> project-bound snapshot は projects/active/<id>/ 配下が canonical location。
> 

### `project-inquiry`

**purpose**: Phase 0 投資調査記録 (= PRE-decision investigation、ADR への feeding source)。 decision-audit (= POST-decision lineage) と区別、inquiry → decision-audit feeding 関係 articulate。

- **temporalScope**: `mixed`
- **referencePolicy**: `canonical-source`
- **observedCount**: 8
- **readers**: `後任 AI session (= 過去調査 reference)`, `user (= 採用後の判断材料)`
- **requiredSections**: _(none)_
- **forbiddenContent** (1):
  - POST-decision lineage (= decision-audit.md に articulate)
- **examples** (2):
  - `projects/active/aag-structural-control-plane/inquiry/01-existing-contract-assets.md`
  - `projects/active/aag-structural-control-plane/inquiry/08-wave-restructuring.md`
- **observedPathsSample** (5/8):
  - `projects/active/aag-structural-control-plane/inquiry/01-existing-contract-assets.md`
  - `projects/active/aag-structural-control-plane/inquiry/02-existing-yaml-inventory.md`
  - `projects/active/aag-structural-control-plane/inquiry/03-doc-registry-extension-strategy.md`
  - `projects/active/aag-structural-control-plane/inquiry/04-self-check-substrate-sync.md`
  - `projects/active/aag-structural-control-plane/inquiry/05-obligation-migration-strategy.md`
  - _...(+3 more)_

**additionalGuidance**:

> inquiry/<NN>-<topic>.md format。numbered 順に landing。採用済 status を doc 冒頭に articulate
> (= governance-articulated past + 採用後 reference 役)。
> 

### `role-identity`

**purpose**: role の Identity layer (= 前提・価値基準・判断基準)。CLAUDE.md 4 層 governance model の Identity layer に対応。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 8
- **readers**: `AI session (= role consult 時)`, `human reviewer (= role boundary 確認)`
- **requiredSections** (4):
  - Identity (= role 名 + 守護対象)
  - 前提（所与の事実）
  - 価値基準（最適化する対象）
  - 判断基準（選択の基準）
- **forbiddenContent** (1):
  - 実行手順 (= SKILL.md に articulate)
- **examples** (2):
  - `roles/line/architecture/ROLE.md`
  - `roles/staff/documentation-steward/ROLE.md`
- **observedPathsSample** (5/8):
  - `roles/line/architecture/ROLE.md`
  - `roles/line/implementation/ROLE.md`
  - `roles/line/specialist/duckdb-specialist/ROLE.md`
  - `roles/line/specialist/explanation-steward/ROLE.md`
  - `roles/line/specialist/invariant-guardian/ROLE.md`
  - _...(+3 more)_

**additionalGuidance**:

> ROLE.md と SKILL.md は pair で role-bound governance contract を構成。pair の片方だけでは不完全。
> 

### `role-skill`

**purpose**: role の Execution layer (= 論理構造 + 方法論)。SKILL-N 構造 (= 因果関係 + 手順 + 出力テンプレート)。 CLAUDE.md 4 層 governance model の Execution layer に対応。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 8
- **readers**: `AI session (= role 実行時)`
- **requiredSections**: _(none)_
- **forbiddenContent** (2):
  - role identity (= ROLE.md に articulate)
  - claude-skill activation protocol (= 別 kind = claude-skill)
- **examples** (2):
  - `roles/line/architecture/SKILL.md`
  - `roles/staff/documentation-steward/SKILL.md`
- **observedPathsSample** (5/8):
  - `roles/line/architecture/SKILL.md`
  - `roles/line/implementation/SKILL.md`
  - `roles/line/specialist/duckdb-specialist/SKILL.md`
  - `roles/line/specialist/explanation-steward/SKILL.md`
  - `roles/line/specialist/invariant-guardian/SKILL.md`
  - _...(+3 more)_

**additionalGuidance**:

> filename だけでは role-skill か claude-skill か判定不可 (= governance contract で区別)。
> role-skill = roles/<tier>/<role>/SKILL.md の固定 location。
> 

### `project-checklist`

**purpose**: live task list 正本 (= project-checklist-governance contract)。required checkbox 集合。 collection mode は完了 [x] と open [ ] が併存 (= governance-articulated)。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 6
- **readers**: `AI session (= task 着手判断)`, `user (= progress 確認)`
- **requiredSections** (2):
  - AI 自己レビュー (= user 承認の手前)
  - 最終レビュー (user 承認)
- **forbiddenContent** (2):
  - judgment rationale (= plan.md に分離)
  - 不可侵原則 (= plan.md に分離)
- **relatedFailurePatterns**: `DOC-FAIL-TEMPORAL-MIXING`
- **examples** (2):
  - `projects/active/quick-fixes/checklist.md`
  - `projects/active/aag-structural-control-plane/checklist.md`
- **observedPathsSample** (5/6):
  - `projects/active/presentation-quality-hardening/checklist.md`
  - `projects/active/pure-calculation-reorg/checklist.md`
  - `projects/active/quick-fixes/checklist.md`
  - `projects/active/reposteward-ai-ops-platform/checklist.md`
  - `projects/active/taxonomy-v2/checklist.md`
  - _...(+1 more)_

**additionalGuidance**:

> checklist.md format guard が機械検証。AI 自己レビュー section + 最終レビュー section が
> finite project (= kind: project) の必須構造 (= project-checklist-governance §3.1)。
> collection kind の checklist は [x] 蓄積 OK (= governance-articulated feature)、かつ
> AI 自己レビュー / 最終レビュー section は **collection mode 例外** で不要 (= governance §3.1
> で articulate 済、projectizationPolicyGuard PZ-13 も isCollection() で skip)。
> post-write checker (= check-doc-postwrite.mjs) も同 exception で collection mode を skip。
> 

### `project-discovery-log`

**purpose**: project scope 外で発見した事項 / 改善 candidate / 詳細調査要事項を articulate (= DA-β-003 institute、 AAG 5 系統目: 発見蓄積)。projectizationPolicyGuard PZ-14 で機械検証 (= file 存在 + schema 軽量 check)。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 5
- **readers**: `後任 AI session (= scope 外 finding 引き継ぎ)`, `user (= post-archive 別 program 起動判断)`
- **requiredSections** (1):
  - priority
- **forbiddenContent** (2):
  - scope 内 task (= checklist.md に articulate)
  - judgment 履歴 (= decision-audit.md に articulate)
- **examples** (2):
  - `projects/active/presentation-quality-hardening/discovery-log.md`
  - `projects/active/reposteward-ai-ops-platform/discovery-log.md`
- **observedPathsSample** (5/5):
  - `projects/active/aag-structural-control-plane/discovery-log.md`
  - `projects/active/presentation-quality-hardening/discovery-log.md`
  - `projects/active/pure-calculation-reorg/discovery-log.md`
  - `projects/active/reposteward-ai-ops-platform/discovery-log.md`
  - `projects/active/taxonomy-v2/discovery-log.md`

**additionalGuidance**:

> discovery-log と decision-audit の役割分担を明確化:
> - discovery-log = scope 外発見 (= 未処理 inventory)
> - decision-audit = scope 内意思決定 (= lineage articulation)
> 

### `project-projectization`

**purpose**: AAG-COA 判定結果 articulate (= projectizationLevel + changeType + implementationScope + breakingChange + requiresLegacyRetirement + requiresGuard + requiresHumanApproval)。 projectization-policy.md governance contract に基づく。

- **temporalScope**: `mixed`
- **referencePolicy**: `canonical-source`
- **observedCount**: 5
- **readers**: `AI session (= bootstrap 時の judgment 確認)`, `user (= 重 project の approval gate)`
- **requiredSections** (2):
  - 判定結果
  - 判定理由
- **forbiddenContent** (2):
  - live task list
  - inline state articulation (= state は HANDOFF / decision-audit に分離)
- **examples** (2):
  - `projects/active/pure-calculation-reorg/projectization.md`
  - `projects/active/taxonomy-v2/projectization.md`
- **observedPathsSample** (5/5):
  - `projects/active/aag-structural-control-plane/projectization.md`
  - `projects/active/presentation-quality-hardening/projectization.md`
  - `projects/active/pure-calculation-reorg/projectization.md`
  - `projects/active/reposteward-ai-ops-platform/projectization.md`
  - `projects/active/taxonomy-v2/projectization.md`

**additionalGuidance**:

> projectization.flag (= breakingChange / requiresLegacyRetirement) が true の場合、対応する
> mandatory artifact (= breaking-changes.md / legacy-retirement.md) が要求される (= bidirectional
> governance contract、Wave 3 で機械検証 candidate)。
> 

### `project-promotion-proposal`

**purpose**: Promote Ceremony 提案書 (= AI scaffold draft + user 承認 form の二段 workflow)。 候補情報 + 推奨順序 + 観測 entry/exit criteria + 承認 form を articulate。

- **temporalScope**: `mixed`
- **referencePolicy**: `canonical-source`
- **observedCount**: 4
- **readers**: `user (= 昇格 approval)`, `AI session (= proposal status 確認)`
- **requiredSections** (1):
  - 候補情報
- **forbiddenContent** (1):
  - AI self-approval (= user signature only、不可侵原則)
- **examples** (1):
  - `projects/active/pure-calculation-reorg/phase-8/proposals/ANA-003-sensitivity.md`
- **observedPathsSample** (4/4):
  - `projects/active/pure-calculation-reorg/phase-8/proposals/ANA-003-sensitivity.md`
  - `projects/active/pure-calculation-reorg/phase-8/proposals/ANA-004-trendAnalysis.md`
  - `projects/active/pure-calculation-reorg/phase-8/proposals/ANA-007-dowGapAnalysis.md`
  - `projects/active/pure-calculation-reorg/phase-8/proposals/ANA-009-computeMovingAverage.md`

**additionalGuidance**:

> AI は提案者にとどまる (= user signature 承認 form を user が fill)。最終 promote 判断 = user 承認のみ。
> Promote Ceremony 整合の governance workflow。
> 

### `project-decision-audit`

**purpose**: L3 重判断 institute (= drawer Pattern 1 application、複数 Phase に跨る判断の lineage articulation)。 各 entry が 5 軸 (= status / context / decision / rationale / alternatives) + 観測点 + Lineage (judgementCommit + preJudgementCommit + retrospectiveCommit) + 振り返り判定。

- **temporalScope**: `mixed`
- **referencePolicy**: `canonical-source`
- **observedCount**: 2
- **readers**: `後任 AI session (= 過去判断 reference)`, `user (= 重判断 historical review)`
- **requiredSections**: _(none)_
- **forbiddenContent** (2):
  - live task list
  - scope 外 finding (= discovery-log.md に articulate)
- **examples** (2):
  - `projects/active/reposteward-ai-ops-platform/decision-audit.md`
  - `projects/active/aag-structural-control-plane/decision-audit.md`
- **observedPathsSample** (2/2):
  - `projects/active/aag-structural-control-plane/decision-audit.md`
  - `projects/active/reposteward-ai-ops-platform/decision-audit.md`

**additionalGuidance**:

> complexity-policy.md §3.4 + drawer Pattern 1 が governance contract source。Archive v2 で
> archive.manifest.json の decisionEntries に圧縮される。
> 

### `project-breaking-changes`

**purpose**: AAG-COA mandatory artifact (= projectization.breakingChange: true 宣言時の必須 doc)。 対象破壊的変更 + Phase + 撤退条件を articulate。

- **temporalScope**: `present`
- **referencePolicy**: `summary-pointer`
- **observedCount**: 2
- **readers**: `AI session (= 影響 scope 把握)`, `user (= breaking change approval)`
- **requiredSections** (1):
  - 対象破壊的変更
- **forbiddenContent** (1):
  - non-breaking change (= 別 kind)
- **examples** (2):
  - `projects/active/pure-calculation-reorg/breaking-changes.md`
  - `projects/active/taxonomy-v2/breaking-changes.md`
- **observedPathsSample** (2/2):
  - `projects/active/pure-calculation-reorg/breaking-changes.md`
  - `projects/active/taxonomy-v2/breaking-changes.md`

**additionalGuidance**:

> 正本 = plan.md。本 doc は AAG-COA 入口の summary。projectization.breakingChange: true との
> bidirectional governance contract (= Wave 3 で機械検証 candidate)。
> 

### `project-legacy-retirement`

**purpose**: AAG-COA mandatory artifact (= projectization.requiresLegacyRetirement: true 宣言時の必須 doc)。 撤退対象 + 撤退内容 + Phase + sunsetCondition を articulate。

- **temporalScope**: `present`
- **referencePolicy**: `summary-pointer`
- **observedCount**: 2
- **readers**: `AI session (= 撤退 scope 把握)`, `user (= retirement approval)`
- **requiredSections** (1):
  - 撤退対象
- **forbiddenContent** (1):
  - non-retirement change
- **examples** (2):
  - `projects/active/pure-calculation-reorg/legacy-retirement.md`
  - `projects/active/taxonomy-v2/legacy-retirement.md`
- **observedPathsSample** (2/2):
  - `projects/active/pure-calculation-reorg/legacy-retirement.md`
  - `projects/active/taxonomy-v2/legacy-retirement.md`

**additionalGuidance**:

> 正本 = plan.md。本 doc は AAG-COA 入口の summary。projectization.requiresLegacyRetirement: true
> との bidirectional governance contract。
> 

### `repo-entrypoint`

**purpose**: repo orchestration の最上位案内板。AI session が repo 全体に reach する starting point。 鉄則索引 + manifest pointer + 設計原則要約 + roles 連携 articulate を提供。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 1
- **readers**: `AI session (= 全 task の起点)`, `human user (= 補助的)`
- **requiredSections** (4):
  - プロジェクト概要
  - 設計原則 (= サマリ + drill-down link)
  - コーディング規約
  - 直近の主要変更 (= pointer to recent-changes.generated.md)
- **forbiddenContent** (2):
  - live task list (= projects/<id>/checklist.md に分離、project-checklist-governance 整合)
  - 静的数値 (= 件数 / 残数 / バージョン履歴 等は generated section に寄せる)
- **relatedFailurePatterns**: `DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE`, `DOC-FAIL-GENERATED-AS-MANUAL`
- **examples** (1):
  - `CLAUDE.md`
- **observedPathsSample** (1/1):
  - `CLAUDE.md`

**additionalGuidance**:

> CLAUDE.md は唯一の repo-entrypoint。新規 entrypoint doc 追加は Wave 3 以降の review window 経由
> で判断。drill-down は references/ family + roles/ family 経由で AI が必要な深さに reach 可能。
> 

### `archive-doc`

**purpose**: retired / past content の保管役。現在は valid でないが歴史的価値のため preserve される doc。

- **temporalScope**: `past`
- **referencePolicy**: `canonical-source`
- **observedCount**: 1
- **readers**: `human user (= 履歴調査時)`, `AI session (= 過去判断 reference)`
- **requiredSections**: _(none)_
- **forbiddenContent** (2):
  - live task list
  - present canonical claim (= 'これは現在の正本' 型表現は禁止)
- **relatedFailurePatterns**: `DOC-FAIL-ARCHIVE-CONTENT-IN-CANONICAL`
- **examples** (2):
  - `references/04-tracking/aag-doc-audit-report.md`
  - `references/04-tracking/authoritative-term-sweep.md`
- **observedPathsSample** (1/1):
  - `references/04-tracking/authoritative-term-sweep.md`

**additionalGuidance**:

> archive-doc は references/99-archive/ 配下が canonical location。それ以外の location に置く
> 場合は disposition: archive で move 提案を articulate。
> 

### `log-journal`

**purpose**: timeline 形式の event / decision / observation log。append-only で articulate される。

- **temporalScope**: `past`
- **referencePolicy**: `canonical-source`
- **observedCount**: 1
- **readers**: `AI session (= history navigation)`, `user (= 判断 history review)`
- **requiredSections**: _(none)_
- **forbiddenContent** (1):
  - past entry の retroactive 改変 (= append-only 原則)
- **examples** (1):
  - `references/04-tracking/recent-changes.generated.md`
- **observedPathsSample** (1/1):
  - `references/04-tracking/taxonomy-review-journal.md`

**additionalGuidance**:

> machine-generated log (= recent-changes.generated.md) と human-articulated journal は同じ kind
> だが、generated section は手編集禁止。
> 

### `generated-report`

**purpose**: 機械生成された current value report (= health metrics / project status / coverage / 等)。 手編集禁止、generator が re-emit する。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 1
- **readers**: `AI session (= current value 参照)`, `user (= 健全性確認)`
- **requiredSections**: _(none)_
- **forbiddenContent** (1):
  - 手編集 (= machine-generated only)
- **relatedFailurePatterns**: `DOC-FAIL-GENERATED-AS-MANUAL`
- **examples** (2):
  - `references/04-tracking/generated/architecture-health.generated.md`
  - `references/04-tracking/generated/document-failure-taxonomy.generated.md`
- **observedPathsSample** (1/1):
  - `references/04-tracking/generated/architecture-state-snapshot.md`

**additionalGuidance**:

> filename suffix '.generated.md' で機械検証 (= generatedFileEditGuard)。手編集は CI fail。
> 対応 generator は authoring source から re-emit する責務。
> 

### `project-sub-project-map`

**purpose**: umbrella project (Level 4) 固有の governance artifact (= sub-project 一覧 + 依存関係 articulate)。 umbrella から spawn した sub-project の status / changeType / scope を articulate。

- **temporalScope**: `present`
- **referencePolicy**: `summary-pointer`
- **observedCount**: 1
- **readers**: `AI session (= umbrella scope 把握)`, `user (= umbrella governance)`
- **requiredSections** (2):
  - sub-project 一覧
  - 依存関係
- **forbiddenContent** (1):
  - non-umbrella project (= Level 2/3 では不要)
- **examples** (1):
  - `projects/active/taxonomy-v2/sub-project-map.md`
- **observedPathsSample** (1/1):
  - `projects/active/taxonomy-v2/sub-project-map.md`

**additionalGuidance**:

> 正本 = plan.md §Interlock 仕様。本 doc は AAG-COA 入口の summary。projectizationLevel: Level 4
> (Umbrella) でのみ articulate。
> 

### `claude-skill`

**purpose**: Claude Code skill 定義 (= /<skill-name> で invoke される user-facing skill)。frontmatter + user-invocable + skill activation protocol を持つ。role-skill と区別 (= 後者は role の internal methodology、前者は user-invocable behavior pattern)。

- **temporalScope**: `present`
- **referencePolicy**: `canonical-source`
- **observedCount**: 1
- **readers**: `AI session (= skill activation 時)`, `user (= skill invocation)`
- **requiredSections**: _(none)_
- **forbiddenContent** (1):
  - role-internal methodology (= role-skill に articulate)
- **examples** (1):
  - `references/02-design-system/SKILL.md`
- **observedPathsSample** (1/1):
  - `references/02-design-system/SKILL.md`

**additionalGuidance**:

> frontmatter 必須 (= name + version + description + user-invocable)。SKILL.md という同名 file が
> role-skill (= roles/) と claude-skill (= 他 location) で role 異なる (= governance contract で区別)。
> 
