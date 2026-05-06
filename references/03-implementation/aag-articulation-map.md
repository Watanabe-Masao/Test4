# AAG Articulation Map (Detection ↔ Command ↔ Schema)

> **役割**: AAG / RepoSteward の **3 軸 cross-reference index** (= 検出 logic / CLI command / schema artifact を 1 表で articulate)。AI session が「この検出はどの command で読めるか / この schema はどの command が produce / consume するか」を即値で articulate するための surface map。
>
> **canonical**: 本 narrative + `docs/generated/aag/schema-graph.json` (= improvement F、機械 readable graph) + `references/03-implementation/reposteward-command-surface.md` (= PR B、command maturity matrix) + `references/03-implementation/detection-inventory-v2.md` (= Wave 4 #18、検出 inventory)。
>
> **位置付け**: improvement G (= reposteward-ai-ops-platform post-archive AAG-friendly improvement) で landing。Detection Inventory v2 (= 検出 → location) と Command Surface (= command → maturity) を **同 1 表で articulate** することで、AI session が detection family と command family を相互 navigate できるようにする。
>
> **AAG framework との関係**: AAG framework 自体は `aag/_internal/`、本 articulation map は AAG が articulate する **検出 / command / schema の relation を 1 view に articulate** した index。

## 動機

AI session が repo を articulate する際、従来は 3 か所を独立に walk する必要があった:

1. **検出 logic location**: `app/src/test/guards/` + `app/src/test/audits/` + `tools/architecture-health/src/detectors/` + `aag-engine/internal/detectors/`
2. **command surface**: `aag-engine/cmd/aag/command_*.go`
3. **schema contracts**: `docs/contracts/aag/*.schema.json`

3 軸は本来 **同 1 dataflow の 3 face** だが、independent に articulate されていたため AI session の navigation cost が高かった。

本 articulation map は **検出 family ごとに command + schema を articulate** することで、AI session が「この検出を CLI で query するには」「この schema を produce する command は」を即値で articulate できるようにする。

## 3 軸 cross-reference table

各 family について「検出 logic / 関連 command / 関連 schema」を articulate。各 cell の articulate level は概要のみ (= 詳細は canonical doc 参照)。

### Family: structure / size

| Detection | Command(s) | Schema(s) | Maturity |
|---|---|---|---|
| effectiveCodeLines per file (= source-facts collector) | `aag stats files` | source-facts-v1 + aag-size-statistics-v1 + aag-parameters-v1 | stable |
| size guard violations (= sizeGuard.test.ts) | (Hard Gate、CLI 経路なし) | (none) | stable (Hard Gate) |

### Family: detection / validation

| Detection | Command(s) | Schema(s) | Maturity |
|---|---|---|---|
| 5 detector × 8 fixture parity | `aag shadow` | detector-result-v1 | stable |
| repo dispatch (= skeleton) | `aag validate` | detector-result-v1 (= empty) | provisional |
| fixture catalog | `aag fixtures` | (fixture catalog ad-hoc) | stable |

### Family: navigation

| Detection | Command(s) | Schema(s) | Maturity |
|---|---|---|---|
| current branch / activeProject / repoHealth + manifest snapshot | `aag where-am-i` | where-am-i-v2 (= improvement B、manifestContext additive) | stable |
| project context (= requiredReads / constraints / nextActions) | `aag context` | context-project-v1 | stable |
| changed files + obligations + requiredReads | `aag changed --base..--head` | changed-explain-v1 + premise-contracts-v1 (consume) | provisional |
| rule definition / guards / docs / thresholds | `aag rule locate <ruleId>` | rule-locate-v1 | stable |
| detector implementation refs | `aag detector refs <detectorId>` | detector-refs-v1 + detection-inventory-v1 (consume) | stable |

### Family: cleanliness / comments / docs

| Detection | Command(s) | Schema(s) | Maturity |
|---|---|---|---|
| generated 混入 / archive manifest 不在 / projectId 重複 | `aag clean check` | clean-check-v1 | provisional |
| TODO / FIXME / suppression / expired comments | `aag comments list --kind` | comments-list-v1 | provisional |
| schema / generated artifact placement | `aag docs placement-check` | docs-placement-check-v1 | provisional |

### Family: obligation / repair

| Detection | Command(s) | Schema(s) | Maturity |
|---|---|---|---|
| premise contract triggers (= path → required reads / co-changes) | `aag obligation check` | obligation-check-v1 + premise-contracts-v1 (consume) | provisional |
| repair context from detector output | `aag repair-context --from FILE \| -` | repair-context-v1 + detector-result-v1 (consume) + task-capsule-v1 (consume) | provisional |

### Family: task capsule lifecycle

| Detection | Command(s) | Schema(s) | Maturity |
|---|---|---|---|
| project task articulation | `aag task prepare` | task-capsule-v1 | stable |
| TaskCapsule schema 準拠 + invariant | `aag task validate --capsule FILE \| -` | task-validate-v1 | stable |
| TaskCapsule close 可能性判定 | `aag task close --capsule FILE \| -` | task-close-v1 | provisional |

### Family: project status

| Detection | Command(s) | Schema(s) | Maturity |
|---|---|---|---|
| stale active project (= 30+ 日 commit なし) | `aag project stale` | project-stale-v1 | stable |
| AI session next action recommendation | `aag next` | next-v1 | provisional |

### Family: envelope / self-describe (= post-merge improvements)

| Detection | Command(s) | Schema(s) | Maturity |
|---|---|---|---|
| stdin JSON wrap (= AagResponse-v2 envelope) | `aag wrap --command NAME` | aag-response-v2 (virtual) | provisional |
| command metadata articulation | `aag describe <command>` / `aag list` | aag-describe-v1 (virtual) | provisional |

## 軸間 relation

### 検出 → command

- **guards** (= `app/src/test/guards/`、Hard Gate 多数) は CLI 経路を articulate しない (= test runner で fail-fast)
- **detectors** (= aag-engine/internal/detectors/) は `aag shadow` / `aag validate` から articulate
- **collectors** (= tools/architecture-health/) は `aag stats files` / `aag where-am-i` から articulate
- **audits** (= app/src/test/audits/) は CLI 経路を articulate しない (= 状態観測のみ、Hard Gate 化対象外)

### command → schema

- 全 command は **JSON-first** (= 不可侵原則 1) で schema 準拠 output を articulate
- Schema は `docs/contracts/aag/*.schema.json` (= 8 個) または virtual (= Go internal package で articulate、3 個)
- `aag-response-v1` のみ producer 不在 (= migrationRecipe / fix-now hint envelope は将来 articulate 予定)

### schema → schema

- 現時点で cross-file `$ref` は **0 件** (= 各 schema は self-contained)
- 詳細 dependency graph は `docs/generated/aag/schema-graph.json` を参照

## maturity / 不可侵原則 整合

本 map は **不可侵原則 6 (= additive-only)** に整合:

- 既存 14 command の output / behaviour は不変 (= 本 map は articulate のみ)
- `improvement A〜G` で追加された 3 command (= wrap / describe / list) は provisional として articulate
- Hard Gate 化は本 map の scope 外 (= `reposteward-command-surface.md` §hard gate 化政策 を参照)

## 参照

| 文書 / artifact | 役割 |
|---|---|
| `references/03-implementation/reposteward-command-surface.md` | command maturity matrix (= PR B) |
| `references/03-implementation/detection-inventory-v2.md` | 検出 inventory (= Wave 4 #18) |
| `docs/generated/aag/schema-graph.json` | schema dependency graph (= improvement F) |
| `aag-engine/internal/describe/describe.go` | command metadata embedded source-of-truth (= improvement E) |
| `projects/active/reposteward-ai-ops-platform/` | 親 project (= active 中、archive 後は `projects/completed/` 配下に移動) |

## 後続候補 (= post-archive 別 program)

| 候補 | 内容 | trigger |
|---|---|---|
| `schema-graph-collector` | schema-graph.json の自動生成 (= TS collector で articulate) | improvement F が手 curate のままで違和感が大きくなった時 |
| `articulation-map-guard` | 本 map の detection / command / schema 三軸の整合性検証 guard | command 追加時の更新漏れが発生した時 |
| `aag inventory` CLI | detection-inventory-v2 + command-surface + articulation-map を統合 query する CLI command | navigation 用 query が複雑化した時 |
