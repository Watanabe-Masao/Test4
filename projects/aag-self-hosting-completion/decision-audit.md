# decision-audit — aag-self-hosting-completion

> 役割: 主要判断の articulation + 振り返り observation の記録 artifact。
> 規約: `plan.md` §1 不可侵原則 + `references/03-guides/decision-articulation-patterns.md` Pattern 1 (Commit-bound Rollback) + Pattern 4 (Honest Articulation)。
> 1 entry = 1 判断 = 1 振り返り。**観測なき articulation を禁ず**。

## 必須要件

### 判断時 (Phase / 軸 着手時)

- 候補 / 採用案 / 判断根拠 (事実 + 推論)
- 想定リスク (採用案外れ時の最大被害)
- 振り返り観測点 **最低 5 つ** (1 つ以上は反証可能、不可侵原則 6)
- **5 軸 articulation** (製本 / 依存方向 / 意味 / 責務 / 境界、AAG component design lens)
- **Commit Lineage** (judgementCommit / preJudgementCommit + annotated tag)
- judgementCommit を **amend / rebase / force push 禁止** (= sha が rollback target)

### 振り返り (Phase / 軸 完了時)

- 観測点を **実測** (推測 / 主観禁止)
- 判定 = **3 値**: 正しい / 部分的 / 間違い (= drawer Pattern 4 適用、graduation 禁止)
- 軌道修正 (判定が "部分的" / "間違い" の場合): rollback procedure or forward-fix plan + rollbackCommit + rollbackTag

### Commit Message Convention

```
Decision: DA-α-NNN ({judgement|implementation|retrospective|rollback})
```

`git log --grep="DA-α-NNN"` で判断系列を抽出可能。

### Tag Convention

```bash
git tag -a "aag-self-hosting-completion/DA-α-NNN-rollback-target" -m "preJudgement" <preJudgementSha>
git tag -a "aag-self-hosting-completion/DA-α-NNN-judgement"      -m "judgement landing" <judgementSha>
git tag -a "aag-self-hosting-completion/DA-α-NNN-retrospective"  -m "retrospective"  <retrospectiveSha>
```

`git checkout aag-self-hosting-completion/DA-α-NNN-rollback-target` で判断前に物理的に戻れる。

---

## 判断 entry 一覧

| ID | Phase / 軸 | 判断対象 | status |
|---|---|---|---|
| DA-α-000 | Phase 0 | 本 program の進行モデル (drawer Pattern 1 application + AAG Pilot DA institution からの継承判断) | active |
| DA-α-001 | Phase R1 | AAG sub-tree relocation 着手判断 (= 9 doc 物理移動 + 101 inbound update) | planned |
| DA-α-002 | Phase R2 | drawer + protocols + operations relocate 判断 | planned |
| DA-α-003 | Phase R3 | references/ directory rename 判断 (= 5 directory rename + 1,000+ inbound update + 138 guard path) | planned |
| DA-α-004 | Phase R4 | per-element directory + dashboard layer 判断 (= pilot subset 選定 + 機械生成 mechanism) | planned |
| DA-α-005 | Phase R5 | operational-protocol-system M1-M5 deliverable landing 判断 | planned |
| DA-α-006 | Phase R6 | AAG self-hosting closure articulate update 判断 (= meta.md §2.1 + selfHostingGuard 拡張) | planned |
| DA-α-007 | Phase R7 | verify + archive 判断 | planned |

---

## DA-α-000: 本 program の進行モデル決定

**status**: active

### 判断時 (2026-05-02 / Phase 0)

- 候補:
  1. 人間承認 gate モデル (3+ Gate)
  2. AI judgement only (履歴なし)
  3. AI judgement + retrospective verification
  4. **AI judgement + retrospective + commit-bound rollback** (= drawer Pattern 1 + AAG Pilot DA institution からの継承)
- 採用案: 候補 4
- 判断根拠:
  - 事実 1: AAG Pilot (= `projects/completed/aag-platformization/`) で同 institution が成立、19+ reframes に対し rollback 0 件で機能 verify 済 (= drawer Pattern 1 の application instance が実証)
  - 事実 2: drawer (= `references/03-guides/decision-articulation-patterns.md`) Pattern 1 が一般 trigger と適用領域を articulate 済 (= 領域 agnostic、本 project でも reuse 可能)
  - 事実 3: 不可侵原則 7「起動・archive 判断は user 領域、AI 単独で起動・archive しない」と整合 (= AI 単独進行 + 最終 archive 人間承認)
  - 事実 4: operational-protocol-system project でも同 institution で進行中 (= DA-α-000 = 進行モデル landing)、本 project も同 institution 採用で structural separation 整合
- 想定リスク:
  - 最大被害: judgementCommit / Tag 管理 overhead が R-phase 進行を鈍化、rollback tag が dead reference 化。mitigation = AAG Pilot で実証済 + operational-protocol-system bootstrap で適用済 (rollback 0 件でも DA institution は psychological safety + scope discipline として機能)
  - 二番目: tag prefix `aag-self-hosting-completion/DA-α-` が既存 prefix (= aag-platformization, operational-protocol-system) と区別されない混同 risk。mitigation = prefix 完全一致 + repo 内 tag list で区別可能
- 振り返り観測点 (5 点):
  - 1 (肯定): 全 R-phase の各 DA で commit lineage が漏れず記録される
  - 2 (肯定): 1 件以上の DA で判定 "間違い" or "部分的" + 軌道修正 entry が活用される (= AAG Pilot DA-α-005 で precedent)
  - 3 (反証): 全 R-phase で judgementCommit を amend した事故 0 件
  - 4 (反証): 「overhead」を理由に DA を skip した entry 0 件
  - 5 (反証): rollback tag が一度も使われずすべて "正しい" 判定だと dead weight (= AAG Pilot 後の本 project でも同様、Pattern 1 の psychological safety value を articulate)

### 5 軸 articulation

- **製本** (canonical): 本 program 内 `decision-audit.md` が canonical (派生先なし)
- **依存方向**: 上位 = `plan.md` §1 + drawer Pattern 1、下位 = なし。AAG Pilot + operational-protocol-system DA institution からの一方向継承
- **意味**: 「AI 判断履歴 + 物理 rollback 経路を持つ institution の articulation」(= AAG Pilot DA-α-000 + operational-protocol-system DA-α-000 の領域 agnostic 拡張)
- **責務**: institution の articulate + 1 entry のみ self-dogfood
- **境界**: 本 project 内のみ、横展開対象外 (= 横展開 = drawer Pattern 1 経由で各 program が自分で landing)

### Commit Lineage

- judgementCommit: `<本 commit sha>` (= bootstrap commit、本 entry landing 後に記入)
- preJudgementCommit: `<前 commit sha>` (= bootstrap 直前、aa2c62d = light improvement)
- judgementTag: `aag-self-hosting-completion/DA-α-000-judgement` (本 commit に annotated tag landing)
- rollbackTag: `aag-self-hosting-completion/DA-α-000-rollback-target` (前 commit に annotated tag landing)
- implementationCommits:
  - `<本 commit sha>` — bootstrap 全実装 (skeleton 6 doc + DA-α-000 + open-issues 行追加 + operational-protocol-system pause articulate + doc-registry update)

### 振り返り (本 program archive 直前 / TBD)

> R1-R7 完了 + 最終レビュー直前に追記、observation 5 件すべて実測。

- 観測点 1〜5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 起票時点で軌道修正なし、Phase 進行中に sub-events articulate 必要時に追記)
