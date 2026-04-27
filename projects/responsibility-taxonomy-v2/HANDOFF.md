# HANDOFF — responsibility-taxonomy-v2

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0+1+2+3+3.5+4+5+6a-1+6a-2 完遂（main 反映済）+ Phase 6b/6c 完遂（2026-04-27、本 branch）。Phase 6 全主要 deliverable 完了、Phase 7 v1 Deprecation に進める状態。**

> **Phase 6b/6c で landing したもの（本 branch、v1/v2 gap 検証 + Promotion Gate L5）:**
>
> - `app/src/test/guards/taxonomyV1V2GapGuard.test.ts` — v1/v2 gap 検証 guard 新設（4 tests PASS）
>   - GAP-R-0: smoke
>   - GAP-R-1: v1-only tagged file ratchet-down (baseline=259、Phase 7 で 0 化目標)
>   - GAP-R-2: v2-only 分布情報出力 (現在 407 件、大半が R:unclassified)
>   - GAP-R-3: 両軸 co-existence + 分布全体サマリ
> - v1 guard `responsibilityTagGuard.test.ts` の `UNCLASSIFIED_BASELINE` 401 → 0 ratchet-down（Phase 6a-2 mass-tagging で全 file が分類済）
> - `tools/architecture-health/src/collectors/taxonomy-collector.ts` に新 KPI `taxonomy.responsibility.v1OnlyFiles` 追加（GAP-R-1 と同期、Phase 7 で 0 到達追跡）
> - `responsibilityTaxonomyRegistryV2.ts` の全 10 R:tag を `promotionLevel: L1` → `L5` 一斉 bump（Coverage 100% 達成 → §OCS.5 Promotion Gate L5 Guarded）
> - `app/package.json` の `taxonomy:check` script に新 guard 追加（v2 guard 5 + V2-T 6 + interlock 9 + gap 4 = 24 tests）
> - `references/03-guides/guard-test-map.md` に新 guard entry 登録
> - `references/03-guides/duckdb-data-loading-sequence.md` + `new-page-checklist.md` に Phase 6a-2 acknowledgement 追記（obligation 解消）
>
> **作業 branch:** `claude/taxonomy-v2-phase6bc-gap-promotion`
> **scope:** v1/v2 gap guard 新設 + v1 baseline ratchet + KPI 追加 + Promotion Gate L5 一斉 bump + 2 obligation 解消 + 本 HANDOFF（Phase 7 v1 Deprecation は別 PR）

### Phase 6b/6c 設計結果

| 指標                                  | 値                                                                |
| ------------------------------------- | ----------------------------------------------------------------- |
| 新設 guard                            | `taxonomyV1V2GapGuard.test.ts` (4 tests PASS)                     |
| GAP-R-1 baseline                      | 259（v1-only tagged file、Phase 7 v1 deprecation で 0 化目標）    |
| v1 UNCLASSIFIED_BASELINE              | 401 → 0 ratchet-down                                              |
| 新設 KPI                              | `taxonomy.responsibility.v1OnlyFiles` (architecture-health.json feed) |
| Promotion Gate 達成                   | 全 10 R:tag が L1 → L5（Coverage 100% Guarded）                  |
| `taxonomy:check` 実行範囲             | 5 + 6 + 9 + 4 = 24 tests (Phase 6b 追加で +4)                     |
| 機械検証                              | taxonomy:check 24/24 + test:guards 837/837 + docs:check PASS      |

> **Phase 6a-2 で landing したもの（本 branch、coverage 100% 達成）:**

> **Phase 6a-2 で landing したもの（本 branch、coverage 100% 達成）:**
>
> - 残 untagged 1041 R: file 全件に `@responsibility R:unclassified` を能動退避（原則 1「未分類は能動タグ」適用、layer 別 commit 6 件: domain 137 + application 355 + infrastructure 109 + presentation 210 + features 150 + test/guards 80）
> - 全 .test.ts/.test.tsx 731 件中 untagged 708 件に `@taxonomyKind T:unclassified` を能動退避
> - V2-R-1 untagged baseline: 1041 → 0 達成（責務軸 §OCS.6 Drift Budget untagged = 0）
> - V2-T-1 untagged baseline: 709 → 0 達成（テスト軸 §OCS.6 Drift Budget untagged = 0）
> - V2-R-3 / V2-T-3 を smoke から hard fail rule に昇格（タグなし状態を構造的に禁止）
> - 新設: `tools/scripts/phase6a2-mass-tagging.ts` — 一回限りの migration script (idempotent, --axis / --layer / --dry-run)
> - 副作用対応: usePeriodAwareKpi.ts (302 行 active-debt allowlist 登録、6 ヶ月 expiresAt) / 3 infrastructure file (advancedAnalytics / schemas / backupExporter / purchaseComparison) を JSDoc 圧縮で限度内に収める
> - obligation 解消: calculationCanonRegistry.ts header に Phase 6a-2 注記 / chart-data-flow-map.md + duckdb-type-boundary-contract.md に R:unclassified 退避 acknowledgement 追記
>
> **作業 branch:** `claude/taxonomy-v2-phase6a2-mass-tagging`
> **scope:** R: 軸 1041 file + T: 軸 708 test の一括 unclassified 付与 + V2-R-1/V2-T-1 baseline 0 化 + V2-R-3/V2-T-3 hard fail 昇格 + 4 obligation 解消 + 1 allowlist 登録 + 本 HANDOFF（v1 retirement / Phase 6b/6c は別 PR）

### Phase 6a-2 設計結果

| 指標                                  | 値                                                                          |
| ------------------------------------- | --------------------------------------------------------------------------- |
| R: 軸 mass tagging                    | 1041 file（domain 137 + application 355 + infrastructure 109 + presentation 210 + features 150 + test/guards 80）|
| T: 軸 mass tagging                    | 708 test（全 .test.ts 731 中、skipped 23 既存タグ保持）                     |
| V2-R-1 baseline                       | 1041 → 0（**責務軸 §OCS.6 Drift Budget untagged 達成**）                    |
| V2-T-1 baseline                       | 709 → 0（**テスト軸 §OCS.6 Drift Budget untagged 達成**）                   |
| V2-R-3 / V2-T-3 hard fail 昇格        | smoke → hard rule（タグなし状態を構造的に禁止、原則 1 機械強制）            |
| 副作用対応                            | usePeriodAwareKpi.ts (302 行 active-debt) + 4 file JSDoc 圧縮 (400 行 within) |
| obligation 解消                       | 4 件 (calculationCanonRegistry / chart-data-flow-map / duckdb-type-boundary / doc-registry) |
| 機械検証                              | taxonomy:check 20/20 + test:guards 833/833 + lint 0err + format PASS + build PASS + docs:check PASS |
| coverage 達成率                       | 100% (R: 軸) / 99.7% (T: 軸 — 23 既存タグは具体タグ保持)                    |

> **Phase 6a-1 で landing したもの（本 branch、v1/v2 並行運用 unblock）:**

> **Phase 6a-1 で landing したもの（本 branch、v1/v2 並行運用 unblock）:**
>
> - `app/src/test/responsibilityTagRegistry.ts` — `VALID_TAGS` に v2 vocabulary 10 件を追加（v1 guard が v2 タグを「不正タグ」誤検出しないように）
> - Phase 4 Pilot で revert した 4 file を v2 タグ付きで再 add:
>   - `app/src/application/hooks/useDailyPageData.ts` — untagged → `R:hook`
>   - `app/src/application/hooks/usePersistence.ts` — untagged → `R:hook`
>   - `app/src/presentation/components/charts/DowPatternChart.tsx` — `R:chart-view` → `R:presentation`
>   - `app/src/presentation/components/charts/RegressionInsightChart.tsx` — `R:chart-view` → `R:presentation`
> - V2-R-1 untagged baseline: 1043 → 1041（-2、ratchet-down）
> - V2-R-2 unknown vocab baseline: 270 → 268（-2、ratchet-down）
> - v1 guard 4/4 + v2 guard 5/5 + interlock 9/9 + 全 833 test PASS（v1/v2 並行運用が機械検証された）
>
> **作業 branch:** `claude/responsibility-taxonomy-v2-phase6a-prep`
> **scope:** v1 registry の VALID_TAGS 拡張 + Phase 4 revert 4 file の re-add + v2 baseline ratchet-down + 本 HANDOFF（mass tagging は Phase 6a-2 別 PR）

### Phase 6a-1 設計結果

| 指標                                | 値                                                                  |
| ----------------------------------- | ------------------------------------------------------------------- |
| v1 VALID_TAGS 拡張                  | v1 vocab 20 → v1 + v2 vocab 28（R:calculation / R:adapter は co-existence、Phase 7 で v1 側撤去）|
| Phase 4 revert 4 file re-add        | 全件 v2 タグ付与成功（v1 guard が「不正タグ」検出せず PASS）        |
| V2-R-1 ratchet-down                 | 1043 → 1041（-2: useDailyPageData / usePersistence の R:hook 付与）|
| V2-R-2 ratchet-down                 | 270 → 268（-2: 2 chart の R:chart-view → R:presentation 置換）     |
| v1/v2 並行運用検証                  | v1 guard 4/4 PASS + v2 guard 5/5 PASS + interlock 9/9 PASS          |
| 全 test:guards                      | 833/833 PASS                                                        |
| Phase 6a-2 影響範囲                 | 残 untagged R: file 1041 件 → 全件 R:unclassified 一括退避が可能化  |

> **Phase 5 で landing したもの（本 branch、責務軸 operations 起草）:**
>
> - `references/03-guides/responsibility-taxonomy-operations.md` — 責務軸別運用ガイド正本（§1 範囲分担 / §2 提案テンプレ + 「捨て場」化リスク事前否認 / §3 撤退テンプレ + Lifecycle 対応 / §4 test-taxonomy-v2 同期手順 / §5 `taxonomy:impact` R 軸出力 contract / §6 PR レビュー観点）
> - `projects/responsibility-taxonomy-v2/checklist.md` Phase 5 — 軸別正本に関する 4 項目を [x]、impact CLI / PR template の 2 項目は統合 branch 担当として明記
>
> **作業 branch:** `claude/responsibility-taxonomy-v2-phase5-operations`
> **scope:** `references/03-guides/responsibility-taxonomy-operations.md` 新設 + 子 checklist Phase 5 の 4 項目 [x] + 本 HANDOFF（impact CLI 実装 / PR template 改変 / docs:generate / 兄弟 cross-link は統合 branch）

### Phase 5 設計結果

| 指標                               | 値                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| operations.md 章立て               | 7 章（§1 範囲分担 / §2 提案テンプレ / §3 撤退テンプレ / §4 同期手順 / §5 impact CLI / §6 PR レビュー / §7 関連文書）|
| 提案テンプレ事前情報項目           | 11 項目（提案者 / 日 / Why / Antibody / 必須 T:kind / 任意 T:kind / 対象 file 数 / Evidence / promotionLevel / Sunset / 影響）|
| 撤退テンプレ事前情報項目           | 9 項目（replacedBy / 影響 file 数 / 撤退期限 / sunsetCondition / 対 T:kind 影響 / 移行戦略 等）|
| 同期 trigger イベント              | 4 件（新 R:tag / 撤退 / Antibody Pair / Cognitive Load Ceiling）                          |
| impact CLI R 軸出力フィールド      | 7 件（path / detectedResponsibility / requiredTKinds / optionalTKinds / foundTKinds / missingTKinds / result）|
| PR レビュー観点                    | fast 4 + deep 4 + auto-approve 4 計 12 観点                                              |
| review window 重複排除             | 共通手続きは review-window.md 参照、軸固有 (§2-§6) に特化                                |

> **Phase 4 で landing したもの（本 branch、Pilot 18 file）:**
>
> - 18 production file に v2 R:tag (Anchor 5 + R:store/hook/adapter/registry 計 9 種) を試験付与
>   - R:calculation: 2 (domain/calculations/aggregation.ts / averageDivisor.ts)
>   - R:bridge: 2 (application/services/timeSlotBridge.ts / dowGapBridge.ts)
>   - R:read-model: 2 (readModels/salesFact / grossProfit)
>   - R:guard: 2 (test/guards/layerBoundaryGuard / architectureRuleGuard)
>   - R:presentation: 2 (charts/DowPatternChart 既 R:chart-view → 置換 / RegressionInsightChart)
>   - R:store: 2 (stores/periodSelectionStore / dataStore)
>   - R:hook: 2 (hooks/usePersistence / useDailyPageData)
>   - R:adapter: 2 (infrastructure/ImportService / storeIdNormalization)
>   - R:registry: 2 (test/guardTagRegistry / migrationTagRegistry 既 R:utility → 置換)
> - V2-R-1 untagged baseline: 1055 → 1041（-14、ratchet-down）
> - V2-R-2 unknown vocabulary baseline: 270 → 268（-2、ratchet-down）
> - v2 guard 20/20 + taxonomy:check PASS
>
> **作業 branch:** `claude/responsibility-taxonomy-v2-phase4-pilot`
> **scope:** 18 file の @responsibility 編集 + responsibilityTagGuardV2 baseline 更新 + HANDOFF のみ（references/ + checklist.md + 親文書 + Origin Journal + generated/ 触らず）

### Phase 4 Pilot 結果

| 指標                              | 値                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Pilot file 件数                   | 18 (≤ 20 cap、Anchor 5 R:tag を最低 2 件ずつ含む + R:store/hook/adapter/registry 計 9 種網羅)    |
| 既存 v1 タグ置換                  | 3 件（R:chart-view → R:presentation / R:utility → R:registry / R:utility → R:registry）          |
| 新規 v2 タグ付与                  | 15 件（untagged file への能動付与）                                                              |
| V2-R-1 untagged ratchet-down      | 1055 → 1041 (-14)                                                                                |
| V2-R-2 unknown vocab ratchet-down | 270 → 268 (-2)                                                                                   |
| v2 guard 状態                     | 20/20 PASS (V2-R 5 + V2-T 6 + INTERLOCK 9)                                                       |
| Schema 問題                       | 検出なし（Pilot で発見された Schema 問題は無し、registry V2 + interlock マトリクスで全件 cover） |

> **Phase 3 で landing したもの（本 branch、V2-R-1〜V2-R-4）:**
>
> - `app/src/test/guards/responsibilityTagGuardV2.test.ts` — v2 guard 新設（5 tests PASS）
>   - V2-R-0: smoke test (scope > 100 file)
>   - V2-R-1: untagged baseline ratchet-down (baseline=1055)
>   - V2-R-2: unknown vocabulary baseline ratchet-down (baseline=270 = v1 タグ使用 file)
>   - V2-R-3: タグなし vs R:unclassified (Phase 6 完了後に hard rule 昇格、Phase 3 では smoke)
>   - V2-R-4: Cognitive Load Ceiling 15 以下 (原則 7)
>
> **作業 branch:** `claude/responsibility-taxonomy-v2-phase3-guard`
> **scope:** v2 guard 新設のみ（interlock guard / AR-TAXONOMY-\* / collector / taxonomy:check は統合 branch で共通 infra 実装）

### Phase 3 設計結果

| 指標                        | 値                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------- |
| v2 guard test 件数          | 5 (PASS、v1 guard と並行運用)                                                      |
| Untagged baseline           | 1055 (Phase 0 inventory と一致)                                                    |
| Unknown vocabulary baseline | 270 (v1 タグ使用 file 全件、v1→v2 移行で 0 到達目標)                               |
| §OCS.5 Promotion Gate 進捗  | L4 (Guarded) 部分到達 — 残 interlock guard + AR-TAXONOMY-\* active 化は統合 branch |

> **Phase 2 で landing したもの（本 branch）:**
>
> - `references/03-guides/responsibility-v1-to-v2-migration-map.md` — v1 → v2 移行表正本（Phase 2 統合 branch 2026-04-26 で derived → references/03-guides/ に正本配置完遂）
>
> **作業 branch:** `claude/responsibility-taxonomy-v2-phase2-migration`
> **scope:** 子 project derived/migration/ + HANDOFF のみ（`references/` + checklist.md + 親文書 + Origin Journal + generated/ 一切触らず、Phase 2 統合 branch で正本配置 + checklist [x] 反映）

### Phase 2 設計結果

| 指標                         | 値                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| v1 → v2 mapping table 件数   | 全 v1 20 R:tag 網羅（1:1 keep 2 / N:1 統合 13 / context-judged 1 / N:1 退避 2）                 |
| R:unclassified 退避対象      | 1128 entry baseline（R:utility 48 + R:barrel 5 + untagged 1055 + unknownVocab 20）              |
| Lifecycle State Machine 対応 | Phase 3-9 の 7 段階（active → deprecated → sunsetting → retired → archived）への per-Phase 対応 |
| context-judged tag           | R:transform 18 件（per-file review window で Phase 6 直前確定）                                 |
| 削減率                       | v1 20 → v2 10（**50% 削減**、Cognitive Load Ceiling 余裕 5 スロット）                           |

> **Phase 1 で landing したもの（本 branch）:**
>
> - `references/01-principles/responsibility-taxonomy-schema.md` — v2 R:tag schema 正本（Phase 1 統合 branch 2026-04-26 で derived → references/01-principles/ に配置完遂）
> - `app/src/test/responsibilityTaxonomyRegistryV2.ts` — v2 R:tag registry（10 件 / Cognitive Load Ceiling 15 まで 5 スロット余裕、v1 registry と併存）
>
> **作業 branch:** `claude/responsibility-taxonomy-v2-phase1-schema`
> **scope:** 子 project derived/ + app/src/test/responsibilityTaxonomyRegistryV2.ts のみ（`references/` 一切触らず、Phase 1 統合 branch で正本配置）

### Phase 1 設計結果

| 指標                                | 値                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------- |
| v2 R:tag 件数                       | **10** (Cognitive Load Ceiling 15 まで余裕 5)                          |
| Anchor Slice 5 R:tag 含有           | ✅ R:calculation / R:bridge / R:read-model / R:guard / R:presentation  |
| Antibody Pairs                      | 6 ペア (原則 6 準拠)                                                   |
| Frontmatter (§OCS.2 Evidence Level) | 全 10 件 (guarded 7 / asserted 2 / reviewed 1)                         |
| Frontmatter (§OCS.5 Promotion Gate) | 全 10 件 L1 Registered                                                 |
| Frontmatter (§OCS.4 Lifecycle)      | 全 10 件 `active`                                                      |
| v1 → v2 削減率                      | 50% (v1 20 → v2 10)                                                    |
| R:utility 廃止                      | ✅ R:unclassified に統合（捨て場禁止、原則 1 + Phase 1 禁止事項 適用） |

> **Phase 0 で landing したもの:**
>
> - `tools/scripts/responsibility-taxonomy-inventory.ts` — Inventory 生成 script
>   （再現可能、`cd app && npx tsx ../tools/scripts/responsibility-taxonomy-inventory.ts` で再生成）
> - `references/02-status/responsibility-taxonomy-inventory.yaml`
>   — 親 plan §Common Inventory Schema (CanonEntry shape) 準拠の Phase 0 baseline 1370 entry
>
> **作業 branch:** `claude/responsibility-taxonomy-v2-phase0-inventory`
> **scope:** project-internal のみ（`references/` 一切触らず）
> 親 Phase 4 統合 branch で derived → references/02-status/ に正本配置 + Origin Journal §R 転記。

### Phase 0 集計結果（baseline）

| 指標                                 | 値                                         |
| ------------------------------------ | ------------------------------------------ |
| total entries（5 directories scope） | 1370                                       |
| Anchor Slice 内 entry                | 299 (22%)                                  |
| ├ R:guard                            | 102                                        |
| ├ R:presentation                     | 112                                        |
| ├ R:calculation                      | 38                                         |
| ├ R:read-model                       | 31                                         |
| └ R:bridge                           | 16                                         |
| Drift Budget: untagged               | 1055 (77%)                                 |
| Drift Budget: unknownVocabulary      | 20 (R:guard 16 / R:model 3 / R:selector 1) |
| Drift Budget: missingOrigin          | 1370（v1 全タグ Origin unknown）           |

> **scope 注記:** 旧 v1 guard `responsibilityTagGuard` の TARGET_DIRS 5 件
> （application/hooks / presentation/\* / features/）は subset。本 inventory は
> v2 vocabulary 設計に必要な全 anchor 候補をカバーするため scope を拡大している。
> 旧 baseline 401 untagged は新 scope では 1055 untagged に変わる（同じ untagged ファイルが
> 多くカウントされる）。Phase 1 Schema で v2 vocabulary 設計時に scope 縮退も検討。

### Phase 0 着手承認の根拠（2026-04-26）

- 親 `projects/taxonomy-v2/checklist.md` Phase 3 §子 project キックオフ で
  本 project の Phase 0 着手が承認された
- 親 plan.md §Common Inventory Schema（CanonEntry shape）が確定（Phase 0 出力 shape）
- 親 plan.md §OCS.7 Anchor Slice 5 R:tag（`R:calculation` / `R:bridge` /
  `R:read-model` / `R:guard` / `R:presentation`）が確定（Phase 0 baseline 対象）
- 親 plan.md §OCS.6 Drift Budget の baseline 計測（責務軸 untagged /
  unknownVocabulary / missingOrigin）が本 plan.md Phase 0 成果物に記載済

### Phase 体系

```
Phase 0: Inventory（現行 v1 の全タグ棚卸し）
Phase 1: Schema 設計（R:tag vocabulary / Antibody Pairs）
Phase 2: Migration Path（v1 → v2 対応表 + R:unclassified 段階導入）
Phase 3: Guard 実装（responsibilityTagGuardV2 + interlock 検証）
Phase 4: Pilot（少数ファイルで試験運用）
Phase 5: Operations（review window の軸固有部分）
Phase 6: Migration Rollout（全ファイル段階移行）
Phase 7: v1 Deprecation
Phase 8: v1 Retirement（old guard 削除 + old tag 禁止 guard 化）
Phase 9: Legacy Collection（旧コメント / registry / 文書の掃除）
```

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先（次セッション = Phase 1 Schema 設計）

- Phase 0 inventory（1370 entry, Anchor 299 件）を読みながら v2 R:tag vocabulary 設計
- Cognitive Load Ceiling ≤ 15 に収まる vocabulary 配分（軸分離 + Antibody Pair）
- v2 R:tag frontmatter に親 plan §OCS.2 Evidence Level + §OCS.5 Promotion Gate L1 + §OCS.4 Lifecycle status を登録
- 対応 T:kind は TBD（test-taxonomy-v2 Phase 1 + 親 review window で同期裁定）
- `app/src/test/responsibilityTaxonomyRegistryV2.ts`（v1 併存）

### 中優先（親 Phase 4 統合時）

- `references/02-status/responsibility-taxonomy-inventory.yaml`
  を `references/02-status/responsibility-taxonomy-inventory.yaml` に正本配置
- 既存 v1 20 タグの Origin を `references/01-principles/taxonomy-origin-journal.md` §R に転記
  （親 Phase 1 残 2 checkbox の解消 — Origin 採取 + L2 到達）
- docs:generate で taxonomy-health.json に baseline を反映

### 中優先（Phase 1 以降）

- 軸分離スキーマの設計（responsibility × purity × layer）
- Antibody Pair の列挙（authoritative ↔ bridge 等）
- Cognitive Load 15 に収まる vocabulary 配分

### 低優先（Phase 5 以降）

- v1 deprecation 計画
- Legacy Collection の掃除対象リスト作成

## 3. ハマりポイント

### 3.1. 未分類 400 件を "削減" しようとしてはいけない

原則 1: 未分類は能動タグ。400 件を正しく `R:unclassified` にすることが Phase 2 のゴール
であり、「タグをつけて未分類を減らす」のは Phase 6 以降の話。Phase 2 で無理に分類すると
「嘘の単一責務」が大量発生する（AAG 原則 C9 違反）。

**対策:** Phase 2 では v1 のタグなし → v2 の `R:unclassified` 明示付与を優先。
分類を増やすのは Phase 6 Migration Rollout で review window を経由してから。

### 3.2. `R:utility` の捨て場化を繰り返さない

v1 では分類に迷ったら `R:utility` に押し込まれていた（33 件）。v2 で同じ罠を作らない。

**対策:** v2 では `R:utility` を廃止 or 厳密定義する。Phase 1 Schema 設計で
「最後の逃げ場」タグを作らない。迷ったら `R:unclassified` に。

### 3.3. Cognitive Load Ceiling（15）を超過する誘惑

軸分離（責務 × 純粋性 × 層）するとタグ数が膨らみやすい。

**対策:**

- 軸ごとに別 namespace（R: = 責務のみ。純粋性は Purity:\*、層は Layer:\* 等、別 axis）
- Phase 1 で責務軸の vocabulary を ≤ 15 に絞る
- 超過した場合は統廃合 or 親 Constitution 変更の 2 択を親 Discovery Review で裁定

### 3.4. test 軸（T:kind）を勝手に決めない

interlock 仕様（R ⇔ T マトリクス）は親の所掌。本 project で R:tag を決める際、
対応する T:kind を仮置きしてはいけない（test-taxonomy-v2 との同期 review window で決定）。

**対策:** 本 project の R:tag 提案時、対応 T:kind は "TBD: see test-taxonomy-v2
Phase 1" と記録し、実際の値は親 Phase 2 review window で両軸同時裁定。

### 3.5. v1 guard を Phase 3 で消してはいけない

新 guard (v2) と旧 guard (v1) の並行運用期間が Phase 3-7。Phase 3 で v1 を止めると
未分類 400 件が roll back する。

**対策:** Phase 3-7 は v1 + v2 両方の guard を動かす。v1 sunset は Phase 7、
撤去は Phase 8。pure-calculation-reorg と同じ「定義した Phase で即導入、撤去は最後」原則。

## 4. 関連文書

| ファイル                                             | 役割                                    |
| ---------------------------------------------------- | --------------------------------------- |
| `AI_CONTEXT.md`                                      | プロジェクト意味空間の入口              |
| `plan.md`                                            | 10 Phase 構造 + Phase 別禁止事項        |
| `checklist.md`                                       | Phase 完了条件                          |
| 親: `projects/taxonomy-v2/plan.md`                   | 7 不可侵原則 + interlock 仕様（制約元） |
| `app/src/test/responsibilityTagRegistry.ts`          | 現行 v1 正本                            |
| `app/src/test/guards/responsibilityTagGuard.test.ts` | 現行 v1 guard                           |
| 兄弟: `projects/test-taxonomy-v2/HANDOFF.md`         | テスト軸（同期 window 運用）            |
