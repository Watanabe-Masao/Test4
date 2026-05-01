# HANDOFF — aag-decision-traceability

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 scope out 判断完了、archive プロセス完了 (2026-05-01、spawn と同日)**。

archived `aag-bidirectional-integrity` の HANDOFF / archived AAG doc 群に
"Project E candidate (DecisionTrace + AI utilization、9 insight 統合)" として
蓄積されていた future-follow-up note を本 project に rescue したが、Phase 0
spawn judgment gate で **scope out 判断**。inventory + 要求整理を経ない結論は
本 project 自体が premature spawn だった可能性の articulation を兼ねる
(`aag-legacy-retirement` 前例 = case B early scope-out pattern)。

## 2. 次にやること

なし (本 project は archived)。再判断 trigger は §6 を参照。

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
| `projects/completed/aag-doc-responsibility-separation/` | umbrella sibling project (同日 archive) |
| `references/01-principles/aag/meta.md` | AAG-REQ 12/12 milestone の back-reference |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
| `app/src/test/guards/selfHostingGuard.test.ts` | orphan AAG-REQ baseline=6 articulation (別軸) |

## 6. Phase 0 scope-out rationale

判断結果: **scope out (実装 project 化を見送り)**。

rationale:

- DecisionTrace / AI utilization / blame-free retrospective / equal authority audit / mistake admission / correction opportunity の各 concept は parent project (`aag-bidirectional-integrity`) で articulate されたが、いずれも **speculative** = 解決すべき具体的 painful gap が観測されていない状態での先回り articulation
- 現状 AAG framework MVP は 12/12 AAG-REQ milestone 到達 (selfHostingGuard MVP landing 込み)、過去判断 trace は archived project HANDOFF + commit history で実用的に retrievable
- 「やる / やらない」を本 project として強制判断する act 自体が、AAG-REQ-NO-PERFECTIONISM (完璧主義禁止 — 弱さを構造的に受容) + AAG-REQ-NON-PERFORMATIVE (proxy work 生成禁止) の対偶リスク
- 本 project は archived `aag-bidirectional-integrity` 行から future-follow-up note を切り出すための rescue 手段だったが、note 削除のみで足りた可能性が高い (= **本 project 自体が premature spawn だった可能性を articulate**)

**再判断 trigger** (state-based): 重複 mistake の観測 / 判断 traceability の painful gap / blame culture の観測 / AI-human equal authority の具体的不足のいずれかが state-based に観測された時点。

## 7. archive 履歴

Archived: 2026-05-01 (spawn と同日、umbrella sibling `aag-doc-responsibility-separation` と同 commit で archive)。
case B early scope-out pattern (`aag-legacy-retirement` 前例) に合致。
