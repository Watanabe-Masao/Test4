# checklist — taxonomy-v2（親）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。

## Phase 1: Constitution 起草

### Constitution 本体

- [x] `references/01-foundation/taxonomy-constitution.md` に 7 不可侵原則が landing している
- [x] `references/01-foundation/taxonomy-interlock.md` に R ⇔ T マトリクスが定義されている
- [x] `references/01-foundation/taxonomy-origin-journal.md` に現行 v1 の 20 タグの Origin が記入されている（親 Phase 0 統合 branch 2026-04-26 で §2 v1 20 タグ Origin 一覧として landing）
- [x] `CLAUDE.md` に §taxonomy-binding（AI Vocabulary Binding）が追記されている
- [x] `app/src/test/guards/constitutionBootstrapGuard.test.ts` が存在し PASS している
- [x] 制度成立 5 要件が Constitution 内に明文化されている

### Operational Control System（plan.md §OCS の Constitution 統合）

- [x] §OCS.1（State / Constitutional / Decision の 3 層分離）が Constitution 冒頭に明記されている
- [x] §OCS.2 Evidence Level（generated / tested / guarded / reviewed / asserted / unknown）が Origin Journal の frontmatter spec に統合されている
- [x] §OCS.5 Promotion Gate L0〜L2（proposed / Registered / Origin-linked）の定義が Constitution に追記されている
- [x] §OCS.10 4-Loop Operational Model（Capture / Verification / Change / Governance）が Constitution の運用節に追記されている
- [x] 既存 v1 の 20 タグが §OCS.5 Level 2（Origin-linked）到達済（Origin Journal §2 表に promotionLevel L2 として記載）

### AR-TAXONOMY-\* rule 仕様確定（active 化は子 Phase 3）

- [x] `AR-TAXONOMY-NO-UNTAGGED` の rule ID + 受け入れ条件が Constitution と plan.md で相互参照されている
- [x] `AR-TAXONOMY-KNOWN-VOCABULARY` の rule ID + 受け入れ条件が確定している
- [x] `AR-TAXONOMY-ONE-TAG-ONE-AXIS` の rule ID + 受け入れ条件が確定している
- [x] `AR-TAXONOMY-INTERLOCK` の rule ID + 受け入れ条件が確定している
- [x] `AR-TAXONOMY-ORIGIN-REQUIRED` の rule ID + 受け入れ条件が確定している
- [x] `AR-TAXONOMY-COGNITIVE-LOAD` の rule ID + 受け入れ条件が確定している
- [x] `AR-TAXONOMY-AI-VOCABULARY-BINDING` の rule ID + 受け入れ条件が確定している

### taxonomy-health.json schema（collector 実装は子 Phase 3 + 親 Phase 4）

- [x] plan.md §taxonomy-health.json schema が確定している
- [x] 子 plan からの schema 参照が明記されている
- [x] threshold / budget の正本が plan.md §OCS.6 にある旨が明記されている

## Phase 2: Review Window 仕様

### Review Window 本体

- [x] `references/03-implementation/taxonomy-review-window.md` に四半期 window の手続きが記述されている
- [x] 追加・撤退・却下の判定基準が定義されている
- [x] `references/04-tracking/taxonomy-review-journal.md` に journal skeleton が作成されている
- [x] 両軸同期 window ルールが明記されている

### Operational Control System（plan.md §OCS との接続）

- [x] §OCS.4 Lifecycle State Machine（proposed → active → deprecated → sunsetting → retired → archived）が review window 仕様に統合されている
- [x] §OCS.8 Exception Policy（TXE-NNN + reason / owner / expiresAt / sunsetCondition）が review window 仕様で TXE 採番ルールを含めて明文化されている
- [x] §OCS.9 Human Review Boundary（必須 / 自動承認）が review window 手続きに反映されている
- [x] AI が review window 外で新タグ追加を試みた場合の reject 手順が記述されている

## Phase 3: 子 project 立ち上げ

### Anchor Slice 確定（OCS.7 absorption）

- [x] §OCS.7 Anchor Slice 5 R:tag（`R:calculation` / `R:bridge` / `R:read-model` / `R:guard` / `R:presentation`）が両子 Phase 0 の inventory baseline 対象として承認されている
- [x] §OCS.7 Anchor Slice 6 T:kind（`T:unit-numerical` / `T:boundary` / `T:contract-parity` / `T:zod-contract` / `T:meta-guard` / `T:render-shape`）が両子 Phase 0 の inventory baseline 対象として承認されている
- [x] 両子 Phase 3（Guard 実装）の完了条件として「Anchor Slice §OCS.5 Promotion Gate L4（Guarded）到達」が checklist 化されている

### 子 project キックオフ

- [x] `projects/completed/responsibility-taxonomy-v2/checklist.md` の Phase 0 着手が承認されている
- [x] `projects/completed/test-taxonomy-v2/checklist.md` の Phase 0 着手が承認されている
- [x] 共通 Inventory Schema（両軸共有の CanonEntry 形）が合意されている
- [x] 親 AI_CONTEXT.md / HANDOFF.md に両子の現状リンクが記載されている

### Operational Control System の baseline 約束

- [x] §OCS.6 Drift Budget の baseline（責務軸 untagged 件数 / テスト軸 untagged 件数 / interlock violations 等）が両子 Phase 0 で計測される旨が両子 plan に記載されている
- [x] §OCS.5 Promotion Gate の baseline 計測が両子 Phase 3 完了条件に組み込まれている

## Phase 4: 制度成立確認 + archive

### 制度成立 5 要件

- [x] `projects/responsibility-taxonomy-v2` が archive 済み（全 Phase 完了）（2026-04-27、Phase 0-9 + retrospective fixes 完遂後 `projects/completed/responsibility-taxonomy-v2/` へ git mv で移動、最終レビュー [x]）
- [x] `projects/test-taxonomy-v2` が archive 済み（全 Phase 完了）（2026-04-27、同様に `projects/completed/test-taxonomy-v2/` へ移動、最終レビュー [x]）
- [x] health KPI: 両軸の未分類件数が baseline 以下で安定している（V2-R-1 baseline=0 + V2-T-1 baseline=0 + V2-R-3 / V2-T-3 hard rule、Phase 6a-2 mass-tagging で達成、Phase 8 retirement 後も維持。retrospective fix B で taxonomy-collector が live count に refactor され driftBudget 0 を恒久反映）
- [x] Cognitive Load Ceiling: 両軸の語彙総数 ≤ 15 が維持されている（責務軸 10 R:tag / テスト軸 15 T:kind、両軸とも Cognitive Load Ceiling 内で維持。V2-R-4 / V2-T-4 + INTERLOCK-3 が機械検証）
- [ ] 四半期 review window が 2 回以上 journal に記録されている（**1 回のみ実施**: §3.1 ad-hoc review 2026-04-27 cooling 撤廃。次回 2026-Q3 で 2 回目開催予定 — §3.2 Constitution context 改訂提案を含む。**forward-looking commitment**: 本 checkbox は連続運用が必要なため即時 [x] 不可、初回 archive 時点では [ ] のまま観察期間に入る）
- [ ] interlock マトリクス違反件数 = 0 が連続 2 四半期維持されている（**現状 1 四半期で 0 維持中**、taxonomyInterlockGuard 9/9 PASS が 2026-04-27 時点で landing 後継続。**forward-looking commitment**: 連続 2 四半期観察が必要、archive 後の運用フェーズで自動継続）

### Operational Control System 稼働確認

- [ ] §OCS.5 Promotion Gate L6（Health-tracked）に全タグが到達している（**registry V2 frontmatter は L5 (Coverage / Guarded) まで bump 済**、L6 (Health-tracked) は per-tag tracking が taxonomy-health.json に必要だが現状は aggregate KPI のみ。**forward-looking commitment**: per-tag promotion field 拡張は次フェーズの enhancement として `taxonomy-review-journal.md` §3.2 改訂提案に含意）
- [ ] §OCS.6 Drift Budget の全指標が budget 内で安定している（連続 2 四半期）（現状 1 四半期で全 0 維持中。**forward-looking commitment**: 連続 2 四半期観察が必要）
- [x] §OCS.10 4-Loop Operational Model が稼働している（Capture / Verification / Change / Governance）（Capture: taxonomy-collector / Verification: V2 guard 群 + LCT / Change: review-journal §3.1 ad-hoc + §3.2 提案 / Governance: AR-TAXONOMY-AI-VOCABULARY-BINDING + taxonomyLifecycleTransitionGuard、4-Loop が一通り経験済）
- [x] `npm run taxonomy:check` が CI で hard fail 条件として組み込まれている（pre-push hook の test:guards に統合、taxonomy:check 23/23 PASS が hard gate）
- [x] `npm run taxonomy:impact` が PR template の確認項目に組み込まれている（Phase 5 統合 branch で .github/PULL_REQUEST_TEMPLATE.md に「Taxonomy v2 チェック」§4 項目追加済、taxonomy:check + taxonomy:impact + review window 確認 + 新規 file タグ付与）
- [x] `references/04-tracking/generated/taxonomy-health.json` が docs:generate で生成されている（Phase 3.5 統合 branch で taxonomy-collector.ts 新設、retrospective fix B で live count に refactor、KPI 4 件 architecture-health.json に feed）
- [x] `architecture-health.json` summary に taxonomy カテゴリが反映されている（taxonomy.responsibility.unknownVocabulary / taxonomy.test.unknownVocabulary / taxonomy.vocabulary.{responsibility,test}Count の 4 KPI が KpiCategory 'guard' で feed 済）

### Anchor Slice → 全 vocabulary 拡大の確認

- [x] §OCS.7 absorption の段階 1（Anchor 着手）が両子 Phase 3 で完了済（INTERLOCK-2a / INTERLOCK-2b で Anchor Slice 5 R:tag + 6 T:kind が registry V2 に Anchor として登録されていることを機械検証、Phase 3.5 統合 branch 2026-04-26 で達成）
- [x] §OCS.7 absorption の段階 2（全 vocabulary 拡大）が両子 Phase 6 で完了済（Phase 6a-2 mass-tagging で R 軸 1041 file + T 軸 708 test に v2 vocabulary 付与、Phase 6c で全 R:tag / T:kind を promotionLevel L5 一斉 bump、Coverage 100% 達成）
- [x] §OCS.7 absorption の段階 3（Health KPI 接続）が本 Phase 4 で完了済（taxonomy-health.json の 4 KPI が architecture-health.json に feed 済 + retrospective fix B で live count refactor、KPI 接続経路が完成）

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [ ] **総チェック**: 全 Phase 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) をuser がレビューし、archive プロセスへの移行を承認する
