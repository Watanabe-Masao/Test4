# projectization — responsibility-taxonomy-v2

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目                       | 値                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectizationLevel`      | Level 3                                                                                                                                           |
| `changeType`               | architecture-refactor                                                                                                                             |
| `implementationScope`      | `["app/src/test/responsibilityTagRegistry.ts", "app/src/test/guards/", "docs/contracts/", "references/01-principles/taxonomy-origin-journal.md"]` |
| `breakingChange`           | true                                                                                                                                              |
| `requiresLegacyRetirement` | true                                                                                                                                              |
| `requiresGuard`            | true                                                                                                                                              |
| `requiresHumanApproval`    | true                                                                                                                                              |

## 2. 判定理由

umbrella `taxonomy-v2` の **責務軸 (R:\*) 子 project**。7 不可侵原則と interlock
仕様のもとで、R:tag vocabulary / schema / guard / operations / legacy 撤退を 10 Phase
で実装する。

- **Level 3** — 単独 sub-project。親の Constitution 下で schema / guard / operations /
  legacy 撤退にまたがる architecture level の実装
- **changeType=architecture-refactor** — v1 tag 体系の全入替（vocabulary / schema / guard）
- **breakingChange=true** — BC-TAX-1（v1 vocabulary 全入替 + タグなし CI fail 化）
- **requiresLegacyRetirement=true** — 未分類 400 件 / タグ不一致 48 件 / `R:utility` 捨て場化
  33 件の段階撤退
- **requiresGuard=true** — `responsibilityTaxonomyGuard` 新設 + 親の interlock guard 連動
- **requiresHumanApproval=true** — 親の 7 不可侵原則を反映するため archive 前に人間承認必須

## 3. 必要な文書

| 文書                             |    必要性 | 理由                                           |
| -------------------------------- | --------: | ---------------------------------------------- |
| `AI_CONTEXT.md`                  |  required | Level 3 必須                                   |
| `HANDOFF.md`                     |  required | Level 3 必須                                   |
| `plan.md`                        |  required | 10 Phase 構造 + 親の 7 不可侵原則継承          |
| `checklist.md`                   |  required | completion 判定入力                            |
| `inquiry/`                       |      任意 | Phase 0 Inventory で現状棚卸し（checklist 内） |
| `breaking-changes.md`            |  required | BC-TAX-1 の運用                                |
| `legacy-retirement.md`           |  required | v1 R:tag の段階撤退                            |
| `sub-project-map.md`             | forbidden | 本 project 自体が sub-project                  |
| guard 設計 (plan.md 内)          |  required | R:tag guard + interlock guard 連動             |
| 最終レビュー (人間承認) checkbox |  required | requiresHumanApproval=true                     |

## 4. やらないこと (nonGoals)

- T:\* テスト軸の変更（test-taxonomy-v2 の所掌）
- 親の 7 不可侵原則を書き換えること（親 taxonomy-v2 の所掌）
- review window 外での R:tag 追加
- `R:utility` 等の曖昧タグへの再退避（`R:unclassified` のみ許可）
- AAG 他 2 柱（Architecture Rule / Principles）の変更
- 本体アプリ（粗利管理ツール）のコード変更

## 5. Escalation / De-escalation 条件

- R:tag の新規追加で Cognitive Load Ceiling（15）を超える場合 → 親 review window で裁定
- T:\* との interlock 不整合が発覚した場合 → 親 taxonomy-v2 に戻って interlock 仕様を再確定
- v1 タグ撤退 scope が予想より広い場合 → review window 延長、baseline ratchet-down 維持

## 6. 履歴

| 日付       | 変更                       | 理由                                             |
| ---------- | -------------------------- | ------------------------------------------------ |
| 2026-04-21 | spawn（taxonomy-v2 子 A）  | umbrella Phase 1 Constitution 確定に伴う実装開始 |
| 2026-04-25 | AAG-COA 遡及判定 (Level 3) | projectization-policy 導入後の retroactive 付与  |
