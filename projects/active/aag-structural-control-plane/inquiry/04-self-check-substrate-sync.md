# inquiry/04 — self-check Substrate Sync

> **役割**: Phase 0 で `aag-engine` self-check の軸数 drift（V6 / V7 が internal 実装済だが command 層 + Axis コメントは V1〜V5 のみ articulate）を **最初の Finding として記録** する。
>
> **scope**: 本 program は AAG framework 内部実装に touch しない（projectization.md §4 nonGoal）。本 inquiry は **記録のみ**、修正は別 program 候補（reposteward 内で対応するのが自然）。
>
> **規約**: discovery-log.md の P2 entry「2026-05-07 P2: self-check substrate drift」と同期。

## 1. 観測された drift

### 1.1. internal/selfcheck/selfcheck.go = V1〜V7（実装済）

`aag-engine/internal/selfcheck/selfcheck.go` の実装状況:

| 軸 | 内容 | 場所 |
|---|---|---|
| V1 | describe.commandTable ↔ introspect.implTable cross-sync | L7 doc / L94 dispatch |
| V2 | introspect.implTable の handlerFile / dispatcherFile が実在 | L8 doc / L95 dispatch |
| V3 | introspect.schemaTable の file-backed schema path が実在 | L9 doc / L96 dispatch |
| V4 | introspect.testTable の test file path が実在 | L10 doc / L97 dispatch |
| V5 | introspect.schemaInfoTable の各 schema が producer or consumer を持つ | L11 doc / L98 dispatch |
| V6 | introspect.exampleTable の articulate された example directory が実在 | L13 doc / L99 dispatch |
| V7 | example file の schemaVersion が schema の const/enum articulate と整合 | L15 doc / L100 dispatch |

Summary struct（L61-67）も V1〜V7 を articulate。axis count（L106-119）も V1〜V7 を articulate。

### 1.2. cmd/aag/command_selfcheck.go = V1〜V5 のみ articulate（stale）

`aag-engine/cmd/aag/command_selfcheck.go` の doc は V1〜V5 のみ articulate（L11-19 周辺）。command 層が V6 / V7 の存在を articulate していない。

### 1.3. internal/selfcheck/selfcheck.go L72 = `// V1 / V2 / V3 / V4 / V5` の stale comment

`Axis` フィールドのコメント（L72）が `// V1 / V2 / V3 / V4 / V5` のままで、V6 / V7 が反映されていない。

## 2. Finding 記録（本 inquiry の主成果）

### Finding ID（仮）: `FND-SELFCHECK-AXIS-DRIFT-001`

> 注: 正式な Finding ID は Phase 1 schema MVP（`docs/contracts/schema/aag-finding.schema.json`）で確定する。本 inquiry の articulate は仮 ID。

```yaml
finding:
  id: FND-SELFCHECK-AXIS-DRIFT-001
  schemaVersion: aag-finding-v1-draft
  severity: warn
  subject:
    kind: substrate-doc-drift
    paths:
      - aag-engine/cmd/aag/command_selfcheck.go
      - aag-engine/internal/selfcheck/selfcheck.go
    locations:
      - file: aag-engine/cmd/aag/command_selfcheck.go
        line: 11-19
        observedContent: V1〜V5 のみ articulate
      - file: aag-engine/internal/selfcheck/selfcheck.go
        line: 72
        observedContent: "// V1 / V2 / V3 / V4 / V5"
  problem: command 層 doc + Axis フィールドコメントが V1〜V5 で stale。実装は V1〜V7。
  expected: command 層 doc が V1〜V7 を articulate + Axis コメントが V1〜V7 を articulate
  suggestedDisposition: out-of-scope-for-this-program
  recommendedTarget: reposteward `aag-engine-domain-coverage-extension` 候補（同種の doc/comment sync drift と一括対応）
  observedBy: aag-structural-control-plane Phase 0 inquiry/04
  observedAtCommit: c0f7823de95e9c119e872435788deb8ed93ce959
```

## 3. なぜ本 program で修正しないか

- **scope 違い**: 本 program は `docs/contracts/` / `tools/governance/` / `references/` / `projects/` のみ touch。`aag-engine/` 内部実装は scope 外（projectization.md §4 nonGoal）
- **責務分離**: AAG framework 内部実装の整合性は reposteward が責務を持つ（`projects/active/reposteward-ai-ops-platform/`）
- **drift の意味**: 本 drift は「documentation がコードに追従していない」typical example。本 program で扱う Document Contract / Temporal Scope の **第 0 件目の実例** として記録する価値がある（製本 = 現在の正本、code = 現在の状態、両者の drift は AAG が検出すべき対象）

## 4. 本 inquiry の意義

本 drift は **本 program の核心思想を実証する実例** である:

- code は V7 まで進化したが、doc は V5 で止まっている
- これは「製本に過去/未来が混入する」のではなく、「製本が現在に追従していない」ケース
- AAG-SCP-DOC-TEMPORAL-001（製本は present-only）は **「現在に追いついている」**ことも要求する
- Phase 4 Document Kind + Temporal Scope Shadow で同種 drift を機械検出する設計を articulate（heading drift / version drift / signature drift）

## 5. open questions

- Q1: 本 drift は self-check 軸数のみか、他にも同種 drift があるか? → Phase 0 では本 1 件のみ記録、Phase 1+ で全 substrate doc-comment-code sync の機械検出 plan を articulate（reposteward 側で扱う候補）
- Q2: 本 finding を reposteward の discovery-log に転記すべきか? → 暫定: yes、本 program archive 時に reposteward discovery-log への cross-link を articulate
- Q3: Phase 1 で確定する Finding schema は `recommendedTarget` field を持つべきか? → 暫定: yes、out-of-scope finding の escalate 先を機械追跡可能にする

## 6. 整合性確認項目（Phase 0 で完了）

- [ ] 本 inquiry の Finding 記述が discovery-log.md の 2026-05-07 P2 entry と整合
- [ ] 本 finding が「本 program 修正対象外」として明示
- [ ] 本 finding が「reposteward `aag-engine-domain-coverage-extension` 候補等の post-archive escalate 先」として articulate
- [ ] 本 finding の出現が Phase 4 Document Kind + Temporal Scope Shadow checker design を informs（同種 drift の機械検出 design を articulate）
