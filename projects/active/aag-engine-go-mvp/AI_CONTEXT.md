# AI_CONTEXT — aag-engine-go-mvp

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Engine Go MVP — read-only governance validator shadow implementation
（aag-engine-go-mvp）

## Purpose

`aag-engine-readiness-refactor` (= 2026-05-05 archive、self-dogfood 4 件目) で
抽出済みの **5 detector** (= archive manifest / doc registry / generated metadata /
project lifecycle / schema validation) を、**Go 製 read-only governance engine** として
shadow mode 実装する。

**重要**: 本 MVP は validator のみで generator ではない。TS guard / docs:check /
architecture-health は置き換えない。**目標は「同じ input / fixture に対して同じ
DetectorResult[] を返す」 ことを Go 実装で証明する** こと (= readiness refactor の
parity 検証主軸を engine 側で再現)。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位と現在地）
3. `plan.md`（不可侵原則 + Phase 0〜10 構造 + commit pattern）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. `projectization.md`（AAG-COA 判定結果 = L3 / architecture-refactor）
6. `decision-audit.md`（DA-α 系 lineage articulation）
7. `discovery-log.md`（scope 外発見蓄積）

### Required reads (= readiness refactor deliverable、Phase 0 で固定)

後続 AI session が本 project の base context として **必ず read すべき** file 群:

| 種別 | path | 役割 |
|---|---|---|
| Archive | `projects/completed/aag-engine-readiness-refactor/ARCHIVE.md` | readiness refactor 完遂 summary + engine readiness 要点 + 永続維持 file 一覧 |
| Archive metadata | `projects/completed/aag-engine-readiness-refactor/archive.manifest.json` | DA lineage + commit history + relatedPrograms (= 本 MVP は relatedPrograms.child 候補) |
| Inventory | `references/03-implementation/aag-engine-readiness-inventory.md` | engine input 5 分類 + 3 状態問題 (= 本 MVP の入力 boundary) |
| TS contract | `tools/architecture-health/src/detector-result.ts` | DetectorResult TS implementation (= Go 側で同 schema を再現) |
| Layered model | `tools/architecture-health/src/detectors/README.md` | 4 層 layered model + Logic Boundary Reference (= per-detector 移植 boundary) |
| Detectors (5 系統) | `tools/architecture-health/src/detectors/{archive-manifest,doc-registry,generated-metadata,project-lifecycle,schema-validation}-detector.ts` | TS pure detector reference (= Go 移植元) |
| Path helpers | `tools/architecture-health/src/path-helpers.ts` | RepoPath / RepoFileEntry + 4 規約 (= Go 側で同 規約再現) |
| Fixture corpus | `fixtures/aag/README.md` + `fixtures/aag/` (= 8 fixture / 5 系統 coverage) | parity 検証主軸 (= Go engine の primary success metric) |
| Schema | `docs/contracts/aag/detector-result.schema.json` | canonical DetectorResult schema (= Go output が conformant な状態を要求) |
| Schema | `docs/contracts/aag/project-archive.schema.json` | Archive v2 schema (= archive-manifest detector の input 正本) |
| Test contract | `app/src/test/guards/detectorResultModuleGuard.test.ts` | TS detector の動作 contract (= Go 移植時の parity test reference) |
| Test contract | `app/src/test/guards/aagContractSchemaSyncGuard.test.ts` | schema ↔ TS interface sync (= Go 側でも sync 維持) |

これらは readiness refactor archive で「永続維持 file」 として articulate 済 (=
圧縮対象外、active doc として運用継続)。本 MVP の各 Phase で逐次参照する。

## Why this project exists

`aag-engine-readiness-refactor` Phase 7 readiness report で articulate された
「engine MVP scope」 (= 5 系統 + Go MVP input/output boundary + shadow mode 比較対象 +
hard gate 化判定 + Go 実装開始条件) の **実装段階に入る** ための project。

readiness refactor は意図的に「engine 実装に入らない」 を不可侵原則 1 として
articulate していた。本 MVP は不可侵原則 1 を反転 (= Go 実装に入る) しつつ、
不可侵原則 2 / 4 / 5 (= 既存 guard 不変 / rule semantics 不複製 / app-specific
排除) は継承する。

readiness refactor で揃った deliverable (= 5 detector + 8 fixture + path-helpers +
schema + Logic Boundary Reference) を **Go engine の入力として利用** することで、
engine 実装の scope を validator のみに絞れる。

## Scope

### 含む (= implementationScope)

- `aag-engine/` (= 新設 Go モジュール、go.mod + cmd/aag/main.go + internal/contract/ + internal/report/)
- `projects/active/aag-engine-go-mvp/` (= 本 project の lifecycle 関連 file)

### 含まない (= nonGoals、`config/project.json` 参照)

- Rust engine の実装 (= Phase 10 で必要性再評価)
- generated artifact の生成機能 (= MVP は validator only)
- docs:generate を Go に移管
- TypeScript guard を削除
- AAG rule semantics を Go 側に複製
- calculation / presentation / WASM / TS AST 系 guard 移植
- CI hard gate を即時置換 (= shadow mode 期間後に user 判断)
- 実装 AI による自己承認

## Phase 構造（要約）

詳細は `plan.md` を参照。

| Phase | 名称 | 主成果 |
|---|---|---|
| 0 | Project Bootstrap | project 起票 + scope / non-goals / required reads / DA-α-000 |
| 1 | Go CLI Skeleton | Go binary 起動 + JSON output 経路 + exit code contract |
| 2 | DetectorResult Contract Binding | Go 側 DetectorResult ↔ canonical schema sync |
| 3 | Fixture Runner | 既存 8 fixture を読んで parity 比較 |
| 4 | Archive Manifest Detector | 最初の detector 移植 (= JSON schema validation 主体、低リスク) |
| 5 | Doc Registry Detector | references / docs/contracts 参照整合性 |
| 6 | Schema Validation Detector | JSON schema validation + level range check |
| 7 | Project Lifecycle Detector | active / completed / Archive v2 lifecycle 検証 (= 3 状態 routing) |
| 8 | Generated Metadata Detector (advisory) | regex / timestamp 検出、advisory only |
| 9 | Shadow Mode | Go engine と TS AAG を並走、parity / drift report |
| 10 | CI Advisory | CI に Go engine を non-blocking で導入、2〜4週間 false positive 観測 |
| 11 | Partial Hard Gate Promotion | 安全な detector から hard gate 昇格 (= archive manifest → schema → doc registry → lifecycle、generated は最後 or advisory 継続) |
| 12 | Closure / Next Architecture Decision | A. CI hard gate 昇格 / B. advisory 継続 / C. 追加 detector / D. metadata 強化 / E. Rust 必要性再評価 のいずれかを user 判断 |

## Long-term Target (= 本 MVP の position 再 articulate)

最終到達は、AAG を **repo 内の文化・test 群** から **repo 外側から読む
read-only governance engine** へ段階昇格させること。

**ただし、最終形でも TypeScript guard を全廃しない**:

| 領域 | 担当 |
|---|---|
| app-specific guard (= calculation / presentation / WASM / TS AST) | **TypeScript / Vitest に残す** (= 本 MVP scope 外) |
| archive manifest validation | Go engine |
| project lifecycle validation | Go engine |
| doc-registry validation | Go engine |
| schema validation | Go engine |
| generated metadata validation | Go engine、ただし最初は advisory |
| health / report aggregation | 初期は TS、将来 engine 側に一部移管可 (= MVP scope 外) |
| docs:generate | 当面 TypeScript 側に残す (= MVP scope 外) |

= **AAG Engine は「全 guard の置換」ではなく、repo / docs / project lifecycle /
artifact / schema / archive の検証を担う外部 engine として育てる**。これは
readiness refactor 不可侵原則 5 (= app-specific TS guard を engine 化対象に
含めない) の長期 articulate でもある。

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/05-aag-interface/operations/project-checklist-governance.md` | 本 project の運用ルール (= AAG Layer 4A)、特に §13.1〜§13.3 commit pattern |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA 判定基準、L3 required artifacts |
| `references/05-aag-interface/protocols/complexity-policy.md` §3.4 | L3 重変更 routing (= DA institute + judgement commit + 振り返り判定) |
| `aag/_internal/architecture.md` | AAG 5 層構造 (= 本 project は新言語 engine 導入で Layer 3 Execution の同型実装) |
| `projects/completed/aag-engine-readiness-refactor/ARCHIVE.md` | 親 readiness program archive (= 本 MVP の前提条件) |
| 上記 Required reads 一覧 | readiness refactor で永続維持された 17 deliverable file |
