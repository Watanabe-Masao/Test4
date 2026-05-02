# HANDOFF — aag-platformization

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 0 (Bootstrap) のみ landed + Platformization Standard articulate 済**。

- `projects/aag-platformization/` を `_template` から bootstrap 済 (commit `36c4868` 以降)
- 必須セット 6 ファイル + DA-α-000 (進行モデル決定) landing 済
- 6 reframe を経て plan を **supreme principle + F1-F7 + Go 実装条件 C1-C4 + 10 Phase (3 segment)** 構造に再構築
- **本 project が `references/01-principles/platformization-standard.md` の Pilot Application であることを articulate (本 commit)**
- Standard 8 軸 (subsystem-level) と本 plan 5 軸 (component-level) の二段 lens 構造を articulate
- 派生 artifact / sync guard / merge policy 修復 / 5 軸 framework すべて未着手 = **Phase 1 から開始**

実装作業 0 件、articulation のみ。Phase 1 から **「あるべき」を「機能している」に転じる**。

## 2. 次にやること (3 segment)

### Segment A: Pre-Go 条件確立 (Phase 1-5、最優先)

Go 実装条件 C1-C4 を固定する。**Go 実装 (Phase 9) 着手前提**。

- **Phase 1**: Authority 固定 + 5 軸 framework operational 化
- **Phase 2** (= C1): Merge policy 一本化 (defaults 補完 + resolvedBy + 三重定義解消 + bootstrap 修復)
- **Phase 3** (= C2): Merged artifact 生成 (`docs/generated/aag/merged-architecture-rules.<format>` + sync guard)
- **Phase 4** (= C3): Contract independence (AagResponse + detector schema 化)
- **Phase 5** (= C4): RuleBinding 境界 guard

### Segment B: AI Navigation + Audit (並列着手可)

- **Phase 6**: drawer artifact 群 (rules-by-path / rule-index / rule-detail / rule-by-topic)
- **Phase 7**: 5 軸 audit (既存 AAG + 本 project の reframe 跡)

### Segment C: Verification + Implementation + Archive

- **Phase 8**: Simulation suite (CT1〜CT10) で F1-F7 + Go 条件 verification
- **Phase 9**: Go 実装 (条件 C1-C4 全 met 時のみ、言語 Go / Python / combo、Rust 除外)
- **Phase 10**: archive + 後続 program charter (人間承認 1 点)

## 3. ハマりポイント

### 3.1. supreme principle 違反 (= articulation without functioning) は本 program 最大の risk

`strategy.md` §2.1「抽象化の過剰」AI 本質的弱点を本 program で再現しないこと。Phase 完了 = articulate 完了ではなく **observable verification 通過** が条件。

### 3.2. 既存 AAG 振る舞いを変えない (不可侵原則 1)

既存 9 integrity guard / 12 AAG-REQ / merge ロジック / AagResponse 出力 / detector message を変えない。修復は **矛盾・潜在バグ** 発見時のみ、必ず DA entry に articulate。

### 3.3. 派生 artifact の 5 軸 articulate を skip しない (不可侵原則 4)

製本 / 依存方向 / 意味 / 責務 / 境界 を articulate していない deliverable は scope 外。Phase 1 で template 確立後、Phase 2+ は必ず articulate して build。

### 3.4. observation なき articulation は scope 外 (不可侵原則 5)

calendar-time observation (= 「2 週間運用観測」) は **AAG-REQ-NO-DATE-RITUAL 違反**。simulation (state-based / scenario-driven) で代替。Phase 6 が main verification, 各 Phase 完了直後にも mini simulation を走らせる。

### 3.5. judgementCommit を amend / rebase しない

DA entry の `judgementCommit` (sha) と `judgementTag` (annotated tag) が rollback target を物理的に指す唯一の手がかり。一度 push したら amend 禁止、rollback tag delete-and-recreate 禁止。**rollback 動作確認は worktree clean 時のみ** (DA-α-000 第一事象で記録済)。

### 3.6. 言語境界

AAG runtime に **Rust 使用禁止** (本体 WASM/Rust と境界混線)。Go / Python / combo OK。AI が Rust を強く推奨する場合は **人間確認 escalation** (DA entry に articulate)。

### 3.7. 本 project 自身も audit 対象

5 軸 audit (Phase 4) は既存 AAG だけでなく **本 project (`aag-platformization`) の reframe 跡** も対象。1,710 行の articulation は 5 軸 lens で「資産 / 負債 / 両義的」に分類して restructure。

### 3.8. Phase 単位で commit する (やってはいけないことの 1 つ)

複数 Phase を 1 commit にまとめると、Phase 境界での observation ができない。**1 Phase = 1+ commit、必ず DA entry の Commit Lineage に紐付ける**。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 文脈の入口 |
| `plan.md` | supreme principle + 不可侵原則 + F1-F7 + 7 Phase 構造 |
| `checklist.md` | observable verification の機械入力 |
| `decision-audit.md` | 判断履歴 + 5 軸 articulate + 振り返り |
| `projectization.md` | AAG-COA Level 3 判定 |
| `breaking-changes.md` | 破壊的変更 (BC-AAG-1〜6) と rollback plan |
| `aag/execution-overlay.ts` | 案件 overlay (本 program は空のまま運用) |
| `references/01-principles/aag/strategy.md` §3.4 / §2.1 | supreme principle の上位根拠 |
| `references/01-principles/aag/source-of-truth.md` | 5 軸「製本」articulate |
| `references/01-principles/aag/architecture.md` | 5 軸「依存方向」articulate |
| `references/01-principles/aag/meta.md` | 5 軸「意味」articulate (AAG-REQ-*) |
| `references/01-principles/aag/layer-map.md` | 5 軸「境界」articulate |
