# decision-audit — operational-protocol-system

> 役割: 主要判断の articulation + 振り返り observation の記録 artifact。
> 規約: `plan.md` §1 不可侵原則 + `references/05-aag-interface/drawer/decision-articulation-patterns.md` Pattern 1 (Commit-bound Rollback) + Pattern 4 (Honest Articulation)。
> 1 entry = 1 判断 = 1 振り返り。**観測なき articulation を禁ず**。

## 必須要件

### 判断時 (Phase / 軸 着手時)

- 候補 / 採用案 / 判断根拠 (事実 + 推論)
- 想定リスク (採用案外れ時の最大被害)
- 振り返り観測点 **最低 3 つ** (1 つ以上は反証可能)
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
git tag -a "operational-protocol-system/DA-α-NNN-rollback-target" -m "preJudgement" <preJudgementSha>
git tag -a "operational-protocol-system/DA-α-NNN-judgement"      -m "judgement landing" <judgementSha>
git tag -a "operational-protocol-system/DA-α-NNN-retrospective"  -m "retrospective"  <retrospectiveSha>
```

`git checkout operational-protocol-system/DA-α-NNN-rollback-target` で判断前に物理的に戻れる。

---

## 判断 entry 一覧

| ID | Phase / 軸 | 判断対象 | status |
|---|---|---|---|
| DA-α-000 | Phase 0 | 本 program の進行モデル (drawer Pattern 1 application instance + AAG Pilot DA institution からの継承判断) | active |
| DA-α-001 | Phase M1 | M1 Task Protocol System 着手判断 (新 doc 4 件配置 + articulate 順序) | active |
| DA-α-002 | Phase M2 | M2 既存 5 文書 routing 固定方針 | planned |
| DA-α-003 | Phase M3 | M3 動的昇格・降格ルール articulate 方針 | planned |
| DA-α-004 | Phase M4 | M4 Task Class 5 protocol articulate 方針 | planned |
| DA-α-005 | Phase M5 | M5 drawer `_seam` 統合 + guard 化判断 | planned |

---

## DA-α-000: 本 program の進行モデル決定

**status**: active

### 判断時 (2026-05-02 / Phase 0)

- 候補:
  1. user 承認 gate モデル (3+ Gate)
  2. AI judgement only (履歴なし)
  3. AI judgement + retrospective verification
  4. **AI judgement + retrospective + commit-bound rollback** (= drawer Pattern 1 + AAG Pilot DA institution からの継承)
- 採用案: 候補 4
- 判断根拠:
  - 事実 1: AAG Pilot (= `projects/completed/aag-platformization/`) で同 institution が成立、19+ reframes に対し rollback 0 件で機能 verify 済 (= drawer Pattern 1 の application instance が実証)
  - 事実 2: drawer (= `references/05-aag-interface/drawer/decision-articulation-patterns.md`) Pattern 1 が一般 trigger と適用領域を articulate 済 (= 領域 agnostic、本 project でも reuse 可能)
  - 事実 3: 不可侵原則 6「起動・archive 判断は user 領域、AI 単独で起動・archive しない」と整合 (= AI 単独進行 + 最終 archive user 承認)
- 想定リスク:
  - 最大被害: judgementCommit / Tag 管理 overhead が Phase 進行を鈍化、rollback tag が dead reference 化。mitigation = AAG Pilot で実証済 (rollback 0 件でも DA institution は psychological safety + scope discipline として機能)
  - 二番目: tag prefix `operational-protocol-system/DA-α-` が AAG Pilot prefix と区別されない混同 risk。mitigation = prefix 完全一致 + repo 内 tag list で区別可能
- 振り返り観測点 (5 点):
  - 1 (肯定): 全 Phase の各 DA で commit lineage が漏れず記録される
  - 2 (肯定): 1 件以上の DA で判定 "間違い" or "部分的" + 軌道修正 entry が活用される (= AAG Pilot DA-α-005 で precedent)
  - 3 (反証): 全 Phase でjudgementCommit を amend した事故 0 件
  - 4 (反証): 「overhead」を理由に DA を skip した entry 0 件
  - 5 (反証): rollback tag が一度も使われずすべて "正しい" 判定だと dead weight (= AAG Pilot 後の本 project でも同様、Pattern 1 の psychological safety value を articulate)

### 5 軸 articulation

- **製本** (canonical): 本 program 内 `decision-audit.md` が canonical (派生先なし)
- **依存方向**: 上位 = `plan.md` §1 + drawer Pattern 1、下位 = なし。AAG Pilot DA institution からの一方向継承
- **意味**: 「AI 判断履歴 + 物理 rollback 経路を持つ institution の articulation」(= AAG Pilot DA-α-000 の領域 agnostic 拡張)
- **責務**: institution の articulate + 1 entry のみ self-dogfood
- **境界**: 本 project 内のみ、横展開対象外 (= 横展開 = drawer Pattern 1 経由で各 program が自分で landing)

### Commit Lineage

- judgementCommit: `8283b4b` (= bootstrap commit、本 entry を含む実装 commit)
- preJudgementCommit: `653882b` (= bootstrap 直前、charter draft commit + references/README + doc-registry index 反映)
- judgementTag: `operational-protocol-system/DA-α-000-judgement` (`8283b4b` に annotated tag landing 済)
- rollbackTag: `operational-protocol-system/DA-α-000-rollback-target` (`653882b` に annotated tag landing 済)
- implementationCommits:
  - `8283b4b` — bootstrap 全実装 (skeleton 6 doc + DA-α-000 + open-issues 行追加 + charter draft 削除 + doc-registry / README 更新)

### 振り返り (本 program archive 直前 / TBD)

> Phase M1-M5 完了 + 最終レビュー直前に追記、observation 5 件すべて実測。

- 観測点 1〜5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 起票時点で軌道修正なし、Phase 進行中に sub-events articulate 必要時に追記)

---

## DA-α-001: M1 Task Protocol System 着手判断

**status**: active

### 判断時 (2026-05-04 / Phase M1)

- 候補:
  1. 4 doc 一括 landing (= 1 commit で 4 doc + DA + checklist update)
  2. doc 別 PR 分割 (= 4 commit で 4 doc を逐次 landing)
  3. doc 一括 + DA / checklist update 別 PR
- **採用案: 候補 1** (= 4 doc 一括 landing)
- 判断根拠:
  - 事実 1: 4 doc は **相互参照** が必須 (= task-protocol-system は他 3 doc を index、catalog ↔ session-protocol ↔ complexity-policy で cross-link)。逐次 landing だと中間状態で broken link が発生
  - 事実 2: M1 観測点 (= 4 doc 全 landing で `docs:check` PASS) は 4 doc 同時 landing を前提
  - 事実 3: archive-v2 program PR 6 / 6 として scope discipline 整合 (= drawer Pattern 2、本 PR を逸脱しない)
  - 事実 4: AAG Pilot DA-α-005 で同種「複数 generated drawer 一括 landing」が成立済 (= precedent)
- 想定リスク:
  - 最大被害: 4 doc の articulate quality に drift がある場合、後続 M2-M5 で全 doc を再 update する rework 発生。mitigation = M1 scope は articulate のみ、M2-M5 で routing / 動的ルール / 5 protocol / drawer `_seam` の各層で順次 refine する pattern を articulate 済 (= drawer Pattern 4 honest articulation で「完成度を分割段階で漸進」)
  - 二番目: docs:check が KPI drift で fail し commit blocked。mitigation = 4 doc landing 後に `docs:generate` 実行、generated section + KPI drift 解消
- 振り返り観測点 (5 点 = M1 観測点 5 件と同期):
  - 1 (M1-1 肯定): 6 Task Class が `task-class-catalog.md` で articulate されている (= TC-1〜TC-6、各々に scope + 入口/出口条件 + complexity range + antipattern)
  - 2 (M1-2 肯定): Session Protocol が L1/L2/L3 別に `session-protocol.md` §3.2/§3.3/§3.4 で articulate されている
  - 3 (M1-3 肯定): L1/L2/L3 と既存 5 文書の使い分けが `complexity-policy.md` §1 + §5 table で articulate されている
  - 4 (M1-4 反証): 4 doc 全 landing で `docs:check` PASS (= 機械検証可能観測)
  - 5 (M1-5 反証): synthetic session scenario で各 level の routing が verify 可能 (= `session-protocol.md` §3.2/§3.3/§3.4 を読んで AI が即 routing 可能、本 session が初の self-application instance)

### 5 軸 articulation

- **製本** (canonical):
  - `references/05-aag-interface/protocols/task-protocol-system.md` (= 上位 index、canonical)
  - `references/05-aag-interface/protocols/task-class-catalog.md` (= Task 軸 canonical)
  - `references/05-aag-interface/protocols/session-protocol.md` (= Session 軸 canonical)
  - `references/05-aag-interface/protocols/complexity-policy.md` (= Complexity 軸 canonical)
  - 派生先なし (= 5 文書 / drawer / AAG-COA は本 protocol の **input** として参照、派生関係なし)
- **依存方向**: 上位 = AAG framework (= aag/_internal/ + drawer + AAG-COA、改変しない)、下位 = 主アプリ改修 user の day-to-day workflow。一方向参照
- **意味**: 「AAG framework を使う側の操作 protocol articulate」(= over-ritual / under-ritual 回避 + session ad-hoc 解消 + AI context 最短到達)
- **責務**: 運用 layer の articulate のみ、AAG framework / 主アプリ code は touch しない (= 不可侵原則 1)
- **境界**: M1 は 4 doc articulate のみ、M2 (= routing 固定) / M3 (= 動的ルール) / M4 (= 5 protocol) / M5 (= drawer `_seam`) は別 Phase

### Commit Lineage

- judgementCommit: TBD (= 本 entry を含む M1 landing commit、commit 後に実 sha を update)
- preJudgementCommit: TBD (= M1 landing 直前 commit、commit 後に実 sha を update)
- judgementTag: `operational-protocol-system/DA-α-001-judgement` (= TBD commit に annotated tag landing)
- rollbackTag: `operational-protocol-system/DA-α-001-rollback-target` (= TBD commit に annotated tag landing)
- implementationCommits:
  - TBD — M1 全実装 (= 4 doc 新設 + DA-α-001 entry + checklist update + HANDOFF update)

### 振り返り (Phase M1 完了 / TBD)

> Phase M1 完了直前に追記、observation 5 件すべて実測。

- 観測点 1〜5: TBD
- 判定: TBD
- 学習: TBD
- retrospectiveCommit / Tag: TBD

### 軌道修正 (判定 "部分的" / "間違い" のみ)

- (本 entry 起票時点で軌道修正なし、Phase 進行中に sub-events articulate 必要時に追記)
