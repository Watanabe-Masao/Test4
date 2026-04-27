# checklist — responsibility-taxonomy-v2（子: 責務軸）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。

## Phase 0: Inventory

- [x] `references/02-status/responsibility-taxonomy-inventory.yaml` が作成されている（親 Phase 0 統合 branch 2026-04-26 で正本配置完遂、CanonEntry 1370 entry）
- [x] 現行 v1 の 20 タグ全てに Origin（採択日・採択者 or legacy-unknown）が記入されている（親 Phase 0 統合 branch 2026-04-26 で `references/01-principles/taxonomy-origin-journal.md` §2 v1 20 タグ Origin 一覧として landing）
- [x] 35+ 対象ファイルの現 v1 タグが全件記録されている（実測 1370 entry: 5 directories scope = application/ + domain/ + features/ + infrastructure/ + presentation/ + test/guards/）
- [x] 未分類件数と層別分布が baseline として記録されている（untagged 1055 / 比率 77%）
- [x] タグ不一致 48 件の分布が記録されている（unknown vocabulary 20 件 = R:guard 16 / R:model 3 / R:selector 1 として記録）
- [x] 親 plan.md §OCS.6 Drift Budget の baseline 計測（責務軸 untagged / unknownVocabulary / missingOrigin）が完了している（untagged=1055 / unknownVocabulary=20 / missingOrigin=1370）
- [x] 親 plan.md §OCS.7 Anchor Slice 5 R:tag（`R:calculation` / `R:bridge` / `R:read-model` / `R:guard` / `R:presentation`）の現 v1 対応関係が inventory に記録されている（Anchor Slice 内 entry 計 299 件: R:guard=102 / R:presentation=112 / R:calculation=38 / R:read-model=31 / R:bridge=16）

## Phase 1: Schema 設計

- [x] `references/01-principles/responsibility-taxonomy-schema.md` が作成されている（Phase 1 統合 branch 2026-04-26 で正本配置）
- [x] v2 R:tag vocabulary が ≤ 15 で定義されている（10 件、Cognitive Load Ceiling 15 まで余裕 5）
- [x] Antibody Pairs が列挙されている（6 ペア、原則 6 準拠）
- [x] 各 R:tag に対応 T:kind の TBD エントリがある（interlock の入口）（taxonomy-interlock.md §2.1 引用、R:adapter / R:registry のみ短期 TBD）
- [x] R:utility / R:misc 等の捨て場タグが含まれていない（捨て場は R:unclassified に正規化、原則 1 + Phase 1 禁止事項）
- [x] `app/src/test/responsibilityTaxonomyRegistryV2.ts` が新規作成され v1 と併存している
- [x] 各 v2 R:tag frontmatter に親 plan.md §OCS.2 Evidence Level が登録されている（全 10 件: guarded 7 / asserted 2 / reviewed 1）
- [x] 各 v2 R:tag frontmatter に親 plan.md §OCS.5 Promotion Gate（初期 L1 Registered）が登録されている（全 10 件 L1）
- [x] 各 v2 R:tag frontmatter に親 plan.md §OCS.4 Lifecycle status（初期 `proposed` または `active`）が登録されている（全 10 件 `active`）

## Phase 2: Migration Path

- [x] `references/03-guides/responsibility-v1-to-v2-migration-map.md` が作成されている（Phase 2 統合 branch 2026-04-26 で derived → references/03-guides/ に正本配置）
- [x] `R:unclassified` が v2 registry に active tag として登録されている（Phase 1 で `responsibilityTaxonomyRegistryV2.ts` に `lifecycle: 'active'` で landing 済、本 Phase 2 で migration map §1 / §2.1 にも明文化）
- [x] v1 タグなし → v2 `R:unclassified` の変換方針が明文化されている（migration map §2.1 退避対象 / §2.2 段階的能動付与）
- [x] 1:1 マッピング不能なタグが `R:unclassified` への退避対象として列挙されている（migration map §1 N:1 退避: R:utility 48 / R:barrel 5、§2.3 context-judged: R:transform 18）
- [x] 親 plan.md §OCS.4 Lifecycle State Machine の `deprecated` / `sunsetting` / `retired` が migration の各段階に対応付けられている（migration map §3 Phase 3-9 per-Phase 対応）

## Phase 3: Guard 実装

### 既存項目

- [x] `app/src/test/guards/responsibilityTagGuardV2.test.ts` が PASS している（Phase 3 子 branch 2026-04-26、5 tests PASS）
- [x] interlock 検証 guard が R:tag → 必須 T:kind の存在を検証している（Phase 3 統合 branch で `taxonomyInterlockGuard.test.ts` 9 tests PASS、INTERLOCK-1a/1b で双方向検証 + INTERLOCK-4a で Antibody Pair 双方向対称性検出 → schema fix）
- [x] 未分類 baseline が ratchet-down で管理されている（V2-R-1: untagged baseline=1055、V2-R-2: unknown vocabulary baseline=270）
- [ ] タグなし ≠ `R:unclassified` が hard fail で検出される（V2-R-3 で smoke 配置済、Phase 6 Migration Rollout 完了後に hard rule 昇格予定）
- [x] v1 guard と v2 guard が並行運用されている（responsibilityTagGuard.test.ts と responsibilityTagGuardV2.test.ts が同時 PASS、scope/vocabulary 異なる）

### AR-TAXONOMY-_ rule active 化（責務軸側、親 plan.md §AR-TAXONOMY-_）

- [x] `AR-TAXONOMY-NO-UNTAGGED` を responsibility 軸で active 化（baseline=current 値）（Phase 3.5 統合 branch 2026-04-27 で base-rules.ts に登録、guardCategoryMap + executionOverlay + reviewPolicy 追加、検出は responsibilityTagGuardV2 V2-R-1 が担う、baseline=1055）
- [x] `AR-TAXONOMY-KNOWN-VOCABULARY` を responsibility 軸で active 化（Phase 3.5 統合 branch 2026-04-27、検出は V2-R-2 が担う、baseline=270）
- [x] `AR-TAXONOMY-ONE-TAG-ONE-AXIS` を responsibility 軸で active 化（Phase 3.5 統合 branch 2026-04-27、軸 namespace 分離は registry V2 + guardCategoryMap で構造的強制）
- [x] `AR-TAXONOMY-INTERLOCK` の責務軸側（R:tag → required T:kind 検証）を active 化（Phase 3.5 統合 branch 2026-04-27、検出は taxonomyInterlockGuard INTERLOCK-1a が担う）
- [x] `AR-TAXONOMY-ORIGIN-REQUIRED` を responsibility 軸で active 化（Phase 3.5 統合 branch 2026-04-27、registry V2 の TypeScript 型システムで Origin field を required 強制）
- [x] `AR-TAXONOMY-COGNITIVE-LOAD` を responsibility 軸で active 化（ceiling=15）（Phase 3.5 統合 branch 2026-04-27、検出は V2-R-4 + INTERLOCK-3 が担う、現状 10/15）
- [x] `AR-TAXONOMY-AI-VOCABULARY-BINDING` を responsibility 軸で active 化（Phase 3.5 統合 branch 2026-04-27、CLAUDE.md §taxonomy-binding + review-window §9 で AI 制約明文化）

### Anchor Slice 保証経路完成（親 §OCS.7 段階 1）

- [x] Anchor Slice 5 R:tag が §OCS.5 Promotion Gate L4（Guarded）に到達している（INTERLOCK-2a で Anchor Slice 5 R:tag が registry V2 に Anchor として登録されていることを検証 + V2-R-1/V2-R-2 で対象 file の guard 監視が active）
- [x] taxonomy-health.json collector の責務軸側 fields が出力されている（Phase 3.5 統合 branch 2026-04-27 で `tools/architecture-health/src/collectors/taxonomy-collector.ts` 新設、`references/02-status/generated/taxonomy-health.json` に taxonomy.responsibility.\* fields 出力、KPI 4 件 architecture-health に feed）
- [x] `npm run taxonomy:check` の責務軸側が PASS する（Phase 3.5 統合 branch 2026-04-27、責務軸 5 tests + interlock 9 tests = 14 件 PASS）

## Phase 4: Pilot

- [x] Pilot 対象ファイルリスト（≤ 20）が確定している（Phase 4 子 branch 2026-04-27、18 file 選定: Anchor 5 R:tag を最低 2 件ずつ + R:store/hook/adapter/registry 計 9 種）
- [x] Pilot 対象に v2 タグが付与されている（18 file 全件 @responsibility R:\* 付与済、3 件は v1 タグ置換 / 15 件は新規付与）
- [x] Pilot で発見された Schema 問題が review window に上程 or 解決済みである（Phase 4 Pilot で発見された Schema 問題なし、registry V2 + interlock マトリクスで全件 cover）
- [x] Pilot 対象が親 §OCS.7 Anchor Slice 5 R:tag を最低 1 件ずつ含んでいる（R:calculation 2 / R:bridge 2 / R:read-model 2 / R:guard 2 / R:presentation 2 = 全 5 anchor 各 2 件以上）

## Phase 5: Operations

- [ ] `references/03-guides/responsibility-taxonomy-operations.md` が作成されている
- [ ] 新 R:tag 提案テンプレートが定義されている
- [ ] R:tag 撤退テンプレートが定義されている
- [ ] test-taxonomy-v2 との同期 review window 連絡手順が明記されている
- [ ] `npm run taxonomy:impact` の R: 軸出力（detected responsibility / required tests）が動作確認済み
- [ ] PR template に親 plan.md §OCS.3 の確認項目（taxonomy:check / taxonomy:impact）が追加されている

## Phase 6: Migration Rollout

- [ ] 全対象ファイルに v2 タグ（`R:unclassified` 含む）が付与されている
- [ ] v1 registry と v2 registry の整合検証 guard が PASS している
- [ ] health KPI に v2 未分類件数 baseline が登録されている
- [ ] v1/v2 ギャップ件数 baseline が登録されている
- [ ] 全 R:tag が §OCS.5 Promotion Gate L5（Coverage 100%）に到達している
- [ ] §OCS.6 Drift Budget（責務軸 untagged / unknownVocabulary / missingOrigin）が全て 0 に到達している

## Phase 7: v1 Deprecation

- [ ] v1 registry / guard に `@deprecated since:` コメントが追記されている
- [ ] v1 撤去期限（90 日以上先）が設定されている
- [ ] 移行期限が CLAUDE.md または references/ から参照可能である

## Phase 8: v1 Retirement

- [ ] `app/src/test/responsibilityTagRegistry.ts` が削除されている
- [ ] `app/src/test/guards/responsibilityTagGuard.test.ts` が削除されている
- [ ] 旧 R:tag を禁止する新 guard が PASS している
- [ ] v1 関連の allowlist / ratchet baseline が削除されている

## Phase 9: Legacy Collection

- [ ] v1 参照検索（`responsibilityTagRegistry[^V]` 等）が 0 件である
- [ ] `references/03-guides/responsibility-separation-catalog.md` が v2 版に更新されている
- [ ] `CLAUDE.md` §G8 の参照が v2 に統一されている
- [ ] v1 時代の古いコメント / TODO が掃除されている

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
