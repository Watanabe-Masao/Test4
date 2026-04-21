# checklist — taxonomy-v2（親）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 1: Constitution 起草

* [ ] `references/01-principles/taxonomy-constitution.md` に 7 不可侵原則が landing している
* [ ] `references/01-principles/taxonomy-interlock.md` に R ⇔ T マトリクスが定義されている
* [ ] `references/01-principles/taxonomy-origin-journal.md` に現行 v1 の 20 タグの Origin が記入されている
* [ ] `CLAUDE.md` に §taxonomy-binding（AI Vocabulary Binding）が追記されている
* [ ] `app/src/test/guards/constitutionBootstrapGuard.test.ts` が存在し PASS している
* [ ] 制度成立 5 要件が Constitution 内に明文化されている

## Phase 2: Review Window 仕様

* [ ] `references/03-guides/taxonomy-review-window.md` に四半期 window の手続きが記述されている
* [ ] 追加・撤退・却下の判定基準が定義されている
* [ ] `references/02-status/taxonomy-review-journal.md` に journal skeleton が作成されている
* [ ] 両軸同期 window ルールが明記されている

## Phase 3: 子 project 立ち上げ

* [ ] `projects/responsibility-taxonomy-v2/checklist.md` の Phase 0 着手が承認されている
* [ ] `projects/test-taxonomy-v2/checklist.md` の Phase 0 着手が承認されている
* [ ] 共通 Inventory Schema（両軸共有の CanonEntry 形）が合意されている
* [ ] 親 AI_CONTEXT.md / HANDOFF.md に両子の現状リンクが記載されている

## Phase 4: 制度成立確認 + archive

* [ ] `projects/responsibility-taxonomy-v2` が archive 済み（全 Phase 完了）
* [ ] `projects/test-taxonomy-v2` が archive 済み（全 Phase 完了）
* [ ] health KPI: 両軸の未分類件数が baseline 以下で安定している
* [ ] Cognitive Load Ceiling: 両軸の語彙総数 ≤ 15 が維持されている
* [ ] 四半期 review window が 2 回以上 journal に記録されている
* [ ] interlock マトリクス違反件数 = 0 が連続 2 四半期維持されている

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
