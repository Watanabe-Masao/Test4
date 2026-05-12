# AAG Framework 変更履歴（AAG CHANGELOG）

AAG framework (= Adaptive Architecture Governance) の version 単位の変更を記録します。
**app (粗利管理ツール) の変更は本 file scope 外** — repo root の `CHANGELOG.md` を参照。

## 役割分担 (= 3-tree boundary 整合、第二階層)

| 軸 | source of truth (file) | 構造化 source (JSON) | reader |
|---|---|---|---|
| **app** version | `CHANGELOG.md` (= repo root) | `docs/contracts/project-metadata.json` `appVersion` | 粗利管理 user-facing reader |
| **AAG** version | `aag/CHANGELOG.md` (= 本 file) | `docs/contracts/aag/aag-metadata.json` `aagVersion` | AAG framework reader |

> **bridge note (= AAG 5.x までの歴史)**:
> AAG 5.x (= AAG 5.1 / AAG 5.2) までの version 変更は repo root `CHANGELOG.md` の各 release section title 内 inline articulate されています (= v1.9.0 → AAG 5.1 / v1.10.0 → AAG 5.2)。
> これは 3-tree boundary 分離 (= aag-self-hosting-completion, 2026-05-04 完遂) 以前の articulation 形式であり、retroactive split は scope 外 (= 別 program `aag-changelog-historical-split` 起票候補)。
> **AAG 6.0 以降は本 file が canonical** (= 2026-05-06 aag-engine-go-mvp Phase 12 closure で institute)。

## バージョニングポリシー

[Semantic Versioning 2.0.0](https://semver.org/lang/ja/) を AAG framework 範囲で適用:

- **MAJOR** (X.0): paradigm shift (= 既存 governance mechanism の根本構造変更、rule semantics 移植 boundary 拡張、validator paradigm 変更等)
- **MINOR** (0.Y): 機能追加・改善 (= 新 detector / 新 guard / 新 governance protocol / 新 operational pattern 追加、後方互換あり)
- **PATCH** (= 採用しない、AAG 範囲では本質的に minor 以上の articulation を伴うため)

> **app version との独立**: AAG version は app/package.json `version` / `project-metadata.json` `appVersion` とは **完全独立** に進化。app user-facing 変更なしで AAG version 単独 bump 可能 (= 本 AAG 6.0 が 1 例目)。

## バージョンアップ判定基準 (= 計画段階で project ごとに declare、2026-05-06 institute、DA-α-014)

> **原則**: 「気をつけるではなく mechanism として運用」 (= AAG philosophy)。バージョンアップ判定は **project 着手段階** (= AAG-COA scope 検討と同 timing) で `config/project.json` の `versionImpact` field に declare。archive 移行時に `versionImpactGuard` (= 別 program `aag-version-impact-declaration-guard` で実装、本 MVP では schema + self-dogfood + criteria articulation のみ) が declared vs actual の整合を機械検証することで「未更新の AI 単独判断による看過」 を構造的に防止。

### 判定基準 table

#### app version (= 粗利管理 user-facing、semver X.Y.Z)

| level | delta 表記 | trigger |
|---|---|---|
| `none` | `+0.0.0` | user-facing app behavior 不変 (= calculation / UI / store / data shape 全て不変) |
| `patch` | `+0.0.1` | bug fix / docs only、behavior 不変 |
| `minor` | `+0.1.0` | 新機能 / 改善 (= backward-compatible) |
| `major` | `+1.0.0` | 破壊的変更 (= data format incompat / API removal / 撤去) |

#### AAG version (= AAG framework 自体、X.Y)

| level | delta 表記 | trigger |
|---|---|---|
| `none` | `+0.0` | AAG 構造変更なし (= 内部 refactor / dependency update のみ) |
| `minor` | `+0.1` | 新 detector / 新 guard / 新 governance protocol / 新 operational pattern (= backward-compatible) |
| `major` | `+1.0` | paradigm shift (= validator boundary 拡張 / source of truth 変更 / 不可侵原則 reformulation / 新 mechanism kind) |

### delta + baselineAtCreation snapshot 方式

declare 形式 (= `config/project.json` の `versionImpact` field):

```json
"versionImpact": {
  "app": {
    "baselineAtCreation": "<X.Y.Z>",
    "delta": "+<dx.dy.dz>",
    "rationale": "<判断根拠 1-2 文、本 §判定基準 table reference>"
  },
  "aag": {
    "baselineAtCreation": "<X.Y>",
    "delta": "+<dx.dy>",
    "rationale": "<判断根拠 1-2 文、本 §判定基準 table reference>"
  }
}
```

**並列 / out-of-order project への耐性 (= 絶対値 declare では判定狂う、user 直接 directive)**:

- 単純な絶対値 declare (= e.g., `targetVersion: "6.0"`) では他 project が先に bump した時に「自 project が contribute したか」 が判定不能
- delta + baselineAtCreation で:
  - **expectedTargetVersion** = `baselineAtCreation + delta` (= semver 加算) を archive 時に算出
  - 並列 project (= 同 baseline + 同 delta) → 同 expectedTargetVersion → CHANGELOG entry 1 つに複数 project が relatedPrograms で reference されれば全 PASS
  - sequential (= A 先完了で AAG 5.2 → 6.0 後、B が baseline 5.2 + delta `+0.1` で archive) → expected 5.3、CHANGELOG 5.3 entry を要求 (= 6.0 とは独立 entry articulate 必要)
  - out-of-order: A の expectedTarget 5.3 / B の expectedTarget 6.0 で B 先完了 → A の 5.3 entry は B の 6.0 entry 後に追加可能 (= 別 entry のため衝突なし)
- 競合 declare (= 同 baseline + 同 delta だが意味的に別 paradigm の 2 project) → expected 衝突を検出可能 → user 判断で baseline 再 snapshot or entry 統合

### 機械検証 logic (= versionImpactGuard、別 program で実装予定)

archive 移行 trigger (= active → archived):

1. `expectedTargetVersion` = `baselineAtCreation + delta` (semver 加算) を算出
2. CHANGELOG (= app or AAG) に `## [<expectedTargetVersion>]` 形式 entry が存在するか検証
3. 当該 entry の body or `relatedPrograms` で本 project ID が reference されているか検証
4. delta = none (= `+0.0.0` or `+0.0`) は entry / reference 検証 skip (= 判定対象外)
5. (1)〜(3) すべて satisfy → PASS、いずれか欠落 → hard fail

これにより:
- AI 自己 review 盲点による未更新の看過 → archive trigger で hard fail
- declare 段階の rationale が後続 audit で navigable (= 判断履歴の transparent 化)
- user の bump 判断 burden を archive 直前ではなく **計画段階** に前倒し

## [AAG 6.2] - 2026-05-11

### AAG Governance Ratchet-down (= aag-governance-ratchet-down umbrella + Sub-1/2/3 完遂、Sub-4 cancelled)

**minor**: AAG 6.1 (= aag-structural-control-plane) で **articulate 完成** した advisory infrastructure (= ai-doc-template-rules / required-docs-matrix / artifact-coverage / failure-pattern taxonomy) を **ratchet-down 実装に converted**。新 governance pattern や新 schema の追加なし (= articulate 完成済を実装に下ろす変換)、既存 advisory checker は不変、app/src/ business logic は不変。3 sub-program archive (= Sub-1/2/3) + 1 sub formally cancelled (= Sub-4) で closure 成立、umbrella + sub の Archive v2 圧縮 self-dogfood 4 件 landing。

- **Sub-1 (aag-coverage-rule-expansion)** — artifact-coverage rules 17 → 84 (= 67 new、unmanaged 86.2% → **0% 達成**、3704 tracked files 100% classified)。`docs/contracts/src/governance/artifact-coverage.yaml` + `tools/governance/check-coverage.mjs` baseline=0 ratchet-down (= 増加方向のみ advisory fail)。Archive v2 self-dogfood 5 件目

- **Sub-2 (aag-failure-pattern-guards)** — Failure Loop **6/6 guard candidates → guardrail-shadow stage 着地** (= CLAUDE.md G8 機械化実装最終段階)。6 patterns 統合 guard 採用 = `docDuplicateResponsibilityGuard` (= 1st、sha256 byte-comparison) + `docFailurePatternBaselineGuard` (= 残 5 patterns 統合、baseline 配列 ratchet-down)。`docs/contracts/src/docs/document-failure-taxonomy.yaml` 6 pattern articulate 正本。Archive v2 self-dogfood 6 件目

- **Sub-3 (aag-disposition-execution)** — Reading Pass 19/19 disposition の物理 execution (= archive 3 + move 12 + split 3 + generated-register 1)。`document-reading-decisions.yaml` 19 path 整合済 + `ar-rule-binding-protocol.md` move (= ar-rule-audit.md から split) + 3 reference docs split (= engine-maturity-matrix / engine-promotion-matrix / features-migration-status、DOC-FAIL-TEMPORAL-MIXING 解消) + architecture-state-snapshot generated-register rename。Archive v2 self-dogfood 7 件目

- **Sub-4 (aag-failure-pattern-maturity)** — **formally cancelled 2026-05-11** (= not-spawned、cancellation articulate のみで closure)。user 判断「spawn しない」+ Sub-2 6 guards shadow stage で観測期間継続、advisory 昇格は別 program で起票。再起動 trigger 3 条件 state-based articulate (= `projects/completed/aag-governance-ratchet-down/ARCHIVE.md` §umbrella 要点)。`aag-decision-traceability` 2026-05-01 cancellation precedent 整合 (= speculative concept への先回り program 化を回避)

- **Umbrella archive** — `aag-governance-ratchet-down` umbrella を Archive v2 圧縮で self-dogfood **8 件目** として archive。umbrella 特有 file `sub-project-map.md` (= 通常 7 file + 1 file) も圧縮対象、ARCHIVE.md §umbrella 要点 で parallel impl pattern + sub-PR landing pattern + ratchet-down baseline mechanism + Sub-4 deferred → cancelled rationale を後続 program 向け knowledge として permanent articulate

- **不可侵 (= 不可侵原則 7 件 全件 maintained)**:
  - 新 articulate を加えない (= aag-scp 完成 articulate を実装に converted)
  - 即 Gate 化禁止 (= 5 段階 maturity progression、AAG-SCP-DOC-LEARNING-002 整合)
  - AI 単独 vocabulary 改変禁止 (= AR-TAXONOMY-AI-VOCABULARY-BINDING 整合)
  - Sub-program 独立性 (= parallel impl 実証、`f0bfc39` で Sub-1 + Sub-2 1st guard 同時 landed)
  - Separate Program candidate 不侵食 (= Phase 8a/b/c + Phase 10 は reposteward 移譲、本 program 着手 0)
  - app/src/ 配下不変 (= business logic touch なし、test/guards/ 新 guard test のみ追加)
  - 既存 advisory checker 継続運用 (= aag-scp で landed の post-write / required-docs / coverage checker は不変)
  - 不可侵原則 8 (= 「実装 AI が完了承認しない」) 本義維持 (= user 代行 delegation で flip、aag-engine-readiness-refactor 2026-05-05 precedent 整合)

- **Failure Learning Loop 機械化実装の閉じる**:
  - AAG 6.1 Wave 2 で auto-promotion 2 例実証 (= guard candidates 4 → 5 → 6) → AAG 6.2 Sub-2 で 6/6 全件 guardrail-shadow 着地
  - 残り maturity progression (= shadow → advisory → enforced) は **観測期間ベース**、AAG 単独で自動昇格させない (= user judgment gate 維持)
  - CLAUDE.md G8 (= 同種 failure 観測 → guard 候補昇格) の articulate complete + 実装 complete

- **versionImpact**: app +0.0.0 (= app/ 配下 touch なし、app/src/test/guards/ + tools/governance/ + docs/contracts/ + references/ + projects/ のみ、Sub-2 の 2 新 guard test は AAG framework scope) / aag +0.1 (= 本 AAG 6.1 → 6.2 minor bump、advisory → ratchet-down guard 化 + artifact-coverage 100% coverage + Reading Pass 完遂)

## [AAG 6.1] - 2026-05-10

### AAG Structural Control Plane (= aag-structural-control-plane program 完遂)

**minor**: AAG framework に **Tree Contract / Document Contract / Temporal Scope / AI Document Instruction Pack / Required Docs Matrix / Artifact Coverage Gate** を additive に追加。reposteward-ai-ops-platform の Task Capsule / AAG Parameters / SourceFacts substrate を入力として消費し、その上に repo tree / document / temporal の 4 layer governance を articulate。後方互換あり (= 既存 TS guard / WASM detector に変更なし、新 schema + 新 generator + 新 advisory checker の追加のみ)。

- **Wave 1 (Schema MVP + Skeleton-aware Parse)**:
  - 3 新 schema landed (`aag-finding` / `tree-contracts` / `doc-kind-registry`)
  - structural-skeleton.yaml + Phase 2A〜2E (= structural skeleton declaration + repo topology parser + skeleton diff generator + managed-zone file-level inventories + top-level disposition articulation)
  - check-tree.mjs (= Tree Contract advisory checker)

- **Wave 2 (Document Reset Pass + Failure Learning Loop + Document Universe Index)**:
  - Reading Pass infrastructure (= document-reading-decisions schema + candidates generator + universe index)
  - Document Failure Taxonomy (= 11 patterns articulate、5 guard candidates auto-promote 達成 = DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE 16 + DOC-FAIL-LOCATION-MISMATCH 13 + DOC-FAIL-DUPLICATE-RESPONSIBILITY 8 + DOC-FAIL-TEMPORAL-MIXING 6 + DOC-FAIL-GENERATED-AS-MANUAL 5 + DOC-FAIL-STALE-DESCRIPTION 5)
  - Reading Pass 100% 完遂 (= 22 batches、398 docs articulate)
  - Phase 4 Document Kind + Temporal Scope Shadow checker landed

- **Wave 3 (Governance Migration)**:
  - Phase 6 AI Instruction Pack (= 20 Document Kind の AI 向け post-write validation guidance、不可侵原則 11 整合 = guidance であって命令書ではない)
  - Phase 7 Required Docs Matrix (= 5 target type rules、46 targets enumerate)
  - Phase 9 Artifact Coverage Gate (= 17 rules、3704 tracked files inventory、6 category 分類)

- **Cleanup work** (= Wave 2 → Wave 3 value chain 実証):
  - 3 stale docs rewrite (= protocols/README + aag/_internal/README + taxonomy-constitution)
  - 9 files delete (= taxonomy-v2 unfilled template duplicates 8 + quality-audit-latest 1)
  - 1 governance gap fix (= collection mode exception 3 段 articulate、machine ↔ doc drift fix)
  - 1 HANDOFF.md staleness fix (= post-Wave 3 sync、auto-promotion 2 例目 trigger)

- **Failure Learning Loop auto-promotion 2 例実証**:
  - Wave 2 Batch 11: DOC-FAIL-DUPLICATE-RESPONSIBILITY (0 → 8) で guard candidates 4 → 5
  - Wave 3 sub-PR 8: DOC-FAIL-STALE-DESCRIPTION (3 → 5) で guard candidates 5 → 6
  - → CLAUDE.md G8 (= 同種 failure 観測 → guard 候補昇格) の機械化実装が **2 例で再実証**

- **Generated artifacts (= 7 新 generated docs)**:
  - document-universe.generated.{json,md} (Wave 2)
  - document-failure-taxonomy.generated.{json,md} (Wave 2)
  - document-reading-candidates.generated.json (Wave 2)
  - ai-doc-instructions.generated.{json,md} (Wave 3)
  - doc-postwrite-findings.generated.md (Wave 3)
  - required-docs-matrix.generated.{json,md} (Wave 3)
  - artifact-coverage.generated.{json,md} (Wave 3)

- **不可侵 (= ADR-SCP-021 + AAG-SCP-DOC-LEARNING-002 + 不可侵原則 6 + 11 整合)**:
  - 即 Gate 化禁止 (= 全 sub-PR advisory only、hard gate 追加 0)
  - guidance であって命令書ではない (= AI session の自由度確保、pre-write 強制 mechanism なし)
  - 5 段階 maturity progression 維持 (= observed → pattern-articulated → guardrail-candidate-emitted → guardrail-shadow → guardrail-advisory)

- **versionImpact**: app +0.0.0 (= app/ 配下 touch なし、references/ + docs/contracts/ + tools/governance/ + projects/ のみ) / aag +0.1 (= 本 AAG 6.0 → 6.1 minor bump、6 新 governance subsystem 追加)

## [AAG 6.0] - 2026-05-06

### Read-Only Governance Engine (Go MVP)

**paradigm shift**: AAG framework に **外部 read-only governance validator** を導入。従来の TS-only guard 群 (= app-domain integrity / calculation / presentation / WASM AST guard 等) を **永続維持** しつつ、repo / governance / archive / lifecycle / metadata の 5 系統に対する **言語非依存 validator** (= Go 実装) を articulate。

- **Go module `aag-engine/`** 新設 (= 6 internal package = `cmd/aag` + `internal/contract` + `internal/detectors` + `internal/fixture` + `internal/report` + `internal/shadow`)
- **5 detector 移植完了** (= TS 側 detector の output parity 検証側として):
  - `archive-manifest` (= AR-ARCHIVE-MANIFEST-A2、12 required field 検出)
  - `doc-registry` (= AR-DOC-REGISTRY-D1、missing path 検出)
  - `schema-validation` (= AR-SCHEMA-VALIDATION-PZ2、projectization.level 範囲検出)
  - `project-lifecycle` (= AR-PROJECT-LIFECYCLE-C1、completed-not-archived 検出)
  - `generated-metadata` (= AR-GENERATED-METADATA-G2、stale metadata 検出、advisory CI 扱い)
- **3 CLI subcommand**: `aag validate` (= Phase 1 skeleton、real-repo dispatch は post-MVP) / `aag fixtures` (= fixture catalog 出力) / `aag shadow` (= 5 detector × 8 fixture = 40 parity 検証点を集約)
- **Fixture parity 100% 達成** (= 8 fixture すべてで TS captured output と Go 出力が field-level Match=true、`shadow.AllMatched()=true`)
- **DetectorResult contract**: `docs/contracts/aag/detector-result.schema.json` (= JSON Schema draft-07) を Go struct と structurally identical に articulate (= field name / order / type 一致)
- **2 advisory CI workflow** 新設 (= 既存 `ci.yml` と完全独立、isolation による non-blocking advisory):
  - `.github/workflows/aag-engine.yml` (= advisory all-detector、go test + 3 subcommand)
  - `.github/workflows/aag-engine-archive-manifest-hardgate.yml` (= archive-manifest hard gate 候補、user approval + branch protection 登録で hard gate 効果 articulate)
- **97 Go test PASS** (= cmd/aag 15 + contract 14 + fixture 16 + report 8 + detectors 35 + shadow 9) + **TS guard 1057 PASS** (= 並走整合)
- **Institutional articulation**:
  - `isolation による advisory` pattern (= continue-on-error より transparent、branch protection 登録という単一 operational flip point)
  - `json.RawMessage` 循環依存回避 pattern (= 集約 layer を report に embed する Go 慣用)
  - `fixture name prefix routing` (= forward-compatible dispatch、新 fixture 追加時 shadow runner 修正不要)
  - `obligation map per-commit 履行義務` (= workflow modify → 必ず metadata $comment update を含む follow-up commit、Phase 10/11 で institute)
  - `AAG version の app version からの分離` (= 本 AAG 6.0 で institute、本 file が AAG canonical changelog として確立)

### 不可侵原則 (= 本 MVP 期間中 strict adherence、後続 program でも継承)

1. validator only (= generator にしない)
2. TS guard を全廃しない
3. rule semantics を別言語に複製しない (= regex literal は「検出 surface」 として scope 内、business logic 判断は scope 外)
4. app-specific guard (= calculation / presentation / WASM / TS AST) を Go 移植対象に含めない
5. CI hard gate を即時置換しない (= shadow mode 期間 + user approval 経て段階昇格)
6. scope creep 禁止
7. AI が最終レビューを [x] にしない
8. Go engine を source of truth にしない (= TS captured output が canonical)
9. fixture parity を必須にする (= primary success metric)

### relatedPrograms (= 親 / 子 articulation)

- **parent**: `aag-engine-readiness-refactor` (= 2026-05-05 archive、本 MVP の前提条件 = engine input 5 分類 + 8 fixture corpus + DetectorResult schema + path-helpers articulation)
- **child candidate** (= post-MVP user 判断、`projects/active/aag-engine-go-mvp/discovery-log.md` §別 program candidate):
  - `aag-engine-hard-gate-promotion` (= 残 4 detector の段階昇格)
  - `aag-engine-domain-coverage-extension` (= 新 governance scope 追加)
  - `aag-engine-shadow-mode-runner-impl` (= TS detector を Go から exec する真の TS 並走 mode)
  - `aag-engine-real-repo-dispatch-impl` (= `aag validate --repo .` skeleton 解消)
  - `aag-changelog-vertical-obligation-guard` (= AAG-tagged project は本 file 更新を mechanical 強制する guard)
  - `aag-changelog-historical-split` (= AAG 5.x までの inline articulation を本 file に retroactive 移植)

### 新規追加 file

- `aag-engine/` (= Go module root、6 internal package + cmd)
- `.github/workflows/aag-engine.yml`
- `.github/workflows/aag-engine-archive-manifest-hardgate.yml`
- `aag/CHANGELOG.md` (= 本 file、AAG framework changelog の canonical articulation)
- `docs/contracts/aag/aag-metadata.json` (= AAG version 構造化 source)
- `projects/active/aag-engine-go-mvp/` (= 本 program 8 file = AI_CONTEXT / HANDOFF / plan / checklist / projectization / discovery-log / decision-audit + config/project.json)
