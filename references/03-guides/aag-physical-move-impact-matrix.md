# AAG Physical Move Impact Matrix

> Phase 1-B 成果物。物理移動時にどの consumer がどの程度影響を受けるかを可視化する。

## 目的

`architectureRules.ts` が単一ファイルであることを前提にしている consumer を棚卸しし、
物理分割時の破壊リスクと緩和策を事前に整理する。

## Consumer 一覧

### 直接走査 consumer（ARCHITECTURE_RULES 配列を直接イテレート）

| consumer | readsFrom | usesWhichFields | assumesSingleFile | needsFacade | canFollowDerivedView | moveRisk | recommendedMitigation |
|---|---|---|---|---|---|---|---|
| `app/src/test/guards/architectureRuleGuard.test.ts` | ARCHITECTURE_RULES | id, guardTags, detection.*, what, why, correctPattern.description, migrationPath.steps, relationships.*, doc, sunsetCondition, ruleClass, slice, principleRefs, thresholds | **YES** — `.length`, `.map()`, `.filter()`, `.find()` | barrel re-export で十分 | YES | **medium-high** | barrel index.ts で reassembled array を維持 |
| `app/src/test/guardMetadataView.ts` | ARCHITECTURE_RULES | id, detection.severity, detection.baseline, doc, what, outdatedPattern.codeSignals[0], migrationPath.effort, sunsetCondition | **YES** — `.map()` | barrel re-export で十分 | YES | **medium-high** | barrel index.ts で reassembled array を維持 |

### 関数経由 consumer（getRuleById / formatViolationMessage / checkRatchetDown）

43 の guard test ファイルが `getRuleById('AR-XXX')` 経由でルールにアクセス。
ARCHITECTURE_RULES 配列を直接走査しない。facade 変更なしで追随可能。

| consumer パターン | readsFrom | usesWhichFields | assumesSingleFile | needsFacade | moveRisk | recommendedMitigation |
|---|---|---|---|---|---|---|
| 43 guard test files | getRuleById() | rule.id, rule.what, rule.correctPattern.description, rule.detection.baseline | **NO** | 不要 | **low** | getRuleById が内部で reassembled array を参照すれば変更不要 |

**対象ファイル**: analysisFrameGuard, architectureRuleGuard, calculationCanonGuard, canonicalInputGuard, canonicalizationSystemGuard, codePatternGuard, comparisonScopeGuard, customerFactPathGuard, customerGapPathGuard, dataIntegrityGuard, discountFactPathGuard, docCodeConsistencyGuard, docRegistryGuard, docStaticNumberGuard, dualRunExitCriteriaGuard, factorDecompositionPathGuard, fallbackMetadataGuard, freePeriodBudgetPathGuard, freePeriodDeptKPIPathGuard, freePeriodPathGuard, grossProfitConsistencyGuard, grossProfitPathGuard, layerBoundaryGuard, migrationTagGuard, noNewDebtGuard, oldPathImportGuard, pageMetaGuard, piValuePathGuard, pipelineSafetyGuard, presentationIsolationGuard, projectStructureGuard, purchaseCostImportGuard, purchaseCostPathGuard, purityGuard, queryPatternGuard, renderSideEffectGuard, responsibilitySeparationGuard, responsibilityTagGuard, salesFactPathGuard, sizeGuard, storeResultAnalysisInputGuard, structuralConventionGuard, temporalRollingGuard, temporalScopeGuard, topologyGuard, coChangeGuard

### 型のみ consumer

| consumer | readsFrom | usesWhichFields | assumesSingleFile | needsFacade | moveRisk | recommendedMitigation |
|---|---|---|---|---|---|---|
| `app/src/test/aagSchemas.ts` | type { RuleBinding } | なし（型のみ） | NO | 不要 | **low** | import パスだけ更新すれば追随可能 |

### tools/ ディレクトリ

| consumer | readsFrom | usesWhichFields | assumesSingleFile | needsFacade | moveRisk | recommendedMitigation |
|---|---|---|---|---|---|---|
| `tools/architecture-health/src/collectors/guard-collector.ts` | architectureRules.ts を直接 import しない。vitest の test 結果を解析 | — | **NO** | 不要 | **low** | ルール物理移動の影響を受けない |
| `tools/architecture-health/src/aag-response.ts` | 同上 | — | NO | 不要 | **low** | 同上 |
| `tools/architecture-health/src/main.ts` | 同上 | — | NO | 不要 | **low** | 同上 |

**重要な発見**: tools/ は ARCHITECTURE_RULES を直接 import しない。
guard test の出力（vitest 結果）を解析する間接依存のみ。
したがって、ルールの物理移動は tools/ に影響しない。

## フィールドアクセス頻度

| 頻度 | フィールド | アクセス元 |
|---|---|---|
| **超高頻度**（全 consumer） | `id` | getRuleById, guard test assertions |
| **高頻度**（10+ consumer） | `what`, `correctPattern.description` | formatViolationMessage, test failure messages |
| **中頻度**（3-9） | `detection.severity`, `detection.baseline`, `doc`, `migrationPath`, `slice`, `guardTags`, `detection.type` | architectureRuleGuard, guardMetadataView |
| **低頻度**（1-2） | `outdatedPattern.codeSignals`, `sunsetCondition`, `lifecyclePolicy`, `reviewPolicy`, `principleRefs`, `ruleClass`, `confidence` | guardMetadataView, architectureRuleGuard のみ |

## 重点的に検証した問い

### 1. architectureRules.ts が単一ファイルであることを暗黙前提にしていないか？

**結果**: 2 ファイルのみ（architectureRuleGuard.test.ts, guardMetadataView.ts）。
いずれも `ARCHITECTURE_RULES` 定数を直接イテレートする。
barrel re-export で reassembled array を提供すれば変更不要。

### 2. ARCHITECTURE_RULES の直参照が多すぎないか？

**結果**: 直参照は 2 ファイル。残り 43 は全て `getRuleById()` 経由。
関数ベースのアクセスパターンが支配的で、分割耐性が高い。

### 3. Derived view を経由すれば追随できるか？

**結果**: YES。guardMetadataView.ts 自体が derived view であり、
それを消費する tools/ は vitest 出力経由。2 段階の間接性がある。

### 4. Facade を 1 枚挟めば十分か？

**結果**: YES。以下の barrel re-export で全 consumer が追随可能:
```
architectureRules/index.ts → ARCHITECTURE_RULES（reassembled）+ getRuleById + 型 re-export
```

### 5. 物理移動より先に collector 側を抽象化すべきか？

**結果**: NO。tools/ は ARCHITECTURE_RULES を直接参照しない。
collector の抽象化は不要。

## Move Readiness 判定

### Ready（今移してよい）

- **全 140 ルールのデータ移動**: barrel re-export で吸収可能。high risk 0 件
- **aagSchemas.ts の RuleBinding re-export**: import パス更新のみ
- **tools/ への影響**: なし（間接依存のみ）

### Review Needed（確認後に移動）

- **architectureRuleGuard.test.ts**: ARCHITECTURE_RULES を直接走査。barrel re-export が正しく動くか検証が必要
- **guardMetadataView.ts**: `outdatedPattern.codeSignals[0]` へのアクセスが intersection 型経由で維持されるか検証が必要

### Not Ready（まだ移さない）

- **guard 実装ロジックの分割**: 各 guard test の検出ロジック自体は architectureRules.ts に依存せず、
  ソースコードを直接走査する。移動不要
- **health collector の振る舞い変更**: 不要（間接依存のみ）

## 推奨する物理移動戦略

impact matrix の結果から、**Exit A（小規模 physical move + barrel facade）** を推奨:

```
Step 1: architectureRules/ ディレクトリ作成
Step 2: 以下に分割:
  - architectureRules/rules.ts      ← ARCHITECTURE_RULES 配列
  - architectureRules/helpers.ts    ← getRuleById, formatViolationMessage, checkRatchetDown
  - architectureRules/types.ts      ← ArchitectureRule, RuleBinding, PrincipleId
  - architectureRules/index.ts      ← barrel re-export（全 consumer が参照する入口）
Step 3: 旧 architectureRules.ts → architectureRules/index.ts からの re-export に変更
Step 4: 全 45 consumer の import パスは変更不要
```

**consumer 変更件数: 0**（barrel re-export が同一パスを維持）

## 次フェーズへの出口

**Exit A を採用**: barrel facade で全 consumer を吸収し、小規模 physical move から着手。
collector 側の抽象化は不要（tools/ は間接依存のみ）。
