# AI_CONTEXT — aag-decision-traceability

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Decision Traceability — AI / Human 判断 trace と blame-free retrospective（aag-decision-traceability）

## Purpose

archived `aag-bidirectional-integrity` の HANDOFF と archived AAG doc 群に
"Project E candidate (DecisionTrace + AI utilization、9 insight 統合)" として
埋め込まれていた future-follow-up note を、**判断するための独立 project として
切り出す**。

メインドキュメント (references / archived row / archived doc) は機能と歴史を
定義する場であり、進行を持たない (`references/03-guides/project-checklist-governance.md`
§0)。Phase 0 の判断結果次第で本 project は defer / scope out / 実装 project に
escalate する。**Phase 0 spawn judgment gate を通過するための受け皿** が
本 project の存在理由。

## Why this project exists

`projects/completed/aag-bidirectional-integrity/HANDOFF.md` および archived
AAG doc 群に "Project E candidate" 表現で蓄積された future-follow-up note は、
`references/03-guides/project-checklist-governance.md` §0
「ドキュメントはその機能を説明するためにある。そこに課題が紛れるとノイズになる」
の鉄則に違反する状態。

archived row を「project が何をしたか」の記述に閉じる代わりに、Project E concept
自体は live tracking の対象として projects/ 配下に独立 project として切り出す。
進行状態は config (`config/project.json`) と checklist (`checklist.md`) が正本となり、
references / archived doc には残さない (= 状態管理層への分離)。

## Scope

含む:

- archived AAG docs / HANDOFF に残る Project E candidate 関連の全記述の inventory
- DecisionTrace / AI utilization / blame-free retrospective / equal authority audit の要求整理
- Project E を「実装 project として進める / defer する / scope out する」の人間判断
- 判断結果の HANDOFF.md および `references/02-status/open-issues.md` への反映

含まない:

- Phase 0 で「進める」と判断する前の DecisionTrace schema / guard 設計（先回り実装禁止）
- AAG Core / AAG Audit の rule binding 変更（archived `aag-rule-schema-meta-guard` /
  `aag-display-rule-registry` の所掌範囲）
- selfHostingGuard baseline=6 ratchet-down（既に
  `app/src/test/guards/selfHostingGuard.test.ts` Test 3 で機械的 articulate 済、別軸）

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 / 次にやること / ハマりポイント）
3. `plan.md`（Phase 0 judgment gate の構造 + 不可侵原則）
4. `checklist.md`（completion 判定の入力）
5. `projectization.md`（AAG-COA 判定 Level 1 / governance-hardening の根拠）
6. `projects/completed/aag-bidirectional-integrity/HANDOFF.md`（Project E candidate 記述の起源）
7. `references/01-principles/aag/meta.md`（AAG-REQ 12/12 milestone の back-reference）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/03-guides/projectization-policy.md` | AAG-COA 判定基準（Level 1 設定の根拠） |
| `projects/completed/aag-bidirectional-integrity/HANDOFF.md` | Project E candidate 記述の起源 |
| `references/01-principles/aag/meta.md` | AAG-REQ 12/12 milestone の back-reference |
| `app/src/test/guards/selfHostingGuard.test.ts` | orphan AAG-REQ baseline=6 articulation（別軸、本 project の scope 外） |
