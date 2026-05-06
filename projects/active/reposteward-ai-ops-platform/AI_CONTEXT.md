# AI_CONTEXT — reposteward-ai-ops-platform

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

RepoSteward AI Ops Platform — AI-first repo operations engine への進化 (= post-MVP)（reposteward-ai-ops-platform）

## Naming Note

| 軸 | name | 由来 |
|---|---|---|
| **Concept / platform** | `RepoSteward AI Ops Platform` | 構想名 (= 本 project の北極星) |
| **Binary / CLI command** | `aag` | aag-engine-go-mvp で institute された binary 名を継続、Wave 1〜5 で command surface を additive 拡張 |
| **Project id** | `reposteward-ai-ops-platform` | concept name を kebab-case で articulate |

plan / docs / examples で「`reposteward stats files`」のように articulate される command は **現実装上 `aag stats files` で実行する**。両者は意図的に維持 (= 構想名の articulate と、既存 binary 命名 continuity の両立)。後続 step で `reposteward` symlink / alias を articulate する選択肢はあるが、本 program では追加しない (= 不可侵原則 6 = additive-only)。

## Purpose

AAG / RepoSteward を **validator** から **AI-first repo operations engine** に進化させる。
AI が grep / search / 推測で repo を探索しなくても、目的別 command で「現在地 / project context / changed file 影響範囲 / required reads / co-change obligation / rule・detector・fixture・schema 参照先 / repair context / repository cleanliness / effective LOC 統計 / stale project / next action」に一発到達できる operations layer を構築する。

`aag-engine-go-mvp`（2026-05-06 archive、AAG 6.0 institute、5 detector × 8 fixture = 40 parity 検証点維持、advisory CI + archive-manifest hard-gate scaffold landing）の post-MVP 後継 program。Wave 1（**Task Capsule schema v1 → `reposteward task prepare` MVP** → AAG Parameters v1 → SourceFacts v1 → effective LOC statistics → stats files query）を最初の milestone に置き、肥大化を抑止して長期戦に入る。

**Task Capsule (= AI Work Packet)** を Wave 1 最先頭に articulate する理由 (= DA-α-002): stats files / rule locate / changed --explain は **個別の道具** だが、Task Capsule は「作業目的 / 現在地 / 読むべき正本 / 触るべき file / 触ってはいけない範囲 / 関連 rule / 検証 command / 失敗時 repair policy」を 1 JSON に束ねる **作業仕様書 surface** で、これが先にあると後続の全 command が AI-friendly に接続される。Detection Inventory v2 は Wave 1 critical path から外し preparatory doc work として位置付け (= 任意 / 並行)。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位 + ハマりポイント）
3. `projectization.md`（AAG-COA 判定 = L3 governance-hardening / requiresHumanApproval=true / nonGoals）
4. `plan.md`（5 不可侵原則 + Wave 1〜5 構造 + やってはいけないこと）
5. `checklist.md`（completion 判定の入力 — Phase 0 bootstrap のみ ticked-out、Wave 1+ は landing 時に追記）
6. `decision-audit.md`（DA-α-000 進行モデル + DA-α-001 project naming 判断）
7. `discovery-log.md`（scope 外発見の蓄積 inventory）
8. 必要に応じて `projects/completed/aag-engine-go-mvp/ARCHIVE.md`（前提 program、5 detector / fixture parity / advisory CI / versionImpact mechanism の articulation）
9. 必要に応じて `aag/CHANGELOG.md`（AAG version 履歴 + バージョンアップ判定基準 table）

## Why this project exists

**Go MVP の後継として独立 project にする理由**:

- `aag-engine-go-mvp` は **validator MVP** として完遂済 (= 5 detector / fixture parity / shadow mode / advisory CI / archive-manifest hard-gate scaffold)
- 本 program はその上層に **AI-first command operations** を載せる別動線 (= scope と読者が異なる、混ぜると両方が機能不全になる §0)
- 後続 program 候補 (= Go MVP ARCHIVE で articulate された `aag-engine-real-repo-dispatch-impl` / `aag-engine-domain-coverage-extension` / `aag-engine-hard-gate-promotion` / `aag-version-impact-declaration-guard` 等) のうち、**AI navigation surface** に直接寄与するものを束ねる上位 program として位置付け
- L3 + 複数 phase + 不可侵原則を独自に持つため、`quick-fixes` collection 経路ではなく独立 project が適切（§11 判断基準）

**既存 active project と scope が混ざらない理由**:

- `presentation-quality-hardening`: presentation 層テスト・E2E 強化 → 本 program は AAG / RepoSteward 拡張で別領域
- `pure-calculation-reorg`: domain/calculations 再編 → 本 program は業務 logic に触れない (nonGoal)
- `taxonomy-v2`: 責務軸 / テスト軸 vocabulary 運用 → 本 program は taxonomy を扱わず、parameters / source facts / command surface に focus
- `quick-fixes`: 単発 fix collection → 本 program は複数 phase / 不可侵原則 / ハマりポイント引き継ぎが必要

## Scope

含む:

- **Task Capsule schema v1** (= `docs/contracts/aag/task-capsule.schema.json`、taskId / projectId / repoHealth / currentState / goal / nonGoals / requiredReads / targetFiles / relatedCommands / expectedOutputs / repairPolicy の JSON shape 定義)
- **`reposteward task prepare` MVP** (= projectId 受領 → project context 読 → repo health 読 → required reads / nonGoals / target files / commands / expected outputs / repair policy を JSON で返す read-only command、`aag-engine/internal/taskcapsule/` に landing)
- AAG Parameters v1 (= JSON contract、effective LOC bucket / layer 別 size budget / generated・fixture・archive 除外設定 等の可変設定 articulation、Task Capsule の constraints source として参照)
- SourceFacts v1 (= path / kind / layer / physicalLines / blankLines / commentLines / effectiveCodeLines / imports / exports / hooks 統計の collector + JSON output、Task Capsule の facts source として参照)
- Effective LOC statistics (= bucket distribution + p50/p75/p90/p95/p99/max + layer 別 distribution、Health summary に articulate)
- `reposteward stats files --metric effectiveCodeLines --range N..M` query (= bucket / range から file に直行する command、Task Capsule v3 `--intent` の入力 backend)
- 既存 `sizeGuard.test.ts` / `architectureStateAudit.test.ts` の effectiveCodeLines 化 (= raw line count → effective に切替、コメント penalty 抑止、Wave 2)
- AI navigation MVP (= where-am-i / context --project / changed --explain / rule locate / detector refs、Wave 3、Task Capsule の構成要素として再利用)
- Repository cleanliness rules (= generated に hand-authored doc 混入 / docs/contracts に narrative / fixtures に production doc / archive.manifest.json 不在 等の検出、Wave 4)
- Comment / Doc placement rules (= コメント governance + doc 配置 governance、Wave 4)
- Premise / Obligation Contract v1 (= path → required reads / required co-changes の宣言契約、Wave 5)
- `reposteward task validate` / `task repair-context` / `task close` (= Task Capsule の validate / repair / close 補助 command、Wave 5)
- Repair-context generator (= DetectorResult / obligation / cleanliness / comment violation から AI が読むべき repair context を JSON で返す、Wave 5)
- Detection Inventory v2 (= 既存検出ロジックの棚卸 + JSON contract、preparatory doc work / 任意 / Wave に non-blocking で並行)

含まない (詳細 nonGoals は `projectization.md` §4 / `config/project.json` `projectization.nonGoals`):

- TypeScript guard 全廃 / WASM 移植 / docs:generate Go 移管 / 業務 logic 複製
- Human UI / browser dashboard (= JSON output 限定)
- YAML 採用 (= JSON-first 原則)
- Wave 1 milestone 到達前の hard gate 追加
- コメント annotation (@premise / @canonicalRef 等) を主検出経路にすること
- 実装 AI による自己承認 (= L3 + requiresHumanApproval=true)

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/05-aag-interface/operations/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA 判定（Level / changeType / required artifacts） |
| `aag/CHANGELOG.md` | AAG version 履歴 + バージョンアップ判定基準 table（versionImpact field 根拠） |
| `projects/completed/aag-engine-go-mvp/ARCHIVE.md` | 前提 program (= validator MVP)、5 detector / fixture parity / advisory CI / 後続 program 候補 |
| `projects/completed/aag-engine-readiness-refactor/` | Go MVP 前段の TS 構造事前整備 (= 不可侵原則 4/5 = TS guard / 業務 logic 不可触の institute) |
| `aag/_internal/strategy.md` | AAG 戦略 + 文化論 + AI 対話の根拠 |
| `aag/_internal/architecture.md` | AAG 5 層構造 (= 本 program は Layer 3 + Layer 4A interface 拡張) |
| `aag/_internal/source-of-truth.md` | 正本ポリシー (= AAG Parameters は可変設定の articulation、既存 calculationCanonRegistry / readModels 正本性は不変) |
