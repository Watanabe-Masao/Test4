# legacy-retirement — canonicalization-domain-consolidation

> 役割: 本 project が `requiresLegacyRetirement=true` の対象として撤退する旧 guard / 旧 parser / 旧 helper / 重複 logic を列挙し、撤退順序 / sunset 条件 / rollback を記録する（draft 段階）。

## 1. 撤退規律（plan.md §5 と整合）

各 retirement は **5 step** を経由:

| step                          | 状態                               | 検証                                           |
| ----------------------------- | ---------------------------------- | ---------------------------------------------- |
| 1. 並行運用開始               | 旧 active / 新 active              | 両 guard が同 PR で同 violation 集合を出す     |
| 2. 観察期間 (≥ 1 週間 / 5 PR) | 旧 active / 新 active              | drift 数の dual-emit 等価性を継続              |
| 3. @deprecated 化             | 旧 `@deprecated` JSDoc / 新 active | `deprecatedMetadataGuard` が 4 metadata を認識 |
| 4. 物理削除                   | 削除 / 新 singular                 | caller=0、import grep で 0 件                  |
| 5. baseline 統合              | (削除済) / 新が baseline 統合      | `architecture-health` に統合後 KPI 反映        |

各 PR で **1 step だけ進める**。

## 2. 撤退対象一覧（draft、Phase A の inventory で具体化）

### 2.1. 旧 guard（domain 経由に置換予定）

| 旧 guard                                                                  | 新経路（domain primitive）                                                | 撤退順序 wave       |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------- |
| `docRegistryGuard.test.ts` の自前 parsing / existence check               | `app-domain/integrity/parsing/jsonRegistry.ts` + `detection/existence.ts` | C (first migration) |
| `calculationCanonGuard.test.ts` の registry 検証 logic                    | `app-domain/integrity/parsing/tsRegistry.ts`                              | D Wave 1            |
| `canonicalizationSystemGuard.test.ts` の readModel ディレクトリ検査       | `app-domain/integrity/detection/structuralExistence.ts`（仮）             | D Wave 1            |
| `testContractGuard.test.ts` の test contract 整合                         | `app-domain/integrity/parsing/jsonRegistry.ts`                            | D Wave 1            |
| `scopeJsonGuard.test.ts` / `scopeBoundaryInvariant.test.ts` の scope 整合 | `app-domain/integrity/parsing/jsonRegistry.ts`                            | D Wave 1            |
| `taxonomyInterlockGuard.test.ts` の vocabulary parsing                    | `app-domain/integrity/parsing/tsRegistry.ts`                              | D Wave 2            |
| `principleConsistency.test.ts` （相当）                                   | `app-domain/integrity/parsing/jsonRegistry.ts`                            | D Wave 2            |
| `architectureRulesMergeSmokeGuard.test.ts` の merge 整合                  | `app-domain/integrity/detection/mergeIntegrity.ts`（仮）                  | D Wave 2            |
| `allowlistMetadataGuard.test.ts` の metadata 整合                         | `app-domain/integrity/detection/temporal.ts`                              | D Wave 3            |
| `checklistFormatGuard.test.ts` の format 検査                             | `app-domain/integrity/parsing/checklistFormat.ts`（仮）                   | D Wave 3            |
| `obligation-collector` の path-trigger 検査                               | `app-domain/integrity/detection/pathTrigger.ts`（仮）                     | D Wave 3            |
| `contentSpec*Guard.test.ts` × 6 (spec-state 系)                           | Phase B で先行 adapter 化（reference 実装）                               | B                   |

### 2.2. 旧 helper / parser

| 旧 helper                                                             | 新経路                                            | 備考                          |
| --------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------- |
| `app/src/test/guards/contentSpecHelpers.ts` の `parseSpecFrontmatter` | `app-domain/integrity/parsing/yamlFrontmatter.ts` | helper 自体は re-export 維持  |
| 各 guard 固有の JSON.parse + 自前型 narrow                            | `app-domain/integrity/parsing/jsonRegistry.ts`    | generic Registry<TEntry> 経由 |
| 散在する `findIdLine` / `findExportLine`                              | `app-domain/integrity/extraction/anchor.ts`       | TS Compiler API 経由に統一    |

### 2.3. 重複 drift detection logic

| 重複箇所                                                                    | 統合先                   |
| --------------------------------------------------------------------------- | ------------------------ |
| Existence check（spec ↔ source の双方向）の guard 別実装                    | `detection/existence.ts` |
| Ratchet-down baseline 検査の guard 別実装                                   | `detection/ratchet.ts`   |
| Temporal expiration check（@expiresAt / deadline / lastReviewedAt cadence） | `detection/temporal.ts`  |

## 3. 各撤退の sunsetCondition / expiresAt 候補

各 `@deprecated` JSDoc に必須記入する metadata の draft:

```ts
/**
 * @deprecated since 2026-MM-DD
 * @expiresAt 2026-MM-DD
 * @sunsetCondition canonicalization-domain-consolidation Phase E で本 file が
 *                  app-domain/integrity/* 経由に置換され、caller=0 が確認された
 * @reason 整合性 domain への統合により重複 drift 検出 logic を削減
 */
```

各 wave の物理削除目標は Phase D 完遂後 + 観察期間 1 週間以降。

## 4. 影響を受ける外部 consumer

各 retirement で破壊する API は `breaking-changes.md` 側に列挙。本 doc は **物理削除する file** を列挙する。

## 5. rollback 戦略

各 step で:

| step              | rollback 可否 | 戦略                                                         |
| ----------------- | ------------- | ------------------------------------------------------------ |
| 1. 並行運用開始   | ○ revert 容易 | 新 domain 経由 guard を削除すれば旧経路復元                  |
| 2. 観察期間       | ○ revert 容易 | 同上                                                         |
| 3. @deprecated 化 | ○ revert 容易 | JSDoc 削除のみ                                               |
| 4. 物理削除       | △ revert 困難 | git history から復元、ただし本来 step 1-3 で観察済みのはず   |
| 5. baseline 統合  | △ revert 困難 | 旧 baseline file を git history から復元、新 baseline を分離 |

step 4-5 に進む前に **必ず step 1-3 が観察期間完了**していることを PR で確認する。

## 6. 撤退完了の検証

各 wave の完了時:

- [ ] 旧 guard の caller = 0（grep + import 検査）
- [ ] 新 domain 経由 guard が同 violation 集合を出している（dual-emit 等価性）
- [ ] ratchet-down baseline が新 domain 側に統合済み
- [ ] `legacy-retirement.md` (本 doc) の撤退対象表に actual sunset 日付を記録
- [ ] `references/02-status/generated/architecture-health.json` に統合後 KPI 反映

## 7. 進行状況 (Phase 別、actual)

### Phase B (spec-state 系、completed 2026-04-28)

| 撤退対象                                                                                                           | 状態                                                              | actual sunset 日付    |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------- |
| `contentSpecHelpers.ts` の純関数群 (parseSpecFrontmatter / inferKindFromId / findIdLine / findExportLine + 5 type) | step 3 (`@deprecated` 化、3 metadata 完備、@expiresAt 2026-10-31) | 物理削除予定: Phase E |
| `contentSpecHelpers.ts` の I/O 関数 (loadAllSpecs / readSourceContent / list\*)                                    | 残置 (Phase E で domain 化検討)                                   | —                     |
| 11 contentSpec\*Guard の inline pure logic 重複                                                                    | step 5 完了 (domain delegation 経由で 1 経路に統合)               | 2026-04-28            |

**動作同一性検証**: 11 contentSpec\*Guard / 25 test 全件 PASS (B-6 commit 9c592e2)。

### Phase E (Legacy Retirement、completed 2026-04-28)

| 撤退対象                                                                                                                                                                                                        | 状態                                                                | actual sunset 日付 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------ |
| `contentSpecHelpers.ts` の純関数 re-export 層 (parseSpecFrontmatter / inferKindFromId / findIdLine / findExportLine / SpecFrontmatter / SpecKind / LifecycleStatus / EvidenceLevel / RiskLevel / BehaviorClaim) | step 4 完了 (re-export ブロック物理削除、`@deprecated` marker 解除) | 2026-04-28         |
| 11 contentSpec\*Guard の `./contentSpecHelpers` 経由 pure import (4 file)                                                                                                                                       | step 4 完了 (`@app-domain/integrity` 直接 import に切替)            | 2026-04-28         |

**動作同一性検証 (Phase E)**:

- 11 contentSpec\*Guard / 25 test 全件 PASS (re-export 層撤去後)
- 全 125 guard / 844 test PASS (test:guards)
- I/O 関数 (loadAllSpecs / readSourceContent / list\* / specPathFor / parseSpecFrontmatter wrapper) は本 file の **stable な役割**として確定 — Phase E 後は domain delegation の adapter として継続運用

**確定した contentSpecHelpers.ts の役割** (deprecated 解除):

- filesystem 定数 (REPO_ROOT / SPECS_BASE / SPECS_WIDGETS_DIR 等)
- listAll\* / specPathFor (filesystem 走査 + path 構築)
- parseSpecFrontmatter (file path → readFileSync → domain `parseSpecFrontmatter`)
- readSourceContent (spec → source file content、I/O)
- loadAllSpecs / loadAnchorSpecs (orchestration)

`@deprecated` marker は **解除した**。本 file は I/O wrapper としての stable な責務を持ち続け、`app-domain/integrity/` の純粋 primitive と適切に分離される構造として確定 (G8 mechanism)。

### Phase D Wave 3 (運用系、completed 2026-04-28)

| 撤退対象                                                                          | 状態                                                                            | actual sunset 日付 |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------ |
| `allowlistMetadataGuard.test.ts` の inline ratchet + expiresAt 走査               | step 5 完了 (`checkRatchet` × 4 + `checkExpired` 経由)                          | 2026-04-28         |
| `checklistFormatGuard.test.ts` の inline live project 列挙 + F1 + EXEMPT baseline | step 5 完了 (`filesystemRegistry` + `checkPathExistence` + `checkRatchet` 経由) | 2026-04-28         |
| `documentConsistency.test.ts` Invariant catalog ↔ guard map 双方向                | step 5 完了 (`scanMarkdownIds` + `checkInclusionByPredicate` 経由)              | 2026-04-28         |

**動作同一性検証 (Wave 3)**:

- allowlistMetadataGuard: 5 既存 test 全件 PASS
- checklistFormatGuard: 3 既存 test 全件 PASS
- documentConsistency.test.ts (Invariant 2 test): 34 既存 test 全件 PASS
- 全 125 guard / 844 test PASS (test:guards)

**Wave 3 で追加した primitive**:

- `parsing/markdownIdScan.ts` — `scanMarkdownIds` (heading id 抽出 with idPattern)
- `parsing/filesystemRegistry.ts` — `filesystemRegistry` (FileEntry[] → Registry wrap、I/O は caller)

**scope 外として残置した logic**:

- `checklistGovernanceSymmetryGuard.test.ts` — heading walking が markdown 専用で domain primitive 適用範囲が狭く、checklistFormatGuard と同形 pattern を judicial precedent として確立
- `obligation-collector` (#11) — 親 `architectureRuleGuard.test.ts` (Phase E 再評価対象) に統合される検証で本 Wave scope 外
- `checklistFormatGuard.test.ts` の F2-F5 (section-aware checkbox 走査) — markdown 専用 logic で domain primitive 適用範囲外、caller に inline 残置

### Phase D Wave 2 (高結合系、completed 2026-04-28)

| 撤退対象                                                             | 状態                                                                                                                          | actual sunset 日付 |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `architectureRulesMergeSmokeGuard.test.ts` の inline merge 整合      | step 5 完了 (`checkInclusion` + `checkUniqueness` + `checkNonEmpty` + `checkSizeEquality` + `checkInclusionByPredicate` 経由) | 2026-04-28         |
| `documentConsistency.test.ts` の principles 部分 (4 test)            | step 5 完了 (`jsonRegistry` + `checkInclusionByPredicate` + `checkInclusion` 経由)                                            | 2026-04-28         |
| `taxonomyInterlockGuard.test.ts` の INTERLOCK-1/3/4 (representative) | step 5 完了 (`checkInclusionByPredicate` + `checkUpperBound` + `checkBidirectionalReference` 経由)                            | 2026-04-28         |

**動作同一性検証 (Wave 2)**:

- architectureRulesMergeSmokeGuard: 9 既存 test 全件 PASS
- documentConsistency.test.ts (principles 4 test): 34 既存 test 全件 PASS
- taxonomyInterlockGuard: 9 既存 test 全件 PASS
- 全 125 guard / 844 test PASS (test:guards)

**Wave 2 で追加した primitive**:

- `detection/cardinality.ts` — `checkUniqueness` / `checkUpperBound` / `checkNonEmpty` / `checkSizeEquality`
- `detection/bidirectionalReference.ts` — `checkBidirectionalReference` (原則 6 Antibody Pair 等)

**scope 外として残置した logic**:

- `architectureRuleGuard.test.ts` (823 行) — registry / guardTagRegistry / SLICE_GUIDANCE 等の多面検証で domain primitive 適用範囲が狭く Phase E で再評価
- `responsibilityTagGuardV2.test.ts` / `testTaxonomyGuardV2.test.ts` — taxonomyInterlockGuard と同形 (cooling lifecycle / Antibody Pair) のため judicial precedent としては成立。Phase E で同 primitive 経由に変換可能だが本 Wave 完了条件は representative 1 file で満たす
- `documentConsistency.test.ts` の他 describe (MetricId / Role / Guard tag 等) — principles と独立した整合性検証で domain primitive 適用範囲外

### Phase D Wave 1 (低結合系、completed 2026-04-28)

| 撤退対象                                                          | 状態                                                                                   | actual sunset 日付 |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------ |
| `calculationCanonGuard.test.ts` 第 1 describe の inline iteration | step 5 完了 (`tsRegistry` + `checkBidirectionalExistence` + `checkRatchet` 経由)       | 2026-04-28         |
| `canonicalizationSystemGuard.test.ts` の inline ディレクトリ走査  | step 5 完了 (`checkPathExistence` + `checkInclusionByPredicate` 経由)                  | 2026-04-28         |
| `testContractGuard.test.ts` の inline JSON.parse + token 走査     | step 5 完了 (`jsonRegistry` + `checkPathExistence` + `checkInclusionByPredicate` 経由) | 2026-04-28         |
| `scopeJsonGuard.test.ts` の inline JSON.parse + path prefix 走査  | step 5 完了 (`jsonRegistry` + `checkPathExistence` + `checkDisjoint` 経由)             | 2026-04-28         |

**動作同一性検証 (Wave 1 4 件)**:

- calculationCanonGuard: 15 既存 test 全件 PASS (15/15)
- canonicalizationSystemGuard: 旧 5 → 新 6 test 全件 PASS (registry/orchestrator 確認を separate test に分離、動作は同一)
- testContractGuard: 7 既存 test 全件 PASS (7/7)
- scopeJsonGuard: 6 既存 test 全件 PASS (6/6)
- 全 125 guard / 844 test PASS (test:guards)

**Wave 1 で追加した primitive**:

- `parsing/tsRegistry.ts` (1 番手) — `Record<string, TEntry>` → `Registry<TEntry>` wrapper
- `detection/setRelation.ts` (Wave 1 完走で landing) — `checkDisjoint` / `checkInclusion` / `checkInclusionByPredicate`

**scope 外として残置した logic**:

- 第 2 describe (意味分類ガード Phase 2、calculationCanonGuard 11 test) — 業務 specific 検証 (semantic class consistency / wasmEngine truth-layer / contractId mapping) のため domain primitive で表現できず、Phase D-E では touch しない
- canonicalizationSystemGuard の Types/index/impl trio shape 検査 — readModels 専用パターンのため caller side に inline 残置 (一般化候補は Phase E で再評価)

### Phase C (doc-registry guard、completed 2026-04-28)

| 撤退対象                                             | 状態                                                                    | actual sunset 日付 |
| ---------------------------------------------------- | ----------------------------------------------------------------------- | ------------------ |
| `docRegistryGuard.test.ts` の inline JSON.parse      | step 5 完了 (`jsonRegistry` primitive 経由に置換)                       | 2026-04-28         |
| `docRegistryGuard.test.ts` の inline existence check | step 5 完了 (`checkPathExistence` + `checkBidirectionalExistence` 経由) | 2026-04-28         |
| `docRegistryGuard.test.ts` の inline category 走査   | step 5 完了 (`Registry<DocEntry>.entries` Map 経由)                     | 2026-04-28         |

**動作同一性検証**: 6 docRegistryGuard test / `node_modules` skip 後 全件 PASS。
inline ロジック行数は ~140 → ~110 行に縮小、既存の ratchet baseline (UNREGISTERED_BASELINE=0) は維持。
`fs.readFileSync` / `fs.existsSync` / `fs.readdirSync` 等の I/O 呼び出しは guard 側に残置 (domain 純粋性 不変条件 #1 遵守)。

**選択した撤退戦略**: 単一 guard を refactor (in-place migration)。並行運用 (5 step の step 1〜2) は不要と判定 — 同一 file 内で inline → primitive 経由に同時切替し、6 既存 test を変更せず PASS することで動作同一性を担保。撤退規律 5 step は別 file に新 guard を立てる場合の手順、本 case は同 file 内の logic 入れ替えのため step 5 (singular) に直接到達。

## 8. 改訂履歴

| 日付       | 変更                                                                                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-27 | 初版（draft）。Phase A inventory 完了時に具体的撤退対象 + 順序 + sunsetCondition を確定する predicate 形式で起草                                                                                                             |
| 2026-04-28 | Phase B (B-6/B-7) + Phase C 完遂を §7 に記録。spec-state 系 11 guard + doc-registry guard の domain 経由化を sunset 表として追記。in-place migration が単一 guard refactor で step 5 (singular) に直接到達する case を判例化 |
