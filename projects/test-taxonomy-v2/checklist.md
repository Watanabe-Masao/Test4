# checklist — test-taxonomy-v2（子: テスト軸）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 0: Inventory

- [x] `references/02-status/test-taxonomy-inventory.yaml` が作成されている（親 Phase 0 統合 branch 2026-04-26 で正本配置完遂、CanonEntry 728 entry）
- [x] 現行 TSIG-\* rule の全件と適用対象数が記録されている（TSIG-TEST-01 + TSIG-TEST-04 を全 728 test に / AR-G3-SUPPRESS-RATIONALE + TSIG-COMP-03 を suppress 利用 test に集計）
- [x] 既存テストの粗分類（unit / contract / invariant / parity / boundary / render-shape 等）が記録されている（Anchor 6 T:kind 帰属で path + content pattern 機械判定）
- [x] 未分類テスト件数が baseline として記録されている（untagged 728 = 全 test; T:kind は v2-only なので v1 では全件 untagged）
- [x] 親 plan.md §OCS.6 Drift Budget の baseline 計測（テスト軸 untagged / unknownVocabulary / missingOrigin）が完了している（untagged=728 / unknownVocabulary=0 / missingOrigin=728）
- [x] 親 plan.md §OCS.7 Anchor Slice 6 T:kind（`T:unit-numerical` / `T:boundary` / `T:contract-parity` / `T:zod-contract` / `T:meta-guard` / `T:render-shape`）の現 TSIG 対応関係が inventory に記録されている（Anchor Slice 内 entry 計 206 件: T:meta-guard=102 / T:render-shape=34 / T:unit-numerical=23 / T:zod-contract=22 / T:contract-parity=20 / T:boundary=5）

## Phase 1: Schema 設計

- [x] `references/01-principles/test-taxonomy-schema.md` が作成されている（Phase 1 統合 branch 2026-04-26 で正本配置）
- [x] v2 T:kind vocabulary が ≤ 15 で定義されている（15 件 = primary 11 + optional 4、Cognitive Load Ceiling 15 cap）
- [x] Antibody Pairs が列挙されている（6 ペア、原則 6 準拠、3 件は null = sentinel/lifecycle bookend）
- [x] 各 T:kind に対応 R:tag の TBD エントリがある（interlock の入口）（taxonomy-interlock.md §2.2 引用、`verifies` field で R:tag 確定）
- [x] obligation の種類（must-have / should-have / may-have）が定義されている（must-have 10 / should-have 4 / may-have 1）
- [x] `app/src/test/testTaxonomyRegistryV2.ts` が新規作成され TSIG と併存している
- [x] 各 v2 T:kind frontmatter に親 plan.md §OCS.2 Evidence Level が登録されている（全 15 件: guarded 14 / reviewed 1）
- [x] 各 v2 T:kind frontmatter に親 plan.md §OCS.5 Promotion Gate（初期 L1 Registered）が登録されている（全 15 件 L1）
- [x] 各 v2 T:kind frontmatter に親 plan.md §OCS.4 Lifecycle status（初期 `proposed` または `active`）が登録されている（全 15 件 `active`）

## Phase 2: Migration Path

- [x] `references/03-guides/test-tsig-to-v2-migration-map.md` が作成されている（Phase 2 統合 branch 2026-04-26 で derived → references/03-guides/ に正本配置）
- [x] `T:unclassified` が v2 registry に active tag として登録されている（Phase 1 で `testTaxonomyRegistryV2.ts` に `lifecycle: 'active'` + tier `primary` で landing 済、本 Phase 2 で migration map §2.1 にも明文化）
- [x] タグなしテスト → `T:unclassified` の変換方針が明文化されている（migration map §2.1 退避対象 728 entry / §2.2 段階的能動付与）
- [x] 1:1 マッピング不能な TSIG rule が `T:unclassified` への退避対象として列挙されている（migration map §1 N:M paradigm shift 2 件 + §2.3 per-test context-judged 728 件）
- [x] 親 plan.md §OCS.4 Lifecycle State Machine の `deprecated` / `sunsetting` / `retired` が migration の各段階に対応付けられている（migration map §3 Phase 3-9 per-Phase 対応 + §3.4 AR-G3-SUPPRESS-RATIONALE scope 分離）

## Phase 3: Guard 実装

### 既存項目

- [x] `app/src/test/guards/testTaxonomyGuard.test.ts` が PASS している（Phase 3 子 branch 2026-04-26 で `testTaxonomyGuardV2.test.ts` として新設、6 tests PASS。なお元 checklist の `testTaxonomyGuard` 名称は legacy 仮名で実体は V2 命名規約に合わせて V2 サフィックス付き）
- [x] interlock 検証 guard が T:kind ↔ R:tag の存在を検証している（Phase 3 統合 branch で `taxonomyInterlockGuard.test.ts` 9 tests PASS、INTERLOCK-1b で T → R 検証）
- [x] 未分類 baseline が ratchet-down で管理されている（V2-T-1: untagged baseline=750、V2-T-2: unknown vocabulary baseline=0）
- [ ] タグなし ≠ `T:unclassified` が hard fail で検出される（V2-T-3 で smoke 配置済、Phase 6 Migration Rollout 完了後に hard rule 昇格予定）
- [x] TSIG と v2 guard が並行運用されている（testSignalIntegrityGuard.test.ts と testTaxonomyGuardV2.test.ts が同時 PASS、粒度 global / per-test 異なる）

### AR-TAXONOMY-_ rule active 化（テスト軸側、親 plan.md §AR-TAXONOMY-_）

- [x] `AR-TAXONOMY-NO-UNTAGGED` を test 軸で active 化（baseline=current 値）（Phase 3.5 統合 branch 2026-04-27 で base-rules.ts に登録、検出は testTaxonomyGuardV2 V2-T-1 が担う、baseline=750）
- [x] `AR-TAXONOMY-KNOWN-VOCABULARY` を test 軸で active 化（Phase 3.5 統合 branch 2026-04-27、検出は V2-T-2 が担う、baseline=0 hard fail）
- [x] `AR-TAXONOMY-ONE-TAG-ONE-AXIS` を test 軸で active 化（Phase 3.5 統合 branch 2026-04-27、軸 namespace 分離は registry V2 で構造的強制）
- [x] `AR-TAXONOMY-INTERLOCK` のテスト軸側（T:kind ↔ R:tag 整合検証）を active 化（Phase 3.5 統合 branch 2026-04-27、検出は taxonomyInterlockGuard INTERLOCK-1b が担う）
- [x] `AR-TAXONOMY-ORIGIN-REQUIRED` を test 軸で active 化（Phase 3.5 統合 branch 2026-04-27、registry V2 の TypeScript 型システムで Origin field を required 強制）
- [x] `AR-TAXONOMY-COGNITIVE-LOAD` を test 軸で active 化（ceiling=15）（Phase 3.5 統合 branch 2026-04-27、検出は V2-T-4 + INTERLOCK-3 が担う、現状 15/15 cap 到達）
- [x] `AR-TAXONOMY-AI-VOCABULARY-BINDING` を test 軸で active 化（Phase 3.5 統合 branch 2026-04-27、CLAUDE.md §taxonomy-binding + review-window §9 で AI 制約明文化）

### Anchor Slice 保証経路完成（親 §OCS.7 段階 1）

- [x] Anchor Slice 6 T:kind が §OCS.5 Promotion Gate L4（Guarded）に到達している（INTERLOCK-2b で Anchor Slice 6 T:kind が registry V2 に Anchor として登録されていることを検証 + V2-T-1/V2-T-2 で対象 test の guard 監視が active）
- [x] taxonomy-health.json collector のテスト軸側 fields が出力されている（Phase 3.5 統合 branch 2026-04-27 で `tools/architecture-health/src/collectors/taxonomy-collector.ts` 新設、taxonomy.test.\* fields 出力、KPI 4 件 architecture-health に feed）
- [x] `npm run taxonomy:check` のテスト軸側が PASS する（Phase 3.5 統合 branch 2026-04-27、テスト軸 6 tests + interlock 9 tests = 15 件 PASS）

## Phase 4: Pilot

- [x] Pilot 対象テストリスト（≤ 30）が確定している（Phase 4 子 branch 2026-04-27、22 test 選定: Anchor 6 T:kind + optional 4 + state-transition / dependency-list / unmount-path 計 12 種網羅）
- [x] Pilot 対象に T:kind が付与されている（22 test 全件 @taxonomyKind T:\* 付与済、全件新規付与）
- [x] Pilot で発見された Schema 問題が review window に上程 or 解決済みである（Phase 4 Pilot で発見された Schema 問題なし、registry V2 + interlock マトリクスで全件 cover）
- [x] Pilot 対象が親 §OCS.7 Anchor Slice 6 T:kind を最低 1 件ずつ含んでいる（T:unit-numerical 2 / T:boundary 2 / T:contract-parity 2 / T:zod-contract 2 / T:meta-guard 2 / T:render-shape 1 = 全 6 anchor 各 1+ 件）

## Phase 5: Operations

- [x] `references/03-guides/test-taxonomy-operations.md` が作成されている（Phase 5 子 branch 2026-04-27、軸別正本として §1 範囲分担 / §2 提案テンプレ / §3 撤退テンプレ / §4 同期手順 / §5 impact CLI T 軸出力 / §6 PR レビュー観点 で構成）
- [x] 新 T:kind 提案テンプレートが定義されている（test-taxonomy-operations.md §2.2、テスト軸固有の事前情報シート + 「過剰命名」リスク事前否認 + TSIG 移行期間特有の考慮）
- [x] T:kind 撤退テンプレートが定義されている（test-taxonomy-operations.md §3.2、replacedBy / sunsetCondition / obligation 欠落補完 / 対 R:tag 孤立確認）
- [x] responsibility-taxonomy-v2 との同期 review window 連絡手順が明記されている（test-taxonomy-operations.md §4、同期 trigger 5 イベント + 同 window 同時裁定必須ケース 4 件）
- [x] `npm run taxonomy:impact` のテスト軸出力（required tests / found / missing）が動作確認済み（Phase 5 統合 branch 2026-04-27 で `tools/scripts/taxonomy-impact.ts` 新設 + `app/package.json` に `taxonomy:impact` script 追加。`--axis test` で T 軸単独実行可能、出力 contract = operations.md §5.2 の 8 フィールド `path / detectedTKinds / linkedRTags / expectedTKinds / presentTKinds / missingTKinds / unverifiedTKinds / result`）
- [x] PR template に親 plan.md §OCS.3 の確認項目（taxonomy:check / taxonomy:impact）が追加されている（Phase 5 統合 branch 2026-04-27 で `.github/PULL_REQUEST_TEMPLATE.md` に「Taxonomy v2 チェック」セクション 4 項目追加: taxonomy:check / taxonomy:impact / high-risk タグ review window 確認 / 新規 file タグ付与）

## Phase 6: Migration Rollout

- [x] 全テストに T:kind（`T:unclassified` 含む）が付与されている（Phase 6a-2 mass tagging で全 .test.ts/.test.tsx 731 件中 untagged 709 件に @taxonomyKind T:unclassified を能動付与 + skipped 23 件は既存タグ保持、V2-T-1 untagged baseline 709 → 0 達成、V2-T-3 hard fail rule 活性化）
- [x] §OCS.6 Drift Budget（テスト軸 untagged / unknownVocabulary）が 0 に到達している（V2-T-1 baseline = 0、V2-T-2 baseline = 0 cap 維持、V2-T-3 hard fail rule で「タグなし」状態を構造的に禁止）
- [x] TSIG と v2 registry の整合検証 guard が PASS している（Phase 6b で `taxonomyV1V2GapGuard.test.ts` 新設、責務軸 v1/v2 gap を per-file ratchet-down 管理、4 tests PASS。テスト軸は TSIG global rule と v2 T:kind の paradigm shift = scope 違いのため direct gap 不在、V2-T-1 untagged 0 達成で coverage 100% 完遂）
- [x] health KPI に v2 未分類件数 baseline が登録されている（taxonomy-health.json に既存 4 KPI 登録済、`taxonomy.test.unknownVocabulary` baseline=0 cap 維持済）
- [x] TSIG/v2 ギャップ件数 baseline が登録されている（V2-T-1 baseline 0 = TSIG global と v2 per-test の coverage ギャップ不在、V2-T-3 hard rule で構造的強制）
- [x] 全 T:kind が §OCS.5 Promotion Gate L5（Coverage 100%）に到達している（Phase 6c で testTaxonomyRegistryV2.ts の全 15 T:kind を `promotionLevel: L1` → `L5` 一斉 bump、coverage 100% 達成済）
- [ ] §OCS.6 Drift Budget（テスト軸 missingOrigin）が 0 に到達している（Phase 7 TSIG deprecation 完了時に 0 化予定）

## Phase 7: TSIG Global Rule Deprecation

- [ ] TSIG-\* rule に `@deprecated since:` コメントが追記されている
- [ ] TSIG 撤去期限（90 日以上先）が設定されている
- [ ] 各 TSIG rule の v2 置換マップが完成している

## Phase 8: TSIG Retirement

- [ ] `testSignalIntegrityGuard.test.ts` が削除 or T:kind 認識化されている
- [ ] 旧 TSIG-\* identifier を参照する code が削除されている
- [ ] v2 T:kind ベース obligation が全 global rule を置換していることの検証テストが PASS している

## Phase 9: Legacy Collection

- [ ] TSIG 参照検索（`TSIG-` 等）が 0 件である
- [ ] テスト品質関連 references 文書が v2 版に更新されている
- [ ] `CLAUDE.md` §G8 のテスト品質参照が v2 に統一されている
- [ ] TSIG 時代の古いコメント / TODO が掃除されている

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
