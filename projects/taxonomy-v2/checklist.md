# checklist — taxonomy-v2（親）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 1: Constitution 起草

### Constitution 本体

* [x] `references/01-principles/taxonomy-constitution.md` に 7 不可侵原則が landing している
* [x] `references/01-principles/taxonomy-interlock.md` に R ⇔ T マトリクスが定義されている
* [ ] `references/01-principles/taxonomy-origin-journal.md` に現行 v1 の 20 タグの Origin が記入されている
* [x] `CLAUDE.md` に §taxonomy-binding（AI Vocabulary Binding）が追記されている
* [x] `app/src/test/guards/constitutionBootstrapGuard.test.ts` が存在し PASS している
* [x] 制度成立 5 要件が Constitution 内に明文化されている

### Operational Control System（plan.md §OCS の Constitution 統合）

* [x] §OCS.1（State / Constitutional / Decision の 3 層分離）が Constitution 冒頭に明記されている
* [x] §OCS.2 Evidence Level（generated / tested / guarded / reviewed / asserted / unknown）が Origin Journal の frontmatter spec に統合されている
* [x] §OCS.5 Promotion Gate L0〜L2（proposed / Registered / Origin-linked）の定義が Constitution に追記されている
* [x] §OCS.10 4-Loop Operational Model（Capture / Verification / Change / Governance）が Constitution の運用節に追記されている
* [ ] 既存 v1 の 20 タグが §OCS.5 Level 2（Origin-linked）到達済

### AR-TAXONOMY-* rule 仕様確定（active 化は子 Phase 3）

* [x] `AR-TAXONOMY-NO-UNTAGGED` の rule ID + 受け入れ条件が Constitution と plan.md で相互参照されている
* [x] `AR-TAXONOMY-KNOWN-VOCABULARY` の rule ID + 受け入れ条件が確定している
* [x] `AR-TAXONOMY-ONE-TAG-ONE-AXIS` の rule ID + 受け入れ条件が確定している
* [x] `AR-TAXONOMY-INTERLOCK` の rule ID + 受け入れ条件が確定している
* [x] `AR-TAXONOMY-ORIGIN-REQUIRED` の rule ID + 受け入れ条件が確定している
* [x] `AR-TAXONOMY-COGNITIVE-LOAD` の rule ID + 受け入れ条件が確定している
* [x] `AR-TAXONOMY-AI-VOCABULARY-BINDING` の rule ID + 受け入れ条件が確定している

### taxonomy-health.json schema（collector 実装は子 Phase 3 + 親 Phase 4）

* [x] plan.md §taxonomy-health.json schema が確定している
* [x] 子 plan からの schema 参照が明記されている
* [x] threshold / budget の正本が plan.md §OCS.6 にある旨が明記されている

## Phase 2: Review Window 仕様

### Review Window 本体

* [x] `references/03-guides/taxonomy-review-window.md` に四半期 window の手続きが記述されている
* [x] 追加・撤退・却下の判定基準が定義されている
* [x] `references/02-status/taxonomy-review-journal.md` に journal skeleton が作成されている
* [x] 両軸同期 window ルールが明記されている

### Operational Control System（plan.md §OCS との接続）

* [x] §OCS.4 Lifecycle State Machine（proposed → active → deprecated → sunsetting → retired → archived）が review window 仕様に統合されている
* [x] §OCS.8 Exception Policy（TXE-NNN + reason / owner / expiresAt / sunsetCondition）が review window 仕様で TXE 採番ルールを含めて明文化されている
* [x] §OCS.9 Human Review Boundary（必須 / 自動承認）が review window 手続きに反映されている
* [x] AI が review window 外で新タグ追加を試みた場合の reject 手順が記述されている

## Phase 3: 子 project 立ち上げ

### Anchor Slice 確定（OCS.7 absorption）

* [ ] §OCS.7 Anchor Slice 5 R:tag（`R:calculation` / `R:bridge` / `R:read-model` / `R:guard` / `R:presentation`）が両子 Phase 0 の inventory baseline 対象として承認されている
* [ ] §OCS.7 Anchor Slice 6 T:kind（`T:unit-numerical` / `T:boundary` / `T:contract-parity` / `T:zod-contract` / `T:meta-guard` / `T:render-shape`）が両子 Phase 0 の inventory baseline 対象として承認されている
* [ ] 両子 Phase 3（Guard 実装）の完了条件として「Anchor Slice §OCS.5 Promotion Gate L4（Guarded）到達」が checklist 化されている

### 子 project キックオフ

* [ ] `projects/responsibility-taxonomy-v2/checklist.md` の Phase 0 着手が承認されている
* [ ] `projects/test-taxonomy-v2/checklist.md` の Phase 0 着手が承認されている
* [ ] 共通 Inventory Schema（両軸共有の CanonEntry 形）が合意されている
* [ ] 親 AI_CONTEXT.md / HANDOFF.md に両子の現状リンクが記載されている

### Operational Control System の baseline 約束

* [ ] §OCS.6 Drift Budget の baseline（責務軸 untagged 件数 / テスト軸 untagged 件数 / interlock violations 等）が両子 Phase 0 で計測される旨が両子 plan に記載されている
* [ ] §OCS.5 Promotion Gate の baseline 計測が両子 Phase 3 完了条件に組み込まれている

## Phase 4: 制度成立確認 + archive

### 制度成立 5 要件

* [ ] `projects/responsibility-taxonomy-v2` が archive 済み（全 Phase 完了）
* [ ] `projects/test-taxonomy-v2` が archive 済み（全 Phase 完了）
* [ ] health KPI: 両軸の未分類件数が baseline 以下で安定している
* [ ] Cognitive Load Ceiling: 両軸の語彙総数 ≤ 15 が維持されている
* [ ] 四半期 review window が 2 回以上 journal に記録されている
* [ ] interlock マトリクス違反件数 = 0 が連続 2 四半期維持されている

### Operational Control System 稼働確認

* [ ] §OCS.5 Promotion Gate L6（Health-tracked）に全タグが到達している
* [ ] §OCS.6 Drift Budget の全指標が budget 内で安定している（連続 2 四半期）
* [ ] §OCS.10 4-Loop Operational Model が稼働している（Capture / Verification / Change / Governance）
* [ ] `npm run taxonomy:check` が CI で hard fail 条件として組み込まれている
* [ ] `npm run taxonomy:impact` が PR template の確認項目に組み込まれている
* [ ] `references/02-status/generated/taxonomy-health.json` が docs:generate で生成されている
* [ ] `architecture-health.json` summary に taxonomy カテゴリが反映されている

### Anchor Slice → 全 vocabulary 拡大の確認

* [ ] §OCS.7 absorption の段階 1（Anchor 着手）が両子 Phase 3 で完了済
* [ ] §OCS.7 absorption の段階 2（全 vocabulary 拡大）が両子 Phase 6 で完了済
* [ ] §OCS.7 absorption の段階 3（Health KPI 接続）が本 Phase 4 で完了済

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
