# decision-audit — aag-platformization

> 役割: 本 program 中の主要判断と事後振り返りの記録 artifact。
> AI が事実と根拠で判断し、Phase 完了時に振り返り観測点を実測する。
>
> 規約: `plan.md` §"Decision Audit Mechanism" + 原則 5。
> 1 entry = 1 判断 = 1 振り返り。判断時と振り返り時で必ず 2 セクションを埋める。

---

## このファイルが存在する理由

本 program は AI が事実と根拠で判断して進める。人間承認は archive 1 点のみに圧縮する (`plan.md` 原則 5)。判断の正しさは「人間の同意」では担保できないため、**判断時に振り返り観測点を articulate** し、**Phase 完了時に観測点を実測** する仕組みを内蔵する。さらに **判断と commit を物理的に結合** し、判断が間違いと判定された場合に **物理的に preJudgement commit に戻れる** ことを制度として保証する。これは AAG 自体が標榜する "適応" を、本 program 内部に実装する装置。

---

## entry テンプレート

新しい判断を追加するときは、以下のテンプレートをコピーして `## DA-{α|β|γ}-{NNN}` で始める entry を最後に追加する。**判断時セクションは判断と同時に書く** (後出しを禁じる)。**振り返りセクションは Phase 完了時に追記する** (観測しないまま判定しない)。**commit lineage は必ず埋める** (sha + tag の両方)。

```markdown
## DA-{α|β|γ}-{NNN}: {判断の名前}

**status**: active | superseded

### 判断時 (Phase N 着手時 / YYYY-MM-DD)

- **判断主体**: AI (Claude) / 補助参考 (もしあれば)
- **候補**:
  1. ...
  2. ...
  3. ...
- **採用案**: ...
- **判断根拠**:
  - 事実 1: 〈調査結果 / file path : line / commit hash〉
  - 事実 2: ...
  - 推論: ...
- **想定リスク**:
  - 採用案が外れたときの最大被害: ...
  - 二番目に被害が大きい外れ方: ...
- **振り返り観測点** (最低 3 つ。1 つ以上は反証可能なもの):
  - 観測点 1 (肯定検証): 〈この事実を観測したら判断が正しかった〉
  - 観測点 2 (否定検証): 〈この事実を観測したら判断が間違っていた〉
  - 観測点 N: ...

### Commit Lineage

- **judgementCommit**: `<sha>` — 本 entry を landing した commit
- **preJudgementCommit**: `<sha>` — 本判断の影響を受ける前の最後の commit (rollback target)
- **judgementTag**: `aag-platformization/DA-{α|β|γ}-{NNN}-judgement` — judgementCommit に付与
- **rollbackTag**: `aag-platformization/DA-{α|β|γ}-{NNN}-rollback-target` — preJudgementCommit に付与
- **implementationCommits**: 本判断に基づく実装 commit (Phase 進行中に追記)
  - `<sha>` — `<commit message 概要>`
  - `<sha>` — `<commit message 概要>`

### 振り返り (Phase N 完了時 / YYYY-MM-DD)

- 観測点 1: 〈実測結果〉 → 期待通り / 期待通りでない
- 観測点 2: 〈実測結果〉 → 期待通り / 期待通りでない
- 観測点 N: 〈実測結果〉 → 期待通り / 期待通りでない
- **判定**: 正しい / 部分的 / 間違い (グラデーションで逃げない)
- **学習**: 何が効いたか / 何を読み違えたか
- **retrospectiveCommit**: `<sha>` — 本振り返りを landing した commit
- **retrospectiveTag**: `aag-platformization/DA-{α|β|γ}-{NNN}-retrospective` — retrospectiveCommit に付与

### 軌道修正 (判定が "部分的" / "間違い" の場合のみ記入)

- **rollback decision**: 完全 revert / 部分 revert / forward-fix で対応
- **rollback procedure** (完全/部分 revert の場合):
  ```bash
  git checkout aag-platformization/DA-{α|β|γ}-{NNN}-rollback-target
  git checkout -b claude/aag-platformization-DA-{NNN}-rollback
  # または個別 commit revert:
  # git revert <implementationCommit-N> ... <implementationCommit-1>
  ```
- **forward-fix plan** (forward-fix の場合): どの Phase の checklist のどの項目を、どう変えるか
- **rollbackCommit**: `<sha>` — rollback / 軌道修正を landing した commit
- **rollbackTag**: `aag-platformization/DA-{α|β|γ}-{NNN}-rollback-applied`
- 本 entry の status を `superseded` に変更し、新たな DA-X-NNN (cross-phase) entry を起こす
```

---

## 必須要件

### 判断時の必須要件

- **振り返り観測点を最低 3 つ書く**。うち 1 つ以上は反証可能 (「この事実が出たら判断は間違っていた」)
- **事実根拠を明示**。推測や直感ではなく、調査済みの fact / file path / line number / commit へのリンクを書く
- **想定リスクを書く**。採用案が外れたときの最大被害と、二番目に大きい外れ方
- **判断時セクションは Phase 着手時に書ききる**。後出し (判断後に観測点を増やす) を禁じる
- **commit lineage を埋める**。judgementCommit / preJudgementCommit / judgementTag / rollbackTag を必ず記録
- **judgementCommit を amend / rebase で書き換えない**。sha が変わると振り返り時に commit を引き当てられなくなる

### 振り返りの必須要件

- 観測点を **実測** する。観測しないまま判定しない
- 判定は **3 値** (正しい / 部分的 / 間違い)。「概ね正しい」「ほぼ間違い」のグラデーション表現を禁じる
- 軌道修正案は **具体** に書く (どの Phase の checklist のどの項目を、どう変えるか / どの commit に戻るか)
- 判定が "間違い" でも、本 program は失敗ではない。**判断の正しさを担保する仕組みが機能した** ことの記録になる
- 軌道修正で rollback を選んだ場合、`rollbackTag` に物理的に戻れることを確認 (`git checkout <rollbackTag>` が動く)

### Commit Message Convention

各 commit の body に **必ず** 以下のいずれかを含める (本 program の commit を後で grep / 追跡できるようにするため):

```
Decision: DA-{α|β|γ}-{NNN} ({judgement|implementation|retrospective|rollback})
```

意味:

- `judgement` — 本判断を articulate した commit (Phase 着手時の DA entry 追加)
- `implementation` — 本判断に基づく実装 commit
- `retrospective` — 本判断の振り返りを landing した commit
- `rollback` — 本判断の軌道修正 / revert を landing した commit

### Tag Convention

判断と commit を物理的に結合するため、Phase 着手 / 完了 / rollback target に **annotated tag** を打つ:

```bash
# 判断時 (Phase N 着手時)
git tag -a "aag-platformization/DA-α-002-rollback-target" -m "preJudgement for DA-α-002" <preJudgementSha>
git tag -a "aag-platformization/DA-α-002-judgement" -m "judgement landing for DA-α-002" <judgementSha>
git push origin "aag-platformization/DA-α-002-judgement" "aag-platformization/DA-α-002-rollback-target"

# 振り返り時 (Phase N 完了時)
git tag -a "aag-platformization/DA-α-002-retrospective" -m "retrospective for DA-α-002" <retrospectiveSha>
git push origin "aag-platformization/DA-α-002-retrospective"

# 軌道修正時 (判定が部分的 / 間違いの場合)
git tag -a "aag-platformization/DA-α-002-rollback-applied" -m "rollback applied for DA-α-002" <rollbackSha>
git push origin "aag-platformization/DA-α-002-rollback-applied"
```

これにより:

- `git log --grep="DA-α-002"` で本判断に関わる全 commit を抽出できる
- `git checkout aag-platformization/DA-α-002-rollback-target` で判断前の状態に物理的に戻れる
- `git diff aag-platformization/DA-α-002-rollback-target..aag-platformization/DA-α-002-retrospective` で判断の影響範囲を可視化できる

---

## 判断 entry 一覧

> Phase が進むにつれて以下に entry を追加していく。Phase 完了時には振り返り欄が埋まる。

### Workstream A — Authority

- (Phase 1 着手時) DA-α-001: Authority Table の 10 concept × 4 列構造の妥当性判断
- (Phase 2 着手時) DA-α-002: Merge Policy 採用案 (defaults stub / merged null / bootstrap seed の 3 案比較)
- (Phase 3 着手時) DA-α-003: Schema isomorphism の方向性 (TS-from-schema vs schema-from-TS)

### Workstream B — Artifactization

- (Phase 4 着手時) DA-β-001: artifact 生成タイミング (`docs:generate` 内 / `build` 内 / 別 script)
- (Phase 8 着手時) DA-β-004: overlay JSON の格納先構造 (`docs/generated/aag/overlays/<id>.json` vs `projects/<id>/aag/execution-overlay.json`)

### Workstream C — Contract

- (Phase 5 着手時) DA-β-002: AagResponse schema 駆動化方針 (codegen の方向性 + renderer 4 種分割の粒度)
- (Phase 6 着手時) DA-β-003: detector protocol の適用範囲 (guard test / collector / pre-commit / 将来 Go)
- (Phase 7 着手時) DA-β-005: RuleBinding 境界 guard の所属 Workstream (現状 C、A への移動可否)

### Workstream D — Operating System

- (Phase 9 着手時) DA-γ-001: Go PoC scope 決定 (parity check 範囲 / CI 組み込み是非)
- (Phase 10 着手時) DA-γ-002: cutover charter の後続 project 分離方針 (`aag-go-cutover` の Level 判定)

### Special — Cross-Phase

- (随時) DA-X-NNN: Phase をまたいで発覚した判断 (Phase N の振り返りで Phase M を再構成する場合等)

---

## 関連

- `plan.md` §不可侵原則 5 (本 mechanism の根拠)
- `plan.md` §"Decision Audit Mechanism" (entry 構造の根拠)
- `AI_CONTEXT.md` §5 "AI-driven judgement + retrospective verification"
- `references/01-principles/aag/evolution.md` (AAG の進化動学の上位思想)
