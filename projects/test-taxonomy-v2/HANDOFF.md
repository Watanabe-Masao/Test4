# HANDOFF — test-taxonomy-v2

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0+1+2+3+3.5 完遂（main 反映済）+ Phase 4 Pilot 完遂（2026-04-27、本 branch）。Phase 5 Operations に進める状態。**

> **Phase 4 で landing したもの（本 branch、Pilot 22 test）:**
>
> - 22 test に v2 T:kind (Anchor 6 + optional 4 + state-transition / dependency-list / unmount-path 計 12 種) を試験付与
>   - T:unit-numerical: 2 (safeDivide / calculationRules)
>   - T:boundary: 2 (averageDivisor / conditionResolver)
>   - T:invariant-math (optional): 1 (factorDecomposition)
>   - T:contract-parity: 2 (movingAverageBridge / compareUtils)
>   - T:fallback-path (optional): 1 (pinIntervalsWasm)
>   - T:zod-contract: 2 (readFreePeriodFact / readFreePeriodBudgetFact)
>   - T:null-path: 1 (selectPrevYearSummaryFromFreePeriod)
>   - T:meta-guard: 2 (architectureRuleGuard / checklistFormatGuard)
>   - T:allowlist-integrity (optional): 1 (allowlistMetadataGuard)
>   - T:render-shape: 1 (lazyWithRetry)
>   - T:state-transition: 3 (dataStore / settingsStore / widgetPeriodStore)
>   - T:dependency-list: 2 (useImport / useSettings)
>   - T:unmount-path: 2 (usePwaInstall / useIntersectionObserver)
> - V2-T-1 untagged baseline: 728 → 709（-19、ratchet-down）
> - V2-T-2 unknown vocabulary: 0 (cap 維持)
> - v2 guard 20/20 + taxonomy:check PASS
>
> **作業 branch:** `claude/test-taxonomy-v2-phase4-pilot`
> **scope:** 22 test の @taxonomyKind 付与 + testTaxonomyGuardV2 baseline 更新 + HANDOFF のみ（references/ + checklist.md + 親文書 + Origin Journal + generated/ 触らず）

### Phase 4 Pilot 結果

| 指標                         | 値                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| Pilot test 件数              | 22 (≤ 30 cap、Anchor 6 T:kind + optional 4 + state/hook 系 3 = 12 種網羅)                        |
| 全件 新規 v2 T:kind 付与     | 22 件 (T:kind は v2-only vocabulary、既存 test は全件 untagged から開始)                         |
| V2-T-1 untagged ratchet-down | 728 → 709 (-19)                                                                                  |
| V2-T-2 unknown vocab         | 0 cap 維持 (registry 未登録 T:kind の使用なし)                                                   |
| v2 guard 状態                | 20/20 PASS (V2-R 5 + V2-T 6 + INTERLOCK 9)                                                       |
| Schema 問題                  | 検出なし（Pilot で発見された Schema 問題は無し、registry V2 + interlock マトリクスで全件 cover） |

> **Phase 3 で landing したもの（本 branch、V2-T-0〜V2-T-5）:**
>
> - `app/src/test/guards/testTaxonomyGuardV2.test.ts` — v2 guard 新設（6 tests PASS、TSIG global rule と並行運用）
>   - V2-T-0: smoke test (test scope > 500 file)
>   - V2-T-1: untagged baseline ratchet-down (baseline=750、Phase 0 inventory 728 + 余裕)
>   - V2-T-2: unknown vocabulary baseline=0 hard fail (registry 強制、新 T:kind 追加は review window 経由のみ)
>   - V2-T-3: タグなし vs T:unclassified (Phase 6 完了後に hard rule 昇格、Phase 3 では smoke)
>   - V2-T-4: Cognitive Load Ceiling 15 cap (原則 7)
>   - V2-T-5: tier 構造検証 (primary 11 + optional 4 = 15)
>
> **作業 branch:** `claude/test-taxonomy-v2-phase3-guard`
> **scope:** v2 guard 新設のみ（interlock guard / AR-TAXONOMY-\* / collector / taxonomy:check は統合 branch で共通 infra 実装）

### Phase 3 設計結果

| 指標                        | 値                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------- |
| v2 guard test 件数          | 6 (PASS、TSIG global rule と並行運用)                                              |
| Untagged baseline           | 750 (Phase 0 inventory 728 + 余裕、Phase 6 で 0 到達目標)                          |
| Unknown vocabulary baseline | 0 (Phase 3 時点で v2 T:kind 使用 0、registry 強制)                                 |
| Tier 構造検証               | primary 11 / optional 4 / 合計 15 (Cognitive Load cap)                             |
| §OCS.5 Promotion Gate 進捗  | L4 (Guarded) 部分到達 — 残 interlock guard + AR-TAXONOMY-\* active 化は統合 branch |

> **Phase 2 で landing したもの（本 branch）:**
>
> - `references/03-guides/test-tsig-to-v2-migration-map.md` — TSIG → v2 移行表正本（Phase 2 統合 branch 2026-04-26 で derived → references/03-guides/ に正本配置完遂）
>
> **作業 branch:** `claude/test-taxonomy-v2-phase2-migration`
> **scope:** 子 project derived/migration/ + HANDOFF のみ（`references/` + checklist.md + 親文書 + Origin Journal + generated/ 一切触らず、Phase 2 統合 branch で正本配置 + checklist [x] 反映）

### Phase 2 設計結果

| 指標                          | 値                                                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| TSIG → v2 mapping table 件数  | 全 4 TSIG global rule 網羅（N:M paradigm shift 2 / 1:1 統合 1 / scope 分離 1）                  |
| T:unclassified 退避対象       | 728 entry baseline（全 test、v1 では全件 untagged が原則）                                      |
| Lifecycle State Machine 対応  | Phase 3-9 の 7 段階（active → deprecated → sunsetting → retired → archived）への per-Phase 対応 |
| Paradigm shift                | global → per-tag（R:tag → 必須 T:kind interlock 経由）                                          |
| Cognitive Load Ceiling 状態   | v2 = 15（cap）、新規追加は既存 retirement とセット必須（差し引き 0 維持）                       |
| AR-G3-SUPPRESS-RATIONALE 扱い | scope 分離（T:kind 軸とは独立、別 layer 恒久維持）                                              |

> **Phase 1 で landing したもの（本 branch）:**
>
> - `references/01-principles/test-taxonomy-schema.md` — v2 T:kind schema 正本（Phase 1 統合 branch 2026-04-26 で derived → references/01-principles/ に配置完遂）
> - `app/src/test/testTaxonomyRegistryV2.ts` — v2 T:kind registry（15 件 = primary 11 + optional 4、Cognitive Load Ceiling 15 cap、TSIG global rule と並行運用）
>
> **作業 branch:** `claude/test-taxonomy-v2-phase1-schema`
> **scope:** 子 project derived/ + app/src/test/testTaxonomyRegistryV2.ts のみ（`references/` + checklist.md 一切触らず、Phase 1 統合 branch で正本配置 + Origin Journal §4 同期更新 + checklist [x] 反映）

### Phase 1 設計結果

| 指標                                  | 値                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| v2 T:kind 件数                        | **15** (primary 11 + optional 4) = Cognitive Load Ceiling 15 cap                                      |
| Anchor Slice 6 T:kind 含有            | ✅ T:unit-numerical / T:boundary / T:contract-parity / T:zod-contract / T:meta-guard / T:render-shape |
| Antibody Pairs                        | 6 ペア (原則 6 準拠、3 件は null = sentinel/lifecycle bookend)                                        |
| Frontmatter (§OCS.2 Evidence Level)   | 全 15 件 (guarded 14 / reviewed 1)                                                                    |
| Frontmatter (§OCS.5 Promotion Gate)   | 全 15 件 L1 Registered                                                                                |
| Frontmatter (§OCS.4 Lifecycle)        | 全 15 件 `active`                                                                                     |
| Tier 構造                             | primary 11（必須 10 + sentinel 1）/ optional 4                                                        |
| Obligation 強度 (must / should / may) | must-have 10 / should-have 4 / may-have 1（sentinel）                                                 |
| TSIG global → v2 T:kind 移行          | 4 global rule → 11 primary T:kind (per-tag obligation) + 4 optional                                   |

> **Phase 0 で landing したもの:**
>
> - `tools/scripts/test-taxonomy-inventory.ts` — Inventory 生成 script
>   （再現可能、`cd app && npx tsx ../tools/scripts/test-taxonomy-inventory.ts` で再生成）
> - `references/02-status/test-taxonomy-inventory.yaml`
>   — 親 plan §Common Inventory Schema (CanonEntry shape) 準拠の Phase 0 baseline 728 entry
>
> **作業 branch:** `claude/test-taxonomy-v2-phase0-inventory`
> **scope:** project-internal のみ（`references/` 一切触らず）
> 親 Phase 4 統合 branch で derived → references/02-status/ に正本配置 + Origin Journal §T 転記。

### Phase 0 集計結果（baseline）

| 指標                                         | 値                                   |
| -------------------------------------------- | ------------------------------------ |
| total entries（全 \*.test.ts / \*.test.tsx） | 728                                  |
| Anchor Slice 内 entry                        | 206 (28%)                            |
| ├ T:meta-guard                               | 102                                  |
| ├ T:render-shape                             | 34                                   |
| ├ T:unit-numerical                           | 23                                   |
| ├ T:zod-contract                             | 22                                   |
| ├ T:contract-parity                          | 20                                   |
| └ T:boundary                                 | 5                                    |
| Drift Budget: untagged                       | 728 (T:kind 自体が v2-only)          |
| Drift Budget: unknownVocabulary              | 0                                    |
| Drift Budget: missingOrigin                  | 728（TSIG ベースで個別 Origin なし） |
| TSIG-TEST-01 適用                            | 728（global）                        |
| TSIG-TEST-04 適用                            | 728（global）                        |

### Phase 0 着手承認の根拠（2026-04-26）

- 親 `projects/taxonomy-v2/checklist.md` Phase 3 §子 project キックオフ で
  本 project の Phase 0 着手が承認された
- 親 plan.md §Common Inventory Schema（CanonEntry shape）が確定（Phase 0 出力 shape）
- 親 plan.md §OCS.7 Anchor Slice 6 T:kind（`T:unit-numerical` / `T:boundary` /
  `T:contract-parity` / `T:zod-contract` / `T:meta-guard` / `T:render-shape`）が
  確定（Phase 0 baseline 対象）
- 親 plan.md §OCS.6 Drift Budget の baseline 計測（テスト軸 untagged /
  unknownVocabulary / missingOrigin）が本 plan.md Phase 0 成果物に記載済

### Phase 体系

```
Phase 0: Inventory（現行 TSIG + テストの種類分類の棚卸し）
Phase 1: Schema 設計（T:kind vocabulary / obligation 種類定義）
Phase 2: Migration Path（TSIG-TEST-* → T:kind + T:unclassified 段階導入）
Phase 3: Guard 実装（testTaxonomyGuard + interlock 検証）
Phase 4: Pilot（少数テストで試験運用）
Phase 5: Operations（review window のテスト軸固有部分）
Phase 6: Migration Rollout（全テストへの T:kind 付与）
Phase 7: TSIG Global Rule Deprecation
Phase 8: TSIG Retirement（global 撤去 + T:kind ベース置換）
Phase 9: Legacy Collection（旧コメント / guard / 文書の掃除）
```

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先（次セッション = Phase 1 Schema 設計）

- Phase 0 inventory（728 entry, Anchor 206 件）を読みながら v2 T:kind vocabulary 設計
- Cognitive Load Ceiling ≤ 15 に収まる vocabulary 配分（Antibody Pair: T:parity ↔ T:invariant-math 等）
- v2 T:kind frontmatter に親 plan §OCS.2 Evidence Level + §OCS.5 Promotion Gate L1 + §OCS.4 Lifecycle status を登録
- 対応 R:tag は TBD（responsibility-taxonomy-v2 Phase 1 + 親 review window で同期裁定）
- obligation の種類（must-have / should-have / may-have）定義
- `app/src/test/testTaxonomyRegistryV2.ts`（TSIG 併存）

### 中優先（親 Phase 4 統合時）

- `references/02-status/test-taxonomy-inventory.yaml`
  を `references/02-status/test-taxonomy-inventory.yaml` に正本配置
- 既存 TSIG-\* rule を `references/01-principles/taxonomy-origin-journal.md` §T に転記
- docs:generate で taxonomy-health.json に baseline を反映

### 中優先（Phase 1 以降）

- T:kind vocabulary 設計（Cognitive Load ≤ 15）
- R:tag ⇔ T:kind 対応（responsibility-taxonomy-v2 と同期 review window で合意）
- obligation の種類（must-have / should-have / may-have）定義

### 低優先（Phase 5 以降）

- TSIG global rule の分解計画
- Legacy Collection の掃除対象リスト作成

## 3. ハマりポイント

### 3.1. 「テスト = unit test だけ」という前提を置かない

v1 の TSIG は "テストが存在するか" しか見ていない。v2 は**何を保証するテストか**を
T:kind で分類する。unit / contract / invariant / parity / boundary / render-shape /
state-transition / null-path 等、種類別に obligation が異なる。

**対策:** Phase 1 Schema で T:kind を「証明する対象」で分類（テストの書き方ではない）。

### 3.2. R:tag を勝手に参照しない

interlock 仕様（R ⇔ T マトリクス）は親の所掌。本 project で T:kind を決める際、
「この R:tag に対応」と仮置きしてはいけない（同期 review window で裁定）。

**対策:** 本 project の T:kind 提案時、対応 R:tag は "TBD: see responsibility-taxonomy-v2
Phase 1" と記録。実値は親 Phase 2 review window で両軸同時裁定。

### 3.3. 既存テストを一斉に書き直さない

Phase 6 Migration Rollout で全テストに T:kind 付与する際、テストのロジックを同時に
直したくなる誘惑がある。これをやると T:kind 付けの観点とテスト品質改善の観点が
混線し、review がブロックされる。

**対策:** Phase 6 は T:kind 付けのみ。テスト品質修正は別 PR / 別 Phase で。

### 3.4. TSIG global rule を早期撤去しない

v2 の T:kind ベース guard が安定運用されるまで TSIG global rule は動かす。
Phase 7 で deprecation、Phase 8 で retirement。撤去を早めるとテスト品質の回帰が起きる。

**対策:** responsibility-taxonomy-v2 と同じ「新 guard 即時導入 / 旧 guard は最後に撤去」
原則。Phase 3 で v2 guard 並行運用、Phase 8 で TSIG 撤去。

### 3.5. `T:unclassified` も能動タグ（親原則 1）

テストにタグがないことと `T:unclassified` は違う。タグなしは CI fail、
`T:unclassified` は review window 待ちの active 状態。

**対策:** Phase 2 Migration Path で「タグなしテスト → `T:unclassified` 明示付与」を
mechanical 変換。Phase 6 Rollout 後はタグなしテストが 0 件であることを guard で強制。

## 4. 関連文書

| ファイル                                               | 役割                                        |
| ------------------------------------------------------ | ------------------------------------------- |
| `AI_CONTEXT.md`                                        | プロジェクト意味空間の入口                  |
| `plan.md`                                              | 10 Phase 構造 + Phase 別禁止事項            |
| `checklist.md`                                         | Phase 完了条件                              |
| 親: `projects/taxonomy-v2/plan.md`                     | 7 不可侵原則 + interlock 仕様（制約元）     |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts` | 現行 TSIG（Phase 8 で T:kind ベースに置換） |
| 兄弟: `projects/responsibility-taxonomy-v2/HANDOFF.md` | 責務軸（同期 window 運用）                  |
