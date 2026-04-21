# checklist — test-taxonomy-v2（子: テスト軸）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 0: Inventory

* [ ] `references/02-status/test-taxonomy-inventory.yaml` が作成されている
* [ ] 現行 TSIG-\* rule の全件と適用対象数が記録されている
* [ ] 既存テストの粗分類（unit / contract / invariant / parity / boundary / render-shape 等）が記録されている
* [ ] 未分類テスト件数が baseline として記録されている

## Phase 1: Schema 設計

* [ ] `references/01-principles/test-taxonomy-schema.md` が作成されている
* [ ] v2 T:kind vocabulary が ≤ 15 で定義されている
* [ ] Antibody Pairs が列挙されている
* [ ] 各 T:kind に対応 R:tag の TBD エントリがある（interlock の入口）
* [ ] obligation の種類（must-have / should-have / may-have）が定義されている
* [ ] `app/src/test/testTaxonomyRegistryV2.ts` が新規作成され TSIG と併存している

## Phase 2: Migration Path

* [ ] `references/03-guides/test-tsig-to-v2-migration-map.md` が作成されている
* [ ] `T:unclassified` が v2 registry に active tag として登録されている
* [ ] タグなしテスト → `T:unclassified` の変換方針が明文化されている
* [ ] 1:1 マッピング不能な TSIG rule が `T:unclassified` への退避対象として列挙されている

## Phase 3: Guard 実装

* [ ] `app/src/test/guards/testTaxonomyGuard.test.ts` が PASS している
* [ ] interlock 検証 guard が T:kind ↔ R:tag の存在を検証している
* [ ] 未分類 baseline が ratchet-down で管理されている
* [ ] タグなし ≠ `T:unclassified` が hard fail で検出される
* [ ] TSIG と v2 guard が並行運用されている

## Phase 4: Pilot

* [ ] Pilot 対象テストリスト（≤ 30）が確定している
* [ ] Pilot 対象に T:kind が付与されている
* [ ] Pilot で発見された Schema 問題が review window に上程 or 解決済みである

## Phase 5: Operations

* [ ] `references/03-guides/test-taxonomy-operations.md` が作成されている
* [ ] 新 T:kind 提案テンプレートが定義されている
* [ ] T:kind 撤退テンプレートが定義されている
* [ ] responsibility-taxonomy-v2 との同期 review window 連絡手順が明記されている

## Phase 6: Migration Rollout

* [ ] 全テストに T:kind（`T:unclassified` 含む）が付与されている
* [ ] TSIG と v2 registry の整合検証 guard が PASS している
* [ ] health KPI に v2 未分類件数 baseline が登録されている
* [ ] TSIG/v2 ギャップ件数 baseline が登録されている

## Phase 7: TSIG Global Rule Deprecation

* [ ] TSIG-\* rule に `@deprecated since:` コメントが追記されている
* [ ] TSIG 撤去期限（90 日以上先）が設定されている
* [ ] 各 TSIG rule の v2 置換マップが完成している

## Phase 8: TSIG Retirement

* [ ] `testSignalIntegrityGuard.test.ts` が削除 or T:kind 認識化されている
* [ ] 旧 TSIG-\* identifier を参照する code が削除されている
* [ ] v2 T:kind ベース obligation が全 global rule を置換していることの検証テストが PASS している

## Phase 9: Legacy Collection

* [ ] TSIG 参照検索（`TSIG-` 等）が 0 件である
* [ ] テスト品質関連 references 文書が v2 版に更新されている
* [ ] `CLAUDE.md` §G8 のテスト品質参照が v2 に統一されている
* [ ] TSIG 時代の古いコメント / TODO が掃除されている

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
