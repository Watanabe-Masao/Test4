# plan — aag-platformization

> **AAG Platformization Program**
> 目的: AAG をアプリ内サブシステムから、authority + artifact + contract + change-policy を持つ独立した品質基盤へ昇華する。Go 移行はその最終 runtime 形であって、本 program の goal ではない。

## 不可侵原則

本 program が **絶対に破ってはいけない** 4 つのルール。違反は escalation 判定 (`projectization.md` §5) を即時発火させる。

### 原則 1: アプリ業務ロジックを 1 行も変えない

本 program は AAG 自体の制度基盤化に閉じる。`domain/calculations/` / `application/usecases/` / `application/queries/` / `presentation/` / readModels の **意味** を変える変更は本 program の scope 外。AAG が改善されたとしても、それを理由に業務側を触らない。

> **理由**: AAG の制度変更とアプリ業務の意味変更を同じ commit に混ぜると、変更の責任境界が崩れる (どちらの diff がどちらの問題を起こしたか追跡不能)。

### 原則 2: 既存 guard の検出範囲を緩めない

既存の guard test (architectureRuleGuard / responsibilityTagGuardV2 / testTaxonomyGuardV2 / 等) の baseline を **緩和方向** に動かさない。Phase 2 の bootstrap path 修復で既存 guard が落ちる場合は、guard を緩めるのではなく実装側を直す。ratchet-down (検出範囲を狭めない方向に baseline を動かす) のみ許容。

> **理由**: 制度基盤化の作業中に既存制度を退行させるのは本末転倒。AAG が床を保証している前提を本 program が壊さない。

### 原則 3: derived artifact を手編集しない

Phase 4 以降に生成される `docs/generated/aag/merged-architecture-rules.json` / `overlay-coverage.json` / `merge-report.json` は **生成物**。手で編集しない。差分が出たら generator (Phase 4 で landing) を直す。

> **理由**: derived の手編集を許すと「正本 → 派生」の方向性が壊れ、artifact が "手で書いた事実" の置き場になる。`source-of-truth.md` 正本ポリシー違反。

### 原則 4: Go PoC は PoC 止まり、本 cutover はしない

Phase 9 で Go binary を作るが、CI 主経路の Go 化 / TS facade の縮退 / Go authoritative 宣言は本 program の scope 外。`aag-go-cutover` (仮称) として後続 project に分離する。本 program は cutover charter (Phase 10) までで止める。

> **理由**: Go 移行を本 program に内包すると Level 4 (umbrella) に escalate せざるを得なくなる。本 program は Level 3 で完結することを設計目標とする。Go 実装を急ぐより authority / artifact / contract / change-policy の 4 軸を完成させる方が、後続 cutover の安全性に効く。

---

## 全体構造 — 4 Workstream / 3 Gate / 10 Phase

本 program は 4 Workstream を 10 Phase に展開し、3 Gate で人間承認を得る。Phase の進行順序は Workstream の論理依存に従う。

```
Workstream A (Authority)        Phase 1 → Phase 2 → Phase 3
                                                ↓
                                         [Gate 1: Authority Gate]
                                                ↓
Workstream B (Artifactization)  Phase 4 → Phase 8
Workstream C (Contract)         Phase 5 → Phase 6 → Phase 7
                                                ↓
                                         [Gate 2: Artifact Gate]
                                                ↓
Workstream D (Operating System) Phase 9 → Phase 10
                                                ↓
                                         [Gate 3: Runtime Replacement Gate]
                                                ↓
                                         [最終レビュー (人間承認)]
```

### Workstream の役割

| Workstream | 目的 | 含む Phase |
|---|---|---|
| **A. Authority** | 何が正本か / 何を schema にするかを決め切る | 1, 2, 3 |
| **B. Artifactization** | runtime merge を build artifact に変える | 4, 8 |
| **C. Contract** | TS helper に宿った意味を schema に引き剥がす | 5, 6, 7 |
| **D. Operating System** | AAG をコードではなく制度として管理する | 9, 10 |

### Gate の役割

| Gate | 通過条件 | 承認主体 |
|---|---|---|
| **Gate 1: Authority Gate** | 何が正本かが固定された (Phase 1〜3 完了) | 人間 |
| **Gate 2: Artifact Gate** | merged artifact + AagResponse / detector contract が landing | 人間 |
| **Gate 3: Runtime Replacement Gate** | Go PoC が動き、cutover charter が文書化された | 人間 |

各 Gate は `checklist.md` の対応 Phase 末尾の checkbox で機械判定する。

---

## Phase 構造

### Phase 0: Bootstrap (本 commit で完了)

`projects/_template` から本 project を複写し、必須セット 6 ファイルを埋める。AAG-COA Level 3 を `projectization.md` に記録する。最終レビュー (人間承認) checkbox を `checklist.md` 末尾に置く。`open-issues.md` に行を追加し、`CURRENT_PROJECT.md` を切り替えて `npm run verify:project` / `test:guards` / `docs:generate` / `docs:check` / `lint` / `build` が PASS することを確認する。

完了条件: `checklist.md` Phase 0 が全 [x]。

---

### Workstream A — Authority Program

#### Phase 1: Authority Charter

**目的**: AAG の 4 役割 (Core / App Profile / Derived Artifact / Consumer Facade) を文書として固定する。

**やること**:

- `aag/core/AAG_AUTHORITY_TABLE.md` を新設し、以下 4 列の表を定義:
    - `concept`: RuleSemantics / RuleGovernance / RuleOperationalState / RuleDetectionSpec / RuleBinding / DEFAULT_EXECUTION_OVERLAY / EXECUTION_OVERLAY / ARCHITECTURE_RULES / AagResponse / DetectorResult
    - `authority`: Core / App Profile / Derived Artifact / Consumer Facade
    - `physical source`: ファイルパス
    - `change policy`: 誰の承認で変えてよいか
- `aag/core/AAG_CORE_INDEX.md` から本 doc にリンクする
- `references/01-principles/aag/source-of-truth.md` に "Authority Table" セクションを追加し、本 doc を index する

**完了条件**: `AAG_AUTHORITY_TABLE.md` に全 10 concept が分類された状態で landing。`docs:check` PASS。

#### Phase 2: Merge Policy Fix

**目的**: bootstrap 破綻 (空 overlay → `merged.ts` throw) を修復し、merge policy を 1 つに固定する。

**やること**:

- `aag/core/MERGE_POLICY.md` を新設し、以下 3 案から人間承認で 1 つを採用:
    - **案 A**: `defaults.ts` に reviewPolicy stub を追加 (owner: 'unassigned' / lastReviewedAt: null / reviewCadenceDays: 90)
    - **案 B**: `merged.ts` で project overlay 不在時に reviewPolicy を null として組み立て、reviewPolicy 必須は別 guard に逃がす
    - **案 C**: bootstrap で `seed-execution-overlay.ts` を生成必須化 (空 overlay を許さない)
- `RuleExecutionOverlayEntry` を `aag-core-types.ts` に集約 (現状は _template と pure-calculation-reorg で二重定義)
- `_template/aag/execution-overlay.ts` の comment と `pure-calculation-reorg/aag/execution-overlay.ts` の comment を採用案に揃える
- `merged.ts` の merge result に `resolvedBy` field を追加 (project-overlay / defaults / stub の 3 値)
- `new-project-bootstrap-guide.md` Step 4 を採用案に合わせて書き直す

**完了条件**: 空 `EXECUTION_OVERLAY = {}` で `merged.ts` が throw せず動く。`pure-calculation-reorg` の既存挙動が維持される。`test:guards` PASS。

#### Phase 3: Authority Table + Schema Registry

**目的**: 現存する 5 つの Core type を JSON Schema として正本化する。

**やること**:

- `aag/core/AAG_SCHEMA_REGISTRY.md` を新設し、schema 一覧と version policy を定義
- 以下 5 schema を `docs/contracts/aag/` 配下に新設:
    - `rule-semantics.schema.json` (from `aag-core-types.ts` `RuleSemantics`)
    - `rule-governance.schema.json` (from `RuleGovernance`)
    - `rule-operational-state.schema.json` (from `RuleOperationalState`)
    - `rule-detection-spec.schema.json` (from `RuleDetectionSpec`)
    - `rule-binding.schema.json` (from `architectureRules/types.ts` `RuleBinding`)
- 各 schema に `$id` / `version` / `description` を設定
- TS 型と schema の同型性を検証する guard を新設 (`aagSchemaIsomorphismGuard.test.ts`)

**完了条件**: 5 schema が landing し、TS 型変更時に同型性 guard が落ちる。`test:guards` PASS。**[Gate 1: Authority Gate] 通過判定**。

---

### Workstream B — Artifactization Program

#### Phase 4: Merged Artifact Generator

**目的**: runtime merge を build artifact に変え、`resolvedBy` で transparency を担保する。

**やること**:

- `tools/architecture-health/src/aag/merge-artifact-generator.ts` を新設
- 以下を生成:
    - `docs/generated/aag/merged-architecture-rules.json` (全 rule の merge 結果 + 各 field の `resolvedBy`)
    - `docs/generated/aag/merge-report.json` (merge 統計: project override 率 / defaults 補完率 / stub 適用率)
    - `docs/generated/aag/overlay-coverage.json` (各 project overlay の rule 網羅率)
- `npm run docs:generate` から呼び出す
- generated section の鮮度検証を `docs:check` に組み込む

**完了条件**: 3 artifact が `npm run docs:generate` で再生成可能。差分があれば `docs:check` が落ちる。

#### Phase 8: Overlay Artifactization

**目的**: defaults / 各 project overlay を JSON artifact 化し、Go runtime から直接読める状態にする。

**やること**:

- `docs/generated/aag/default-execution-overlay.json` を `defaults.ts` から生成
- 各 active project (`pure-calculation-reorg` / `presentation-quality-hardening` / `aag-platformization`) の `aag/execution-overlay.ts` を `aag/execution-overlay.json` と並列出力 (TS は authoring 正本として残す)
- 後続 Phase 9 の Go PoC が JSON 経由で読めることを確認

**完了条件**: 全 overlay が JSON artifact として存在し、TS と JSON の同期 guard が landing。

---

### Workstream C — Contract Program

#### Phase 5: AagResponse Contract Separation

**目的**: AagResponse を helper 駆動から schema 駆動に切り替える。

**やること**:

- `docs/contracts/aag/aag-response.schema.json` を新設
- `tools/architecture-health/src/aag-response.ts` の `AagResponse` 型を schema からの型生成に切り替え
- renderer (`renderAagResponse`) を text / markdown / shell / pr-comment の 4 種に分割 (今は text のみ)
- helpers.ts は schema-backed AagResponse を re-export するだけにする
- AAG docs (`references/01-principles/aag/`) で AagResponse を doc 化

**完了条件**: AagResponse が schema を 1 次正本として振る舞う。4 renderer が functional。`test:guards` PASS。

#### Phase 6: Detector Protocol

**目的**: guard / collector / pre-commit / 将来の Go detector が同一 protocol で出力する。

**やること**:

- `docs/contracts/aag/detector-result.schema.json` を新設 (ruleId / detectionType / sourceFile / evidence / actual / baseline / severity / messageSeed)
- 既存 guard test の violation message 構築箇所を schema 準拠に揃える (helpers.ts `formatViolationMessage` 経由)
- collector (obligation-collector / dependency-collector / 等) も同 schema に揃える
- pre-commit hook の output も同 schema 準拠

**完了条件**: 全 detector output が schema validation を通る。`test:guards` PASS。

#### Phase 7: RuleBinding Boundary Guard

**目的**: `RuleBinding` に意味系フィールド (what / why / decisionCriteria / migrationRecipe / fixNow / executionPlan / lifecyclePolicy) が漏れないことを機械保証する。

**やること**:

- `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` を新設
- 許可フィールド: `doc` / `correctPattern` / `outdatedPattern` / `canonicalDocRef` / `metaRequirementRefs` (現状の 5 つ)
- 禁止フィールド: 上記 7 つ + 任意の `detection*` / `governance*` / `operationalState*` プレフィックス
- `aag/core/principles/rule-binding-policy.md` を新設し、許可 / 禁止 list の根拠を articulate

**完了条件**: 違反コードを試験的に書くと guard が hard fail する。`test:guards` PASS。**[Gate 2: Artifact Gate] 通過判定**。

---

### Workstream D — Operating System Program

#### Phase 9: Go Core PoC

**目的**: Go で AAG Core の最小 authoritative path を動かす (PoC 止まり、本 cutover はしない)。

**やること**:

- `tools/aag-go/` を新設 (Go module)
- 実装する binary (3 つ):
    - `aag-go validate` — `docs/contracts/aag/*.schema.json` で merged artifact を validate
    - `aag-go merge` — `default-execution-overlay.json` + `<project>/execution-overlay.json` + `base-rules.json` (Phase 4 で派生済) を merge
    - `aag-go render-response` — AagResponse JSON を 4 renderer (text / markdown / shell / pr-comment) で出力
- TS 側の merge 結果と Go 側の merge 結果が **byte-identical** であることを確認するスクリプトを新設
- CI には組み込まない (後続 cutover project の責務)

**完了条件**: 3 binary が builds し、PoC として手動実行で TS と同一結果を返す。

#### Phase 10: Cutover Charter + Change Policy

**目的**: 本 program で確立した制度を後続 cutover に引き渡せる形で文書化する。

**やること**:

- `aag/core/AAG_CORE_CHANGE_POLICY.md` を新設し、以下を articulate:
    - schema versioning 必須ルール
    - golden test 必須ルール
    - compatibility test 必須ルール
    - merge policy の変更は人間承認必須
    - `RuleBinding` 境界違反は hard fail
    - Core に app 固有具体名を入れたら hard fail
- `aag/core/AAG_CUTOVER_CHARTER.md` を新設し、後続 `aag-go-cutover` project の前提・nonGoals・着手条件を articulate
- `references/02-status/recent-changes.md` に本 program のサマリを追加
- 完了済 4 AAG project (`aag-core-doc-refactor` / `aag-rule-schema-meta-guard` / `aag-display-rule-registry` / `aag-legacy-retirement`) の継承関係を明記

**完了条件**: 2 doc が landing。`docs:check` PASS。**[Gate 3: Runtime Replacement Gate] 通過判定**。

---

### 最終レビュー (人間承認)

`checklist.md` 末尾の最終レビュー checkbox を人間が approve することで、本 program は archive プロセスへ移行可能な状態となる。

---

## やってはいけないこと

| 禁止事項 | なぜ禁止か |
|---|---|
| アプリ業務ロジック (`domain/calculations/` / `application/usecases/` / readModels) の意味を変える | 不可侵原則 1 違反。本 program と業務変更の責任境界が崩れる |
| 既存 guard の baseline を緩和方向に動かす | 不可侵原則 2 違反。AAG が床を保証している前提を本 program が壊す |
| `docs/generated/aag/*.json` を手編集する | 不可侵原則 3 違反。正本→派生の方向性が壊れる |
| Phase 9 完了をもって CI の主経路を Go に切り替える | 不可侵原則 4 違反。後続 `aag-go-cutover` project の所掌 |
| `base-rules.ts` (10,805 行) を全 JSON 化する | nonGoal §4。authoring の rich TS 表現 (型補完 / リファクタ安全) を毀損する |
| `pure-calculation-reorg` の `aag/execution-overlay.ts` rule entry を削除する | nonGoal。本 program は overlay 型 / comment / authority 契約の整理に閉じる。entry の意味判断は所掌外 |
| `references/99-archive/` 配下の旧 AAG doc を削除する | `aag-legacy-retirement` で archive 移管済み。本 program で再削除すると履歴が壊れる |
| Phase 2 完了前に新規 project を bootstrap する | bootstrap path が破綻している (HANDOFF §3.1)。Phase 2 修復後に手順を確定してから |
| 単一 commit で 2 Phase 以上をまとめる | Phase 境界での `docs:generate` / `test:guards` 検証ができなくなる。Phase 単位で commit する |
| AAG 関連 doc を更新せず `tools/architecture-health/` を編集する | obligation-collector が AAG 8 doc の read 義務を発火する (HANDOFF §3.5)。Phase 5 / 6 で必須 |

---

## 関連実装

### Phase 1〜3 (Authority)

| パス | 役割 |
|---|---|
| `aag/core/AAG_AUTHORITY_TABLE.md` | 新設 (Phase 1) — 10 concept × 4 列の正本表 |
| `aag/core/MERGE_POLICY.md` | 新設 (Phase 2) — merge 解決順序と reviewPolicy 契約 |
| `aag/core/AAG_SCHEMA_REGISTRY.md` | 新設 (Phase 3) — schema 一覧と version policy |
| `app/src/test/aag-core-types.ts` | 修正 (Phase 2) — `RuleExecutionOverlayEntry` 集約 |
| `app/src/test/architectureRules/merged.ts` | 修正 (Phase 2 / 4) — bootstrap 修復 + `resolvedBy` 追加 |
| `app/src/test/architectureRules/defaults.ts` | 修正 (Phase 2) — reviewPolicy stub (採用案次第) |
| `app/src/test/guards/aagSchemaIsomorphismGuard.test.ts` | 新設 (Phase 3) — TS 型と JSON Schema の同型性検証 |

### Phase 4, 8 (Artifactization)

| パス | 役割 |
|---|---|
| `tools/architecture-health/src/aag/merge-artifact-generator.ts` | 新設 (Phase 4) |
| `docs/generated/aag/merged-architecture-rules.json` | 派生 (Phase 4) |
| `docs/generated/aag/merge-report.json` | 派生 (Phase 4) |
| `docs/generated/aag/overlay-coverage.json` | 派生 (Phase 4) |
| `docs/generated/aag/default-execution-overlay.json` | 派生 (Phase 8) |
| `projects/<id>/aag/execution-overlay.json` | 派生 (Phase 8、各 active project ごと) |

### Phase 5〜7 (Contract)

| パス | 役割 |
|---|---|
| `docs/contracts/aag/aag-response.schema.json` | 新設 (Phase 5) |
| `docs/contracts/aag/detector-result.schema.json` | 新設 (Phase 6) |
| `tools/architecture-health/src/aag-response.ts` | 修正 (Phase 5) — schema 駆動化 + 4 renderer 分離 |
| `app/src/test/guards/ruleBindingBoundaryGuard.test.ts` | 新設 (Phase 7) |
| `aag/core/principles/rule-binding-policy.md` | 新設 (Phase 7) |

### Phase 9〜10 (Operating System)

| パス | 役割 |
|---|---|
| `tools/aag-go/` | 新設 (Phase 9) — Go module |
| `tools/aag-go/cmd/aag-go-validate/` | 新設 (Phase 9) |
| `tools/aag-go/cmd/aag-go-merge/` | 新設 (Phase 9) |
| `tools/aag-go/cmd/aag-go-render-response/` | 新設 (Phase 9) |
| `aag/core/AAG_CORE_CHANGE_POLICY.md` | 新設 (Phase 10) |
| `aag/core/AAG_CUTOVER_CHARTER.md` | 新設 (Phase 10) |

### 触らないが影響を受けるもの

| パス | 役割 |
|---|---|
| `app-domain/gross-profit/rule-catalog/base-rules.ts` (10,805 行) | TS authoring 正本として維持 |
| `app/src/test/architectureRules.ts` | facade として維持 (内部だけ artifact 駆動化) |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | AAG path obligation を維持 |
| `references/01-principles/aag/` (9 doc, 1,538 行) | 整合参照のみ (本 program で削除しない) |
