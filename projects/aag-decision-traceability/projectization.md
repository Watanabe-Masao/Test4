# projectization — aag-decision-traceability

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 1 (Lightweight Project) |
| `changeType` | governance-hardening |
| `implementationScope` | `[]`（Phase 0 は判断 gate のみ、実装 scope なし） |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | false |
| `requiresHumanApproval` | true（Phase 0 結論は人間判断） |

## 2. 判定理由

本 project は Phase 0 spawn judgment gate (Project E concept を実装 project として進めるか /
defer / scope out の人間判断) を主目的とし、機能実装を含まない。

- **Level 0 (Task) ではない理由**: 単発 fix ではなく、複数 inventory + 要求整理 + 判断 gate を
  通過する必要があり、quick-fixes ではなく独立 project として文脈を引き継ぐ価値がある。
  ハマりポイント (forward-looking note を archived row に書き戻さない / sunk cost 回避 /
  別軸との混同回避) を HANDOFF.md に articulate する必要があり、Level 1 の最小構造で十分。
- **Level 2+ ではない理由**: 判断前段階のため新規原則制定 / Phase 0〜7 full structure /
  inquiry/ ディレクトリ / breaking-changes.md / sub-project-map.md は不要。
- **`requiresHumanApproval = true`**: Phase 0 結論 (進める / defer / scope out) は人間判断
  でなければならず、AI 単独で結論できない。最終レビュー checkbox による gate が必須。

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | project 意味空間の入口 (D1 構造必須) |
| `HANDOFF.md` | required | 現在地 / 次にやること / ハマりポイント (D1 構造必須) |
| `plan.md` | required | 不可侵原則 + Phase 構造 (D1 構造必須) |
| `checklist.md` | required | completion 判定 (D1 構造必須) |
| `inquiry/` | forbidden | Level 1 で `inquiry/` 持つと PZ-5 hard fail |
| `breaking-changes.md` | forbidden | breakingChange = false |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement = false |
| `sub-project-map.md` | forbidden | 単一 project (PZ-6 相当) |
| guard 設計 (plan.md 内) | forbidden | requiresGuard = false。判断前に guard を設計すると不可侵原則 2 違反 |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval = true |

## 4. やらないこと (nonGoals)

この project の scope に含めない作業を明示する。
scope 逸脱の抑止と escalation 判定の基準として機能する。

- Phase 0 判断前に DecisionTrace schema / guard / retrospective protocol を設計する (先回り実装禁止、不可侵原則 2)
- selfHostingGuard baseline=6 ratchet-down を本 project の scope に取り込む (別軸、rule binding 操作)
- archived AAG docs / archived row に Project E candidate の future-follow-up note を残す (§0 鉄則違反、不可侵原則 1)
- Phase 0 結論を曖昧化する (「あとで決める」「保留」等)。3 値「進める / defer / scope out」のいずれかを明示する

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する。

- Phase 0 結論が「進める」で、Phase 1+ の DecisionTrace schema / guard / retrospective
  protocol 設計が必要になった → **Level 2+ に escalate**。breakingChange / requiresGuard /
  implementationScope を再評価し、必要なら inquiry/ / breaking-changes.md / guard 設計
  section を追加する。
- Phase 0 結論が「defer」で、判断保留期間中の状態を quick-fixes 級に縮約できる → **Level 0
  に de-escalate** (判断保留 entry を `projects/quick-fixes/checklist.md` へ移管する選択肢、
  ただし通常は本 project を archive する方が clean)。
- Phase 0 結論が「scope out」で、本 project が即 archive 候補になる → de-escalate ではなく
  そのまま archive プロセス (§6.2) へ進む。

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-01 | 初期判定 (Level 1 / governance-hardening) | spawn judgment gate として独立 project 化、archived AAG docs から Project E candidate future-follow-up note を切り出し |
