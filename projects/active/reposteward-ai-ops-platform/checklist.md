# checklist — reposteward-ai-ops-platform

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> **必須構造**: 最後の 2 section は **必ずこの順** で配置:
> 1. `## AI 自己レビュー (= user 承認の手前)` — AI が実装後の総 review を実施する mandatory checkpoint (= DA-β-002)
> 2. `## 最終レビュー (user 承認)` — user 承認 gate
>
> **本 checklist の追記方針**: Wave 1〜5 各 step は「verified LIVE な未着手項目」として **着手 PR の commit で追記** する (= §3 ルール、想像上の項目を bootstrap 段階で先取り articulate しない)。本 PR では Phase 0 (Bootstrap) のみ articulate。Wave 1 #1 (Task Capsule schema v1) 着手 PR で Wave 1 section を初期化する。

## Phase 0: Bootstrap

- [ ] `projects/active/reposteward-ai-ops-platform/` 配下 8 ファイル一式 (= AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / config/project.json) を landing
- [ ] `references/04-tracking/open-issues.md` の `## active projects` 索引に `reposteward-ai-ops-platform` 行を追加
- [ ] `cd app && npm run docs:generate` を実行し、`references/04-tracking/generated/project-health.generated.md` に新 project が `derivedStatus = in_progress` で現れることを確認
- [ ] `cd app && npm run test:guards` PASS 確認 (= projectizationPolicyGuard PZ-1〜12 / checklistFormatGuard / projectCompletionConsistencyGuard 等が新 project を accept)
- [ ] DA-α-000 (進行モデル決定) を `decision-audit.md` に articulate
- [ ] DA-α-001 (project naming = `reposteward-detection-ops-platform` → `reposteward-ai-ops-platform`) を `decision-audit.md` に articulate
- [ ] DA-α-002 (Wave 1 reordering / Task Capsule prepend) を `decision-audit.md` に articulate
- [ ] bootstrap commit を `claude/reposteward-detection-ops-bootstrap-mqG14` に push (= retry 4 回 / exponential backoff per branch policy)

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [ ] **総チェック**: 全 Phase / Wave 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則 1〜8 違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 (= Go MVP 不可侵原則 4/5 違反 / YAML 混入 / Human UI 追加 / hard gate 追加) が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / Task Capsule schema validation / SourceFacts collector エラー伝播 / Go CLI exit code を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit / `aag/CHANGELOG.md` (= [AAG 6.1] entry) の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: app version は不変 (= versionImpact app=+0.0.0 declared)、`docs/contracts/aag/aag-metadata.json` `aagVersion` は 6.0 → 6.1 に bump、`aag/CHANGELOG.md` に [AAG 6.1] entry 追加 + project-metadata.json appVersion 整合

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase / Wave + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase / Wave の成果物 (commit / PR / 関連正本 / generated artifact / Task Capsule self-dogfood / Wave 1〜5 全 PR landed / Health Hard Gate PASS 維持) を user がレビューし、archive プロセスへの移行を承認する
