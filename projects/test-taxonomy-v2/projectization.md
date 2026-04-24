# projectization — test-taxonomy-v2

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目                       | 値                                                                                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectizationLevel`      | Level 3                                                                                                                                                                                                                     |
| `changeType`               | architecture-refactor                                                                                                                                                                                                       |
| `implementationScope`      | `["app/src/test/testTaxonomyRegistry.ts", "app/src/test/guards/testTaxonomyGuard.test.ts", "app/src/test/guards/testSignalIntegrityGuard.test.ts", "docs/contracts/", "references/01-principles/test-signal-integrity.md"]` |
| `breakingChange`           | true                                                                                                                                                                                                                        |
| `requiresLegacyRetirement` | true                                                                                                                                                                                                                        |
| `requiresGuard`            | true                                                                                                                                                                                                                        |
| `requiresHumanApproval`    | true                                                                                                                                                                                                                        |

## 2. 判定理由

umbrella `taxonomy-v2` の **テスト軸 (T:\*) 子 project**。7 不可侵原則と interlock
仕様のもとで、T:kind vocabulary / schema / guard / operations / legacy 撤退を 10 Phase
で実装する。

- **Level 3** — 単独 sub-project。親の Constitution 下で schema / guard / operations /
  legacy 撤退にまたがる architecture level の実装
- **changeType=architecture-refactor** — T:\* 軸自体が v1 に存在しない → 新規導入
- **breakingChange=true** — BC-TAX-2（v1 に存在しない T:\* の新規導入 + 必須化で CI fail）
- **requiresLegacyRetirement=true** — global TSIG-TEST-\* obligation を T:kind 別
  obligation に分解、existence-only assertion 等の無品質テストを撤退
- **requiresGuard=true** — `testTaxonomyGuard` 新設 + interlock guard 連動 +
  既存 TSIG guard の書き換え
- **requiresHumanApproval=true** — 親の 7 不可侵原則を反映、かつ全テストに影響するため
  archive 前に人間承認必須

## 3. 必要な文書

| 文書                             |    必要性 | 理由                                             |
| -------------------------------- | --------: | ------------------------------------------------ |
| `AI_CONTEXT.md`                  |  required | Level 3 必須                                     |
| `HANDOFF.md`                     |  required | Level 3 必須                                     |
| `plan.md`                        |  required | 10 Phase 構造 + 親の 7 不可侵原則継承            |
| `checklist.md`                   |  required | completion 判定入力                              |
| `inquiry/`                       |      任意 | Phase 0 Inventory で現状棚卸し（checklist 内）   |
| `breaking-changes.md`            |  required | BC-TAX-2 の運用                                  |
| `legacy-retirement.md`           |  required | global TSIG obligation の分解 + 無品質テスト撤退 |
| `sub-project-map.md`             | forbidden | 本 project 自体が sub-project                    |
| guard 設計 (plan.md 内)          |  required | T:kind guard + interlock guard 連動              |
| 最終レビュー (人間承認) checkbox |  required | requiresHumanApproval=true                       |

## 4. やらないこと (nonGoals)

- R:\* 責務軸の変更（responsibility-taxonomy-v2 の所掌）
- 親の 7 不可侵原則を書き換えること（親 taxonomy-v2 の所掌）
- review window 外での T:kind 追加
- `T:unknown` 等の曖昧タグへの退避（`T:unclassified` のみ許可）
- テスト内容の書き換え（分類のみが scope、individual test content は別 project）
- 本体アプリ（粗利管理ツール）のコード変更

## 5. Escalation / De-escalation 条件

- T:kind の新規追加で Cognitive Load Ceiling（15）を超える場合 → 親 review window で裁定
- R:\* との interlock 不整合が発覚した場合 → 親 taxonomy-v2 に戻って interlock 仕様を再確定
- 既存 TSIG 書き換えで scope が予想より広い場合 → review window 延長、baseline 維持

## 6. 履歴

| 日付       | 変更                       | 理由                                             |
| ---------- | -------------------------- | ------------------------------------------------ |
| 2026-04-21 | spawn（taxonomy-v2 子 B）  | umbrella Phase 1 Constitution 確定に伴う実装開始 |
| 2026-04-25 | AAG-COA 遡及判定 (Level 3) | projectization-policy 導入後の retroactive 付与  |
