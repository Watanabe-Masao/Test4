# integrity-pair-inventory — 散在する registry+guard ペアの正式 inventory

> **canonicalization-domain-consolidation Phase A 成果物** (2026-04-28 起草)。
> 散在する 13 種類の「registry / 契約 ↔ guard」ペアを正式に inventory し、
> 共通パターンを抽出する。`projects/completed/canonicalization-domain-consolidation/plan.md`
> §1.2 の表を本 doc が canonical 化する。
>
> 本 doc は **Phase B (Domain Skeleton)** の素材になる。各ペアの parser /
> 検出パターン / ratchet-down baseline / 共通 primitive 候補を1表で把握できる。

## 1. 既存 13 ペア (canonical inventory)

各ペアの形式: **registry/契約** + **検出 guard** + (option) **collector / generator** + (option) **ratchet-down baseline**。

詳細は §1.1 〜 §1.13 を参照。サマリ表 (§1.0):

| #   | registry/契約 (path)                                                              | guard (path)                                                                                          | parser 種別                               | ratchet-down                   | 主検証                                                            |
| --- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| 1   | `app/src/test/calculationCanonRegistry.ts`                                        | `calculationCanonGuard.test.ts`                                                                       | TS const (object literal import)          | あり (Zod 未追加 ≤ 3)          | calc 全 file 分類整合 + 陳腐化検出 + 意味分類必須                 |
| 2   | `app/src/application/readModels/<dir>/` 構造                                      | `canonicalizationSystemGuard.test.ts`                                                                 | filesystem ディレクトリ走査               | なし (binary check)            | readModel 構造 + 定義書存在 + CLAUDE.md token                     |
| 3   | `docs/contracts/doc-registry.json`                                                | `docRegistryGuard.test.ts`                                                                            | JSON.parse                                | あり (UNREGISTERED_BASELINE=0) | 双方向存在 + README/CLAUDE.md ref 実在                            |
| 4   | `docs/contracts/test-contract.json`                                               | `testContractGuard.test.ts`                                                                           | JSON.parse                                | なし                           | CLAUDE.md token / generated section / canonical-pair 共起         |
| 5   | `roles/<role>/scope.json`                                                         | `scopeJsonGuard.test.ts` / `scopeBoundaryInvariant.test.ts`                                           | JSON.parse                                | あり (warn-only)               | role 編集境界 + owns/out_of_scope 整合                            |
| 6   | `responsibilityTaxonomyRegistryV2.ts` / `testTaxonomyRegistryV2.ts`               | `taxonomyInterlockGuard.test.ts` / `responsibilityTagGuardV2.test.ts` / `testTaxonomyGuardV2.test.ts` | TS const + JSDoc parser                   | あり (cooling tag 経由)        | vocabulary cooling lifecycle + Antibody Pair 対称 + Interlock     |
| 7   | `docs/contracts/principles.json`                                                  | `documentConsistency.test.ts`                                                                         | JSON.parse + Markdown 走査                | なし                           | 設計原則 enum と prose 一致                                       |
| 8   | `app-domain/gross-profit/rule-catalog/base-rules.ts` + overlays + defaults        | `architectureRuleGuard.test.ts` / `architectureRulesMergeSmokeGuard.test.ts`                          | TS const + spread merge                   | なし (smoke)                   | 4 layer rule merge 整合 + id 重複検出                             |
| 9   | `app/src/test/allowlists/*.ts`                                                    | `allowlistMetadataGuard.test.ts`                                                                      | TS const + JSDoc metadata                 | あり (各 allowlist 件数)       | sunsetCondition / expiresAt / temporal metadata 強制              |
| 10  | `projects/<id>/checklist.md`                                                      | `checklistFormatGuard.test.ts` / `checklistGovernanceSymmetryGuard.test.ts`                           | Markdown 走査 + frontmatter               | なし                           | format + governance 対称                                          |
| 11  | `tools/architecture-health/.../obligation-collector.ts` `OBLIGATION_MAP`          | obligation-collector runtime + `architectureRuleGuard`                                                | TS const map                              | なし                           | path → 必読 doc 義務の整合                                        |
| 12  | `references/04-tracking/elements/{widgets,read-models,calculations,charts,ui-components}/` | `contentSpec*Guard.test.ts` × 11                                                                      | YAML frontmatter (gray-matter) + AST 走査 | あり (全 0、Phase J 完遂)      | spec ↔ source 双方向 + lifecycle + Behavior Claims Evidence Level |
| 13  | `references/03-implementation/invariant-catalog.md`                                       | invariant test 群 (math invariants)                                                                   | Markdown id 走査 + test name match        | なし                           | 数学的不変条件 ↔ 実装計算の整合                                   |

> 13 ペア共通形: **registry / 契約 (parser 必要)** + **検出 guard (drift detection)** + (option) **collector / generator** + (option) **ratchet-down baseline**。

### §1.1 — calculationCanonRegistry ↔ calculationCanonGuard

| 項目             | 内容                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `app/src/test/calculationCanonRegistry.ts` (817 行、`CALCULATION_CANON_REGISTRY` 定数)                                                              |
| guard            | `app/src/test/guards/calculationCanonGuard.test.ts` (403 行)                                                                                        |
| parser 種別      | TS named const import (object literal、key=relPath、value={tag, semanticClass, zodAdded, reason})                                                   |
| 検出パターン     | (1) `collectTsFiles(domain/calculations)` ↔ registry key 双方向集合差 (2) `tag` 列挙網羅 (3) `entry.tag === 'required' && !entry.zodAdded` 集計     |
| ratchet-down     | あり: `requiredWithoutZod.length ≤ 3` (Phase 段階で 0 化目標)                                                                                       |
| 不変条件         | calc 全 file が registry 登録済 / 陳腐化 entry なし / required は semanticClass 必須 / required+zodAdded ≤ 3 / 分類合計 = entries.length            |
| derived view     | `BUSINESS_SEMANTIC_VIEW` / `ANALYTIC_KERNEL_VIEW` / `MIGRATION_CANDIDATE_VIEW` (手編集禁止、CI で master 整合)                                      |
| 関連             | `references/01-foundation/calculation-canonicalization-map.md` / `semantic-classification-policy.md` / I2 / I3 / I4                                 |
| Phase B 抽出候補 | `parsing/tsRegistry.ts` (object literal loader generic) / `detection/existence.ts` (双方向存在) / `detection/ratchet.ts` (`requiredWithoutZod ≤ N`) |

### §1.2 — readModels ディレクトリ構造 ↔ canonicalizationSystemGuard

| 項目             | 内容                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `app/src/application/readModels/<name>/` 配置 (Types.ts + 実装.ts + index.ts trio)。registry 定数は無く、guard 内ハードコード `REQUIRED_READ_MODELS` 配列が事実上の正本                           |
| guard            | `app/src/test/guards/canonicalizationSystemGuard.test.ts` (124 行)                                                                                                                                |
| parser 種別      | filesystem `fs.existsSync` + `fs.readdirSync` のディレクトリ走査 (純構造検証、内容 parse 無し)                                                                                                    |
| 検出パターン     | (1) `REQUIRED_READ_MODELS` 各 dir 存在 (2) Types.ts + index.ts + (`read*.ts` or `calculate*.ts`) 揃い (3) `REQUIRED_DEFINITIONS` 11 md 存在 (4) CLAUDE.md token (`readPurchaseCost` 等 7 種) 包含 |
| ratchet-down     | なし (binary 存在検証)                                                                                                                                                                            |
| 不変条件         | readModel 6 種 (purchaseCost/grossProfit/salesFact/discountFact/factorDecomposition/freePeriod) の構造 + 定義書 11 件存在 + CLAUDE.md 正本化 token + `useWidgetDataOrchestrator` 存在             |
| 弱点 (改善余地)  | `REQUIRED_READ_MODELS` / `REQUIRED_DEFINITIONS` がガード内ハードコード — Phase B では `readModels/index.ts` の barrel 公開と JSON registry 化を検討する候補                                       |
| Phase B 抽出候補 | `parsing/filesystemRegistry.ts` (dir 構造を Registry<dirEntry> 化) / `detection/shapeSync.ts` (Types.ts/index.ts/実装.ts trio チェック)                                                           |

### §1.3 — doc-registry.json ↔ docRegistryGuard

| 項目             | 内容                                                                                                                                                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `docs/contracts/doc-registry.json` (1115 行、categories[].docs[] = {path, label})                                                                                                                                                                        |
| guard            | `app/src/test/guards/docRegistryGuard.test.ts` (169 行)                                                                                                                                                                                                  |
| parser 種別      | `JSON.parse(fs.readFileSync(...))` + `Set<allRegisteredPaths>` (registry 側) + `fs.readdirSync` (filesystem 側) + 正規表現 (CLAUDE.md / AAG.md ref 抽出)                                                                                                 |
| 検出パターン     | (1) registry → fs 全 path 実在 (2) fs → registry: `references/01-foundation/*.md` / `references/03-implementation/*.md` 双方向登録 (3) `references/README.md` の category 全参照 (4) CLAUDE.md / AAG 正本 doc の `references/...` `docs/contracts/...` link 実在 |
| ratchet-down     | あり: `UNREGISTERED_BASELINE = 0` を 01-principles / 03-guides で個別管理                                                                                                                                                                                |
| 不変条件         | registry の 全 path が実在 / 01-principles と 03-guides の .md が双方向登録 / README が全 category 参照 / CLAUDE.md と AAG.md の link 全実在                                                                                                             |
| 関連             | `referenceLinkExistence` test contract ($\\subset$ #4 で交叉) / G1                                                                                                                                                                                       |
| Phase B 抽出候補 | `parsing/jsonRegistry.ts` (categories[].docs[] generic loader) / `detection/existence.ts` (双方向 path 実在) / `detection/ratchet.ts` (UNREGISTERED_BASELINE) — **Phase C の最小 risk 移行対象**                                                         |

### §1.4 — test-contract.json ↔ testContractGuard

| 項目             | 内容                                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `docs/contracts/test-contract.json` (68 行、`contracts[]` = TokenContract \| DynamicContract \| SectionContract \| PairContract \| NoteContract)                                                                                            |
| guard            | `app/src/test/guards/testContractGuard.test.ts` (203 行)                                                                                                                                                                                    |
| parser 種別      | `JSON.parse` + 5 種 discriminated union (kind は `tokens` / `dynamicSource` / `sections` / `pairs` の存在で識別)                                                                                                                            |
| 検出パターン     | (1) `tokens` 配列の各 token が CLAUDE.md に文字列として出現 (2) `dynamicSource` ディレクトリ配下の全項目が CLAUDE.md に出現 (3) `sections` の各 GENERATED:START/END マーカー対が CLAUDE.md に存在 (4) `pairs` の `function` と `doc` が共起 |
| ratchet-down     | なし (5 contract 全 PASS が hard gate)                                                                                                                                                                                                      |
| 不変条件         | `canonicalization-tokens` / `features-modules` / `generated-sections` / `canonical-table` / `reference-link-existence` / `no-static-numbers` の 6 contract 全成立 (CLAUDE.md 冒頭テーブル参照)                                              |
| 共起検証の特殊性 | #3 の `referenceLinkExistence` と一部 overlap (動的 path 実在検証) — Phase B 後は #3 / #4 で primitive 共有候補                                                                                                                             |
| 関連             | `tools/architecture-health/.../test-contract-collector.ts` が自動生成 / G1 / governance-ops                                                                                                                                                 |
| Phase B 抽出候補 | `parsing/jsonRegistry.ts` (discriminated union loader) / `detection/tokenInclusion.ts` (token 包含検証) / `detection/markerPair.ts` (GENERATED:START/END 対称)                                                                              |

### §1.5 — roles/<role>/scope.json ↔ scopeJsonGuard / scopeBoundaryInvariant

| 項目             | 内容                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `roles/<role>/scope.json` × 8 (staff/pm-business / staff/review-gate / staff/documentation-steward / line/architecture / line/implementation / line/specialist/{invariant-guardian, duckdb-specialist, explanation-steward}) |
| guard            | `app/src/test/guards/scopeJsonGuard.test.ts` (157 行) + `app/src/test/scopeBoundaryInvariant.test.ts`                                                                                                                        |
| parser 種別      | `JSON.parse` per role (schema: {role, category, owns[], out_of_scope_warn?, rationale}) + EXPECTED_ROLES 定数の hardcoded role list が事実上の正本                                                                           |
| 検出パターン     | (1) 全 8 role に scope.json 存在 (2) 必須 field (role/category/owns/rationale) (3) role 名 = ディレクトリ名 (4) owns / out_of_scope_warn の path prefix が実在 (broken path) (5) owns ⊥ out_of_scope_warn (排他)             |
| ratchet-down     | warn-only (out_of_scope_warn は informational)                                                                                                                                                                               |
| 不変条件         | role 編集境界の declarative 整合 / G8 mechanism (「気をつける」exhortation を排除)                                                                                                                                           |
| 関連             | `pre-commit hook` が staged ファイルの role 帰属を informational 表示 / G8                                                                                                                                                   |
| Phase B 抽出候補 | `parsing/jsonRegistry.ts` (per-file loader collector) / `detection/pathExistence.ts` (path prefix 実在) / `detection/setExclusion.ts` (owns ⊥ out_of_scope_warn)                                                             |

### §1.6 — taxonomy-v2 registry × 2 ↔ taxonomyInterlockGuard / responsibilityTagGuardV2 / testTaxonomyGuardV2

| 項目             | 内容                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `app/src/test/responsibilityTaxonomyRegistryV2.ts` (R:tag 10 件、L5 Guarded) + `app/src/test/testTaxonomyRegistryV2.ts` (T:kind 15 件、L5 Guarded)。各 entry は `interlock.requiredTKinds[]` / `interlock.verifies[]` / `antibodyPair` / `cooling` lifecycle / `isAnchorSliceTag` etc. を持つ                                                                                    |
| guard            | `taxonomyInterlockGuard.test.ts` (176 行) / `responsibilityTagGuardV2.test.ts` (232 行) / `testTaxonomyGuardV2.test.ts` (205 行) / `taxonomyLifecycleTransitionGuard.test.ts`                                                                                                                                                                                                    |
| parser 種別      | TS named const import (Record<TagId, RegistryEntry>) + JSDoc tag parser (file 内 `@responsibility R:*` / `@taxonomyKind T:*`)                                                                                                                                                                                                                                                    |
| 検出パターン     | (1) INTERLOCK-1 R⇔T 双方向: `R.requiredTKinds[]` が T registry に存在 / `T.verifies[]` が R registry に存在 (2) INTERLOCK-2 Anchor Slice (R 5 件 / T 6 件) (3) INTERLOCK-3 Cognitive Load Ceiling 軸ごと ≤ 15 (4) INTERLOCK-4 Antibody Pair 双方向対称 (5) INTERLOCK-5 Obligation strength must/should/may (6) lifecycle transition (active → deprecated → retired) cooling 検証 |
| ratchet-down     | あり: cooling 経由 (deprecated → retired は 90 日 cooling 又は ad-hoc human review)、AR-TAXONOMY-\* baseline 増加禁止                                                                                                                                                                                                                                                            |
| 不変条件         | AI Vocabulary Binding (新タグ単独追加禁止) / Antibody Pair 完備 / Anchor Slice 整合 / Cognitive Load Ceiling 軸ごと 15 / 全 file タグ付与 (R:unclassified / T:unclassified 退避可)                                                                                                                                                                                               |
| 関連             | `references/01-foundation/taxonomy-constitution.md` / `taxonomy-interlock.md` / `taxonomy-origin-journal.md` / AAG 第 3 の柱                                                                                                                                                                                                                                                     |
| Phase B 抽出候補 | `parsing/tsRegistry.ts` (Record<string, Entry> loader) / `parsing/jsdocTag.ts` (file 内 @tag scan) / `detection/bidirectionalReference.ts` (interlock 双方向対称) / `detection/setCardinality.ts` (Cognitive Load Ceiling) / `detection/lifecycle.ts` (cooling 期間 + transition)                                                                                                |

### §1.7 — principles.json ↔ documentConsistency.test.ts (Design principle consistency)

| 項目             | 内容                                                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `docs/contracts/principles.json` (304 行、`categories[]` = {id, label, ...} + `taxonomy` + `obsoleteTerms[]`)                                                                                                                                                                                           |
| guard            | `app/src/test/documentConsistency.test.ts` (863 行) — `Design principle consistency` describe + `principles.json と CLAUDE.md / README.md / guardTagRegistry の整合` describe (~line 651-720)                                                                                                           |
| parser 種別      | `JSON.parse` + Markdown 走査 (CLAUDE.md / README / design-principles.md) + TS const import (`GUARD_TAG_REGISTRY`)                                                                                                                                                                                       |
| 検出パターン     | (1) CLAUDE.md の 9 設計原則カテゴリ (A-H + Q) prose 包含 (2) `principles.categories[].id` ⊂ CLAUDE.md (3) README.md `taxonomy` ↔ `principles.taxonomy` 一致 (4) `guardTagRegistry` の category id ⊂ `principles.categories[].id` (5) `obsoleteTerms[]` が design-principles.md / CLAUDE.md に出現しない |
| ratchet-down     | なし (full equality)                                                                                                                                                                                                                                                                                    |
| 不変条件         | 設計原則 enum と prose の一致 / 廃語の prose 不在 / guard tag categorization の整合                                                                                                                                                                                                                     |
| 関連             | `references/01-foundation/design-principles.md` / `references/01-foundation/principles.json`（注: 正本は `docs/contracts/`）/ G1                                                                                                                                                                        |
| Phase B 抽出候補 | `parsing/jsonRegistry.ts` (categories[] generic) / `detection/tokenInclusion.ts` (token 包含) / `detection/setEquality.ts` (id 集合一致) / `detection/tokenAbsence.ts` (廃語検出)                                                                                                                       |

### §1.8 — architectureRules base + overlays + defaults ↔ architectureRuleGuard / architectureRulesMergeSmokeGuard

| 項目             | 内容                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `app-domain/gross-profit/rule-catalog/base-rules.ts` + overlays (`architecture.ts` / `complexity.ts` / `docs.ts` / `duckdb.ts` / `migration.ts` / `misc.ts` / `performance.ts` / `responsibility.ts` / `signalIntegrity.ts` / `size.ts`) + defaults。Consumer facade: `app/src/test/architectureRules.ts` (4 経路 — `index` / `merged` / `rules` / 互換 facade) |
| guard            | `architectureRuleGuard.test.ts` (823 行) + `architectureRulesMergeSmokeGuard.test.ts` (90 行)                                                                                                                                                                                                                                                                   |
| parser 種別      | TS named const import + spread merge (`merged.ts` が overlay 群を base に重畳) — 構造的には Record<RuleId, Rule> の合成                                                                                                                                                                                                                                         |
| 検出パターン     | (a) Registry: 全 rule id 一意 / 全 guardTag が GUARD_TAG_REGISTRY に存在 / gate+count 型は baseline or thresholds 必須 / 全 rule に what/why/correctPattern 必須 (b) Merge smoke: barrel/index/merged/re-export/互換 facade が同一 id 集合 + 全 rule に fixNow/executionPlan/migrationRecipe/decisionCriteria 必須 + ARCHITECTURE_RULES 非空                    |
| ratchet-down     | なし (smoke; rule baseline は各 rule 内 detection.baseline が個別管理)                                                                                                                                                                                                                                                                                          |
| 不変条件         | rule registry 配線完全性 (4 経路 = 互換 facade 含む 5 経路で同一集合) / merge 後の field 完全性 / id 一意 / overlay 欠損なし                                                                                                                                                                                                                                    |
| 関連             | `references/03-implementation/architecture-rule-system.md` / AAG 4 layer rule / F1 / C6                                                                                                                                                                                                                                                                                 |
| Phase B 抽出候補 | `parsing/tsRegistry.ts` (Record<id, Rule> loader) / `detection/setEquality.ts` (4 経路 id 集合一致) / `detection/fieldCompleteness.ts` (必須 field 充足) / `detection/uniqueness.ts` (id 重複)                                                                                                                                                                  |

### §1.9 — allowlists/\*.ts ↔ allowlistMetadataGuard

| 項目             | 内容                                                                                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `app/src/test/allowlists/*.ts` の各 `AllowlistEntry[]` 型 export 群。AllowlistEntry = {path, reason, category, ruleId, createdAt, expiresAt?, lifecycle, reviewPolicy, renewalCount, ...}                               |
| guard            | `app/src/test/guards/allowlistMetadataGuard.test.ts` (109 行)                                                                                                                                                           |
| parser 種別      | `Object.values(allowlists)` (barrel re-export を全件 iterate) + duck typing 判定 (`'path' in e && 'reason' in e && 'category' in e`)                                                                                    |
| 検出パターン     | (M1) ruleId 未設定 ≤ 0 (M2) createdAt 未設定 ≤ 0 (M3) `lifecycle === 'active-debt'` かつ expiresAt 未設定 ≤ 0 (M4) reviewPolicy 未設定 ≤ 0 (M5) **expiresAt 超過 = hard fail** (renewalCount > 2 で ruleId review 強制) |
| ratchet-down     | あり: 4 baseline (現在は全て 0 達成、PR2 完了)。M5 は ratchet ではなく hard fail (期限切れは即時 review トリガー)                                                                                                       |
| 不変条件         | active-debt な allowlist は必ず ruleId/createdAt/expiresAt/reviewPolicy を持つ / 期限切れは即 fail / temporal governance metadata の完全性                                                                              |
| 関連             | `projects/completed/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-002` / AAG temporal governance                                                                                                     |
| Phase B 抽出候補 | `parsing/tsRegistry.ts` (multi-file barrel iteration) / `detection/fieldCompleteness.ts` (4 metadata 充足) / `detection/temporal.ts` (expiresAt 超過判定) / `detection/ratchet.ts` (4 baseline)                         |

### §1.10 — projects/<id>/checklist.md ↔ checklistFormatGuard / checklistGovernanceSymmetryGuard

| 項目             | 内容                                                                                                                                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `projects/<id>/checklist.md` (Markdown) + `projects/<id>/config/project.json` `entrypoints.checklist` field                                                                                                                             |
| guard            | `checklistFormatGuard.test.ts` (209 行) + `checklistGovernanceSymmetryGuard.test.ts` (187 行)                                                                                                                                           |
| parser 種別      | filesystem 走査 (`fs.readdirSync(projects)` で live project 列挙、`completed/` `_template/` 除外) + `JSON.parse(project.json)` + Markdown 行走査 (heading / checkbox 表記)                                                              |
| 検出パターン     | (Format) F1 必須 file 欠落 / F2 形式違反 checkbox / F3〜F5 「やってはいけない」「常時チェック」「最重要項目」セクション内 checkbox 禁止 (Governance Symmetry) S1〜S3 禁止 heading 自体の存在を検出（規約と collector 実装の対称性保証） |
| ratchet-down     | あり: `FORMAT_EXEMPT_PROJECT_IDS` (現在は空集合、増加禁止 = ratchet 方向 0 のみ)                                                                                                                                                        |
| 不変条件         | live project の checklist は format 規約に従う / collector の集計範囲 = format guard の通過範囲 (対称性) / `_template` `completed/` は対象外                                                                                            |
| 関連             | `references/05-aag-interface/operations/project-checklist-governance.md §3 §8 §10` / `tools/architecture-health/.../project-checklist-collector.ts` / G8                                                                                                  |
| Phase B 抽出候補 | `parsing/projectListing.ts` (live project 列挙 + `_` / `completed` 除外) / `parsing/markdownStructure.ts` (heading / checkbox 走査) / `detection/sectionForbidden.ts` (禁止 heading + その配下の構造)                                   |

### §1.11 — OBLIGATION_MAP ↔ obligation-collector / architectureRuleGuard

| 項目             | 内容                                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 正本 (registry)  | `tools/architecture-health/src/collectors/obligation-collector.ts` の `OBLIGATION_MAP: readonly ObligationRule[]` (各 entry = {pathPattern, obligationId, label, check: {type: 'generated_section_fresh' \| 'file_modified' \| 'health_regenerated'}}) |
| guard            | obligation-collector の runtime 実行 (`docs:check`) + `architectureRuleGuard.test.ts` (rule 整合 part)                                                                                                                                                 |
| parser 種別      | TS const map import + `git diff` 出力 + glob prefix match (`pathPattern` 単純 prefix match)                                                                                                                                                            |
| 検出パターン     | (1) 変更 path → 該当 ObligationRule 抽出 (2) check.type に応じた検証 — generated_section_fresh / file_modified / health_regenerated — のいずれかで未履行を検出 (3) 未履行があれば `aag-response` で fix-now hint 生成 + `docs:check` fail              |
| ratchet-down     | なし (per-PR の動的検証)                                                                                                                                                                                                                               |
| 不変条件         | path 変更には更新義務がペアで存在する / 未履行は CI で hard fail / fix-now hint で復帰経路が機械生成                                                                                                                                                   |
| 関連             | CLAUDE.md「Obligation Map (パス → 更新義務)」表 (本 doc のメタ) / AAG ratchet-down + migrationRecipe / G8                                                                                                                                              |
| Phase B 抽出候補 | `parsing/tsRegistry.ts` (rule[] generic) / `detection/pathPatternMatch.ts` (glob prefix match) / `detection/obligationCheck.ts` (3 種 check.type の dispatch) — **path 実在検証 (Phase J 後続課題 B / J7) と primitive 共通化**                        |

### §1.12 — references/04-tracking/elements/ (89 spec) ↔ contentSpec\*Guard × 11 (Phase J 完遂、reference 実装の供給元)

| 項目             | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正本 (registry)  | `references/04-tracking/elements/{widgets,read-models,calculations,charts,ui-components}/` 配下の YAML frontmatter 付き Markdown 89 件 (WID 45 / RM 10 / CALC 24 / CHART 5 / UIC 5)。+ source 側 JSDoc tag (`@widget-id`, `@read-model-id`, `@calc-id`, `@chart-id`, `@uic-id`)                                                                                                                                                                                                                                                     |
| guard            | `contentSpec{Exists,FrontmatterSync,CoChange,Lifecycle,LifecycleLinkSymmetry,Owner,Freshness,EvidenceLevel,VisualEvidence,CanonicalRegistrationSync}Guard.test.ts` × **11 active** (Phase J 完遂、834 test PASS、Hard Gate PASS)                                                                                                                                                                                                                                                                                           |
| parser 種別      | YAML frontmatter (`gray-matter` 相当の `parseSpecFrontmatter`) + AST 走査 (JSDoc tag) + filesystem (`existsSync` / `findIdLine`) + `inferKindFromId` (id prefix → kind 5 種 dispatch)                                                                                                                                                                                                                                                                                                                                      |
| 検出パターン     | (1) Exists: spec id ↔ 物理 source 双方向 (2) FrontmatterSync: spec ↔ source の structural fields 同期 (3) CoChange: 同 PR 内 spec/source 同時 update (4) Lifecycle: planning / proposed / current / sunset / archived (5) LifecycleLinkSymmetry: replacedBy ↔ supersedes 双方向対称 (6) Owner / Freshness (`reviewCadenceDays` + `lastReviewedAt`) / EvidenceLevel (Behavior Claims 6 種 enforcement) / VisualEvidence / CanonicalRegistrationSync (calculationCanonRegistry runtimeStatus ↔ CALC spec)                    |
| ratchet-down     | あり: J6 coverage / canonical-registration-sync 含む **全 baseline = 0** に到達 (Phase J Step 7 candidate slot 二状態モデル institutionalize)                                                                                                                                                                                                                                                                                                                                                                              |
| 不変条件         | 89 spec / 310 Behavior Claim / 11 guard active / 0 violation / candidate slot active 化で +1 over baseline → hard fail (Promote Ceremony 1 PR 5 同期強制)                                                                                                                                                                                                                                                                                                                                                                  |
| 共通 helper      | `app/src/test/guards/contentSpecHelpers.ts` (312 行) — `parseSpecFrontmatter` / `listAllSpecs` (kind 5 種) / `findIdLine` / `inferKindFromId` / `specPathFor` etc. = **Phase B domain primitive の暗黙の skeleton**                                                                                                                                                                                                                                                                                                        |
| generator        | `tools/widget-specs/generate.mjs` (kind 5 種 dispatch、`--check` mode、`--inject-jsdoc` mode)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| collector        | `tools/architecture-health/src/collectors/content-spec-collector.ts` (5 KPI + driftBudget threshold)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 関連             | `phased-content-specs-rollout` Phase A〜J 完遂 (2026-04-28、本 project の **Phase B reference 実装の供給元**) / Promote Ceremony candidate slot 二状態モデル / AAG Hard Gate                                                                                                                                                                                                                                                                                                                                               |
| Phase B 抽出候補 | `parsing/yamlFrontmatter.ts` ← `parseSpecFrontmatter` を **直接 extract** / `parsing/markdownIdScan.ts` ← `listAllSpecs` + `findIdLine` / `detection/existence.ts` ← physical source 存在で active vs planning 振分 logic を **直接 extract** / `detection/shapeSync.ts` ← frontmatterSync + coChange / `detection/temporal.ts` ← freshness / lifecycle deadline / `detection/ratchet.ts` ← J6 coverage baseline / `reporting/formatViolation.ts` ← `expect(violations, violations.join('\n')).toEqual([])` 共通 formatter |

### §1.13 — invariant-catalog.md ↔ invariant test 群 (math invariants)

| 項目             | 内容                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 正本 (registry)  | `references/03-implementation/invariant-catalog.md` (1412 行、158 invariant) — `INV-{PREFIX}-{SEQ}` (PREFIX = SH / PI / CG / RBR / OP / PIN / IC / SENS / TREND / CORR / DG / MA / TS / ARCH / CANON / ALLOW)                                      |
| guard            | invariant test 群 (`factorDecomposition.test.ts` / `piValue.test.ts` 等の math invariants test, Rust 側は `{prefix_lower}_inv_{seq}_*` 命名) — 単一の guard ではなく **invariant id ↔ test name の対応**で機械検証                         |
| parser 種別      | Markdown heading + ID 走査 (`### INV-{PREFIX}-{SEQ}: ...`) + テスト名走査 (TS test `it.each` / Rust `#[test] fn ...`)                                                                                                                      |
| 検出パターン     | (1) catalog 内の invariant 全てに対応する test 関数が存在 (2) test 関数の参照する invariant id が catalog に存在 (双方向) (3) 数式自体は test 内で `expect(... ).toBeCloseTo(...)` 等で検証 (4) `contractId` (BIZ-/ANA-) と CALC spec 連携 |
| ratchet-down     | なし (catalog 全件 test 紐付けが期待状態)                                                                                                                                                                                                  |
| 不変条件         | シャープリー効率性 (INV-SH-01〜): `custEffect + ticketEffect = curSales - prevSales` 等 / PI値 / 客数GAP / 残予算率 / 移動平均 / 時間帯分析 等の数学的不変条件が全て test に紐付く                                                         |
| 関連             | `roles/line/specialist/invariant-guardian/SKILL.md` / `D1` / `D2` / `D3` (D 数学的不変条件 設計原則) / WASM 観測テスト (全 5 engine authoritative)                                                                                         |
| Phase B 抽出候補 | `parsing/markdownIdScan.ts` (heading id 走査、§1.12 と共通化候補) / `detection/bidirectionalReference.ts` (id ↔ test name 双方向) / 既存 #12 の `findIdLine` と統合可能                                                                    |

> **§1 共通観察 (Phase A 終結時の知見)**:
>
> - **parser 種別** は (a) JSON.parse + 構造 type guard (b) TS const import + Record<id, Entry> (c) filesystem 走査 (d) YAML frontmatter (e) Markdown 走査 + heading id (f) 正規表現 / AST tag scan の **6 系**に集約される。これら 6 系を `parsing/` の sub-module 単位とすれば §3.2 の primitive 設計に直結する。
> - **検出パターン** は (i) 双方向存在 (ii) 構造一致 (iii) ratchet-down 集計 (iv) 期限超過 (v) 集合一致 / 包含 / 排他 (vi) 双方向対称参照 (vii) cardinality cap の **7 系**に集約される。
> - **ratchet-down** は 13 ペアのうち #1 / #3 / #6 / #9 / #10 / #12 の 6 ペアが採用 (約半分)。残りは binary or full equality。`detection/ratchet.ts` は最小 baseline + describe message + console hint の 3 要素で generic 化可能。
> - **path 実在検証** が #3 / #5 / #11 / #12 / J7 後続課題で重複 — **最重要 primitive**として `detection/pathExistence.ts` を Phase B 早期に抽出すべき。

## 2. 横展開候補 (selection rule)

> **背景**: plan.md §1.3 に列挙された未正本化領域を、本 §で **selection rule (採用判定)** にかけて
> tier1 (Phase H 採用) / tier2 (後続 project) / **不採用** に振り分ける。
> 不可侵原則 4「新 registry+guard の追加 ≠ 横展開」を mechanism 化する section。

### 2.1 — selection rule (3 ゲート、AND 結合)

候補が **以下 3 ゲートを全て通過した場合のみ** 採用候補とする (Phase A の draft、Phase I で `canonicalization-checklist.md` に確定 institutionalize)。

| ゲート                                        | 判定基準                                                                                                         | 落第時の措置                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **G-1: 業務意味 (Business Meaning)**          | 当該領域の drift が起きると **業務 KPI / UX / 計算正本性** に観測可能な影響が出るか? (ROI 観点)                  | 不採用。drift が「内部整理」止まりなら mechanism 投入は手続き過多  |
| **G-2: 重複検出有効性 (Drift Detectability)** | 既存の 7 検出パターン (i-vii) のいずれかで drift が **機械検出可能**か? rule に判断 (subjective) を要求しないか? | 不採用 (G8 違反候補)。「気をつける」rule に退行する                |
| **G-3: 複数 caller / 規模 (Cardinality)**     | registry の対象が **3 件以上**かつ **複数 caller / 複数 module から参照**されるか?                               | 単発なら 1 file 内 invariant test で足りる、registry 化は overkill |

**追加考慮 (tie-breaker)**:

- **C-1: 既存 primitive 再利用度** — Phase B で抽出される 6 parser × 7 detection 集合のうち、最低 2 primitive を再利用できるか? (→ 高ければ tier1)
- **C-2: ratchet-down 適合** — 段階的 0 化が可能な「カウント可能な現状不整合」を持つか? (→ あれば tier1)
- **C-3: phased-content-specs / pure-calculation-reorg と非競合** — 並行 active project の進行を阻害しないか?

### 2.2 — plan.md §1.3 候補の selection 結果 (draft)

| #   | 領域                                                                  | G-1 業務意味                                               | G-2 検出可能                                             | G-3 規模         | C-1 primitive 再利用               | tier 判定 (draft)   | 根拠                                                                            |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- | ---------------- | ---------------------------------- | ------------------- | ------------------------------------------------------------------------------- |
| H-1 | `app/src/application/hooks/` (`useXxxBundle` / `useXxxPlan`)          | ✅ 計算正本性 (Screen Plan の整合)                         | ✅ 命名規約 + 重複検出 (蓄積されたパターン)              | ✅ 数十 hook     | 高 (#1 #6 と類似)                  | **tier1**           | plan.md §1.3 に「重複検出有効性高」と明記、Phase H 最初の候補                   |
| H-2 | `app/src/presentation/components/charts/` (input/option builder pair) | ✅ chart UX + 5W 説明責任                                  | ✅ pair 整合 (CHART spec frontmatter で既に部分的に検証) | ✅ 数十 chart    | **最大** (#12 contentSpec と直結)  | **tier1**           | #12 の延長、CHART-NNN spec を builder pair まで拡張                             |
| H-3 | `app/src/application/stores/` (Zustand store)                         | △ 重複 state は UX 影響だが間接的                          | ✅ store 数 ratchet + 重複 state 検出                    | △ 10 store 規模  | 中 (#9 ratchet pattern 再利用)     | **tier2**           | 規模が中、phased-content-specs 後の文脈で再評価                                 |
| H-4 | `app/src/application/navigation/pageRegistry.ts`                      | ✅ DEFAULT\_\*\_WIDGET_IDS との整合 = page-level UX        | ✅ 双方向 id 一致 (#12 と同形)                           | △ ページ数 < 10  | 高 (#12 既存 primitive)            | **tier2**           | 既に registry 化済 / spec 化が後続。phased-content-specs Phase G 完遂後に再評価 |
| H-5 | `app/src/domain/formatting/` (F2 文字列カタログ)                      | △ format 関数の整合は重要だが小規模                        | ✅ id 重複 + 命名規約                                    | △ 件数 < 20      | 中                                 | **tier2**           | F2 規約は既に一定 enforce、registry 化は after Phase G                          |
| H-6 | `app/src/domain/constants/`                                           | △ 定数の意味分類 + 重複検出                                | △ 重複検出は subjective になりやすい                     | △ 件数 < 30      | 低                                 | **不採用 (現時点)** | G-2 が弱い。inline 値の検出は別 codePatternGuard で代替可                       |
| H-7 | `wasm/<module>/` (registry + bridge 対応表)                           | ✅ WASM bridge 整合 = 計算正本性に直結                     | ✅ package.json + Rust crate + TS bridge の 3 軸         | △ 7 module       | 高 (#8 multi-source merge と類似)  | **tier1**           | 計算 engine の正本性に直結、現状は build 順序のみで脆弱                         |
| H-8 | `references/02-design-system/` token (一部既存)                       | △ design token の theme.ts sync は UX 影響あり             | ✅ token id 双方向 (既存 design-system 内 partial guard) | ✅ token 数十    | 中                                 | **tier2**           | 既存 partial guard を Phase H で吸収、ただし phased-content-specs 後            |
| H-9 | Storage admin / IndexedDB schema (migration ladder)                   | ✅ schema 版数の drift は data loss / migration 失敗に直結 | ✅ schema 版数 ↔ migration script ladder の双方向        | △ migration 数件 | 中 (#1 ratchet + #6 双方向 と類似) | **tier1**           | 業務影響大 (data loss)、規模は小だが ROI 高                                     |

**集計**: tier1 = 4 候補 (H-1 / H-2 / H-7 / H-9) / tier2 = 4 候補 / 不採用 = 1 候補。

### 2.3 — Phase H 着手順 (draft、Phase G の KPI で再評価)

1. **H-1 (hooks/Bundle) を Phase H 着手 1 番手** — plan.md §1.3 の「重複検出有効性高」明記、primitive 再利用度高
2. **H-2 (charts builder pair) を 2 番手** — #12 contentSpec の直接拡張で primitive コスト最小
3. **H-7 (wasm bridge) を 3 番手** — 業務インパクト最大だが multi-source merge 設計が必要 (Phase B の primitive 安定後)
4. **H-9 (IndexedDB schema ladder) を 4 番手** — 業務インパクト大だが対象規模が小で primitive 整備の触媒として活用
5. tier2 候補は本 project scope 外、後続 project へ引き継ぎ (`references/01-foundation/integrity-domain.md` Phase I で明記)

### 2.4 — selection 過程で発見した判断基準の追補

- **「正本化すべき」≠「常に new registry を作るべき」** (plan.md §1.3 注意書きを selection rule で mechanism 化)
- **G-2 の subjective 度合い**: rule の判断に「気をつける」「適切」「妥当」の語を要求するなら不採用 (G8 違反)
- **C-3 並行 project 非競合**: phased-content-specs Phase J 完遂で **#12 が reference 実装の供給元**になったため、H-2 / H-4 / H-8 は同 primitive 群で adapter 化可能 — 重複コストを大幅圧縮

> **Phase A 完了時点では本 §を draft とする**。Phase I で `references/01-foundation/canonicalization-principles.md` に拡張版として institutionalize、`references/03-implementation/canonicalization-checklist.md` (新 registry+guard 追加 checklist) で機械強制経路を確立する。

## 3. 共通 primitive 候補

> **目的**: §1 の 13 ペアと §2 の tier1 横展開候補を、`app-domain/integrity/` の最小 primitive 集合に対応付ける。
> Phase B (Domain Skeleton) の素材を Phase A の inventory から **逆算**で抽出する。
> plan.md §3.2 の primitive 仮説と本 §の対応表が double check となる。

### 3.1 — parsing/ primitive (6 種、parser 層)

各 primitive は「raw 入力 → Registry<Entry> 中間表現」の関数。

| primitive                       | 入力形式                           | 利用ペア                                                                                     | Phase J 既実装の起点                             | 抽出方針                                                |
| ------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `parsing/jsonRegistry.ts`       | JSON file                          | #3 doc-registry / #4 test-contract / #5 scope.json (per role) / #7 principles                | **新規実装** (spec-state には JSON 系なし)       | discriminated union 対応 (#4 type kind) も generic 化   |
| `parsing/tsRegistry.ts`         | TS named const (Record<id, Entry>) | #1 calc canon / #6 taxonomy R/T / #8 architecture rules / #9 allowlists / #11 OBLIGATION_MAP | `CALCULATION_CANON_REGISTRY` 読込パターン        | adapter 経由で抽象化 (Object.values + duck typing 含む) |
| `parsing/yamlFrontmatter.ts`    | YAML frontmatter Markdown          | #12 contentSpec                                                                              | `parseSpecFrontmatter` (`contentSpecHelpers.ts`) | **直接 extract** (pure 関数、依存なし)                  |
| `parsing/filesystemRegistry.ts` | dir 構造                           | #2 readModels / #5 (per-role discovery) / #10 projects/ live listing                         | `listAllSpecs` (kind 5 種) / `listLiveProjects`  | dir 走査 + filter pattern を generic 化                 |
| `parsing/markdownIdScan.ts`     | Markdown heading + body            | #13 invariant-catalog / #12 (`findIdLine`)                                                   | `findIdLine`                                     | `### INV-...` `### CALC-...` 等の id 走査を generic 化  |
| `parsing/jsdocTag.ts`           | TS source の JSDoc                 | #6 taxonomy (file 内 `@responsibility R:*` `@taxonomyKind T:*`) / #12 (`@calc-id` 等 5 種)   | kind dispatch 5 種                               | tag name → value extractor を generic 化                |

### 3.2 — detection/ primitive (7 種、検出層)

各 primitive は「Registry<Entry> + 比較対象 → Violation[]」の関数。

| primitive                             | 検出パターン (i-vii)       | 利用ペア                                                                                                                                           | Phase J 既実装の起点                                                                 | 抽出方針                                                                             |
| ------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `detection/existence.ts`              | (i) 双方向存在             | #1 / #2 / #3 / #11 / #12 / #13                                                                                                                     | `existsSync` + `findIdLine` + canonical-registration-sync の active vs planning 振分 | **直接 extract** (最重要 primitive)                                                  |
| `detection/pathExistence.ts`          | (i) path 文字列実在        | #3 / #5 / #11 / #12 / Phase J 後続課題 J7                                                                                                          | `existsSync(path.join(REPO_ROOT, refPath))` 反復                                     | **直接 extract**、J7 を本 primitive shape で先行設計                                 |
| `detection/shapeSync.ts`              | (ii) 構造一致              | #2 (Types/index/実装 trio) / #12 (frontmatter ↔ source) / #5 (scope.json schema)                                                                   | `frontmatterSync` guard / `coChange` guard                                           | 並行運用 → adapter 化                                                                |
| `detection/ratchet.ts`                | (iii) ratchet-down 集計    | #1 (Zod未追加 ≤3) / #3 (UNREGISTERED_BASELINE) / #6 (cooling) / #9 (4 baseline) / #10 (FORMAT_EXEMPT) / #12 (J6 coverage / canonical-registration) | const baseline + `toBeLessThanOrEqual` パターン                                      | **直接 extract** (最小 baseline + describe message + console hint の 3 要素 generic) |
| `detection/temporal.ts`               | (iv) 期限 / freshness      | #6 (cooling 期間) / #9 (expiresAt 超過) / #12 (freshness `reviewCadenceDays + lastReviewedAt`) / #10 (deadline)                                    | `freshness` guard / `lifecycle` guard / allowlist M5                                 | **直接 extract** (`Date` 比較 + ISO date parse)                                      |
| `detection/setRelation.ts`            | (v) 集合一致 / 包含 / 排他 | #4 (token 包含) / #5 (owns ⊥ out_of_scope_warn) / #7 (id 集合一致) / #8 (4 経路 id 集合一致)                                                       | `Set` 演算 (added/removed/intersect)                                                 | union/intersect/difference/disjoint の 4 op を generic 化                            |
| `detection/bidirectionalReference.ts` | (vi) 双方向対称参照        | #6 (R⇔T interlock + Antibody Pair 双方向) / #12 (replacedBy ↔ supersedes) / #13 (invariant id ↔ test name)                                         | INTERLOCK-1 / INTERLOCK-4 (`taxonomyInterlockGuard`)                                 | A→B かつ B→A の双方向対称検証 generic                                                |
| `detection/cardinality.ts`            | (vii) cardinality cap      | #6 (Cognitive Load Ceiling 軸ごと ≤ 15) / #8 (id 一意 / 重複なし)                                                                                  | `RESPONSIBILITY_TAGS_V2.length <= 15`                                                | upper / lower / unique の 3 op generic                                               |

### 3.3 — reporting/ primitive (1 種、出力層)

| primitive                      | 役割                                 | 利用ペア                                                                              | Phase J 既実装の起点                                                                                                 | 抽出方針                                                                               |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `reporting/formatViolation.ts` | violation[] → human-readable message | **全 13 ペア共通** (`expect(violations, violations.join('\n')).toEqual([])` パターン) | 全 11 contentSpec\*Guard で共通の `formatViolationMessage(rule, violations)` または `violations.join('\n')` パターン | **直接 extract** (formatter として generic 化、`getRuleById` 経由の rule context 含む) |

### 3.4 — types/ primitive (4 種、型層)

| primitive             | 役割                       | 説明                                                       |
| --------------------- | -------------------------- | ---------------------------------------------------------- |
| `Registry<TEntry>`    | 抽象 registry              | `{id: string, label: string, ...TEntry}` の Record         |
| `DriftReport`         | 共通 drift 表現            | `{ruleId, severity, location, expected, actual, fixHint?}` |
| `SyncDirection`       | one-way / two-way          | parser ↔ source の同期方向 enum                            |
| `EnforcementSeverity` | warn / gate / ratchet-down | 検出結果の強度 enum                                        |

### 3.5 — primitive 抽出順 (Phase B 着手順、リスク低 → 高)

1. **`reporting/formatViolation.ts`** — 全ペア共通、副作用なし。最初に extract して全 guard が経由するように
2. **`parsing/yamlFrontmatter.ts`** — Phase J で完成形が存在、依存最小。**Phase B 1 番手 (plan.md §3.2 対応表で「直接 extract」)**
3. **`detection/existence.ts`** + **`detection/pathExistence.ts`** — 最高頻度の primitive、Phase J で active vs planning 振分済
4. **`detection/ratchet.ts`** — Phase J で coverage baseline 確立、6 ペアで再利用可
5. **`detection/temporal.ts`** — Phase J / #9 / #10 で完成形に近い
6. **`parsing/jsonRegistry.ts`** — Phase C 移行対象 (#3 doc-registry) のため、必要十分な generic を Phase B 末尾で確立
7. **`parsing/tsRegistry.ts`** — Phase D Wave 1 直前で generic 化 (Phase B では adapter のみ)
8. **`detection/setRelation.ts`** + **`detection/bidirectionalReference.ts`** + **`detection/cardinality.ts`** — Phase D で順次抽出
9. **`parsing/filesystemRegistry.ts`** + **`parsing/markdownIdScan.ts`** + **`parsing/jsdocTag.ts`** + **`detection/shapeSync.ts`** — Phase D で確定

> **観察**: Phase B 着手 1 番手 4 primitive (`formatViolation` / `yamlFrontmatter` / `existence` + `pathExistence` / `ratchet`) で **13 ペアのうち約 8 ペアの adapter 化が最小コストで可能**。残り primitive は移行 PR ごとに incremental に extract する。
>
> これは plan.md §3.2 の「Phase J が暗黙に実装した primitive を crystallize」「Phase B 完了予測 ~30%」見直しを Phase A の inventory 側からも追認する結果。

## 4. 採用候補リスト (priority)

> **目的**: §1 の 13 既存ペア (Phase B-E migration 対象) と §2 tier1 横展開候補 (Phase H 採用) を、
> Phase B〜H 全体での **着手 priority 順**に統合する単一リスト。
> 各候補の出力先は `projects/completed/canonicalization-domain-consolidation/derived/` (Phase A 完了条件)。

### 4.1 — 既存 13 ペア (Phase B-E migration)

`risk` = 移行リスク (低 / 中 / 高)、`primitives` = 主に再利用する Phase B primitive、`phase` = 着手 phase。

| priority | #   | ペア                                                                         | risk                                    | primitives (再利用)                                                     | phase          | 備考                                                           |
| -------- | --- | ---------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- | -------------- | -------------------------------------------------------------- |
| **1**    | 12  | references/04-tracking/elements/ ↔ contentSpec\*Guard × 11                            | **最低** (Phase J 完遂、reference 実装) | yamlFrontmatter / existence / pathExistence / ratchet / temporal        | **Phase B**    | Phase B の primitive 抽出 reference として先行 adapter 化      |
| **2**    | 3   | doc-registry.json ↔ docRegistryGuard                                         | **低**                                  | jsonRegistry / existence / pathExistence / ratchet                      | **Phase C**    | plan.md §4 で「lowest risk migration」明記、Phase C 単独で完了 |
| **3**    | 1   | calculationCanonRegistry ↔ calculationCanonGuard                             | 低                                      | tsRegistry / existence / ratchet                                        | Phase D Wave 1 | `pure-calculation-reorg` と協調必要                            |
| **4**    | 2   | readModels 構造 ↔ canonicalizationSystemGuard                                | 低                                      | filesystemRegistry / shapeSync / pathExistence                          | Phase D Wave 1 | ハードコード `REQUIRED_*` 配列を JSON registry 化検討          |
| **5**    | 4   | test-contract.json ↔ testContractGuard                                       | 低                                      | jsonRegistry / setRelation / pathExistence                              | Phase D Wave 1 | discriminated union loader generic                             |
| **6**    | 5   | scope.json ↔ scopeJsonGuard / scopeBoundaryInvariant                         | 低                                      | jsonRegistry / pathExistence / setRelation (排他)                       | Phase D Wave 1 | EXPECTED_ROLES 配列を JSON registry 化検討                     |
| **7**    | 7   | principles.json ↔ documentConsistency.test.ts                                | 中                                      | jsonRegistry / setRelation / tokenInclusion                             | Phase D Wave 2 | documentConsistency.test.ts (863 行) の分割が前提              |
| **8**    | 6   | taxonomy v2 R/T registry ↔ taxonomyInterlockGuard 等                         | **中-高** (cooling 経由 lifecycle 含む) | tsRegistry / jsdocTag / bidirectionalReference / cardinality / temporal | Phase D Wave 2 | AAG 第 3 の柱、Constitution 整合維持必須                       |
| **9**    | 8   | architectureRules base+overlays+defaults ↔ architectureRule(MergeSmoke)Guard | 中                                      | tsRegistry / setRelation / cardinality                                  | Phase D Wave 2 | 4 経路 + 互換 facade の同一性は引き続き smoke で担保           |
| **10**   | 9   | allowlists/\*.ts ↔ allowlistMetadataGuard                                    | 中                                      | tsRegistry / temporal / ratchet                                         | Phase D Wave 3 | M5 hard fail (expiresAt 超過) 動作の同一性が要                 |
| **11**   | 10  | projects/<id>/checklist.md ↔ checklistFormat / GovernanceSymmetryGuard       | 中                                      | filesystemRegistry / markdownIdScan (heading) / setRelation             | Phase D Wave 3 | live project 列挙 + heading 走査の generic 化                  |
| **12**   | 11  | OBLIGATION_MAP ↔ obligation-collector / architectureRuleGuard                | 中                                      | tsRegistry / pathExistence (path glob match)                            | Phase D Wave 3 | git diff 連携あり、CI 経路で慎重に                             |
| **13**   | 13  | invariant-catalog.md ↔ invariant test 群                                     | 中                                      | markdownIdScan / bidirectionalReference (id ↔ test name)                | Phase D Wave 3 | invariant-guardian role と協働 (158 invariant)                 |

→ **Phase E (Legacy Retirement)** で 13 ペア全ての旧 guard を物理削除、ratchet-down baseline を domain 側に統合移行。

### 4.2 — 横展開候補 (Phase H 採用、§2 から転記)

| priority | tier  | 候補                                                                  | risk                           | primitives (再利用)                                                                                  | 備考                                                    |
| -------- | ----- | --------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **H-α**  | tier1 | `app/src/application/hooks/` (`useXxxBundle` / `useXxxPlan`)          | 中                             | tsRegistry / existence / shapeSync / cardinality                                                     | plan.md §1.3 で「重複検出有効性高」明記、Phase H 1 番手 |
| **H-β**  | tier1 | `app/src/presentation/components/charts/` (input/option builder pair) | 中                             | yamlFrontmatter (CHART spec frontmatter 再利用) / shapeSync / bidirectionalReference                 | #12 contentSpec の直接拡張、primitive コスト最小        |
| **H-γ**  | tier1 | `wasm/<module>/` (registry + bridge 対応表)                           | 高 (multi-source merge 設計要) | jsonRegistry (package.json) + tsRegistry (TS bridge) + filesystemRegistry (Rust crate) / setRelation | 計算 engine 正本性に直結、Phase B primitive 安定後      |
| **H-δ**  | tier1 | Storage admin / IndexedDB schema (migration ladder)                   | 中                             | tsRegistry / bidirectionalReference (schema 版数 ↔ migration script ladder) / cardinality            | 業務影響大 (data loss)、ROI 高                          |

### 4.3 — tier2 / 不採用 (本 project scope 外)

| 候補                                             | 判定       | 引き継ぎ先                                         |
| ------------------------------------------------ | ---------- | -------------------------------------------------- |
| `app/src/application/stores/` (Zustand)          | tier2      | 後続 project (phased-content-specs 後)             |
| `app/src/application/navigation/pageRegistry.ts` | tier2      | 後続 project (phased-content-specs Phase G 完遂後) |
| `app/src/domain/formatting/` (F2 文字列カタログ) | tier2      | 後続 project (Phase G 後)                          |
| `references/02-design-system/` token             | tier2      | 後続 project (phased-content-specs 後)             |
| `app/src/domain/constants/`                      | **不採用** | G-2 検出可能性が弱い、`codePatternGuard` で代替可  |

### 4.4 — 出力先 (Phase A 完了条件)

本 §は次の 2 場所に出力する:

1. **本 doc (`references/03-implementation/integrity-pair-inventory.md`)** — canonical inventory (本ファイル)
2. **`projects/completed/canonicalization-domain-consolidation/derived/`** — 採用候補リストの machine-readable 版 (JSON / YAML、Phase A 完了 commit で landing)
3. **`references/01-foundation/canonicalization-principles.md`** — selection rule (§2.1 の 3 ゲート + 3 tie-breaker) を拡張版として記述 (Phase A 完了 commit で landing)
4. **doc-registry.json** — 本 doc + 上記 2/3 の path を category `guides` / `principles` に追加 (HANDOFF.md「次にやること」#2 の同期実施)

### 4.5 — Phase A 完了判定 (本 doc + 関連 doc の整合)

Phase A が「完遂」とみなせるのは次の全てが成立した時点:

- [x] §1.0 サマリ表 13 行 (本 commit)
- [x] §1.1〜§1.13 13 ペア詳細 (本 commit)
- [x] §2 selection rule + §2.2 候補判定 (本 commit)
- [x] §3 共通 primitive 候補 (parsing 6 / detection 7 / reporting 1 / types 4) (本 commit)
- [x] §4 採用候補リスト (本 §) (本 commit)
- [x] `references/01-foundation/canonicalization-principles.md` の selection rule 拡張版 landing (P8 として追加、本 commit)
- [x] `projects/completed/canonicalization-domain-consolidation/derived/` machine-readable 版 landing (`adoption-candidates.json` + README.md、本 commit)
- [x] doc-registry.json への本 doc 追加 (label を populated 状態に更新済、前 commit)

→ 全項目完遂。**Phase A primary deliverable 完遂**を HANDOFF.md に反映。Phase B 着手準備完了。
