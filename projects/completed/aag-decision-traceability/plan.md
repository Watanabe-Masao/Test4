# plan — aag-decision-traceability

## 不可侵原則

1. **メインドキュメント (references / archived row / archived doc) は機能と歴史のみを
   定義し、進行を持たない** — `references/03-guides/project-checklist-governance.md`
   §0 の鉄則。Project E candidate を archived row に future-follow-up note として
   残さない。進行状態は `config/project.json` と `checklist.md` (= 状態管理層) に
   閉じる。
2. **Phase 0 は判断 gate であり実装ではない** — Phase 0 で「進める」と判断する前に
   DecisionTrace schema / guard / retrospective protocol を設計しない (先回り実装禁止)。
   sunk cost が判断結果を歪めることを構造的に防ぐ。
3. **defer / scope out 判断も同等に正当な結論** — 判断結果が「進めない」でも本 project
   は完了として archive プロセスへ進む。「やらない」も成果物として articulate する。

## Phase 構造

### Phase 0: spawn judgment

Project E candidate (DecisionTrace + AI utilization、9 insight 統合) を実装 project
として進めるか / defer するか / scope out するかを人間が判断する。

判断するために必要な inputs:

- archived AAG docs / parent HANDOFF に残る Project E candidate の全記述の inventory
- DecisionTrace / AI utilization / blame-free retrospective / equal authority audit の
  要求整理 (parent project の "9 insight" を含む)

判断結果の articulate 先:

- 本 project の HANDOFF.md (どの結論に至ったか + その理由)
- `references/02-status/open-issues.md` (active 索引 / 解決済み課題テーブル)

完了条件: 上記 inventory + 整理 + 人間判断 + 反映の 4 checkbox が `[x]` になり、
最終レビュー (人間承認) checkbox が `[x]` になった状態。

### Phase 1+ (conditional)

Phase 0 で「進める」と判断した場合のみ articulate する。判断前に Phase 1+ の content
(schema 設計 / guard 仕様 / retrospective protocol 等) を本 plan.md に書かない (不可侵
原則 2)。Phase 1+ articulate 時には projectization Level を再評価し、Level 2+ に escalate
する (`projectization.md` §5)。

## やってはいけないこと

- archived AAG docs / archived row に Project E candidate の future-follow-up note を残す
  → 不可侵原則 1 違反 (`project-checklist-governance.md` §0 鉄則違反)
- Phase 0 判断前に DecisionTrace schema / guard / retrospective protocol を設計する
  → 不可侵原則 2 違反、先回り実装による sunk cost bias
- selfHostingGuard baseline=6 ratchet-down を本 project の scope に取り込む
  → 別軸 (rule binding 操作 vs DecisionTrace schema)、既に
  `app/src/test/guards/selfHostingGuard.test.ts` Test 3 で機械的 articulate 済
- Phase 0 結論を「進める」「defer」「scope out」以外の曖昧な表現で articulate する
  → 判断 gate としての機能を失う。3 値のいずれかを明示する

## 関連実装

| パス | 役割 |
|---|---|
| `projects/completed/aag-bidirectional-integrity/HANDOFF.md` | Project E candidate 記述の起源 |
| `references/01-principles/aag/meta.md` | AAG-REQ 12/12 milestone の back-reference |
| `app/src/test/guards/selfHostingGuard.test.ts` | orphan AAG-REQ baseline=6 articulation (別軸) |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール (§0 鉄則 + §3 checklist 規格) |
| `references/03-guides/projectization-policy.md` | Level 1 設定の根拠 + escalation 条件 |
