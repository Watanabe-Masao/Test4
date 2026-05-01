# plan — aag-platformization

> **AAG Platformization Program**
> 目的: AAG をアプリ内サブシステムから、authority + artifact + contract + change-policy を持つ独立した品質基盤へ昇華する。Go 移行はその最終 runtime 形であって、本 program の goal ではない。

## 不可侵原則

本 program が **絶対に破ってはいけない** 5 つのルール。違反は escalation 判定 (`projectization.md` §5) を即時発火させる。

### 原則 0: 言語層を混ぜない

AAG は本体 (粗利管理システム) と空間 / 意味 / 言語が異なる別サブシステムとして物理境界を持つ。以下を **禁じる**:

- AAG Core / Domain で **Zod** を使うこと (Zod は本体ドメインの runtime validation 用)
- AAG Core / Domain で **Rust** を使うこと (Rust/WASM は本体計算エンジン用)
- AAG 接続部 (TS) で **Go** をリンクすること (接続部は TS のまま)

層別言語 mapping は固定:

| AAG layer | 言語 / 形式 | 物理境界 |
|---|---|---|
| **Core** | Go | `tools/aag-go/` (Phase 9 で新設) |
| **Domain** (rules / schemas / overlays) | JSON + Go | `docs/contracts/aag/` / `docs/generated/aag/` |
| **接続部** (consumer facade / authoring helper) | TypeScript | `app/src/test/architectureRules*` / `tools/architecture-health/` |

> **理由**: AAG が Zod / Rust を借りると、本体ドメインと AAG が同じ道具立てを共有することになり、責務の混線が起きる。AAG は本体に依存しないことを物理層で保証する。

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

### 原則 5: 判断の正しさは "人間の同意" で担保しない

本 program は **AI が事実と根拠で判断して進める**。人間承認は **archive 1 点のみ** に圧縮する。各 Phase の選択肢比較・採用案決定は AI が articulate された判断基準で行い、`decision-audit.md` に **判断時の根拠と振り返り観測点** を記録する。Phase 完了時に観測点を実測し、判断が正しかったか / 部分的か / 間違っていたかを追記する。間違っていた場合は同 artifact に軌道修正方針を記録する。

> **理由**: 「人間が同意したから正しい」という構造を作らない。同意は判断の根拠ではなく **責任の引受** に過ぎない。判断の正しさは事後の事実観測でしか確かめられない。本 program はそれを制度に組み込む (`projectization.md` §2 `requiresHumanApproval=true` は archive 承認のみ。本 §"Decision Audit Mechanism" 参照)。

---

## 全体構造 — 4 Workstream / 3 AI Checkpoint / 10 Phase

本 program は 4 Workstream を 10 Phase に展開し、Phase 群の境界に **AI Checkpoint** を置く。Checkpoint は人間承認 gate ではなく、**AI が判断を articulate し、振り返り観測点を実測し、次へ進めるかを事実で判定する** 内部手続き。

```
Workstream A (Authority)        Phase 1 → Phase 2 → Phase 3
                                                ↓
                                  [AI Checkpoint α: Authority]
                                                ↓
Workstream B (Artifactization)  Phase 4 → Phase 8
Workstream C (Contract)         Phase 5 → Phase 6 → Phase 7
                                                ↓
                                   [AI Checkpoint β: Artifact]
                                                ↓
Workstream D (Operating System) Phase 9 → Phase 10
                                                ↓
                              [AI Checkpoint γ: Runtime Replacement]
                                                ↓
                              [最終 archive レビュー (人間承認)]
                              ※ project-checklist-governance §3.1 構造要請
```

### Workstream の役割

| Workstream | 目的 | 含む Phase |
|---|---|---|
| **A. Authority** | 何が正本か / 何を schema にするかを決め切る | 1, 2, 3 |
| **B. Artifactization** | runtime merge を build artifact に変える | 4, 8 |
| **C. Contract** | TS helper に宿った意味を schema に引き剥がす | 5, 6, 7 |
| **D. Operating System** | AAG をコードではなく制度として管理する | 9, 10 |

### AI Checkpoint の役割

| Checkpoint | 通過条件 (機械検証) | AI が記録すること |
|---|---|---|
| **α: Authority** | Phase 1〜3 完了 + 振り返り観測点が全て期待通り | DA-α-001 (Phase 1 採用案 + 振り返り結果) |
| **β: Artifact** | Phase 4〜7 完了 + merged artifact / response / detector schema が consumer 健全に届く | DA-β-001〜003 (Phase 4/5/6 各判断 + 振り返り) |
| **γ: Runtime Replacement** | Phase 8〜10 完了 + Go PoC が TS と byte-identical + change policy 文書化 | DA-γ-001 (Phase 9 PoC scope 判断 + 振り返り) |

各 Checkpoint は `checklist.md` の対応 Phase 末尾の checkbox で機械判定する。**人間承認は不要**。判断が誤っていたと振り返りで判明した場合は、`decision-audit.md` の "軌道修正" entry を追加し、後続 Phase 構造を再構成する。

### Decision Audit Mechanism

本 program 中の主要判断は `decision-audit.md` に entry として landing する。1 entry = 1 判断 = 1 振り返り。**判断と commit を物理的に結合し、判断が間違いと判定された場合に物理的に戻れる** ことを制度として保証する。

各 entry の構造:

```markdown
## DA-{α|β|γ}-{NNN}: {判断の名前}

### 判断時 (Phase N 着手時 / YYYY-MM-DD)

- **判断主体**: AI (Claude) / 補助参考
- **候補**: ...
- **採用案**: ...
- **判断根拠**: 事実 + 推論 (どの調査結果に基づくか)
- **想定リスク**: ...
- **振り返り観測点**:
  - 観測点 1: 〈この事実を観測したら判断が正しかった〉
  - 観測点 2: 〈この事実を観測したら判断が間違っていた〉
  - 観測点 N: ...

### Commit Lineage

- **judgementCommit**: `<sha>` (本 entry を landing した commit)
- **preJudgementCommit**: `<sha>` (本判断の影響を受ける前の最後の commit = rollback target)
- **judgementTag**: `aag-platformization/DA-{α|β|γ}-{NNN}-judgement` (judgement commit に付与)
- **rollbackTag**: `aag-platformization/DA-{α|β|γ}-{NNN}-rollback-target` (preJudgement commit に付与)

### 振り返り (Phase N 完了時 / YYYY-MM-DD)

- 観測点 1: 観測結果 → 期待通り / 期待通りでない
- 観測点 N: 観測結果 → 期待通り / 期待通りでない
- **判定**: 正しい / 部分的 / 間違い
- **学習**: 何が効いたか / 何を読み違えたか
- **retrospectiveCommit**: `<sha>` (本振り返りを landing した commit)

### 軌道修正 (判定が "部分的" / "間違い" の場合)

- **rollback decision**: 完全 revert / 部分 revert / forward-fix で対応
- **rollback procedure** (該当する場合):
  ```bash
  # 完全 revert (本判断以降を破棄して preJudgement に戻る)
  git checkout <preJudgementCommit>
  git checkout -b claude/aag-platformization-DA-{NNN}-rollback
  # または rollbackTag 経由
  git checkout aag-platformization/DA-{α|β|γ}-{NNN}-rollback-target
  ```
- **forward-fix plan** (該当する場合): どの Phase の checklist のどの項目を、どう変えるか
- **rollbackCommit**: `<sha>` (rollback / 軌道修正を landing した commit)
- 本 entry は status を `superseded` に変更し、新たな DA-X-NNN (cross-phase) entry を起こす
```

**判断時の必須要件**:

- **振り返り観測点を最低 3 つ書く** (1 つ以上は反証可能 — 「この事実が出たら判断は間違っていた」)
- **事実根拠を明示** — 推測や直感ではなく、調査済みの事実 / file path / line number / commit へのリンク
- **想定リスクを書く** — 採用案が外れたときの最大被害
- **commit lineage を埋める** — judgement / preJudgement の両 commit を必ず記録。tag を打って push する
- **judgement commit を amend 禁止** — sha が変わると振り返り時に commit を引き当てられなくなる

**振り返りの必須要件**:

- 観測点を実測する。**観測しないまま判定しない**
- 判定は 3 値: 正しい / 部分的 / 間違い (グラデーションで逃げない)
- 軌道修正案は具体的に書く (どの Phase をどう変えるか / どの commit に戻るか)

**Commit message convention**:

各 commit の body に **必ず** 以下のいずれかを含める:

```
Decision: DA-{α|β|γ}-{NNN} ({judgement|implementation|retrospective|rollback})
```

- `judgement` — 本判断を articulate した commit (Phase 着手時)
- `implementation` — 本判断に基づく実装 commit
- `retrospective` — 本判断の振り返りを landing した commit
- `rollback` — 本判断の軌道修正 / revert を landing した commit

例:
```
docs(decision): DA-α-002 merge policy 採用案 = defaults stub

3 案 (defaults stub / merged null / bootstrap seed) を blast radius / migration
cost / 後方互換 で比較し、defaults stub を採用。

Decision: DA-α-002 (judgement)
```

**Tag convention**:

- Phase 着手 commit に `aag-platformization/DA-{α|β|γ}-{NNN}-judgement` tag
- Phase 完了 commit に `aag-platformization/DA-{α|β|γ}-{NNN}-retrospective` tag
- 判断前の最後の commit に `aag-platformization/DA-{α|β|γ}-{NNN}-rollback-target` tag
- tag は **annotated tag** (`git tag -a`) で push する

これによって `git log --grep="DA-α-002"` で判断履歴を抽出でき、`git checkout aag-platformization/DA-α-002-rollback-target` で物理的に戻れる。

**Rollback の制度化**:

判定が "間違い" の場合、本 program は失敗ではなく **判断の正しさを担保する仕組みが機能した** ことを意味する。具体的には:

1. 振り返り entry に判定 = "間違い" を記録 (`retrospectiveCommit` を landing)
2. `rollback decision` を articulate (完全 revert / 部分 revert / forward-fix のいずれか)
3. 採用した rollback 手順を実行 (`rollbackCommit` を landing、tag = `aag-platformization/DA-{α|β|γ}-{NNN}-rollback-applied` を打つ)
4. 元の DA entry の status を `superseded` に変更
5. 新たな判断を立てる場合は DA-X-NNN (cross-phase) として新 entry を起こす

これは AAG 自体の "適応" を本 program 内部に埋め込む装置。AI が後続 program / 後続 maintainer に判断履歴と物理的な rollback 経路の両方を引き継げる形にする。

---

## Phase 構造

### Phase 0: Bootstrap (本 commit で完了)

`projects/_template` から本 project を複写し、必須セット 6 ファイルを埋める。AAG-COA Level 3 を `projectization.md` に記録する。最終 archive レビュー checkbox (人間承認、構造的要請) を `checklist.md` 末尾に置く。`open-issues.md` に行を追加し、`CURRENT_PROJECT.md` を切り替えて `npm run verify:project` / `test:guards` / `docs:generate` / `docs:check` / `lint` / `build` が PASS することを確認する。

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

- `aag/core/MERGE_POLICY.md` を新設し、以下 3 案を blast radius / migration cost / 後方互換 で比較する一覧を作成、AI が事実根拠で 1 案を採用 (判断は `decision-audit.md` DA-α-002 に記録):
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

**完了条件**: 5 schema が landing し、TS 型変更時に同型性 guard が落ちる。`test:guards` PASS。**[AI Checkpoint α: Authority] 通過判定** — `decision-audit.md` の DA-α-001〜003 振り返り全 entry が "正しい" or "部分的+軌道修正記録あり" 状態。

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
- 各 active project の `aag/execution-overlay.ts` を `docs/generated/aag/overlays/<project-id>.json` として並列出力 (TS は authoring 正本として残す)
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

**完了条件**: 違反コードを試験的に書くと guard が hard fail する。`test:guards` PASS。**[AI Checkpoint β: Artifact] 通過判定** — `decision-audit.md` の DA-β-001〜003 振り返り全 entry が "正しい" or "部分的+軌道修正記録あり" 状態。

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
    - merge policy の変更は `decision-audit.md` への entry 追加必須 (AI 判断 + 振り返り観測点)
    - `RuleBinding` 境界違反は hard fail
    - Core に app 固有具体名を入れたら hard fail
- `aag/core/AAG_CUTOVER_CHARTER.md` を新設し、後続 `aag-go-cutover` project の前提・nonGoals・着手条件を articulate
- `references/02-status/recent-changes.md` に本 program のサマリを追加
- 完了済 4 AAG project (`aag-core-doc-refactor` / `aag-rule-schema-meta-guard` / `aag-display-rule-registry` / `aag-legacy-retirement`) の継承関係を明記

**完了条件**: 2 doc が landing。`docs:check` PASS。**[AI Checkpoint γ: Runtime Replacement] 通過判定** — `decision-audit.md` の DA-γ-001 (Phase 9 PoC scope 判断) 振り返り entry が "正しい" or "部分的+軌道修正記録あり" 状態。

---

### 最終 archive レビュー (人間承認、構造的要請)

`checklist.md` 末尾の最終レビュー checkbox は `references/03-guides/project-checklist-governance.md` §3.1 の構造要請。AI による本 program の判断履歴 (`decision-audit.md` の全 entry) を人間が読み、archive プロセスへの移行を承認する。

**この承認は判断の正しさを担保しない**。人間の "同意" は責任の引受であって、判断の根拠ではない (原則 5)。判断が後日誤りと判明した場合は、後続 program で `decision-audit.md` の "軌道修正" 列を追記して継承する。

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
