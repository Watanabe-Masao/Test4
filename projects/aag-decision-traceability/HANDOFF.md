# HANDOFF — aag-decision-traceability

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**spawn 直後 — Phase 0 未着手**。

archived `aag-bidirectional-integrity` (2026-05-01) の HANDOFF および archived
AAG doc 群に "Project E candidate (DecisionTrace + AI utilization、9 insight 統合)"
として蓄積されていた future-follow-up note を、本 project に切り出した。

切り出しの動機: メインドキュメント (references / archived row / archived doc)
は機能と歴史を定義する場であり、進行を持たないとする
`references/03-guides/project-checklist-governance.md` §0 の鉄則に従う。
進行状態は `config/project.json` と `checklist.md` が正本とする (= 状態管理層へ分離)。

Phase 0 = spawn judgment gate (実装 project として進める / defer / scope out の
人間判断) に着手する状態。実装には未着手。

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先

- archived AAG docs / HANDOFF に残る Project E candidate の全記述を inventory する
  (起点: `projects/completed/aag-bidirectional-integrity/HANDOFF.md`)
- DecisionTrace / AI utilization / blame-free retrospective / equal authority audit の
  要求 (parent project の "9 insight") を整理する

### 中優先

- 整理結果に基づき、Project E を「実装 project として進める / defer / scope out」の
  いずれかを人間が判断する
- 判断結果を本 HANDOFF.md と `references/02-status/open-issues.md` に反映する

### 低優先

- 判断結果が「進める」場合: Phase 1 以降を `plan.md` に articulate (escalation 経路、
  Level 2+ 化)
- 判断結果が「defer / scope out」の場合: 本 project の最終レビュー checkbox を
  tick → archive プロセスへ進む

## 3. ハマりポイント

### 3.1. archived row には forward-looking 要素を残さない

`references/03-guides/project-checklist-governance.md` §0 の鉄則:
> ドキュメントはその機能を説明するためにある。そこに課題が紛れるとノイズになる。

Project E concept を本 project に切り出した目的は、archived row / archived AAG docs に
future-follow-up note を残さない点にある。**Phase 0 で「defer」または「scope out」と
判断した場合でも、結論は本 project の HANDOFF と open-issues.md (active 索引から外し
解決済み課題テーブルへ移動) のみに articulate** し、archived row に future note を
書き戻さない。

### 3.2. selfHostingGuard baseline=6 とは別軸

archived `aag-bidirectional-integrity` 行に併記されていた orphan AAG-REQ baseline=6
ratchet-down は `app/src/test/guards/selfHostingGuard.test.ts` Test 3 で機械的 articulate
済の baseline 操作であり、本 project の scope ではない。**rule binding ratchet-down と
DecisionTrace schema は別物**として扱い、混同しない。

### 3.3. Phase 0 判断前に Phase 1+ 実装に手を出さない

`plan.md` の不可侵原則 2: Phase 0 で「進める」と判断する前に DecisionTrace schema /
guard を設計しない。先回り実装は判断結果を歪める (sunk cost で「進める」に偏る)。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `projects/completed/aag-bidirectional-integrity/HANDOFF.md` | Project E candidate 記述の起源 |
| `references/01-principles/aag/meta.md` | AAG-REQ 12/12 milestone の back-reference |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
| `app/src/test/guards/selfHostingGuard.test.ts` | orphan AAG-REQ baseline=6 articulation (別軸) |
