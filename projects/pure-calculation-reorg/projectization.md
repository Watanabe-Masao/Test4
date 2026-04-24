# projectization — pure-calculation-reorg

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目                       | 値                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectizationLevel`      | Level 3                                                                                                                                                       |
| `changeType`               | architecture-refactor                                                                                                                                         |
| `implementationScope`      | `["app/src/domain/calculations/", "app/src/test/calculationCanonRegistry.ts", "app/src/test/semanticViews.ts", "app/src/test/architectureRules.ts", "wasm/"]` |
| `breakingChange`           | true                                                                                                                                                          |
| `requiresLegacyRetirement` | true                                                                                                                                                          |
| `requiresGuard`            | true                                                                                                                                                          |
| `requiresHumanApproval`    | true                                                                                                                                                          |

## 2. 判定理由

`domain/calculations/` 配下の pure 計算群を意味責任ベース（business / analytic /
candidate）で再分類し、calculationCanonRegistry を唯一の master とし、bridge 構造
で JS ↔ WASM を切り替え、最終的に JS 正本を段階削除する。Phase 0-9 の重量級
architecture refactor。

- **Level 3** — domain / test schema / wasm にまたがる architecture level の再編。
  単独 project のため Level 4 ではない
- **changeType=architecture-refactor** — 意味分類体系と bridge 構造の導入
- **breakingChange=true** — Phase 7 以降の JS 正本削除（bridge 経由に切替）、
  Phase 9 での一括削除を含む
- **requiresLegacyRetirement=true** — JS 計算群の段階撤退（Phase 7 統合整理、
  Phase 9 最終削除）
- **requiresGuard=true** — Phase 0: `authoritative` 単独使用禁止 guard、
  Phase 3: bridge 未経由禁止 guard、Phase 4: current/candidate 混線禁止 guard、
  Phase 7: 統合整理時の追加 guard
- **requiresHumanApproval=true** — Phase 8 Promote Ceremony の承認主体は人間
  （原則 1）、archive 時レビュー必須

## 3. 必要な文書

| 文書                             |    必要性 | 理由                                                                  |
| -------------------------------- | --------: | --------------------------------------------------------------------- |
| `AI_CONTEXT.md`                  |  required | Level 3 必須                                                          |
| `HANDOFF.md`                     |  required | Level 3 必須                                                          |
| `plan.md`                        |  required | 4 不可侵原則 + Phase 0-9 + 禁止事項テーブル                           |
| `checklist.md`                   |  required | completion 判定入力                                                   |
| `inquiry/`                       |      任意 | 現状 inquiry/ は持たない（Phase ごとに棚卸しを checklist 内で進める） |
| `breaking-changes.md`            |  required | Phase 7 / 9 の JS 削除の運用                                          |
| `legacy-retirement.md`           |  required | JS 計算群の撤退運用                                                   |
| `sub-project-map.md`             | forbidden | 単独 project                                                          |
| guard 設計 (plan.md 内)          |  required | 4 guard の baseline 戦略（Phase 別禁止事項テーブルに記載済み）        |
| 最終レビュー (人間承認) checkbox |  required | requiresHumanApproval=true                                            |

## 4. やらないこと (nonGoals)

- Promote Ceremony なしの current 編入（原則 1 違反）
- derived view の手編集（原則 3 違反）
- current / candidate の混線（原則 4 違反）
- データロード冪等化（別 project: `data-load-idempotency-hardening` に archive 済み）
- AAG ルール分割（別 project: `aag-rule-splitting-execution` に archive 済み）
- Presentation 品質強化（別 project: `presentation-quality-hardening`）
- JS を一気に削除（Phase 7 禁止事項、段階削除のみ）
- 実装 AI による自己承認（Phase 8 禁止事項）

## 5. Escalation / De-escalation 条件

- Phase 8 Promote Ceremony で人間承認が得られない場合 → Phase 8 に留まる
- Phase 7 の段階削除で新たな bridge が必要と判明 → plan.md §Phase 別禁止事項テーブルに追加
- scope が複雑化し複数 sub-project に分割必要と判明 → Level 4 に escalate（現状想定外）

## 6. 履歴

| 日付        | 変更                       | 理由                                            |
| ----------- | -------------------------- | ----------------------------------------------- |
| （initial） | project bootstrap          | domain/calculations/ の意味分類整備             |
| 2026-04-25  | AAG-COA 遡及判定 (Level 3) | projectization-policy 導入後の retroactive 付与 |
