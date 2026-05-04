# Planning Protocol — TC-1 (= operational-protocol-system M4 fill)

> **landed**: 2026-05-04 (= operational-protocol-system M4)
>
> **役割**: Task Class **TC-1 Planning** の standardized 手順。計画策定 / 設計判断 / Phase 構造 articulate を含む実装前 articulate task の prescriptive flow。
>
> **位置付け**: [`task-class-catalog.md`](./task-class-catalog.md) §2 で referenced、本 doc が canonical 詳細。
>
> **canonical pointer**: [`task-protocol-system.md`](./task-protocol-system.md) §4 catalog summary table。

## 1. scope (= TC-1 入口判定)

### 1.1 入口条件

- user が「設計したい / 計画を立てたい」と発言
- AI が「実装前に articulate が必要」と判断
- AAG-COA Level 1+ (= Lightweight Project 以上、`projectization-policy.md` §4 適用)

### 1.2 出口条件

- `plan.md` (or 同等 articulate doc) landing
- 不可侵原則 articulated (= 一般的に 3-7 件)
- Phase 構造 articulated (= 各 Phase に観測点)
- AAG-COA judgment 完了 (= Level 確定 + required artifacts list)

### 1.3 typical complexity (= `complexity-policy.md` 参照)

| complexity | 該当 | 必要 artifact |
|---|---|---|
| L2 | 単一 project 内の plan | plan.md + checklist.md |
| L3 | cross-program plan / structural reorganization plan / breaking change plan | plan.md + checklist.md + decision-audit.md |

## 2. 標準手順 (= 6 step)

```
Step 1. 構想 (= why + scope を 1-3 文で articulate)
Step 2. 調査 (= 既存 mechanism / pattern / precedent の reach)
Step 3. 比較検討 (= 候補 ≥ 2 件 articulate、各々の trade-off)
Step 4. 妥当性判断 (= 採用案決定 + rationale articulate)
Step 5. ドキュメント化 (= plan.md or 同等 doc に landing)
Step 6. 自己評価 (= 観測点 articulate、completion 判定の入力)
```

### 2.1 Step 1 — 構想

「**何を達成するか + なぜ必要か**」を 1-3 文で articulate。**観測可能な outcome** を含む (= 「〜が articulated されている」「〜が機械検証可能」等)。

antipattern: 「あるべき」articulate (= AAG-REQ-NON-PERFORMATIVE 違反、observable functioning 不在)。

### 2.2 Step 2 — 調査

既存 mechanism / pattern / precedent を reach し、再発明 risk を articulate。

調査 source:
- `manifest.json` discovery hint (= byTopic / byExpertise)
- `references/01-foundation/` 該当原則 doc
- `references/05-aag-interface/drawer/decision-articulation-patterns.md` (= drawer Pattern 1-6 application 候補)
- 過去の active / completed projects 内 decision-audit.md (= DA precedent)

調査結果は **構想** に back-feed (= 既存で達成可能なら scope 縮小、新規必要なら articulate 強化)。

### 2.3 Step 3 — 比較検討

候補 **≥ 2 件** を articulate。各候補に:
- **採用根拠** (= 事実 list ≥ 2 件、推測のみ禁止)
- **想定リスク** (= 最大被害 + 二番目、mitigation 含む)
- **trade-off** (= 何を犠牲にするか)

= drawer Pattern 4 (Honest Articulation) 整合、後続 retrospect で判定根拠の trace を確保。

### 2.4 Step 4 — 妥当性判断

採用案を articulate (= 「**採用案: 候補 N**」)。判断は:
- AAG framework articulate との整合 (= 不可侵原則 違反なし)
- AAG-REQ 12 件との整合 (= 該当 AAG-REQ list)
- 既存 project / pattern との整合 (= drift なし)

判断不能の場合は **user escalate** (= AAG-REQ-NO-AI-HUMAN-SUBSTITUTION 整合、AI 単独判断回避)。

### 2.5 Step 5 — ドキュメント化

採用案を `plan.md` (or 同等 doc) に landing:
- §1 不可侵原則 (= 3-7 件、本 plan の最上位制約)
- §2 Pilot 完了 criterion / Phase 完遂 criterion (= observable outcome ≥ 3 件)
- §3 Phase 構造 (= 各 Phase に deliverable + scope 外 + 観測点)
- §4 やってはいけないこと (= 不可侵原則の補足、Phase 別禁止事項)

= `references/05-aag-interface/operations/project-checklist-governance.md` §4.1 の 4 doc 役割分離整合。

### 2.6 Step 6 — 自己評価

各 Phase に **観測点** articulate (= ≥ 3 件、肯定 / 反証):
- **肯定観測点**: 達成すれば判定 = "正しい"
- **反証観測点**: 該当すれば判定 = "間違い" or "部分的"

= drawer Pattern 6 (State-based Verification Harness) integration、各 Phase 完遂時の振り返り判定の input。

## 3. drawer Pattern 1-6 application instance hint

| Pattern | TC-1 での application |
|---|---|
| **Pattern 1** Commit-bound Rollback | L3 plan で DA institute 必須 (= judgement / rollback-target tag) |
| **Pattern 2** Scope Discipline | Step 1 構想で scope 外 articulate、後続 step で逸脱 0 件 |
| **Pattern 3** Clean Rewrite | Step 3 比較検討で前提 collapse 検出時、patch 重ねず candidate 再 articulate |
| **Pattern 4** Honest Articulation | Step 1-6 全 step で観測可能 outcome articulate (= 「あるべき」回避) |
| **Pattern 5** Rationale Skip | scope 外項目を「skip + rationale + trigger」3 要素で articulate |
| **Pattern 6** State-based Verification Harness | Step 6 観測点が後続 phase の verification input |

## 4. complexity-policy.md (M3) との対応

### 4.1 該当昇格 trigger (= P-番号 / `complexity-policy.md` §4.1)

- **P1 Authority に touch**: plan articulate 中に rollback / archive / 不可侵原則改変 が articulate されたら L2 → L3 昇格
- **P2 plan.md non-goal 接近**: scope 拡大が articulate されたら L1 → L2 / L2 → L3 昇格
- **P5 multi-axis 拡張**: 想定 1 program → 2+ program に articulate 拡大したら L2 → L3 昇格
- **P6 checklist 局所外**: plan 内 Phase ≥ 3 段が必要と articulate されたら L1 → L2 昇格

### 4.2 該当降格 trigger (= D-番号 / `complexity-policy.md` §4.2)

- **D1 既存方針内**: 既存 pattern 適用で完遂可能と articulate されたら L3 → L2 降格
- **D5 想定 scope 縮小**: Step 3 比較検討で scope 縮小が articulate されたら L3 → L2 / L2 → L1 降格

### 4.3 typical complexity range

L2-L3 (= `task-class-catalog.md` §1 summary 整合)。L1 plan は稀 (= 1 file 内修正の plan は通常不要)。

## 5. antipattern (= 主な失敗 pattern)

- **計画段階で実装する** (= drawer Pattern 2 違反、scope discipline 破棄、Step 5 ドキュメント化前に Step 6 を超えて実装)
- **不可侵原則を articulate せず Phase に進む** (= 後続 session で原則漂流、Step 5 §1 skip)
- **観測点を articulate しない** (= 完了判定 fuzzy、Step 6 skip)
- **候補比較を 1 件で決定** (= Step 3 skip、drawer Pattern 4 違反)
- **「あるべき」articulate** (= AAG-REQ-NON-PERFORMATIVE 違反、observable outcome 不在)
- **AI 単独判断** (= AAG-REQ-NO-AI-HUMAN-SUBSTITUTION 違反、judgement 不能時の escalate skip)

## 6. 関連

- 上位 catalog: `task-class-catalog.md` §2 TC-1 Planning
- 上位 index: `task-protocol-system.md`
- complexity 軸: `complexity-policy.md`
- session 軸: `session-protocol.md`
- AAG drawer: `references/05-aag-interface/drawer/decision-articulation-patterns.md`
- AAG-COA: `references/05-aag-interface/operations/projectization-policy.md`
