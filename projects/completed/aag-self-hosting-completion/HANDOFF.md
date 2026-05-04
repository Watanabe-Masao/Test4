# HANDOFF — aag-self-hosting-completion

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 0 (Bootstrap) のみ landed**。AAG Pilot 完遂 + operational-protocol-system bootstrap 後、user articulation で AAG framework の **entry navigation level での self-hosting failure** が articulate され、structural reorganization を bootstrap (commit b19518c / 4d189a1)。本 commit で **構造案 refinement** (= aag/interface/* の境界矛盾を解消、14 guard 体系 + 命名規約 + 定着 mechanism articulate) を反映。

- 必須セット 6 ファイル + breaking-changes.md + DA-α-000 (進行モデル) landing 済
- AAG-COA Level 3 + architecture-refactor + breakingChange=true で articulate
- operational-protocol-system project は本 program R5 で再開予定 (= ⏸ PAUSED articulated)
- 構造案 refinement: aag/interface/* → references/05-aag-interface/* (境界矛盾解消) + aag/{_internal,_framework}/ 構造 + 14 ratchet-down Hard guard + `*.generated.md` 命名規約 + element-taxonomy + projects active/completed split + CURRENT_PROJECT pointer-only
- 実装 0 件 → **R0 (境界定義先行) から articulation 開始**

## 2. 次にやること

詳細: `checklist.md` / `plan.md` §3。

### 高優先 (Phase R0 着手)

**R0: 境界定義先行** (= 構造変更前に 3 tree (references / aag / projects) 境界を articulate、後続 R-phase で AI / userが物理配置から「読む / 読まない」を即判断できる state を確立)

- [ ] DA-α-001 entry landing (= R0 着手判断、5 軸 + 観測点 + Lineage)
- [ ] `references/README.md` update (= 主アプリ改修 userの knowledge interface)
- [ ] `aag/README.md` 新設 (= AAG framework 本体、`_internal/` + `_framework/` skeleton)
- [ ] projects/ root の README.md update (= 作業単位 lens、active + completed)
- [ ] `CURRENT_PROJECT.md` update (= active project pointer 限定)
- [ ] `CLAUDE.md` update (= 3 tree 境界 + reader-別 routing 1 section)
- [ ] verify 全 PASS (= 944 test + docs:check + lint + build)

R1-R7 詳細は `plan.md` 参照 (= R1 AAG sub-tree relocation / R2 references/05-aag-interface/ / R3 directory rename + naming / R4 per-element + dashboard + taxonomy / R5 protocols landing / R6 self-hosting closure + projects/ split / R7 統合 guard + verify + archive)。

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

### 3.7. 旧経路 / 旧制度の撤退漏れ (= legacy retirement)

各 R-phase で **対応する撤退対象 (= 旧 path + 旧 convention + 旧 mention)** を完全撤退する (= partial migration 禁止)。撤退 verify は **3 軸**:

1. 物理 verify (= 旧 path に file 0 件、`find` で 0 件)
2. string verify (= 旧 path 文字列 reference 0 件、archive-to-archive 例外除く)
3. functional verify (= 旧 path 経路で reach 試行 → fail)

詳細: `plan.md` §7 (legacy retirement plan) + `breaking-changes.md` §5。`oldPathReferenceGuard` (= R3 landing) で string verify、`generatedFileEditGuard` (= R3 landing) で旧 convention 試行検出。

### 3.8. PR template / .github/* / doc-registry / manifest 内の旧 mention

R3 で `references/03-implementation/` rename 時に同時実施。`.github/PULL_REQUEST_TEMPLATE.md` 内 旧 path 参照 (= 約 9 箇所、`responsibility-taxonomy-operations.md` / `test-taxonomy-operations.md` / `taxonomy-review-journal.md` / `extension-playbook.md` / `metric-id-registry.md` / `engine-responsibility.md` / `01-principles/**` / `aag-change-impact-template.md` / `02-status/generated/` / `aag-*` / `AAG_*.md`) を全件 R3 で update。詳細: `plan.md` §7.7。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間 |
| `plan.md` | 不可侵原則 7 件 + Phase R1-R7 + scope 外 + 観測点 |
| `checklist.md` | completion 判定 + 各 R-phase 観測点 |
| `decision-audit.md` | 重判断 institution + DA-α-000 |
| `projectization.md` | AAG-COA 判定 (Level 3 + architecture-refactor) |
| `references/05-aag-interface/drawer/decision-articulation-patterns.md` | drawer Pattern 1-6 application source |
| `aag/_internal/meta.md` | AAG-REQ-SELF-HOSTING (R6 update 対象) |
| `projects/active/operational-protocol-system/HANDOFF.md` §3.6 | R5 完了後再開 articulated |
| `projects/completed/aag-platformization/` | AAG Pilot (= motivation source) |
