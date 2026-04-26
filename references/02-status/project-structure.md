# プロジェクト構成

> この文書がプロジェクト構成の正本。CLAUDE.md はここを参照する。

## app/src/ ディレクトリ構成

```
app/src/
├── domain/           # ドメイン層（フレームワーク非依存、純粋関数）
├── application/      # アプリケーション層（hooks, stores, usecases, queries, workers, services/temporal）
├── infrastructure/   # インフラ層（DuckDB, storage, export, i18n, pwa）
├── presentation/     # プレゼンテーション層（components, pages, theme）
├── features/         # 縦スライス
├── stories/          # Storybook
└── test/             # ガードテスト・共有インフラ
```

### features/ モジュール一覧

<!-- GENERATED:START features-list -->
- budget
- category
- clip-export
- comparison
- cost-detail
- forecast
- purchase
- reports
- sales
- shared
- storage-admin
- time-slot
- weather

> 13 モジュール — 生成: 2026-04-26T16:32:36.506Z
<!-- GENERATED:END features-list -->

### test/ 構成

```
test/
├── guardTestHelpers.ts         # 共有ヘルパー
├── guardTagRegistry.ts         # ガードタグのメタデータ管理
├── architectureRules.ts        # Architecture Rule 定義
├── calculationCanonRegistry.ts # domain/calculations/ 全ファイル分類
├── allowlists/                 # 許可リスト（カテゴリ別分割）
│   ├── architecture.ts         #   層境界ルール
│   ├── complexity.ts           #   行数・useMemo 制限
│   ├── docs.ts                 #   ドキュメント品質
│   ├── duckdb.ts               #   DuckDB hook
│   ├── size.ts                 #   ファイルサイズ
│   ├── performance.ts          #   パフォーマンス制限
│   ├── migration.ts            #   比較移行
│   ├── responsibility.ts       #   責務分離
│   └── misc.ts                 #   その他
├── guards/                     # 構造制約ガード
│   └── (ガードファイル一覧は generated section 参照)
├── audits/                     # アーキテクチャ監査
├── temporal/                   # temporal path テスト
└── observation/                # WASM 不変条件テスト
```

### guards/ ファイル一覧

<!-- GENERATED:START guard-files-list -->
- `aagDerivedOnlyImportGuard.test.ts`
- `allowlistMetadataGuard.test.ts`
- `analysisFrameGuard.test.ts`
- `architectureRuleGuard.test.ts`
- `architectureRulesMergeSmokeGuard.test.ts`
- `barrelReexportMetadataGuard.test.ts`
- `calculationCanonGuard.test.ts`
- `canonicalInputGuard.test.ts`
- `canonicalizationSystemGuard.test.ts`
- `categoryDailyLaneSurfaceGuard.test.ts`
- `categoryLeafDailyLaneSurfaceGuard.test.ts`
- `categoryLeafDailyNestedFieldGuard.test.ts`
- `chartInputBuilderGuard.test.ts`
- `chartRenderingStructureGuard.test.ts`
- `checklistFormatGuard.test.ts`
- `checklistGovernanceSymmetryGuard.test.ts`
- `coChangeGuard.test.ts`
- `codePatternGuard.test.ts`
- `comparisonProjectionContextFieldGuard.test.ts`
- `comparisonProjectionContextImportGuard.test.ts`
- `comparisonResolvedRangeSurfaceGuard.test.ts`
- `comparisonScopeGuard.test.ts`
- `constitutionBootstrapGuard.test.ts`
- `coreRequiredFieldNullCheckGuard.test.ts`
- `customerFactPathGuard.test.ts`
- `customerGapPathGuard.test.ts`
- `dataIntegrityGuard.test.ts`
- `defaultOverlayCompletenessGuard.test.ts`
- `deprecatedMetadataGuard.test.ts`
- `discountFactPathGuard.test.ts`
- `docCodeConsistencyGuard.test.ts`
- `docRegistryGuard.test.ts`
- `docStaticNumberGuard.test.ts`
- `dualRunExitCriteriaGuard.test.ts`
- `duplicateFileHashGuard.test.ts`
- `executionOverlayGuard.test.ts`
- `factorDecompositionPathGuard.test.ts`
- `fallbackMetadataGuard.test.ts`
- `freePeriodBudgetPathGuard.test.ts`
- `freePeriodDeptKPIPathGuard.test.ts`
- `freePeriodHandlerOnlyGuard.test.ts`
- `freePeriodPathGuard.test.ts`
- `fullCtxPassthroughGuard.test.ts`
- `grossProfitConsistencyGuard.test.ts`
- `grossProfitPathGuard.test.ts`
- `guardTestMapConsistencyGuard.test.ts`
- `hookCanonicalPathGuard.test.ts`
- `layerBoundaryGuard.test.ts`
- `manifestGuard.test.ts`
- `migrationTagGuard.test.ts`
- `monthlyPrevYearSalesGuard.test.ts`
- `noDayOnlyKeyGuard.test.ts`
- `noNewDebtGuard.test.ts`
- `noParseIntStoreIdGuard.test.ts`
- `noRateInFreePeriodSqlGuard.test.ts`
- `noSafeNumberAtImportBoundaryGuard.test.ts`
- `oldPathImportGuard.test.ts`
- `orphanUiComponentGuard.test.ts`
- `pageMetaGuard.test.ts`
- `piValuePathGuard.test.ts`
- `pipelineSafetyGuard.test.ts`
- `presentationComparisonMathGuard.test.ts`
- `presentationIsolationGuard.test.ts`
- `presentationPeriodStoreAccessGuard.test.ts`
- `projectCompletionConsistencyGuard.test.ts`
- `projectDocConsistencyGuard.test.ts`
- `projectDocStructureGuard.test.ts`
- `projectStructureGuard.test.ts`
- `projectizationPolicyGuard.test.ts`
- `purchaseCostImportGuard.test.ts`
- `purchaseCostPathGuard.test.ts`
- `purityGuard.test.ts`
- `queryPatternGuard.test.ts`
- `readModelSafetyGuard.test.ts`
- `registryInlineLogicGuard.test.ts`
- `renderSideEffectGuard.test.ts`
- `responsibilitySeparationGuard.test.ts`
- `responsibilityTagGuard.test.ts`
- `reviewPolicyRequiredGuard.test.ts`
- `salesFactPathGuard.test.ts`
- `sameInterfaceNameGuard.test.ts`
- `scopeAwareMutationGuard.test.ts`
- `scopeJsonGuard.test.ts`
- `shortcutPatternGuard.test.ts`
- `sizeGuard.test.ts`
- `storeDailyLaneSurfaceGuard.test.ts`
- `storeResultAnalysisInputGuard.test.ts`
- `structuralConventionGuard.test.ts`
- `subprojectParentGuard.test.ts`
- `temporalRollingGuard.test.ts`
- `temporalScopeGuard.test.ts`
- `testContractGuard.test.ts`
- `testSignalIntegrityGuard.test.ts`
- `timeSlotLaneSurfaceGuard.test.ts`
- `topologyGuard.test.ts`
- `unifiedWidgetContextNoDashboardSpecificGuard.test.ts`
- `unifiedWidgetContextNoPageLocalOptionalGuard.test.ts`
- `useComparisonModuleLegacyCallerGuard.test.ts`
- `userPromptSubmitHookGuard.test.ts`
- `versionSyncGuard.test.ts`
- `wasmCrateStructureGuard.test.ts`
- `weatherCorrelationProjectionGuard.test.ts`

> 102 ファイル — 生成: 2026-04-26T16:32:36.506Z
<!-- GENERATED:END guard-files-list -->

## レイヤー間の依存ルール

`Presentation → Application → Domain ← Infrastructure`

- **domain/** はどの層にも依存しない（純粋なビジネスロジック + 取得対象の契約定義）
- **application/** は domain/ のみに依存（データ取得の調停・フォールバック戦略はここに閉じる）
- **infrastructure/** は domain/ のみに依存（外部API・DuckDB・ストレージの実装）
- **presentation/** は application/ と domain/ に依存（描画のみ。外部APIを直接呼ばない）
- infrastructure/ と presentation/ は直接依存しない
