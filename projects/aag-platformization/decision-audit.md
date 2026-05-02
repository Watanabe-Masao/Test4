# decision-audit — aag-platformization

> 役割: 主要判断の articulation + 振り返り observation の記録 artifact。
> 規約: `plan.md` §4 + 不可侵原則 6。1 entry = 1 判断 = 1 振り返り。
> 観測なき articulation を禁ず (supreme principle)。

## 必須要件

### 判断時 (Phase / 軸 着手時)

- 候補 / 採用案 / 判断根拠 (事実 + 推論)
- 想定リスク (採用案外れ時の最大被害)
- 振り返り観測点 **最低 3 つ** (1 つ以上は反証可能)
- **5 軸 articulation** (製本 / 依存方向 / 意味 / 責務 / 境界、`plan.md` §4)
- **Commit Lineage** (judgementCommit / preJudgementCommit + annotated tag)
- judgementCommit を **amend / rebase / force push 禁止** (sha が rollback target)

### 振り返り (Phase / 軸 完了時)

- 観測点を **実測** (推測 / 主観禁止)
- 判定 = **3 値**: 正しい / 部分的 / 間違い (グラデーション禁止)
- 軌道修正 (判定が "部分的" / "間違い" の場合): rollback procedure or forward-fix plan + rollbackCommit + rollbackTag

### Commit Message Convention

```
Decision: DA-α-NNN ({judgement|implementation|retrospective|rollback})
```

`git log --grep="DA-α-NNN"` で判断系列を抽出可能。

### Tag Convention

```bash
git tag -a "aag-platformization/DA-α-NNN-rollback-target" -m "preJudgement" <preJudgementSha>
git tag -a "aag-platformization/DA-α-NNN-judgement"      -m "judgement landing" <judgementSha>
git tag -a "aag-platformization/DA-α-NNN-retrospective"  -m "retrospective"  <retrospectiveSha>
git push origin <tag>
```

`git checkout aag-platformization/DA-α-NNN-rollback-target` で判断前に物理的に戻れる。

---

## entry テンプレート

```markdown
## DA-α-NNN: <判断名>

**status**: active | superseded

### 判断時 (YYYY-MM-DD / Phase N or 軸 X)

- 候補: 1 / 2 / 3
- 採用案: <case>
- 判断根拠: 事実 + 推論 (file path : line / commit hash)
- 想定リスク: 最大被害 + 二番目に大きい外れ方
- 振り返り観測点 (≥3、≥1 反証可能):
  - 観測点 1 (肯定): ...
  - 観測点 2 (否定): ...
  - 観測点 3: ...

### 5 軸 articulation

- 製本: <canonical / derived>
- 依存方向: <X → Y、一方向 acyclic>
- 意味: <答える 1 問い>
- 責務: <single responsibility>
- 境界: <内 / 外>

### Commit Lineage

- judgementCommit: `<sha>`
- preJudgementCommit: `<sha>`
- judgementTag / rollbackTag: `aag-platformization/DA-α-NNN-{judgement,rollback-target}`
- implementationCommits (Phase 進行中追記):
  - `<sha>` — <概要>

### 振り返り (YYYY-MM-DD)

- 観測点 1: 実測 → 期待通り / でない
- 観測点 2: 実測 → 期待通り / でない
- 観測点 3: 実測 → 期待通り / でない
- 判定: 正しい / 部分的 / 間違い
- 学習: <何が効いた / 何を読み違えた>
- retrospectiveCommit / Tag: `<sha>` / `aag-platformization/DA-α-NNN-retrospective`

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- decision: 完全 revert / 部分 revert / forward-fix
- procedure (revert 系): `git checkout aag-platformization/DA-α-NNN-rollback-target`
- forward-fix plan: <Phase N の checklist 項目をどう変えるか>
- rollbackCommit / Tag
- 本 entry status を `superseded`、新 DA-X-NNN entry を起こす
```

---

## 判断 entry 一覧

| ID | Phase / 軸 | 判断対象 | status |
|---|---|---|---|
| DA-α-000 | Phase 0 | 本 program の進行モデル (AI-driven judgement + retrospective + commit-bound rollback) | active |
| DA-α-001 | Phase 1 / A1 | Authority articulation 方針 (4 layer 正本確認 + back-link) | planned |
| DA-α-002 | Phase 1 / A2 | merge policy 採用案 + format 選定 + 実バグ修復方針 | planned |
| DA-α-003 | Phase 1 / A3 | AagResponse + detector schema 化方針 | planned |
| DA-α-004 | Phase 1 / A4 | RuleBinding 境界 guard 設計 | planned |
| DA-α-005 | Phase 1 / A5 | drawer 4 種 granularity + 配置 | planned |
| DA-α-006 | Phase 2 | simulation CT1-CT5 結果総括 + F1〜F5 status | planned |
| DA-α-007 | Phase 3 | archive 判断 + 横展開 charter 必要性 | planned |

---

## DA-α-000: 本 program の進行モデル決定

**status**: active

### 判断時 (2026-05-01 / Phase 0)

- 候補:
  1. 人間承認 gate モデル (3+ Gate)
  2. AI judgement only (履歴なし)
  3. AI judgement + retrospective verification
  4. **AI judgement + retrospective + commit-bound rollback**
- 採用案: 候補 4
- 判断根拠:
  - 事実 1: user 指示「人間承認はとにかく減らす」「commit log 残す」「判断間違い時に commit に戻れる制度化」
  - 事実 2: `aag/core/principles/core-boundary-policy.md` 「邪魔だから」を理由にできない原則
  - 事実 3: 本 program は AAG self-application、自分自身を例外にできない
- 想定リスク: judgementCommit / Tag 管理 overhead が Phase 進行を鈍化、rollback tag が dead reference 化
- 振り返り観測点:
  - 1 (肯定): Phase 1 の各 DA で commit lineage が漏れず記録される
  - 2 (肯定): 1 件以上の DA で判定 "間違い" or "部分的" + 軌道修正 entry が活用される
  - 3 (反証): Phase 5 までに judgementCommit を amend した事故 0 件
  - 4 (反証): 「overhead」を理由に DA を skip した entry 0 件
  - 5 (反証): rollback tag が一度も使われず全 "正しい" 判定だと dead weight (本 program 完了時に最低 1 件は軌道修正期待)

### 5 軸 articulation

- 製本: 本 program 内 `decision-audit.md` が canonical (派生先なし)
- 依存方向: 上位 = `plan.md` §4 + `references/01-principles/aag/strategy.md`、下位 = なし
- 意味: 「AI 判断履歴 + 物理 rollback 経路を持つ institution の articulation」
- 責務: institution の articulate + 1 entry のみ self-dogfood
- 境界: 本 project 内のみ、横展開対象外

### Commit Lineage

- judgementCommit: `96a9521`
- preJudgementCommit: `d0b079f`
- judgementTag: `aag-platformization/DA-α-000-judgement` (push 済)
- rollbackTag: `aag-platformization/DA-α-000-rollback-target` (push 済)
- implementationCommits:
  - `96a9521` 〜 `<latest>` — 進行モデル articulation + reframe 履歴 + 本 commit clean rewrite

### 振り返り (本 program archive 直前 / TBD)

> Phase 3 完了時または archive 直前に追記、observation 5 件すべて実測。

- 観測点 1〜5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

### 軌道修正 — reframe 履歴 (本 session 中の sub-events、すべて forward-fix)

| date | event | 対応 |
|---|---|---|
| 2026-05-01 | rollback tag sanity check 中の unstaged 衝突 | forward-fix: HANDOFF §3.5 に「rollback 動作確認は worktree clean 時のみ」追加 |
| 2026-05-01 | scope clarification: 「振る舞いを変えない、分離が中心、矛盾・バグは修復」 | forward-fix: plan 不可侵原則 1 articulate |
| 2026-05-01 | format 中立化: JSON は仮置き | forward-fix: format 選定を DA-α-002 に articulate |
| 2026-05-01 | 5 実装品質基準追加 (Q1〜Q5) | forward-fix: 後 5 軸 articulation に統合済 |
| 2026-05-01 | 高品質 refactor (cut / 統合) | forward-fix: doc 数 6→2 cut |
| 2026-05-01 | Pre-Go 条件 4 件 (C1-C4) 復活 | forward-fix: Phase 1 内 A2-A4 に統合 |
| 2026-05-01 | Standard 昇格 (subsystem template + Pilot) | forward-fix: `references/01-principles/platformization-standard.md` 新設 |
| 2026-05-02 | drawer pattern → context provision control の reframe | forward-fix: A5 Generated として統合 |
| 2026-05-02 | 5 軸 + 8 軸 二段 lens | forward-fix: plan §4 articulate |
| 2026-05-02 | CLAUDE.md ≠ AAG entry の訂正 | forward-fix: HANDOFF §3.8 + plan §6「触らない」articulate |
| 2026-05-02 | 前提 collapse → clean rewrite (3 Phase + 1 Gate) | forward-fix: 本 commit |

判定 (本 reframe 系列に対して): **部分的** — articulation は accumulated patch から clean rewrite に restructure 完了、ただし implementation は 0 件。Phase 1 着手で functioning に転じる。

DA-α-000 自体は active のまま継続、judgement model (AI-driven + retrospective + commit-bound rollback) は不変。
