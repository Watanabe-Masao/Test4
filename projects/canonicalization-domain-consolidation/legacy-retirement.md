# legacy-retirement — canonicalization-domain-consolidation

> 役割: 本 project が `requiresLegacyRetirement=true` の対象として撤退する旧 guard / 旧 parser / 旧 helper / 重複 logic を列挙し、撤退順序 / sunset 条件 / rollback を記録する（draft 段階）。

## 1. 撤退規律（plan.md §5 と整合）

各 retirement は **5 step** を経由:

| step | 状態 | 検証 |
|---|---|---|
| 1. 並行運用開始 | 旧 active / 新 active | 両 guard が同 PR で同 violation 集合を出す |
| 2. 観察期間 (≥ 1 週間 / 5 PR) | 旧 active / 新 active | drift 数の dual-emit 等価性を継続 |
| 3. @deprecated 化 | 旧 `@deprecated` JSDoc / 新 active | `deprecatedMetadataGuard` が 4 metadata を認識 |
| 4. 物理削除 | 削除 / 新 singular | caller=0、import grep で 0 件 |
| 5. baseline 統合 | (削除済) / 新が baseline 統合 | `architecture-health` に統合後 KPI 反映 |

各 PR で **1 step だけ進める**。

## 2. 撤退対象一覧（draft、Phase A の inventory で具体化）

### 2.1. 旧 guard（domain 経由に置換予定）

| 旧 guard | 新経路（domain primitive） | 撤退順序 wave |
|---|---|---|
| `docRegistryGuard.test.ts` の自前 parsing / existence check | `app-domain/integrity/parsing/jsonRegistry.ts` + `detection/existence.ts` | C (first migration) |
| `calculationCanonGuard.test.ts` の registry 検証 logic | `app-domain/integrity/parsing/tsRegistry.ts` | D Wave 1 |
| `canonicalizationSystemGuard.test.ts` の readModel ディレクトリ検査 | `app-domain/integrity/detection/structuralExistence.ts`（仮） | D Wave 1 |
| `testContractGuard.test.ts` の test contract 整合 | `app-domain/integrity/parsing/jsonRegistry.ts` | D Wave 1 |
| `scopeJsonGuard.test.ts` / `scopeBoundaryInvariant.test.ts` の scope 整合 | `app-domain/integrity/parsing/jsonRegistry.ts` | D Wave 1 |
| `taxonomyInterlockGuard.test.ts` の vocabulary parsing | `app-domain/integrity/parsing/tsRegistry.ts` | D Wave 2 |
| `principleConsistency.test.ts` （相当） | `app-domain/integrity/parsing/jsonRegistry.ts` | D Wave 2 |
| `architectureRulesMergeSmokeGuard.test.ts` の merge 整合 | `app-domain/integrity/detection/mergeIntegrity.ts`（仮） | D Wave 2 |
| `allowlistMetadataGuard.test.ts` の metadata 整合 | `app-domain/integrity/detection/temporal.ts` | D Wave 3 |
| `checklistFormatGuard.test.ts` の format 検査 | `app-domain/integrity/parsing/checklistFormat.ts`（仮） | D Wave 3 |
| `obligation-collector` の path-trigger 検査 | `app-domain/integrity/detection/pathTrigger.ts`（仮） | D Wave 3 |
| `contentSpec*Guard.test.ts` × 6 (spec-state 系) | Phase B で先行 adapter 化（reference 実装）| B |

### 2.2. 旧 helper / parser

| 旧 helper | 新経路 | 備考 |
|---|---|---|
| `app/src/test/guards/contentSpecHelpers.ts` の `parseSpecFrontmatter` | `app-domain/integrity/parsing/yamlFrontmatter.ts` | helper 自体は re-export 維持 |
| 各 guard 固有の JSON.parse + 自前型 narrow | `app-domain/integrity/parsing/jsonRegistry.ts` | generic Registry<TEntry> 経由 |
| 散在する `findIdLine` / `findExportLine` | `app-domain/integrity/extraction/anchor.ts` | TS Compiler API 経由に統一 |

### 2.3. 重複 drift detection logic

| 重複箇所 | 統合先 |
|---|---|
| Existence check（spec ↔ source の双方向）の guard 別実装 | `detection/existence.ts` |
| Ratchet-down baseline 検査の guard 別実装 | `detection/ratchet.ts` |
| Temporal expiration check（@expiresAt / deadline / lastReviewedAt cadence） | `detection/temporal.ts` |

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

| step | rollback 可否 | 戦略 |
|---|---|---|
| 1. 並行運用開始 | ○ revert 容易 | 新 domain 経由 guard を削除すれば旧経路復元 |
| 2. 観察期間 | ○ revert 容易 | 同上 |
| 3. @deprecated 化 | ○ revert 容易 | JSDoc 削除のみ |
| 4. 物理削除 | △ revert 困難 | git history から復元、ただし本来 step 1-3 で観察済みのはず |
| 5. baseline 統合 | △ revert 困難 | 旧 baseline file を git history から復元、新 baseline を分離 |

step 4-5 に進む前に **必ず step 1-3 が観察期間完了**していることを PR で確認する。

## 6. 撤退完了の検証

各 wave の完了時:

- [ ] 旧 guard の caller = 0（grep + import 検査）
- [ ] 新 domain 経由 guard が同 violation 集合を出している（dual-emit 等価性）
- [ ] ratchet-down baseline が新 domain 側に統合済み
- [ ] `legacy-retirement.md` (本 doc) の撤退対象表に actual sunset 日付を記録
- [ ] `references/02-status/generated/architecture-health.json` に統合後 KPI 反映

## 7. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-27 | 初版（draft）。Phase A inventory 完了時に具体的撤退対象 + 順序 + sunsetCondition を確定する predicate 形式で起草 |
