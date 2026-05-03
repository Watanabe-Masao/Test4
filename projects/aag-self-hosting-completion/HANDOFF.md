# HANDOFF — aag-self-hosting-completion

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 0 (Bootstrap) のみ landed**。AAG Pilot 完遂 + operational-protocol-system bootstrap 後、user articulation で AAG framework の **entry navigation level での self-hosting failure** が articulate されたため、structural reorganization を AAG-REQ-SELF-HOSTING の真の closure 達成 program として bootstrap (本 commit)。

- 必須セット 6 ファイル + DA-α-000 (進行モデル) landing 済
- AAG-COA Level 3 + architecture-refactor + breakingChange=true で articulate
- operational-protocol-system project は本 program R5 で再開予定 (= pause articulated in operational-protocol-system HANDOFF.md §3.6)
- 実装 0 件 → **R1 (AAG sub-tree relocation) から articulation 開始**

## 2. 次にやること

詳細: `checklist.md` / `plan.md` §3。

### 高優先 (Phase R1 着手)

**R1: AAG sub-tree relocation** (= 101 inbound update + boundary structural articulation)

- [ ] DA-α-001 entry landing (= R1 着手判断、5 軸 + 観測点 + Lineage)
- [ ] `aag/_internal/` 新設 + `references/01-principles/aag/` 9 doc を移動
- [ ] `aag/interface/` 新設 (= drawer 配置のための skeleton、R2 で fill)
- [ ] 101 file の inbound link 全 update
- [ ] guard / collector の path constants 該当箇所 update
- [ ] doc-registry.json + manifest.json reorganize entry
- [ ] verify 全 PASS (= 944 test + docs:check + lint + build)

R2-R7 詳細は `plan.md` 参照。

## 3. ハマりポイント

### 3.1. inbound link 大量 update での broken link risk

1,000+ 件の inbound update は **段階別 verify が必須**。R1 完了時点で R1 影響範囲 (= 101 inbound) のみ verify、R2/R3 では各 phase 完了時に該当範囲 verify。

### 3.2. guard / collector の path 変更が test 落とす

138 file の guard / collector が path string match している。R1 で AAG sub-tree path 変更時に path constants update が必要、test:guards で全件 PASS まで反復 verify。

### 3.3. AAG framework articulate **内容** の touch 禁止 (= 不可侵原則 2)

R1-R5 では物理 location 移動のみ、articulate text 不変。例外は R6 で meta.md §2.1 self-hosting closure 部分のみ honest update。

### 3.4. CURRENT_PROJECT.md 切替判断不要

本 program は AAG framework 改革で主アプリ active project (= pure-calculation-reorg) に影響なし、CURRENT_PROJECT.md 切替不要。R3 で CURRENT_PROJECT.md path 検証は必要だが内容変更なし。

### 3.5. operational-protocol-system 再開 timing

R5 で M1 deliverable を aag/interface/protocols/ に直接 landing する設計。operational-protocol-system は本 program R5 完了まで pause、R5 完了で resume + M1 着手。

### 3.6. drawer Pattern 1 (Commit-bound Rollback) 厳守

各 R-phase は **judgement commit + rollback tag** で完結。1 commit に 2 phase まとめない (= rollback 境界 articulate 不能化を防ぐ)。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間 |
| `plan.md` | 不可侵原則 7 件 + Phase R1-R7 + scope 外 + 観測点 |
| `checklist.md` | completion 判定 + 各 R-phase 観測点 |
| `decision-audit.md` | 重判断 institution + DA-α-000 |
| `projectization.md` | AAG-COA 判定 (Level 3 + architecture-refactor) |
| `references/03-guides/decision-articulation-patterns.md` | drawer Pattern 1-6 application source |
| `references/01-principles/aag/meta.md` | AAG-REQ-SELF-HOSTING (R6 update 対象) |
| `projects/operational-protocol-system/HANDOFF.md` §3.6 | R5 完了後再開 articulated |
| `projects/completed/aag-platformization/` | AAG Pilot (= motivation source) |
