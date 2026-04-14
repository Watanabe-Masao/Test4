# ガードテスト対応表

本ファイルはガードテスト → 管理ロール → 保護対象ファイルの対応を示す。

## テストファイル一覧

| テストファイル | 管理ロール | ルール数 | 保護対象 |
|---|---|---|---|
| `app/src/test/guards/layerBoundaryGuard.test.ts` | architecture | 11件 | 4層依存、許可リスト上限・実在確認 |
| `app/src/test/guards/presentationIsolationGuard.test.ts` | architecture | 13件 | Presentation制約、CQRS境界、DuckDB Migration、Q3 enforcement |
| `app/src/test/guards/structuralConventionGuard.test.ts` | architecture | 7件 | 縦スライス、プロトタイプ、バレル移行、ctx重複 |
| `app/src/domain/calculations/__tests__/calculationRules.test.ts` | invariant-guardian | 7件 | safeDivide, calculateTransactionValue, overflowDay, fmtSen, formatPercent, toPct |
| `app/src/presentation/components/charts/__tests__/divisorRules.test.ts` | invariant-guardian | 8件 | computeDivisor, filterByStore, countDistinctDays, 正規ロケーション, 網羅性 |
| `app/src/domain/calculations/__tests__/factorDecomposition.test.ts` | invariant-guardian | 30件 | シャープリー恒等式（2/3/5要素）、2↔3↔5 一貫性 |
| `app/src/features/comparison/application/__tests__/buildComparisonAggregation.test.ts` | invariant-guardian | 34件 | aggregateKpiByAlignment 集約不変条件（売上・客数合計一致、マッピング範囲、ソート順） |
| `app/src/application/usecases/explanation/__tests__/prevYearBudgetExplanation.test.ts` | invariant-guardian | 9件 | 前年予算 Explanation 不変条件（breakdown 合計一致、evidenceRefs 網羅性、無効入力） |
| `app/src/domain/calculations/__tests__/conditionResolver.test.ts` | invariant-guardian | — | conditionResolver 条件判定ロジック |
| `app/src/domain/calculations/__tests__/dowGapAnalysis.test.ts` | invariant-guardian | — | 曜日ギャップ分析の不変条件 |
| `app/src/domain/calculations/__tests__/formulaRegistry.test.ts` | invariant-guardian | — | 計算式レジストリの整合性 |
| `app/src/test/documentConsistency.test.ts` | documentation-steward | 12件 | 不変条件カタログ↔ガードテスト相互参照、エンジン責務↔実コード、CLAUDE.md 参照パス |
| `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | documentation-steward | 7件 | C1-C4: project lifecycle (completion→archive, CURRENT_PROJECT.md 妥当性, dead-link) / L1-L3: cross-reference (stale archived path, broken subpath, wrong archive prefix) |
| `app/src/test/guards/checklistGovernanceSymmetryGuard.test.ts` | documentation-steward | 2件 | S1/S2/S3: 全 live project の checklist.md に governance §3 禁止見出し（やってはいけないこと/常時チェック/最重要項目）が存在しないことを検証。規約と collector 実装の対称性を保つ最終防波堤 |
| `app/src/test/guards/projectDocStructureGuard.test.ts` | documentation-steward | 4件 | D1: 必須 4-doc + config 構造 / D2-D3: AI_CONTEXT.md / HANDOFF.md の役割 banner / D4: AI_CONTEXT.md volatile セクション禁止 (Current Status / Next Actions 等は HANDOFF 責務) |
| `app/src/test/guards/guardTestMapConsistencyGuard.test.ts` | documentation-steward | 1件 | 本ファイル自身の drift 検出（全 guard ファイルが guard-test-map.md に登録されているかを ratchet-down で監視） |
| `app/src/test/guards/defaultOverlayCompletenessGuard.test.ts` | governance-ops | 5件 | DEFAULT_EXECUTION_OVERLAY が BaseRule 全 rule をカバーすることを検証（aag-format-redesign: project overlay 空でも rule 漏れが発生しない状態の保証 / orphan / effort / priority / fixNow の整合性） |
| `app/src/test/guards/subprojectParentGuard.test.ts` | documentation-steward | 4件 | config/project.json の parent field の構造検証（aag-format-redesign P1: 親実在 / 自己参照禁止 / 循環禁止 / 階層 2 段制限） |
| `app/src/test/guards/codePatternGuard.test.ts` | architecture | 8件 | R1-R3,R7,R10: 純粋モジュール、@internal禁止、store算術禁止、副作用チェーン |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts` | governance-ops | 1件 | TSIG-TEST-01: existence-only assertion 禁止 (品質シグナル保全 / False Green 防止 / `references/01-principles/test-signal-integrity.md` に対応) |
| `app/src/test/guards/sizeGuard.test.ts` | architecture | 9件 | R5,R11,R12: サイズ上限、facade分岐制限、層別行数制限 |
| `app/src/test/guards/purityGuard.test.ts` | architecture | 10件 | Domain純粋性、Presentation描画専用、Engine境界、率再計算禁止、facade責務混在、許可リスト増加防止 |
| `app/src/test/comparisonMigrationGuard.test.ts` | architecture | 9件 | 旧 day/offset 比較パターン禁止、ComparisonFrame 新規使用禁止、dailyMapping 独自変換禁止 |
| `app/src/domain/models/__tests__/ComparisonScopeInvariant.test.ts` | invariant-guardian | 3件 | ComparisonScope 意味論（候補窓、位置ベース、1:1対応） |
| `app/src/features/comparison/application/__tests__/sameDowPoint.test.ts` | invariant-guardian | 7件 | SameDowPoint sourceDate 保持、月跨ぎ・年跨ぎ、合計整合性 |
| `app/src/test/guards/purchaseCostPathGuard.test.ts` | architecture | 5件 | 仕入原価取得経路3層防御（import禁止・集計逸脱禁止・正本一貫性） |
| `app/src/application/hooks/duckdb/usePurchaseComparisonQuery.test.ts` | invariant-guardian | 18件 | ピボット一貫性不変条件、KPI-ピボット値一致、buildDailyPivot 動作検証 |
| `app/src/application/readModels/purchaseCost/readPurchaseCost.test.ts` | invariant-guardian | 21件 | 仕入原価プロセス正当性（正本値・計算式・使用方法・変換ヘルパー・店舗別導出） |
| `app/src/test/guards/purchaseCostImportGuard.test.ts` | architecture | 15件 | インポートプロセス正当性（ファイル判別・パース・DuckDB格納・正本化パス） |
| `app/src/infrastructure/storage/__tests__/backupExporter.test.ts` | architecture | 27件 | バックアップ往復・Map復元・SHA-256・AppSettings・ImportHistory・Zod safeParse 境界 |
| `app/src/test/guards/grossProfitPathGuard.test.ts` | architecture | 5件 | 粗利計算正本（calculateGrossProfit 存在・Zod契約・conditionSummaryUtils正本経由・インライン計算制限・定義書） |
| `app/src/test/guards/salesFactPathGuard.test.ts` | architecture | 5件 | 売上ファクト正本（readSalesFact 存在・Zod契約・旧クエリimport禁止・orchestrator統合・定義書） |
| `app/src/test/guards/discountFactPathGuard.test.ts` | architecture | 5件 | 値引きファクト正本（readDiscountFact 存在・Zod契約・旧クエリimport禁止・orchestrator統合・定義書） |
| `app/src/test/guards/factorDecompositionPathGuard.test.ts` | architecture | 5件 | 要因分解正本（calculateFactorDecomposition 存在・Zod契約・直接import許可リスト制限・presentation層制限・定義書） |
| `app/src/test/guards/canonicalizationSystemGuard.test.ts` | architecture | 6件 | 正本化体系統合（全readModelディレクトリ・ファイル構成・全定義書・レジストリ・orchestrator・CLAUDE.md参照） |
| `app/src/application/readModels/grossProfit/calculateGrossProfit.test.ts` | invariant-guardian | 15件 | 粗利4種計算（在庫法×2・推定法×2・Zod契約・フォールバック・StoreResult互換） |
| `app/src/application/readModels/salesFact/readSalesFact.test.ts` | invariant-guardian | 8件 | 売上ファクト正本（Zod parse・grand合計不変条件・導出ヘルパー4種） |
| `app/src/application/readModels/discountFact/readDiscountFact.test.ts` | invariant-guardian | 7件 | 値引きファクト正本（Zod parse・grand合計・71-74内訳・導出ヘルパー3種） |
| `app/src/application/readModels/factorDecomposition/calculateFactorDecomposition.test.ts` | invariant-guardian | 6件 | 要因分解正本（Shapley不変条件2/3/5要素・Zod parse・meta） |

## ルール → テスト対応

### layerBoundaryGuard / presentationIsolationGuard / structuralConventionGuard（旧 architectureGuard を分割）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| — | domain → 外部層依存なし | INV-ARCH-01 |
| — | application → infrastructure 許可リストのみ | INV-ARCH-02 |
| — | presentation → infrastructure 許可リストのみ | INV-ARCH-03 |
| — | application → presentation 依存なし | INV-ARCH-04 |
| — | infrastructure → presentation 依存なし | INV-ARCH-05 |
| — | 許可リストファイル実在確認 | INV-ARCH-06 |
| — | presentation → domain/calculations 直接 import 禁止 | INV-ARCH-07 |
| — | getDailyTotalCost 直接使用禁止 | INV-ARCH-08 |
| — | 比較コンテキスト内部モジュール直接 import 禁止 | INV-ARCH-09 |
| — | storage → duckdb/queries 依存禁止（書き戻し禁止） | INV-ARCH-10 |
| — | presentation → duckdb 直接 import 禁止（DevTools除く） | INV-ARCH-11 |
| — | CQRS: Query → Command 依存禁止 | INV-CMP-03 |
| — | CQRS: Command → Query 依存禁止 | INV-CMP-04 |
| — | features/ 間の直接 import 禁止（shared/ 経由） | INV-ARCH-12 |
| — | APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST ≤16件 | INV-ALLOW-01 |
| — | PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST ≤1件 | INV-ALLOW-02 |
| — | INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST ≤1件 | INV-ALLOW-03 |
| — | Migration Countdown: DuckDB フック新規使用禁止 | — |
| — | Migration Countdown: 許可リストサイズ ≤3（現在 1。最終目標 0） | — |
| — | executor.execute() 直呼び出し禁止（Q3） | — |
| — | useAsyncQuery 直接 import 禁止（Q3） | — |

### 正本化ガード群（architecture ロール管理）

purchaseCostPathGuard / grossProfitPathGuard / salesFactPathGuard /
discountFactPathGuard / factorDecompositionPathGuard / canonicalizationSystemGuard

| 検証内容 | テストファイル | 不変条件 ID |
|---|---|---|
| 仕入原価: 旧クエリ import 禁止 | purchaseCostPathGuard | INV-CANON-01 |
| 仕入原価: 集計逸脱禁止 | purchaseCostPathGuard | INV-CANON-02 |
| 仕入原価: 正本一貫性 | purchaseCostPathGuard | INV-CANON-03 |
| 粗利: calculateGrossProfit 存在・Zod 契約 | grossProfitPathGuard | INV-CANON-04 |
| 粗利: conditionSummaryUtils 正本経由 | grossProfitPathGuard | INV-CANON-05 |
| 粗利: インライン計算パターン制限 | grossProfitPathGuard | INV-CANON-06 |
| 売上: readSalesFact 存在・Zod 契約 | salesFactPathGuard | INV-CANON-07 |
| 売上: presentation 層旧クエリ import 禁止 | salesFactPathGuard | INV-CANON-08 |
| 値引き: readDiscountFact 存在・Zod 契約 | discountFactPathGuard | INV-CANON-09 |
| 値引き: presentation 層旧クエリ import 禁止 | discountFactPathGuard | INV-CANON-10 |
| 要因分解: calculateFactorDecomposition 存在・Zod 契約 | factorDecompositionPathGuard | INV-CANON-11 |
| 要因分解: domain 直接 import 許可リスト制限 | factorDecompositionPathGuard | INV-CANON-12 |
| 体系: 全 readModel ディレクトリ + ファイル構成 | canonicalizationSystemGuard | INV-CANON-13 |
| 体系: 全定義書存在 | canonicalizationSystemGuard | INV-CANON-14 |
| 体系: CLAUDE.md 参照 | canonicalizationSystemGuard | INV-CANON-15 |
| orchestrator: salesFact/discountFact 統合 | salesFact/discountFactPathGuard | INV-CANON-16 |

### calculationRules.test.ts（invariant-guardian ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| RULE-D1 | domain 内インライン除算禁止 | INV-DIV-01 |
| RULE-D2 | インライン客単価計算禁止 | INV-DIV-02 |
| RULE-I1 | overflow day ロジック共通化 | INV-DIV-03 |
| RULE-P2 | fmtSen 重複定義禁止 | INV-FMT-01 |
| RULE-P3 | Dashboard パーセント書式統一 | INV-FMT-02 |
| RULE-C1 | Chart パーセント書式統一 | INV-FMT-03 |

### divisorRules.test.ts（invariant-guardian ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| RULE-1 | computeDivisor 経由強制 | INV-PF-01 |
| RULE-2 | レガシー API 使用禁止 | INV-PF-02 |
| RULE-3 | カレンダーベース除数禁止 | INV-PF-03 |
| RULE-4 | 二重ゼロ除算ガード禁止 | INV-PF-04 |
| RULE-5 | filterByStore 経由強制 | INV-PF-05 |
| RULE-6 | countDistinctDays 経由強制 | INV-PF-06 |
| — | 正規ロケーション実装健全性 | INV-PF-07 |
| — | usePeriodFilter 使用ファイル網羅性 | INV-PF-08 |

### factorDecomposition.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| decompose2 シャープリー恒等式 | INV-SH-01 |
| decompose3 シャープリー恒等式 | INV-SH-02 |
| decompose5 シャープリー恒等式 | INV-SH-03 |
| 2↔3↔5 要素間一貫性 | INV-SH-04 |
| データソース乖離時の合計一致 | INV-SH-03（特殊ケース） |
| 全パラメータ大変動時の合計一致 | INV-SH-03（ストレステスト） |

### buildComparisonAggregation.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| Σ(storeContributions.sales) = entry.sales | INV-AGG-01 |
| Σ(storeContributions.customers) = entry.customers | INV-AGG-02 |
| Σ(dailyMapping.prevSales) = entry.sales | INV-AGG-03 |
| Σ(dailyMapping.prevCustomers) = entry.customers | INV-AGG-04 |
| transactionValue = Math.round(sales / customers) | INV-AGG-05 |
| マッピング範囲 1〜daysInMonth | INV-AGG-06 |
| offset=0 → originalDay = mappedDay | INV-AGG-07 |

### prevYearBudgetExplanation.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| breakdown 日別売上合計 = entry.sales | INV-EXPL-01 |
| evidenceRefs に全 storeContribution が含まれる | INV-EXPL-02 |
| evidenceRefs に budget 参照が含まれる | INV-EXPL-03 |
| explanation.value = safeDivide(sales, budget) | INV-EXPL-04 |
| 無効入力 → 空 Map | INV-EXPL-05 |

### codePatternGuard / sizeGuard（旧 hookComplexityGuard を分割）

per-file tracking を廃止し、層別汎用上限 + 除外リスト方式に移行済み。
純粋モジュールチェックはファイル名パターン自動検出（`*Logic.ts`, `*.vm.ts`, `*Reducer.ts`, `*Builders.ts`）。
Presentation Tier 登録制は廃止し、全 .tsx に 600行上限を適用。

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| R3 | hooks/ に @internal export がない | INV-HOOK-01 |
| R3 | テストに typeof === 'function' アサーションがない | INV-HOOK-02 |
| R7 | stores/ の set() コールバック内に算術式がない | INV-STORE-01 |
| R10 | hooks/ の export にカバレッジ目的のコメントがない | INV-HOOK-03 |
| R1 | 純粋モジュール（パターン自動検出）に React import がない | — |
| R1 | domain/ と infrastructure/ の全ファイルは React-free（i18n除外） | — |
| R1 | 分離先がある hook に build*/compute* 関数がない | — |
| R11 | hooks/ useMemo ≤7、useState ≤6、行数 ≤300（allowlist あり） | — |
| R12 | Presentation .tsx ≤600行（Tier 2 除外リストあり） | — |
| — | Infrastructure .ts ≤400行（汎用上限 + 除外リスト） | — |
| — | Domain .ts ≤300行（汎用上限 + 除外リスト） | — |
| — | Application usecases .ts ≤400行（汎用上限 + 除外リスト） | — |
| R5 | facade ファイルの if/switch ≤5 | — |
| R2 | useEffect 内の fetch→store→cache 密結合禁止 | — |

### purityGuard（旧 domainPurityGuard を移動）

CLAUDE.md の設計原則・禁止事項のうち、import ベースでカバーされない
コード内容ベースの構造制約を機械化。

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| — | domain/ で副作用 API 使用禁止（fetch, localStorage, window 等） | INV-PURE-01 |
| — | domain/calculations/ で async/await 禁止 | INV-PURE-02 |
| — | presentation/ .tsx で SQL 文字列埋め込み禁止 | INV-PURE-03 |
| — | infrastructure/duckdb/queries/ → domain/calculations/ 依存禁止 | INV-ENGINE-01 |
| — | *.vm.ts / *Logic.ts に Zustand/immer import 禁止 | INV-ENGINE-02 |
| — | application/usecases/ に React hook import 禁止 | INV-ENGINE-03 |
| 禁止#10 | presentation/ で率の直接計算禁止 | INV-RATE-01 |
| — | facade ファイルで map/filter/reduce ≤5 | — |
| — | domain/ 300行超ファイル数 ≤7 | — |
| — | infrastructure/ 400行超ファイル数 ≤5 | — |

### comparisonMigrationGuard.test.ts（architecture ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| — | presentation/application で prevYear.daily.get(day) 禁止 | INV-CMP-01 |
| — | day 番号 + offset による前年比較禁止 | INV-CMP-02 |
| — | ComparisonFrame.previous の新規使用禁止 | INV-CMP-03 |
| — | aggregateWithOffset の新規使用禁止 | INV-CMP-04 |
| — | dailyMapping を直接ループして独自 Map を構築する禁止（sourceDate 劣化防止） | INV-CMP-08 |

### sameDowPoint.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| buildSameDowPoints が sourceDate（prevYear/prevMonth/prevDay）を保持する | INV-CMP-09 |
| 月跨ぎ（2026/2/28 → 2025/3/1）で sourceDate.month=3 を失わない | INV-CMP-09 |
| Σ(points.sales) = Σ(dailyMapping.prevSales) | INV-CMP-09 |
| Σ(points.customers) = Σ(dailyMapping.prevCustomers) | INV-CMP-09 |
| points のキー集合 = dailyMapping の currentDay 集合 | INV-CMP-09 |
| 年跨ぎ（2026/1/1 → 2024/12/27）で sourceDate を保持する | INV-CMP-09 |

### ComparisonScopeInvariant.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| prevYearSameDow の period2 は候補窓（period1 + 14日） | INV-CMP-05 |
| alignmentMap は位置ベースで DOW 解決を担当しない | INV-CMP-06 |
| 1:1 プリセットの alignmentMap 長 = effectivePeriod1 長 | INV-CMP-07 |

## 許可リスト管理

**一元管理:** 全許可リストは `app/src/test/allowlists/` ディレクトリにカテゴリ別ファイルで定義されている。
各エントリに `reason`（理由）、`category`（分類）、`removalCondition`（削除条件）が付与されている。

```
allowlists/
├── index.ts           # バレル + buildAllowlistSet / buildQuantitativeAllowlist
├── types.ts           # AllowlistEntry / QuantitativeAllowlistEntry 型定義
├── architecture.ts    # 層境界例外（app→infra, presentation→infra）
├── complexity.ts      # useMemo/useState/hook行数の上限超過
├── size.ts            # 大型ファイル Tier 2 例外
├── duckdb.ts          # DuckDB hook 直接使用（凍結）
├── migration.ts       # 比較サブシステム移行
└── misc.ts            # ViewModel React, contexts, 副作用
```

テストファイルは `allowlists/` から `buildAllowlistSet()` / `buildQuantitativeAllowlist()` で
Set / Record を構築して使用する。許可リストの変更は `allowlists/` 内の該当ファイルのみで行う。

## 共有テストインフラ

| ファイル | 内容 |
|---|---|
| `app/src/test/guardTestHelpers.ts` | `collectTsFiles`, `rel`, `extractImports`, `extractValueImports`, `isCommentLine`, `stripStrings`, `SRC_DIR` |
| `app/src/test/allowlists/` | 全許可リストのカテゴリ別定義 + `buildAllowlistSet`, `buildQuantitativeAllowlist` |

### WASM Candidate 不変条件（Phase 5: Rust テスト）

| 検証内容 | テストファイル | 不変条件 ID |
|---|---|---|
| PI値: 定義恒等式 | `wasm/pi-value/tests/invariants.rs` | INV-PI-01 |
| PI値: 結合一貫性 | `wasm/pi-value/tests/invariants.rs` | INV-PI-02 |
| PI値: ゼロ除算安全 | `wasm/pi-value/tests/invariants.rs` | INV-PI-03 |
| PI値: 再構成恒等式 | `wasm/pi-value/tests/invariants.rs` | INV-PI-04 |
| PI値: 有限保証 | `wasm/pi-value/tests/invariants.rs` | INV-PI-05 |
| PI値: 比例性 | `wasm/pi-value/tests/invariants.rs` | INV-PI-06 |
| PI値: 単調性 | `wasm/pi-value/tests/invariants.rs` | INV-PI-07 |
| 客数GAP: GAP定義恒等式 | `wasm/customer-gap/tests/invariants.rs` | INV-CG-01 |
| 客数GAP: YoY定義恒等式 | `wasm/customer-gap/tests/invariants.rs` | INV-CG-02 |
| 客数GAP: 等率成長ゼロGAP | `wasm/customer-gap/tests/invariants.rs` | INV-CG-03 |
| 客数GAP: null条件 | `wasm/customer-gap/tests/invariants.rs` | INV-CG-04 |
| 客数GAP: 有限保証 | `wasm/customer-gap/tests/invariants.rs` | INV-CG-05 |
| 客数GAP: 符号一貫性 | `wasm/customer-gap/tests/invariants.rs` | INV-CG-06 |
| 残予算率: 定義恒等式 | `wasm/remaining-budget-rate/tests/invariants.rs` | INV-RBR-01 |
| 残予算率: 計画通り恒等式 | `wasm/remaining-budget-rate/tests/invariants.rs` | INV-RBR-02 |
| 残予算率: ゼロ残予算安全 | `wasm/remaining-budget-rate/tests/invariants.rs` | INV-RBR-03 |
| 残予算率: 有限保証 | `wasm/remaining-budget-rate/tests/invariants.rs` | INV-RBR-04 |
| 残予算率: 単調性 | `wasm/remaining-budget-rate/tests/invariants.rs` | INV-RBR-05 |
| 観測期間: elapsed恒等式 | `wasm/observation-period/tests/invariants.rs` | INV-OP-01 |
| 観測期間: 残日数恒等式 | `wasm/observation-period/tests/invariants.rs` | INV-OP-02 |
| 観測期間: 営業日数上界 | `wasm/observation-period/tests/invariants.rs` | INV-OP-03 |
| 観測期間: undefined条件 | `wasm/observation-period/tests/invariants.rs` | INV-OP-04 |
| 観測期間: ステータス単調性 | `wasm/observation-period/tests/invariants.rs` | INV-OP-05 |
| 観測期間: staleness独立性 | `wasm/observation-period/tests/invariants.rs` | INV-OP-06 |
| 棚卸区間: COGS恒等式 | `wasm/pin-intervals/tests/invariants.rs` | INV-PIN-01 |
| 棚卸区間: 粗利恒等式 | `wasm/pin-intervals/tests/invariants.rs` | INV-PIN-02 |
| 棚卸区間: 粗利率恒等式 | `wasm/pin-intervals/tests/invariants.rs` | INV-PIN-03 |
| 棚卸区間: チェーン連続性 | `wasm/pin-intervals/tests/invariants.rs` | INV-PIN-04 |
| 棚卸区間: 日付被覆 | `wasm/pin-intervals/tests/invariants.rs` | INV-PIN-05 |
| 棚卸区間: 有限保証 | `wasm/pin-intervals/tests/invariants.rs` | INV-PIN-06 |
| 棚卸区間: 売上合計一貫性 | `wasm/pin-intervals/tests/invariants.rs` | INV-PIN-07 |
| 推定在庫: 恒等式 | `wasm/inventory-calc/tests/invariants.rs` | INV-IC-01 |
| 推定在庫: コア売上恒等式 | `wasm/inventory-calc/tests/invariants.rs` | INV-IC-02 |
| 推定在庫: 在庫仕入原価恒等式 | `wasm/inventory-calc/tests/invariants.rs` | INV-IC-03 |
| 推定在庫: 累積単調性 | `wasm/inventory-calc/tests/invariants.rs` | INV-IC-04 |
| 推定在庫: 実在庫最終日限定 | `wasm/inventory-calc/tests/invariants.rs` | INV-IC-05 |
| 推定在庫: 有限保証 | `wasm/inventory-calc/tests/invariants.rs` | INV-IC-06 |
| 推定在庫: 日番号連続 | `wasm/inventory-calc/tests/invariants.rs` | INV-IC-07 |
| 感度分析: ゼロデルタ恒等式 | `wasm/sensitivity/tests/invariants.rs` | INV-SENS-01 |
| 感度分析: ベース粗利恒等式 | `wasm/sensitivity/tests/invariants.rs` | INV-SENS-02 |
| 感度分析: 売上差分恒等式 | `wasm/sensitivity/tests/invariants.rs` | INV-SENS-03 |
| 感度分析: 粗利差分恒等式 | `wasm/sensitivity/tests/invariants.rs` | INV-SENS-04 |
| 感度分析: 客数単調性 | `wasm/sensitivity/tests/invariants.rs` | INV-SENS-05 |
| 感度分析: 有限保証 | `wasm/sensitivity/tests/invariants.rs` | INV-SENS-06 |
| 感度分析: 弾性値符号一貫性 | `wasm/sensitivity/tests/invariants.rs` | INV-SENS-07 |
| 相関: Pearson r ∈ [-1,1] | `wasm/correlation/tests/invariants.rs` | INV-CORR-01 |
| 相関: Pearson 対称性 | `wasm/correlation/tests/invariants.rs` | INV-CORR-02 |
| 相関: コサイン類似度 ∈ [0,1] | `wasm/correlation/tests/invariants.rs` | INV-CORR-03 |
| 相関: 正規化値域 [0,100] | `wasm/correlation/tests/invariants.rs` | INV-CORR-04 |
| 相関: Zスコア統計的性質 | `wasm/correlation/tests/invariants.rs` | INV-CORR-05 |
| 相関: 移動平均有限性 | `wasm/correlation/tests/invariants.rs` | INV-CORR-06 |
| 相関: 有限保証 | `wasm/correlation/tests/invariants.rs` | INV-CORR-07 |
| 移動平均: 出力長=入力長 | `wasm/moving-average/tests/invariants.rs` | INV-MA-01 |
| 移動平均: 窓不足→missing | `wasm/moving-average/tests/invariants.rs` | INV-MA-02 |
| 移動平均: 定数系列→定数 | `wasm/moving-average/tests/invariants.rs` | INV-MA-03 |
| 移動平均: strict≥partial | `wasm/moving-average/tests/invariants.rs` | INV-MA-04 |
| 移動平均: window=1→identity | `wasm/moving-average/tests/invariants.rs` | INV-MA-05 |
| 移動平均: 有限保証 | `wasm/moving-average/tests/invariants.rs` | INV-MA-06 |
| トレンド: 出力配列長=入力長 | `wasm/trend-analysis/tests/invariants.rs` | INV-TREND-01 |
| トレンド: 季節性長=12 | `wasm/trend-analysis/tests/invariants.rs` | INV-TREND-02 |
| トレンド: MoM定義 | `wasm/trend-analysis/tests/invariants.rs` | INV-TREND-03 |
| トレンド: 定数→flat | `wasm/trend-analysis/tests/invariants.rs` | INV-TREND-04 |
| トレンド: ソート順列 | `wasm/trend-analysis/tests/invariants.rs` | INV-TREND-05 |
| トレンド: 有限保証 | `wasm/trend-analysis/tests/invariants.rs` | INV-TREND-06 |

| 時間帯: コアタイム⊂営業時間 | `wasm/time-slot/tests/invariants.rs` | INV-TS-01 |
| 時間帯: コアタイム合計≤全体 | `wasm/time-slot/tests/invariants.rs` | INV-TS-02 |
| 時間帯: 窓幅=3 | `wasm/time-slot/tests/invariants.rs` | INV-TS-03 |
| 時間帯: 折り返し∈営業時間 | `wasm/time-slot/tests/invariants.rs` | INV-TS-04 |
| 時間帯: 折り返し=累積50% | `wasm/time-slot/tests/invariants.rs` | INV-TS-05 |
| 時間帯: 空入力→null | `wasm/time-slot/tests/invariants.rs` | INV-TS-06 |
| 時間帯: 有限保証 | `wasm/time-slot/tests/invariants.rs` | INV-TS-07 |
| 曜日GAP: 同一構成→ゼロ | `wasm/dow-gap/tests/invariants.rs` | INV-DG-01 |
| 曜日GAP: 影響額定義 | `wasm/dow-gap/tests/invariants.rs` | INV-DG-02 |
| 曜日GAP: 平均長=7 | `wasm/dow-gap/tests/invariants.rs` | INV-DG-03 |
| 曜日GAP: NaNフォールバック | `wasm/dow-gap/tests/invariants.rs` | INV-DG-04 |
| 曜日GAP: 有限保証 | `wasm/dow-gap/tests/invariants.rs` | INV-DG-05 |
| 曜日GAP: 手法別影響額合計 | `wasm/dow-gap/tests/invariants.rs` | INV-DG-06 |

## 設計原則カテゴリ → ガードテスト対応

| カテゴリ | 主なガードテスト |
|---|---|
| A: 層境界 | layerBoundaryGuard, presentationIsolationGuard, purityGuard |
| B: エンジン境界 | purityGuard (INV-ENGINE-*), presentationIsolationGuard (CQRS) |
| C: 純粋性・責務分離 | codePatternGuard (R1,R5,R7), purityGuard (facade) |
| D: 数学的不変条件 | factorDecomposition, scopeBoundaryInvariant, waterfallDataIntegrity, WASM candidate invariants (INV-PI/CG/RBR/OP/PIN/IC) |
| E: 型安全 | comparisonMigrationGuard (INV-CMP-08) |
| F: コード構造規約 | structuralConventionGuard (vertical slice, prototype, barrel) |
| F8: 正本保護 | purchaseCostPathGuard, grossProfitPathGuard, salesFactPathGuard, discountFactPathGuard, factorDecompositionPathGuard, canonicalizationSystemGuard, calculationCanonGuard |
| G: 機械的防御 | sizeGuard (R11,R12), codePatternGuard (R3,R10), designSystemGuard |
