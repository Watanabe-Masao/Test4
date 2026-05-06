# RepoSteward Command Surface

> **役割**: `aag` binary が articulate する command 一覧の audit + maturity matrix。Wave 1〜5 で landing 済 / future-hard-gate-candidate / advisory-only の articulation を 1 表に集約し、AI session が「どの command が安定運用可能で、どれが provisional か」を即値で articulate できる surface map。
>
> **canonical**: 本 doc + `aag-engine/cmd/aag/main.go` 冒頭 docstring + `aag-engine/cmd/aag/main.go` usage block。
>
> **位置付け**: PR B (= reposteward-ai-ops-platform post-merge quality pass の command surface audit) で landing。Detection Inventory v2 (= `references/03-implementation/detection-inventory-v2.md`、Wave 4 #18) と並ぶ AI navigation surface (= 検出 inventory に対する command inventory)。
>
> **Naming note**: Concept = `RepoSteward AI Ops Platform`、Binary = `aag`。doc / plan / examples で「`reposteward 〇〇`」と articulate される command は本 binary では「`aag 〇〇`」で実行。詳細は `projects/active/reposteward-ai-ops-platform/AI_CONTEXT.md` §Naming Note を参照。

## maturity 分類

各 command を以下 4 段階で articulate:

| maturity | 意味 | hard gate 化 | reaction time |
|---|---|---|---|
| **stable** | 設計・実装・test が固まっており、AI session が即値で消費可能。Wave 1〜2 で確立した layer (= schema / parameters / facts / statistics / Go MVP family) | 既に固定 articulate (= 既存 Hard Gate に組込済) | 即時 |
| **provisional** | 動作するが detection precision / output format が成熟途上。AI consumer が articulate できるが review / interpretation を要する | 当面しない (= 不可侵原則 6 整合、threshold policy 未確定) | review window で promote 検討 |
| **advisory** | 検出のみ・enforce しない設計が固定 (= read-only first 不可侵原則 3 整合)。Hard Gate 化は別 program に分離 | 永続的に advisory (= governance design 上意図的) | 性質不変 |
| **future-hard-gate-candidate** | 将来 hard gate 化候補だが、現時点では threshold / baseline / ratchet-down 設計が articulate されていない | 別 program で articulate 後 | post-archive で別 program 起動 |

## Command Surface (= Wave 1〜5 で landing 済 全 14 command + Go MVP family 3 command)

### Go MVP family (= aag-engine-go-mvp で landing、Wave 1 以前)

| Command | maturity | Output schema | Source | Risk | Next |
|---|---|---|---|---|---|
| `aag validate` | provisional | DetectorResult[] (= empty skeleton) | repo + detector registry | low | real repo dispatch (= aag-engine-real-repo-dispatch-impl 後続 program) |
| `aag fixtures` | stable | DetectorResult[] + fixtureSummary | fixtures/aag/ | low | (none) |
| `aag shadow` | stable | shadow.Summary + DetectorResult[] | 5 detector × 8 fixture | low | parity 100% 維持 |

### Task Capsule family (= reposteward-ai-ops-platform Wave 1 #2 + Wave 5 #22)

| Command | maturity | Output schema | Source | Risk | Next |
|---|---|---|---|---|---|
| `aag task prepare` | stable | task-capsule-v1 | project config + health.json + project-health.json | low | --changed-only mode (= v2 candidate) |
| `aag task validate` | stable | task-validate-v1 | --capsule file | low | (none) |
| `aag task close` | provisional | task-close-v1 | --capsule file + repoHealth | medium | per-project final checks (= v2 candidate) |

### Stats family (= Wave 1 #6)

| Command | maturity | Output schema | Source | Risk | Next |
|---|---|---|---|---|---|
| `aag stats files` | stable | stats-files-query-v1 | source-facts.json + aag-size-statistics.json + aag-parameters.json | low | summary command (= v2 candidate)、`--metric` 拡張 |

### Navigation family (= Wave 3 #10〜#14)

| Command | maturity | Output schema | Source | Risk | Next |
|---|---|---|---|---|---|
| `aag where-am-i` | stable | where-am-i-v1 | git + health.json + active dirs | low | (none) |
| `aag context --project` | stable | context-project-v1 | project config + checklist.md | low | (none) |
| `aag changed --explain` | provisional | changed-explain-v1 | git diff + Go embed obligation map | medium | obligation rule subset を premise-contracts 集合と統合 |
| `aag rule locate` | stable | rule-locate-v1 | merged-architecture-rules.json + grep | low | guard reference の AST 化 (= future) |
| `aag detector refs` | stable | detector-refs-v1 | embed mapping + path existence | low | (none、5 detector 固定) |

### Cleanliness / Comments / Docs family (= Wave 4 #15〜#17)

| Command | maturity | Output schema | Source | Risk | Next |
|---|---|---|---|---|---|
| `aag clean check` | provisional | clean-check-v1 | repo scan (= 3 rule = generated-handauthored / archive-missing-manifest / projectid-duplicate) | medium | rule 拡張 (= 6 rule full、advisory-only 維持) |
| `aag comments list --kind` | provisional | comments-list-v1 | regex scan (TS/TSX/Go) | medium | block comment / JSX comment / multiline suppression articulate (= future) |
| `aag docs placement-check` | provisional | docs-placement-check-v1 | repo scan (= 2 rule = schema-misplaced / generated-misplaced) | low | long-term-policy / active-project / archived-project の placement check articulate (= future) |

### Obligation / Repair family (= Wave 5 #20〜#21)

| Command | maturity | Output schema | Source | Risk | Next |
|---|---|---|---|---|---|
| `aag obligation check` | provisional | obligation-check-v1 | git diff + premise-contracts.json (= 5 contract、core schema 5 件) | medium | minimatch glob、negative pattern、required file modified check、mode 別 fulfillment 判定 |
| `aag repair-context --from` | provisional | repair-context-v1 | 4 input kind classifier + rule registry | medium | DetectorResult schema 完全 mirror、each kind の articulation 強化 |

### Project status family (= Wave 5 #23)

| Command | maturity | Output schema | Source | Risk | Next |
|---|---|---|---|---|---|
| `aag project stale` | stable | project-stale-v1 | git log per project | low | per-project threshold articulate (= v2 candidate) |
| `aag next` | provisional | next-v1 | where-am-i + working tree + checklist.md | medium | scoring rationale articulate、recommendation rule の articulation 強化 |

## hard gate 化政策

### 現状

- **Health に articulate 済 hard gate**: 既存 60 KPI のみ (= aag-engine-go-mvp 以前で確立)
- **Wave 1〜5 で追加した Hard Gate**: **0 件** (= 不可侵原則 6 = additive-only / Wave 1 milestone 前 hard gate 追加禁止 整合)
- **future-hard-gate-candidate**: effective LOC `code.size.effectiveLoc.{p90,p95,max}` のみ (= DA-β-003 articulate、別 program で baseline + ratchet-down 設計と同時に articulate)

### 昇格 path (= provisional → stable / future-hard-gate-candidate)

provisional command を hard gate 化する前提条件:

1. **threshold policy が articulate**: budget 値・違反判定 logic が決まっている
2. **baseline / ratchet-down 設計**: 増加方向禁止 + 減少のみ許可 + baseline 監視機構
3. **false positive 計測**: precision の articulate (= 例: comments の TODO 検出は brisk anchor 強化前は 4096+ false positive)
4. **AAG governance review**: review window で user 判断
5. **不可侵原則 6 整合**: additive-only / 後続 program での articulate

これらが揃った時点で別 program として articulate (= 本 program では articulate しない)。

## maturity sub-articulate

### `aag comments list --kind` (= provisional)

**現状**:
- regex anchor 強化済 (= keyword 直後に `:` / `(` / 英字 content 要求)
- false positive 4096+ → 6 件 articulate 達成

**未対応**:
- block comment (= `/* TODO */`) は detect しない
- JSX comment (= `{/* TODO */}`) は detect しない
- multiline suppression reason (= `// eslint-disable-next-line\n// reason: ...`) は detect しない
- broken `@canonicalRef` (= 存在しない path への参照) は detect しない

**昇格条件**: 上記 4 軸の articulate + AST-level parse の検討

### `aag obligation check` (= provisional)

**現状**:
- premise-contracts.json の 5 core contract を articulate
- pathMatchesTrigger は exact / glob `**` / dir prefix の 3 mode

**未対応**:
- minimatch full glob (= `**/*.test.ts` の type-aware matching)
- negative pattern (= `!fixtures/`)
- required file modified check (= `requires.path` が実際に変更されたかの検証)
- decision-audit alternative satisfaction (= `mode: review` の articulation 充足判定)
- mode ごとの fulfillment 判定 (= `mode: must-pass` の test 実行確認)

**昇格条件**: glob matcher 統合 + fulfillment check articulate

### `aag clean check` / `aag docs placement-check` (= provisional)

**現状**:
- 3 + 2 rule MVP
- false positive 抑止 (= projects/<id>/derived/ 例外 / *.generated.md convention pass)

**未対応**:
- docs/contracts narrative 検出 (= directory 内 file 種別の articulate)
- fixtures/ production doc 検出 (= fixture vs production の articulate)
- generated metadata 不在 (= generatedFileEditGuard 統合)
- archived-project content sanity (= ARCHIVE.md 内 metadata articulate)

**昇格条件**: 既存 governance mechanism (= generatedFileEditGuard 等) との整合 + rule 拡張

## 関連 Wave / 関連 doc

- **Wave 1〜5 すべて**: `projects/active/reposteward-ai-ops-platform/plan.md` + `checklist.md` + `decision-audit.md`
- **Detection Inventory v2** (= 検出 inventory): `references/03-implementation/detection-inventory-v2.md`
- **AAG framework articulate**: `aag/_internal/`
- **Premise contracts**: `aag/parameters/premise-contracts.json`
- **Naming note**: `projects/active/reposteward-ai-ops-platform/AI_CONTEXT.md` §Naming Note
- **Health KPI deferral**: `projects/active/reposteward-ai-ops-platform/decision-audit.md` DA-β-003

## 後続候補 (= post-archive 別 program)

| 候補 | 内容 | 起動 trigger |
|---|---|---|
| `aag-engine-real-repo-dispatch-impl` | `aag validate` を skeleton から real repo dispatch に articulate | aag-engine-go-mvp ARCHIVE で articulate 済 |
| `effective-loc-hard-gate-promotion` | `code.size.effectiveLoc.{p90,p95,max}` の Health KPI 統合 + baseline + ratchet-down articulate | DA-β-003 articulate、threshold policy が固まった時点 |
| `aag-cli-dispatcher-refactor` | `aag-engine/cmd/aag/main.go` の分割 (= command_*.go) | PR C で articulate 済 (= 別 PR で実施) |
| `comments-scanner-ast-promotion` | comments / suppression detect の AST level promotion | comments command の precision 計測後 |
| `obligation-glob-fulfillment` | obligation check の minimatch glob + fulfillment check | premise contracts の usage data 蓄積後 |
