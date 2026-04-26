# checklist — responsibility-taxonomy-v2（子: 責務軸）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 0: Inventory

* [x] `references/02-status/responsibility-taxonomy-inventory.yaml` が作成されている（親 Phase 0 統合 branch 2026-04-26 で正本配置完遂、CanonEntry 1370 entry）
* [x] 現行 v1 の 20 タグ全てに Origin（採択日・採択者 or legacy-unknown）が記入されている（親 Phase 0 統合 branch 2026-04-26 で `references/01-principles/taxonomy-origin-journal.md` §2 v1 20 タグ Origin 一覧として landing）
* [x] 35+ 対象ファイルの現 v1 タグが全件記録されている（実測 1370 entry: 5 directories scope = application/ + domain/ + features/ + infrastructure/ + presentation/ + test/guards/）
* [x] 未分類件数と層別分布が baseline として記録されている（untagged 1055 / 比率 77%）
* [x] タグ不一致 48 件の分布が記録されている（unknown vocabulary 20 件 = R:guard 16 / R:model 3 / R:selector 1 として記録）
* [x] 親 plan.md §OCS.6 Drift Budget の baseline 計測（責務軸 untagged / unknownVocabulary / missingOrigin）が完了している（untagged=1055 / unknownVocabulary=20 / missingOrigin=1370）
* [x] 親 plan.md §OCS.7 Anchor Slice 5 R:tag（`R:calculation` / `R:bridge` / `R:read-model` / `R:guard` / `R:presentation`）の現 v1 対応関係が inventory に記録されている（Anchor Slice 内 entry 計 299 件: R:guard=102 / R:presentation=112 / R:calculation=38 / R:read-model=31 / R:bridge=16）

## Phase 1: Schema 設計

* [ ] `references/01-principles/responsibility-taxonomy-schema.md` が作成されている
* [ ] v2 R:tag vocabulary が ≤ 15 で定義されている
* [ ] Antibody Pairs が列挙されている
* [ ] 各 R:tag に対応 T:kind の TBD エントリがある（interlock の入口）
* [ ] R:utility / R:misc 等の捨て場タグが含まれていない
* [ ] `app/src/test/responsibilityTaxonomyRegistryV2.ts` が新規作成され v1 と併存している
* [ ] 各 v2 R:tag frontmatter に親 plan.md §OCS.2 Evidence Level が登録されている
* [ ] 各 v2 R:tag frontmatter に親 plan.md §OCS.5 Promotion Gate（初期 L1 Registered）が登録されている
* [ ] 各 v2 R:tag frontmatter に親 plan.md §OCS.4 Lifecycle status（初期 `proposed` または `active`）が登録されている

## Phase 2: Migration Path

* [ ] `references/03-guides/responsibility-v1-to-v2-migration-map.md` が作成されている
* [ ] `R:unclassified` が v2 registry に active tag として登録されている
* [ ] v1 タグなし → v2 `R:unclassified` の変換方針が明文化されている
* [ ] 1:1 マッピング不能なタグが `R:unclassified` への退避対象として列挙されている
* [ ] 親 plan.md §OCS.4 Lifecycle State Machine の `deprecated` / `sunsetting` / `retired` が migration の各段階に対応付けられている

## Phase 3: Guard 実装

### 既存項目

* [ ] `app/src/test/guards/responsibilityTagGuardV2.test.ts` が PASS している
* [ ] interlock 検証 guard が R:tag → 必須 T:kind の存在を検証している
* [ ] 未分類 baseline が ratchet-down で管理されている
* [ ] タグなし ≠ `R:unclassified` が hard fail で検出される
* [ ] v1 guard と v2 guard が並行運用されている

### AR-TAXONOMY-_ rule active 化（責務軸側、親 plan.md §AR-TAXONOMY-_）

* [ ] `AR-TAXONOMY-NO-UNTAGGED` を responsibility 軸で active 化（baseline=current 値）
* [ ] `AR-TAXONOMY-KNOWN-VOCABULARY` を responsibility 軸で active 化
* [ ] `AR-TAXONOMY-ONE-TAG-ONE-AXIS` を responsibility 軸で active 化
* [ ] `AR-TAXONOMY-INTERLOCK` の責務軸側（R:tag → required T:kind 検証）を active 化
* [ ] `AR-TAXONOMY-ORIGIN-REQUIRED` を responsibility 軸で active 化
* [ ] `AR-TAXONOMY-COGNITIVE-LOAD` を responsibility 軸で active 化（ceiling=15）
* [ ] `AR-TAXONOMY-AI-VOCABULARY-BINDING` を responsibility 軸で active 化

### Anchor Slice 保証経路完成（親 §OCS.7 段階 1）

* [ ] Anchor Slice 5 R:tag が §OCS.5 Promotion Gate L4（Guarded）に到達している
* [ ] taxonomy-health.json collector の責務軸側 fields が出力されている
* [ ] `npm run taxonomy:check` の責務軸側が PASS する

## Phase 4: Pilot

* [ ] Pilot 対象ファイルリスト（≤ 20）が確定している
* [ ] Pilot 対象に v2 タグが付与されている
* [ ] Pilot で発見された Schema 問題が review window に上程 or 解決済みである
* [ ] Pilot 対象が親 §OCS.7 Anchor Slice 5 R:tag を最低 1 件ずつ含んでいる

## Phase 5: Operations

* [ ] `references/03-guides/responsibility-taxonomy-operations.md` が作成されている
* [ ] 新 R:tag 提案テンプレートが定義されている
* [ ] R:tag 撤退テンプレートが定義されている
* [ ] test-taxonomy-v2 との同期 review window 連絡手順が明記されている
* [ ] `npm run taxonomy:impact` の R: 軸出力（detected responsibility / required tests）が動作確認済み
* [ ] PR template に親 plan.md §OCS.3 の確認項目（taxonomy:check / taxonomy:impact）が追加されている

## Phase 6: Migration Rollout

* [ ] 全対象ファイルに v2 タグ（`R:unclassified` 含む）が付与されている
* [ ] v1 registry と v2 registry の整合検証 guard が PASS している
* [ ] health KPI に v2 未分類件数 baseline が登録されている
* [ ] v1/v2 ギャップ件数 baseline が登録されている
* [ ] 全 R:tag が §OCS.5 Promotion Gate L5（Coverage 100%）に到達している
* [ ] §OCS.6 Drift Budget（責務軸 untagged / unknownVocabulary / missingOrigin）が全て 0 に到達している

## Phase 7: v1 Deprecation

* [ ] v1 registry / guard に `@deprecated since:` コメントが追記されている
* [ ] v1 撤去期限（90 日以上先）が設定されている
* [ ] 移行期限が CLAUDE.md または references/ から参照可能である

## Phase 8: v1 Retirement

* [ ] `app/src/test/responsibilityTagRegistry.ts` が削除されている
* [ ] `app/src/test/guards/responsibilityTagGuard.test.ts` が削除されている
* [ ] 旧 R:tag を禁止する新 guard が PASS している
* [ ] v1 関連の allowlist / ratchet baseline が削除されている

## Phase 9: Legacy Collection

* [ ] v1 参照検索（`responsibilityTagRegistry[^V]` 等）が 0 件である
* [ ] `references/03-guides/responsibility-separation-catalog.md` が v2 版に更新されている
* [ ] `CLAUDE.md` §G8 の参照が v2 に統一されている
* [ ] v1 時代の古いコメント / TODO が掃除されている

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
