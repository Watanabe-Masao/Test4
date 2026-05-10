# inquiry/01 — Existing Contract Assets

> **役割**: Phase 0 で確定すべき既存 contract 資産の棚卸 + 本 program 新 schema との配置関係 articulate。
>
> **scope**: `docs/contracts/` 配下の既存 JSON / schema 全件を listing し、本 program で新設する `docs/contracts/schema/` / `docs/contracts/src/` / `docs/contracts/generated/` との配置関係を確定する。
>
> **規約**: ADR-SCP-002（Document Contract は doc-registry.json の拡張層）に従う。`docs/contracts/aag/*.schema.json` は **触らない**。

## 1. 既存資産 listing（Phase 0 で完成）

### 1.1. `docs/contracts/` root 直下

| path | 役割 | 本 program での扱い |
|---|---|---|
| `docs/contracts/doc-registry.json` | references/ 配下の document registry（138KB） | Phase 5 で kind / temporalScope / requiredSections / forbiddenContent を additive 拡張 |
| `docs/contracts/principles.json` | design principles 9-letter taxonomy（58KB） | 本 program で touch しない |
| `docs/contracts/project-metadata.json` | app version / aag version triplet 等 | 本 program で touch しない（versionImpact は config/project.json 側で declare） |
| `docs/contracts/escalation-criteria.json` | escalation 判定 | 本 program で touch しない |
| `docs/contracts/test-contract.json` | CLAUDE.md Test Contract 正本 | 本 program で touch しない |

### 1.2. `docs/contracts/aag/` 配下（10 schemas、reposteward AAG contract）

| path | 役割 | 本 program での扱い |
|---|---|---|
| `docs/contracts/aag/aag-metadata.json` | AAG framework metadata（aagVersion 等） | 本 program で touch しない |
| `docs/contracts/aag/aag-parameters.schema.json` | AAG Parameters schema（reposteward Wave 1） | 本 program で touch しない |
| `docs/contracts/aag/aag-response.schema.json` | AAG response schema | 本 program で touch しない |
| `docs/contracts/aag/aag-size-statistics.schema.json` | size statistics schema | 本 program で touch しない |
| `docs/contracts/aag/detection-inventory.schema.json` | detection inventory schema | 本 program で touch しない |
| `docs/contracts/aag/detector-result.schema.json` | DetectorResult schema | 本 program で touch しない |
| `docs/contracts/aag/premise-contract.schema.json` | premise contract schema（reposteward Wave 5） | 本 program で touch しない |
| `docs/contracts/aag/source-facts.schema.json` | SourceFacts schema | 本 program で touch しない |
| `docs/contracts/aag/task-capsule.schema.json` | Task Capsule schema（reposteward Wave 1） | 本 program で touch しない |
| `docs/contracts/aag/commands/` | command metadata | 本 program で touch しない |

## 2. 本 program で新設する配置（Phase 0 で確定）

### 2.1. `docs/contracts/schema/` 配下（schema definitions、Phase 1 から landing）

| path | 役割 | landing phase |
|---|---|---|
| `docs/contracts/schema/aag-finding.schema.json` | Finding 共通 schema（id / severity / subject / problem / expected / suggestedDisposition） | Phase 1 |
| `docs/contracts/schema/tree-contracts.schema.json` | Tree Contract schema | Phase 1 |
| `docs/contracts/schema/doc-kind-registry.schema.json` | Document Kind Registry schema | Phase 1 |
| `docs/contracts/schema/document-contracts.schema.json` | Document Contract schema | Phase 1 |
| `docs/contracts/schema/temporal-scope-policy.schema.json` | Temporal Scope Policy schema | Phase 1 |
| `docs/contracts/schema/required-docs-matrix.schema.json` | Required Docs Matrix schema | Phase 7 |
| `docs/contracts/schema/artifact-coverage.schema.json` | Artifact Coverage schema | Phase 9 |
| `docs/contracts/schema/generated-artifacts.schema.json` | Generated Artifacts Registry schema | Phase 9 |
| `docs/contracts/schema/obligations.schema.json` | Obligations schema | Phase 8a |
| `docs/contracts/schema/required-reads.schema.json` | Required Reads schema | Phase 8a |
| `docs/contracts/schema/runner-parity.schema.json` | Runner Parity Contract schema | Phase 10 |

### 2.2. `docs/contracts/src/` 配下（YAML authoring source）

| path | 役割 | landing phase |
|---|---|---|
| `docs/contracts/src/repo/tree-contracts.yaml` | Tree Contract 宣言 | Phase 3 |
| `docs/contracts/src/docs/doc-kind-registry.yaml` | Doc Kind Registry 宣言 | Phase 4 |
| `docs/contracts/src/docs/document-topology.yaml` | Document Topology 宣言（zone × kind の許可マトリクス） | Phase 4 |
| `docs/contracts/src/docs/document-contracts.yaml` | Document Contract 宣言 | Phase 5 |
| `docs/contracts/src/docs/document-reading-decisions.yaml` | Reading Pass 結果（human/AI authored） | Phase 2.5 |
| `docs/contracts/src/docs/temporal-scope-policy.yaml` | Temporal Scope Policy 宣言 | Phase 4 |
| `docs/contracts/src/docs/required-docs-matrix.yaml` | Required Docs Matrix 宣言 | Phase 7 |
| `docs/contracts/src/docs/ai-doc-template-rules.yaml` | AI Doc Template Rules 宣言 | Phase 6 |
| `docs/contracts/src/governance/artifact-coverage.yaml` | Artifact Coverage 宣言 | Phase 9 |
| `docs/contracts/src/governance/generated-artifacts.yaml` | Generated Artifacts Registry 宣言 | Phase 9 |
| `docs/contracts/src/governance/obligations.yaml` | Obligations 宣言（OBLIGATION_MAP migration） | Phase 8a |
| `docs/contracts/src/governance/required-reads.yaml` | Required Reads 宣言（PATH_TO_REQUIRED_READS migration） | Phase 8a |
| `docs/contracts/src/governance/runner-parity.yaml` | Runner Parity Contract 宣言 | Phase 10 |
| `docs/contracts/src/governance/exception-policy.yaml` | Exception Policy 宣言 | Phase 9 |

### 2.3. `docs/contracts/generated/` 配下（machine truth）

Phase 別 landing。Phase 1〜10 で順次 landing する generated JSON はすべて producer 宣言済みであり、ADR-SCP-008 例外条項により Reading Pass 対象外。

## 3. 配置関係の整合性（Phase 0 で確認）

- `docs/contracts/aag/` = reposteward AAG contract（既存、touch しない）
- `docs/contracts/schema/` = 本 program 新設 schema（並列配置、reposteward AAG contract と分離）
- `docs/contracts/src/` = 本 program YAML authoring source（新設）
- `docs/contracts/generated/` = 本 program machine truth（新設）

整合性確認項目（Phase 0 で完了）:

- [ ] `docs/contracts/aag/*.schema.json`（10 schemas）が本 program 期間中に touch されないことを git log で確認可能な状態にする
- [ ] `docs/contracts/schema/` 配下の新 schema が `docs/contracts/aag/` の既存 schema を参照しない（独立性確認）
- [ ] reposteward 側の `aagContractSchemaSyncGuard` 系 guard が本 program 新 schema を対象外として認識する（境界確認）
- [ ] doc-registry.json への additive 拡張が `references/04-tracking/recent-changes.generated.md` 系 generator の後方互換を破壊しない（inquiry/03 で詳細）

## 4. open questions

- Q1: `docs/contracts/aag/commands/` 配下の command metadata schema は本 program 対象 schema（command surface 拡張）として扱うか? → 暫定: 扱わない（reposteward Wave 5 の `aag docs instruction` 等は reposteward 側で landing、本 program は post-write validation tool のみ提供）
- Q2: `docs/contracts/aag/aag-metadata.json` の aagVersion update（+0.1）は本 program archive 時に実施する? → 暫定: yes、archive プロセスの「正本更新」step に含める（projectization-policy.md §6.2 整合）
- Q3: `docs/contracts/principles.json`（58KB、design principles）への参照は Document Contract の forbiddenContent / allowedContent で reference 可能にすべきか? → 暫定: yes、Phase 4 doc-kind-registry.yaml で `canonical-doc` allowedContent として `principles-reference` を articulate
