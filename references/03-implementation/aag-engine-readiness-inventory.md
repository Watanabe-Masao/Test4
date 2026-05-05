# AAG Engine Readiness Inventory — engine 移行前 input 棚卸し

> **役割**: 将来 AAG governance を Go / Rust 等の他言語 engine に移す際に **engine
> が読む必要がある input boundary** を articulate する永続 doc。
>
> **位置付け**: `aag-engine-readiness-refactor` project Phase 1 deliverable。
> project archive 後も後続 engine 実装 project が **正本参照** として使用する。
>
> **scope**: input の棚卸し (= 5 分類 + 各 input の path / format / consumer /
> engine 移行考慮事項)。実 engine 実装 / detector pure 化 / fixture 整備は
> Phase 2 以降 + 別 project の所掌。
>
> **不可侵原則**: 本 inventory は **engine 実装に直接コードを書くため** の文書ではなく、
> 「engine は何を読むか」の boundary を articulate するためのもの (= 親 project
> 不可侵原則 1 整合)。

## 0. 目的と読者

### 目的

repo 内 AAG framework を engine (= Go / Rust / WASM 等) に部分移行することを将来検討する
場合に、**engine が input として読む必要がある artifact** を 5 分類で棚卸しし、
各 input の format / consumer / 移行考慮事項を articulate する。

### 読者

- **後続 engine 実装 project AI session** (= 本 inventory が engine MVP scope の入力になる)
- **AAG framework 改修者** (= AAG-internal change が engine input boundary に影響するか確認)
- **本 project (`aag-engine-readiness-refactor`) の Phase 2〜7 AI session** (= 各 Phase の対象範囲を本 inventory で確認)

### 非読者

- **主アプリ改修 user** (= 業務改修では本 doc を読む必要なし、AAG public interface は `references/05-aag-interface/` を参照)
- **app domain (calculation / presentation / domain) 改修者** (= app-specific guard は engine 化対象外、本 inventory scope 外)

## 1. 5 分類 overview

| 分類 | 物理 location | 形式 | engine 必要性 |
|---|---|---|---|
| A. Contracts | `docs/contracts/*.json` | structured JSON (canonical schema) | **必須** = engine が読む正本契約 |
| B. Generated artifacts | `references/04-tracking/generated/*.json` + `docs/generated/aag/*.json` | machine-generated JSON + human view markdown | **必須 (input)** + engine が一部生成も担う |
| C. Project lifecycle | `projects/active/*/` + `projects/completed/*/` (v1 + v2) | per-project config + ライフサイクル成果物 | **必須** = lifecycle 状態判定 |
| D. Rule source | `app-domain/gross-profit/rule-catalog/base-rules.ts` + project execution overlays | TypeScript module export | **engine MVP scope 外 (= consumer 参照のみ)** |
| E. Guard / collector source | `app/src/test/guards/**` + `tools/architecture-health/src/**` | TypeScript test + collector + renderer | **部分必須** = engine 化対象 (= 5 系統) と TS 残置 (= app-specific) を分離 |

### 3 状態問題 (= active / completed-v1 / completed-v2 圧縮)

engine が project lifecycle を読むとき、3 状態すべてで input が読める必要がある:

| 状態 | physical layout | 必須 input | engine 読み方 |
|---|---|---|---|
| **active** (= `projects/active/<id>/`) | full directory (= 7 file 標準セット + `config/`) | 全 file readable | `config/project.json` + `checklist.md` + `HANDOFF.md` + (L3 のみ) `decision-audit.md` を直接 read |
| **completed v1** (= `projects/completed/<id>/`、Archive v2 圧縮 **未**実施) | full directory のまま (= 圧縮前 schema) | 全 file readable | active と同じ read 経路、ただし `derivedStatus = completed` |
| **completed v2** (= `projects/completed/<id>/`、Archive v2 圧縮済) | `ARCHIVE.md` + `archive.manifest.json` + `config/project.json` の 3 file のみ | `archive.manifest.json` の `decisionEntries` / `commitLineage` / `compressedFiles` で active 期 lineage を read | `plan.md` / `checklist.md` 等は **物理存在しない** (= manifest の `restoreAllCommand` で復元可能だが engine は restore せず manifest を直接 read) |

> **engine readiness 観点の含意**: completed v2 圧縮済 project は active 期 file が物理存在しないため、engine は `plan.md` / `checklist.md` の存在を前提にした read を **してはならない**。`config/project.json` (= identification key として残置) と `archive.manifest.json` (= recovery + lineage metadata) の 2 file から lifecycle 情報を読む経路を engine input boundary として articulate する。

---

## 2. 分類 A: Contracts (`docs/contracts/*.json`)

repo 全体の **structured 正本** が集約された directory。engine が読む input の中で最も
stable (= schema 契約として固定) かつ format-clean (= 全 JSON、人間 prose の混入なし)。

| path | 役割 | engine 必要性 | 主 consumer (TS 側) |
|---|---|---|---|
| `docs/contracts/doc-registry.json` | references/ 配下 .md 全 path の構造化正本 (= references/README.md の view source) | **必須** = doc-registry validation, broken link detection | `tools/architecture-health/src/collectors/doc-collector.ts` + `app/src/test/guards/docRegistryGuard.test.ts` |
| `docs/contracts/escalation-criteria.json` | guard violation の escalation 判定基準 | 必須 (advisory output) | `tools/architecture-health/src/aag-response.ts` |
| `docs/contracts/principles.json` | 設計原則 9 カテゴリ (A-I + Q) の構造化正本 | 必須 (rule-to-principle binding) | `tools/architecture-health/src/collectors/architecture-debt-recovery-collector.ts` |
| `docs/contracts/project-archive.schema.json` | Archive v2 schema 契約 (= manifest 形式の正本定義) | **必須** = archive validation | `app/src/test/guards/archiveV2SchemaGuard.test.ts` |
| `docs/contracts/project-metadata.json` | app version triplet (= `package.json` / CHANGELOG / recent-changes) 同期正本 | 必須 (version drift detection) | `app/src/test/guards/projectStructureGuard.test.ts` |
| `docs/contracts/test-contract.json` | CLAUDE.md が要求する暗黙テスト依存の構造化宣言 | 必須 (CLAUDE.md ↔ guard 双方向検証) | `app/src/test/guards/testContractGuard.test.ts` + `tools/architecture-health/src/collectors/test-contract-collector.ts` |

### engine 移行考慮事項 (分類 A)

- **format clean**: 全 JSON、`$comment` field を除き machine-readable。Go / Rust の標準 JSON parser で直接読める。
- **schema 安定性**: `project-archive.schema.json` のように schema 自体が file として存在する input は engine validation の正本になる。
- **engine MVP に含める優先順位**: doc-registry.json + project-archive.schema.json + project-metadata.json (= 構造的 governance に直接関わる 3 件) を MVP scope 候補とする。

---

## 3. 分類 B: Generated artifacts

machine-generated な JSON (= 正本) と human view (= markdown) が並列で存在する。
engine は **JSON のみ** を input とし、markdown view を generation する責務は engine が
持つ場合と TS が持つ場合で分かれる (= 移行段階で articulate)。

### 3.1. AAG generated (`docs/generated/aag/*.json`)

| path | 役割 | engine 必要性 |
|---|---|---|
| `docs/generated/aag/merged-architecture-rules.json` | 全 architecture rule の merge 後正本 | **必須** = engine が rule 評価する場合の input |
| `docs/generated/aag/rule-index.json` | rule ID → metadata の index | 必須 |
| `docs/generated/aag/rule-by-topic.json` | topic → rule[] の逆引き | optional (consumer 経由生成) |
| `docs/generated/aag/rules-by-path.json` | path glob → rule[] の path-aware index | 必須 (path-routing rule evaluation) |

### 3.2. health / KPI generated (`references/04-tracking/generated/*.json`)

| path | 役割 | engine 必要性 |
|---|---|---|
| `references/04-tracking/generated/architecture-health.json` | 全 KPI 正本 (= hard gate / advisory / target / current 全集約) | **必須** = engine が KPI 計算を担う場合の output 先 |
| `references/04-tracking/generated/project-health.json` | project lifecycle 集約 (= active / completed / archived 件数 + checkbox 状態) | **必須** = engine が lifecycle 集約を担う場合の output 先 |
| `references/04-tracking/generated/architecture-state-snapshot.json` | architecture-state の現時点 snapshot (= 件数 + path 集合) | input + output 両義 |
| `references/04-tracking/generated/architecture-debt-recovery-remediation.json` | debt recovery KPI | input |
| `references/04-tracking/generated/build-parity-audit.json` | build parity 検証結果 | input |
| `references/04-tracking/generated/comparison-semantics-audit.json` | 比較 semantics audit 結果 | input |
| `references/04-tracking/generated/content-graph.json` | content (KPI / spec) graph | input |
| `references/04-tracking/generated/content-spec-health.json` | content spec health | input |
| `references/04-tracking/generated/query-access-audit.json` | query access pattern audit | input |
| `references/04-tracking/generated/taxonomy-health.json` | taxonomy v2 health | input |
| `references/04-tracking/generated/test-signal-baseline.json` | test signal baseline (= TSIG / 後継 v2 baseline) | input |

### 3.3. human view (markdown)

`*.generated.md` 形式で各 JSON の view が生成される (= `architecture-health.generated.md` /
`project-health.generated.md` / 等)。**手編集禁止** (`generatedFileEditGuard.test.ts` で機械検証)。

### engine 移行考慮事項 (分類 B)

- **input vs output の二重性**: `architecture-health.json` 等は engine が **生成する** ものでもあり、後続 KPI 計算の **input にもなる**。engine MVP では `[input only]` から始め、生成側は後続 phase。
- **生成 artifact の手編集禁止規約**: engine が再生成するときに staleness 検出 (= committed JSON と live recalc の diff) を hard gate にする mechanism (`docs:check`) を engine も再現する必要がある。
- **markdown view 責務**: `*.generated.md` の生成は **renderer 責務** (= 分類 E §5.3 参照)。engine MVP scope では JSON 出力に限定し、markdown rendering は TS 側に残す選択肢が現実的。

---

## 4. 分類 C: Project lifecycle

repo 内 project の状態 (= active / completed / archived) を engine が判定するための input。
**3 状態問題** (§1 参照) を踏まえた read 経路を articulate する。

### 4.1. Active project input (`projects/active/<id>/`)

| path pattern | 役割 | engine 必要性 |
|---|---|---|
| `projects/active/<id>/config/project.json` | project identification + projectization metadata | **必須** = lifecycle 判定 entry point |
| `projects/active/<id>/checklist.md` | required checkbox 集合 (= completion 判定の唯一入力) | **必須** = `derivedStatus` 計算 (`projectCompletionConsistencyGuard`) |
| `projects/active/<id>/AI_CONTEXT.md` | project 意味空間 entry | optional (= reader hint) |
| `projects/active/<id>/HANDOFF.md` | 後任者 entry + 現在地 + 次の作業 | optional |
| `projects/active/<id>/plan.md` | 不可侵原則 + Phase 構造 | optional |
| `projects/active/<id>/projectization.md` | AAG-COA 判定結果 (= projectization metadata と同期) | optional (drift 検証用) |
| `projects/active/<id>/discovery-log.md` | scope 外発見蓄積 (L2+ 必須) | optional |
| `projects/active/<id>/decision-audit.md` | DA-α / DA-β entry の lineage articulation (L3 のみ) | optional (= retrospective parity 検証用) |
| `projects/active/<id>/aag/execution-overlay.ts` | project 固有 AAG rule overlay | 部分必須 (= rule overlay engine 評価) |

### 4.2. Completed v1 project input (`projects/completed/<id>/` 圧縮**未**実施)

active と同じ file セットが残置される。**physical layout は active と同じ**。
engine は `config/project.json` の `status: "archived"` を見て completed を判定する。

### 4.3. Completed v2 project input (`projects/completed/<id>/` Archive v2 圧縮済)

| path | 役割 | engine 必要性 |
|---|---|---|
| `projects/completed/<id>/config/project.json` | identification key として残置 (= AAG project-checklist-collector の lookup key) | **必須** |
| `projects/completed/<id>/ARCHIVE.md` | human-readable summary (= 完遂内容 / archive 経緯 / restore 手順 / 関連) | optional (reader hint) |
| `projects/completed/<id>/archive.manifest.json` | machine-checkable recovery metadata (= 13 field schema) | **必須** = lineage / DA / commit history の唯一 input |

`archive.manifest.json` の主要 field (= engine input 観点):

| field | 役割 |
|---|---|
| `archiveVersion: 2` | v1 / v2 判別の sentinel |
| `projectId` / `title` | identification |
| `archivedAt` | 完遂時点 |
| `preCompressionCommit` | 圧縮直前 SHA (= restore base) |
| `deletedPaths` | 圧縮で削除された path 集合 |
| `compressedFiles` | 削除前 file の summary (= path / lineCount / summary) |
| `restoreAllCommand` | 全 file 復元 1-line bash command |
| `decisionEntries` | DA entry の圧縮形 (= id + title + commitSha) |
| `commitLineage` | 各 Phase の commit history (= phase + commitSha + subject) |
| `relatedPrograms` | parent / sibling / child program 関係 |
| `compressionRationale` | 圧縮判断の articulation |

### 4.4. 現在の repo 統計 (= 2026-05-04 時点 snapshot)

> **注**: 件数は時系列で変化する (`project-health.json` を参照すべき)。本 inventory では schema の articulation のみ。

- active project: 5 (= `presentation-quality-hardening` / `pure-calculation-reorg` / `taxonomy-v2` / `quick-fixes` / `aag-engine-readiness-refactor` 本 project)
- completed (v1 + v2): 39 (= うち v2 圧縮済は 3 件 = `aag-self-hosting-completion` / `aag-platformization` / `operational-protocol-system`)

### engine 移行考慮事項 (分類 C)

- **3 状態の lookup 統一**: engine は `config/project.json` (= 全 3 状態で必ず存在) を entry point にし、active なら `checklist.md` を、completed v2 なら `archive.manifest.json` を読む routing を持つ必要がある。
- **plan.md / checklist.md が物理存在しない前提**: completed v2 では `restoreAllCommand` で復元可能だが、engine は restore せず manifest を直接 read する設計を default にする (= read-only engine)。
- **`kind: "collection"` project の特殊扱い**: `projects/active/quick-fixes/config/project.json` は `kind: "collection"` で `derivedStatus = collection` 固定 (= completed にならない)。engine も同 kind を special-case で handle する必要がある。

---

## 5. 分類 D: Rule source

architecture rule の TS source。**engine MVP scope 外** (= TS 側に残し、engine は merged JSON 経由で読む) が妥当。

| path | 役割 | engine 必要性 |
|---|---|---|
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | 全 architecture rule の TS 物理正本 (= consumer facade `app/src/test/architectureRules.ts` 経由) | **engine MVP scope 外** = 分類 B §3.1 の `merged-architecture-rules.json` 経由で engine が読む |
| `projects/active/<id>/aag/execution-overlay.ts` | project 固有 rule overlay (= scope-limited tuning) | 部分必須 (= overlay merge logic engine 化) |

### engine 移行考慮事項 (分類 D)

- **rule semantics は TS で維持** (= 親 project 不可侵原則 4「rule semantics を別言語に複製しない」)
- **engine は merged JSON のみ参照**: rule logic を Go / Rust に再実装すると drift origin になる。merged JSON (= `merged-architecture-rules.json`) を engine が input として読む routing が parity 維持の唯一経路。
- **execution overlay の merge 順序**: project-scoped overlay は base rule に対する scope-limited override。merge 順序は TS 側で固定し、merged JSON に articulation 済の状態を engine input にする。

---

## 6. 分類 E: Guard / collector source

`app/src/test/guards/**` + `tools/architecture-health/src/**` 配下の TS source。
本分類は **engine 化対象 (= 5 系統)** と **TS 残置 (= app-specific)** を分離する。

### 6.1. engine 化対象 (= 5 系統、本 project Phase 2〜6 で pure detector 抽出候補)

| 系統 | 主 guard / collector | engine 移行可能性 |
|---|---|---|
| **archive manifest 系** | `app/src/test/guards/archiveV2SchemaGuard.test.ts` + `docs/contracts/project-archive.schema.json` | **高** = JSON schema validation のみ |
| **project lifecycle 系** | `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` + `app/src/test/guards/projectStructureGuard.test.ts` + `tools/architecture-health/src/collectors/project-checklist-collector.ts` | **高** = checkbox 集計 + state derivation + path validation |
| **doc registry 系** | `app/src/test/guards/docRegistryGuard.test.ts` + `tools/architecture-health/src/collectors/doc-collector.ts` | **高** = path existence + registry-README symmetry |
| **generated artifact metadata 系** | `app/src/test/guards/generatedFileEditGuard.test.ts` + `tools/architecture-health/src/collectors/snapshot-collector.ts` | **中** = staleness detection (= committed vs recalc diff) |
| **schema validation 系** | `app/src/test/guards/projectizationPolicyGuard.test.ts` + `app/src/test/guards/projectDocStructureGuard.test.ts` + `app/src/test/guards/projectDocConsistencyGuard.test.ts` | **中** = projectization metadata schema 整合 |

### 6.2. TS 残置 (= app-specific、engine 化対象外、不可侵原則 5)

calculation / presentation / domain 系の guard はすべて TS 残置:

- `grossProfitConsistencyGuard.test.ts` / `factorDecompositionPathGuard.test.ts` / `piValuePathGuard.test.ts` / 他 calculation 系
- `presentationIsolationGuard.test.ts` / `pageMetaGuard.test.ts` / 他 presentation 系
- `purityGuard.test.ts` / `temporalScopeGuard.test.ts` / `dataIntegrityGuard.test.ts` / 他 domain / temporal / integrity 系

これらは **app domain 知識を必要とする** ため、engine 化すると app domain knowledge を engine 側に複製することになり、不可侵原則 5 違反。

### 6.3. tools/architecture-health/ の renderer 責務

`tools/architecture-health/src/renderers/*.ts` (= md / json / certificate / pr-comment / project-health / section-updater) は
**engine 化候補だが MVP では TS 残置** が現実的:

- markdown rendering は engine 側で再実装するコストが高く、parity test が複雑化する。
- engine MVP では JSON 出力までを scope とし、markdown view は TS renderer が引き続き責務を持つ。

### engine 移行考慮事項 (分類 E)

- **Vitest 密結合からの分離が前提**: §6.1 の 5 系統はすべて Vitest test として記述されており、`fs.readFileSync` 等を直接呼ぶ。engine 化前に **pure detector 抽出** が必須 (= 本 project Phase 6)。
- **DetectorResult 統一が前提**: §6.1 の各 guard が独自の error 形式を返すと engine parity test が書けない。**DetectorResult schema** を Phase 2 で導入し、§6.1 の 5 系統で共通使用する。
- **fixture corpus が前提**: §6.1 の各 guard を engine で再実装した parity test を書くには、pass / fail fixture が必要 (= 本 project Phase 5)。
- **collector の fs/glob 依存**: `tools/architecture-health/src/collectors/*.ts` は repo を直接 read するため、Phase 3 で collector / detector / evaluator / renderer を分離し、detector 部分のみを pure 化する。

---

## 7. engine MVP scope candidate (= Phase 7 readiness report での検討対象)

本 inventory を踏まえた **engine MVP scope 候補** (= Phase 7 で確定):

### MVP に含める

- 分類 A の 3 件 (= doc-registry.json / project-archive.schema.json / project-metadata.json)
- 分類 B の input 系 (= architecture-health.json / project-health.json read のみ、生成は TS 側)
- 分類 C の lifecycle 判定 logic (= 3 状態 routing + checkbox 集計)
- 分類 E の §6.1 5 系統のうち最低 3 系統 (= archive manifest / project lifecycle / doc registry)

### MVP に含めない

- 分類 B の生成側 (= KPI 計算 logic は TS 側に残す)
- 分類 D の rule semantics (= 不可侵原則 4)
- 分類 E §6.2 の app-specific guard (= 不可侵原則 5)
- 分類 E §6.3 の renderer (= markdown rendering parity が高コスト)

---

## 8. 関連文書

| 文書 | 役割 |
|---|---|
| `projects/completed/aag-engine-readiness-refactor/ARCHIVE.md` | 親 project の archive (= Phase 0〜7 完遂後 Archive v2 圧縮済、self-dogfood 4 件目)、本 inventory を Phase 1 deliverable として articulate した project の完遂記録 + engine readiness 要点 summary |
| `aag/_internal/architecture.md` | AAG 5 層構造 (= 本 inventory は Layer 3 Execution の input boundary articulation) |
| `aag/_internal/source-of-truth.md` | engine 移行で守るべき正本ポリシー |
| `docs/contracts/project-archive.schema.json` | 分類 A §2 + 分類 C §4.3 の schema 正本 |
| `references/05-aag-interface/operations/project-checklist-governance.md` | 分類 C §4 の lifecycle governance 正本 |
| `references/05-aag-interface/operations/projectization-policy.md` | 分類 C §4.1 の projectization metadata 正本 |
| `tools/architecture-health/src/` | 分類 E §6.3 の collector / renderer 物理 location |
| `app/src/test/guards/` | 分類 E §6.1 / §6.2 の guard 物理 location |
