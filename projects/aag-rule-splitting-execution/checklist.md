# checklist — aag-rule-splitting-execution

> 役割: completion 判定の入力。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。

## Phase 1: 7 ルールの定義追加

* [ ] `AR-RESP-STORE-COUPLING` (P2 由来) を追加する
* [ ] `AR-RESP-MODULE-STATE` (P7 由来) を追加する
* [ ] `AR-RESP-HOOK-COMPLEXITY` (P8 由来) を追加する
* [ ] `AR-RESP-FEATURE-COMPLEXITY` (P10 由来) を追加する
* [ ] `AR-RESP-EXPORT-DENSITY` (P12 由来) を追加する
* [ ] `AR-RESP-NORMALIZATION` (P17 由来) を追加する
* [ ] `AR-RESP-FALLBACK-SPREAD` (P18 由来) を追加する
* [ ] 各ルールに `what` / `correctPattern` / `outdatedPattern` / `migrationRecipe` を記入する
* [ ] architectureRuleGuard.test.ts で 7 ルールの整合性が PASS することを確認する

## Phase 2: ガードの分離

* [ ] `responsibilitySeparationGuard.test.ts` の violation 出力に ruleId を紐付ける
* [ ] 7 種のパターンが個別 ruleId で集計されることを確認する
* [ ] ratchet baseline を AR-RESP-MODULE-STATE に引き継ぐ（4 件を移す）
* [ ] 他 6 ルールの baseline を 0 で固定する

## Phase 3: 例外圧の再分類 + 旧ルール削除

* [ ] AR-RESP-MODULE-STATE に 4 件の例外が再帰属していることを確認する
* [ ] 他 6 ルールの違反数が 0 であることを確認する
* [ ] AR-STRUCT-RESP-SEPARATION を rules.ts から削除する
* [ ] `references/01-principles/aag-rule-splitting-plan.md` 冒頭に「本 plan は projects/aag-rule-splitting-execution で完了済み」を追記する
