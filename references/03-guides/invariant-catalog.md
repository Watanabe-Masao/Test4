# 不変条件カタログ

本ファイルは shiire-arari の全数学的・構造的不変条件を一覧化する。
各不変条件は対応するガードテストによって CI で機械的に検証される。

## 数学的不変条件

### INV-SH-01: シャープリー効率性（2要素）

```
custEffect + ticketEffect = curSales - prevSales
```

- **テスト**: `factorDecomposition.test.ts` — `decompose2` 全シナリオ
- **ロール**: invariant-guardian
- **違反時の影響**: ウォーターフォールチャートの棒が合計に到達しない

### INV-SH-02: シャープリー効率性（3要素）

```
custEffect + qtyEffect + pricePerItemEffect = curSales - prevSales
```

- **テスト**: `factorDecomposition.test.ts` — `decompose3` 全シナリオ
- **ロール**: invariant-guardian

### INV-SH-03: シャープリー効率性（5要素）

```
custEffect + qtyEffect + priceEffect + mixEffect = curSales - prevSales
```

- **テスト**: `factorDecomposition.test.ts` — `decompose5` 全シナリオ
- **ロール**: invariant-guardian
- **特記**: 売上合計とカテゴリ合計が乖離しても成立すること（データソース分離原則）

### INV-SH-04: 2↔3↔5 要素間の一貫性

```
decompose5.custEffect ≈ decompose3.custEffect
decompose5.qtyEffect  ≈ decompose3.qtyEffect
decompose5.priceEffect + mixEffect ≈ decompose3.pricePerItemEffect
```

- **テスト**: `factorDecomposition.test.ts` — `数学的不変条件: 2↔3↔5要素間の一貫性`
- **ロール**: invariant-guardian
- **違反時の影響**: UI で分解レベルを切り替えた際に客数・点数効果の値が変わる

## 構造的不変条件

### INV-ARCH-01: domain は外部層に依存しない

```
domain/ → application/ | infrastructure/ | presentation/ のインポート = 0件
```

- **テスト**: `guards/layerBoundaryGuard.test.ts` — `domain/ は外部層に依存しない`
- **ロール**: architecture

### INV-ARCH-02: application → infrastructure は許可リストのみ

```
許可リスト外の application/ → infrastructure/ インポート = 0件
```

- **テスト**: `guards/layerBoundaryGuard.test.ts` — `application/ は infrastructure/ に直接依存しない`
- **ロール**: architecture
- **許可リスト**: DuckDB フック（14件）、ストレージ永続化（3件）、インポート（4件）、エクスポート（1件）、i18n（1件）

### INV-ARCH-03: presentation → infrastructure は許可リストのみ

```
許可リスト外の presentation/ → infrastructure/ インポート = 0件
```

- **テスト**: `guards/layerBoundaryGuard.test.ts` — `presentation/ は infrastructure/ に直接依存しない`
- **ロール**: architecture
- **許可リスト**: DevTools/QueryProfilePanel.tsx のみ

### INV-ARCH-04: application → presentation の依存なし

- **テスト**: `guards/layerBoundaryGuard.test.ts` — `application/ は presentation/ に依存しない`
- **ロール**: architecture

### INV-ARCH-05: infrastructure → presentation の依存なし

- **テスト**: `guards/layerBoundaryGuard.test.ts` — `infrastructure/ は presentation/ に依存しない`
- **ロール**: architecture

### INV-ARCH-06: 許可リストのファイルが実在する

- **テスト**: `guards/layerBoundaryGuard.test.ts` — `許可リストのファイルが実在する`
- **ロール**: architecture
- **目的**: ファイル削除後に許可リストの残骸が残らないことを保証

### INV-ARCH-07: presentation は domain/calculations のビジネス関数を直接 import しない

- **テスト**: `guards/presentationIsolationGuard.test.ts` — `presentation/ は domain/calculations/ を直接 import しない`
- **ロール**: architecture
- **許可**: `import type` は OK（型のみ）。`domain/calculations/utils` のフォーマット関数は OK。

### INV-ARCH-08: presentation は getDailyTotalCost を直接使用しない

- **テスト**: `guards/presentationIsolationGuard.test.ts` — `getDailyTotalCost 直接使用禁止`
- **ロール**: architecture
- **代替**: `rec.totalCost`（事前計算済みフィールド）を使用

### INV-ARCH-09: presentation は比較コンテキスト内部モジュールを直接 import しない

- **テスト**: `guards/presentationIsolationGuard.test.ts`
- **ロール**: architecture
- **代替**: `useComparisonContext` 経由

### INV-ARCH-10: storage は duckdb/queries に依存しない（書き戻し禁止）

- **テスト**: `guards/presentationIsolationGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: DuckDB（派生キャッシュ）→ IndexedDB（真実源）の書き戻しでデータ整合性崩壊

### INV-ARCH-11: presentation は duckdb を直接 import しない（DevTools 除く）

- **テスト**: `guards/presentationIsolationGuard.test.ts`
- **ロール**: architecture
- **代替**: application/hooks 経由

### INV-ARCH-12: features/ 間の直接 import 禁止（shared/ 経由のみ）

- **テスト**: `guards/structuralConventionGuard.test.ts`（features/ 存在時のみ有効）
- **ロール**: architecture
- **違反時の影響**: 縦スライス間の循環依存が発生

## フック複雑度不変条件

### INV-HOOK-01: hooks/ に @internal export が存在しない

- **テスト**: `guards/codePatternGuard.test.ts` — `R3: hooks/ に @internal export がない`
- **ロール**: architecture
- **違反時の影響**: テストのためだけの export が設計を歪める

### INV-HOOK-02: テストに typeof === 'function' アサーションが存在しない

- **テスト**: `guards/codePatternGuard.test.ts` — `R3: テストに typeof === "function" アサーションがない`
- **ロール**: architecture
- **違反時の影響**: 存在確認テストがカバレッジを水増しする

### INV-HOOK-03: hooks/ の export にカバレッジ目的のコメントが存在しない

- **テスト**: `guards/codePatternGuard.test.ts` — `R10: hooks/ の export にカバレッジ目的のコメントがない`
- **ロール**: architecture
- **違反時の影響**: カバレッジ回復のための設計変更が混入する

### INV-STORE-01: stores/ の set() コールバック内に算術式が存在しない

- **テスト**: `guards/codePatternGuard.test.ts` — `R7: stores/ の set() コールバック内に算術式がない`
- **ロール**: architecture
- **違反時の影響**: store action に業務ロジックが埋め込まれテスト困難になる

## 計算ルール不変条件

### INV-DIV-01: domain 内の除算は safeDivide を経由

- **テスト**: `calculationRules.test.ts` — `RULE-D1`
- **ロール**: invariant-guardian
- **検出パターン**: `x > 0 ? y / x : z`, `x !== 0 ? y / x : z`

### INV-DIV-02: 客単価計算は calculateTransactionValue を経由

- **テスト**: `calculationRules.test.ts` — `RULE-D2`
- **ロール**: invariant-guardian
- **検出パターン**: `Math.round(xxxSales / xxxCustomers)`

### INV-DIV-03: overflow day は overflowDay.ts を経由

- **テスト**: `calculationRules.test.ts` — `RULE-I1`
- **ロール**: invariant-guardian

### INV-FMT-01: fmtSen は drilldownUtils.ts から import

- **テスト**: `calculationRules.test.ts` — `RULE-P2`
- **ロール**: invariant-guardian

### INV-FMT-02: Dashboard widgets のパーセント書式は formatPercent を経由

- **テスト**: `calculationRules.test.ts` — `RULE-P3`
- **ロール**: invariant-guardian

### INV-FMT-03: Chart files のパーセント書式は toPct を経由

- **テスト**: `calculationRules.test.ts` — `RULE-C1`
- **ロール**: invariant-guardian

## 集約不変条件

### INV-AGG-01: storeContributions 売上合計 = entry.sales

```
Σ(storeContributions[*].sales) = entry.sales
```

- **テスト**: `buildComparisonAggregation.test.ts` — `不変条件1`
- **ロール**: invariant-guardian
- **違反時の影響**: Explanation の evidenceRefs が示すデータと表示値が乖離する

### INV-AGG-02: storeContributions 客数合計 = entry.customers

```
Σ(storeContributions[*].customers) = entry.customers
```

- **テスト**: `buildComparisonAggregation.test.ts` — `不変条件2`
- **ロール**: invariant-guardian

### INV-AGG-03: dailyMapping 売上合計 = entry.sales

```
Σ(dailyMapping[*].prevSales) = entry.sales
```

- **テスト**: `buildComparisonAggregation.test.ts` — `不変条件3`
- **ロール**: invariant-guardian
- **違反時の影響**: 日別ドリルダウンの合計が月間合計に一致しない

### INV-AGG-04: dailyMapping 客数合計 = entry.customers

```
Σ(dailyMapping[*].prevCustomers) = entry.customers
```

- **テスト**: `buildComparisonAggregation.test.ts` — `不変条件4`
- **ロール**: invariant-guardian

### INV-AGG-05: transactionValue = Math.round(sales / customers)

- **テスト**: `buildComparisonAggregation.test.ts` — `不変条件5`
- **ロール**: invariant-guardian
- **特記**: customers = 0 のとき transactionValue = 0

### INV-AGG-06: マッピング範囲は 1〜daysInMonth

```
∀ d ∈ dailyMapping: 1 ≤ d.currentDay ≤ daysInMonth
∀ c ∈ storeContributions: 1 ≤ c.mappedDay ≤ daysInMonth
```

- **テスト**: `buildComparisonAggregation.test.ts` — `不変条件6`, `不変条件7`
- **ロール**: invariant-guardian
- **違反時の影響**: 月外の日付がドリルダウンに表示される

### INV-AGG-07: offset=0 では originalDay = mappedDay

- **テスト**: `buildComparisonAggregation.test.ts` — `不変条件8`
- **ロール**: invariant-guardian
- **特記**: 同日アライメントではオフセットなし

## Explanation 生成不変条件

### INV-EXPL-01: breakdown 日別売上合計 = entry.sales

```
Σ(breakdown[*].value) = entry.sales
```

- **テスト**: `prevYearBudgetExplanation.test.ts` — `不変条件1`
- **ロール**: invariant-guardian
- **違反時の影響**: ドリルダウン日別合計が KPI カード表示値と乖離する

### INV-EXPL-02: evidenceRefs に全 storeContribution が含まれる

- **テスト**: `prevYearBudgetExplanation.test.ts` — `不変条件2`
- **ロール**: invariant-guardian
- **違反時の影響**: 根拠参照が計算に寄与したデータを網羅しない

### INV-EXPL-03: evidenceRefs に budget 参照が含まれる

- **テスト**: `prevYearBudgetExplanation.test.ts` — `不変条件3`
- **ロール**: invariant-guardian

### INV-EXPL-04: explanation.value = safeDivide(sales, budget)

- **テスト**: `prevYearBudgetExplanation.test.ts` — `不変条件4`
- **ロール**: invariant-guardian
- **違反時の影響**: KPI カードの表示値と Explanation パネルの値が乖離する

### INV-EXPL-05: 無効入力 → 空 Map

```
hasPrevYear = false ∨ budget ≤ 0 → |Map| = 0
```

- **テスト**: `prevYearBudgetExplanation.test.ts` — `不変条件5`
- **ロール**: invariant-guardian

## 除数計算ルール不変条件

### INV-PF-01: 除数は computeDivisor() を経由（RULE-1）

- **テスト**: `divisorRules.test.ts` — `RULE-1`
- **ロール**: invariant-guardian
- **保証**: `computeDivisor() >= 1`（常に 1 以上を返す）

### INV-PF-02: レガシー API（pf.divisor / pf.divideByMode）の使用禁止（RULE-2）

- **テスト**: `divisorRules.test.ts` — `RULE-2`
- **ロール**: invariant-guardian

### INV-PF-03: カレンダーベース除数（countDowInRange）の除数用途禁止（RULE-3）

- **テスト**: `divisorRules.test.ts` — `RULE-3`
- **ロール**: invariant-guardian

### INV-PF-04: computeDivisor への二重ゼロ除算ガード禁止（RULE-4）

- **テスト**: `divisorRules.test.ts` — `RULE-4`
- **ロール**: invariant-guardian
- **理由**: computeDivisor は >= 1 を保証。二重ガードは設計不理解の兆候。

### INV-PF-05: 店舗フィルタは filterByStore() を経由（RULE-5）

- **テスト**: `divisorRules.test.ts` — `RULE-5`
- **ロール**: invariant-guardian
- **例外**: StoreTimeSlotComparisonChart（店舗間比較のため）

### INV-PF-06: 手動日数カウント禁止、countDistinctDays を使用（RULE-6）

- **テスト**: `divisorRules.test.ts` — `RULE-6`
- **ロール**: invariant-guardian

### INV-PF-07: 正規ロケーション（divisor.ts）に実装が存在

- **テスト**: `divisorRules.test.ts` — `divisor.ts（正規ロケーション）: 実装の健全性`
- **ロール**: invariant-guardian
- **正規**: `application/usecases/categoryTimeSales/divisor.ts`
- **バレル**: `presentation/components/charts/periodFilterUtils.ts`（re-export のみ）

### INV-PF-08: usePeriodFilter 使用ファイルの網羅性

- **テスト**: `divisorRules.test.ts` — `網羅性: usePeriodFilter 使用ファイルの管理`
- **ロール**: invariant-guardian
- **登録必須**: `CHART_FILES_USING_PERIOD_FILTER` に追加すること

## 比較サブシステム移行不変条件

### INV-CMP-01: prevYear.daily.get(day) の新規使用禁止

- **テスト**: `comparisonMigrationGuard.test.ts` — `INV-CMP-01`
- **ロール**: architecture
- **対象**: presentation/, application/hooks/, application/usecases/
- **許可リスト**: 9件（凍結、増加禁止）
- **違反時の影響**: 旧 day 番号参照が残留し、前年同曜日比較で日付ズレが発生する

### INV-CMP-02: day 番号 + offset による前年比較禁止

- **テスト**: `comparisonMigrationGuard.test.ts` — `INV-CMP-02`
- **ロール**: architecture
- **対象**: presentation/, application/hooks/
- **違反時の影響**: origDay - offset の旧式マッピングが復活し、月跨ぎ・曜日ズレが発生する

### INV-CMP-03: comparisonFrame.previous の新規使用禁止

- **テスト**: `comparisonMigrationGuard.test.ts` — `INV-CMP-03`
- **ロール**: architecture
- **対象**: presentation/
- **許可リスト**: 4件（凍結、増加禁止）
- **違反時の影響**: 旧 ComparisonFrame ベースの日付範囲構築が残留する

### INV-CMP-04: aggregateWithOffset の新規使用禁止

- **テスト**: `comparisonMigrationGuard.test.ts` — `INV-CMP-04`
- **ロール**: architecture
- **違反時の影響**: 旧 offset 集計が復活し、alignmentMap ベースの集計と二重実装になる

### INV-CMP-05: prevYearSameDow の period2 は候補窓

```
dateRangeDays(period2) = dateRangeDays(period1) + 14
```

- **テスト**: `ComparisonScopeInvariant.test.ts` — `INV-CMP-05`
- **ロール**: invariant-guardian
- **違反時の影響**: 候補窓が 1:1 比較期間として誤用され、日付対応が崩れる

### INV-CMP-06: alignmentMap は位置ベース（DOW 解決を担当しない）

- **テスト**: `ComparisonScopeInvariant.test.ts` — `INV-CMP-06`
- **ロール**: invariant-guardian
- **違反時の影響**: buildAlignmentMap が DOW 一致を保証すると誤認し、resolver を迂回する

### INV-CMP-07: 1:1 プリセットの alignmentMap 長 = effectivePeriod1 長

```
|alignmentMap| = dateRangeDays(effectivePeriod1)
```

- **テスト**: `ComparisonScopeInvariant.test.ts` — `INV-CMP-07`
- **ロール**: invariant-guardian
- **違反時の影響**: 集計の日数と表示の日数が不一致になる

### INV-CMP-08: dailyMapping の独自 Map 変換禁止（sourceDate 劣化防止）

```
presentation 層・application/hooks 層で dailyMapping を直接ループして
Map<number, { sales, customers }> を構築するコード = 0件
（PrevYearBudgetDetailPanel.tsx は全フィールド保持のため許可）
```

- **テスト**: `comparisonMigrationGuard.test.ts` — `INV-CMP-08`
- **ロール**: architecture
- **違反時の影響**: DayMappingRow の sourceDate（prevYear/prevMonth/prevDay）が失われ、月跨ぎ時に出典追跡不能。前年比が 0 表示になるバグの再発源。
- **正しい手段**: `buildSameDowPoints()` を唯一の入口として使用する

### INV-CMP-09: buildSameDowPoints は sourceDate を保持する

```
∀ point ∈ buildSameDowPoints(mapping):
  point.sourceDate = { year: row.prevYear, month: row.prevMonth, day: row.prevDay }
Σ(points.sales) = Σ(mapping.prevSales)
Σ(points.customers) = Σ(mapping.prevCustomers)
```

- **テスト**: `sameDowPoint.test.ts` — 7件
- **ロール**: invariant-guardian
- **違反時の影響**: 月跨ぎ同曜日比較（例: 2026/2/28 → 2025/3/1）で sourceDate.month が失われる

## 構造純粋性不変条件（guards/purityGuard.test.ts）

### INV-PURE-01: domain/ で副作用 API を使用しない

- **テスト**: `guards/purityGuard.test.ts` — domain/ 副作用 API 禁止
- **ロール**: architecture
- **禁止**: fetch, localStorage, indexedDB, window, document, setTimeout, setInterval, Math.random
- **違反時の影響**: 純粋関数のテスト不能、Authoritative Engine の信頼性崩壊

### INV-PURE-02: domain/calculations/ で async/await を使用しない

- **テスト**: `guards/purityGuard.test.ts` — async/await 禁止
- **ロール**: architecture
- **違反時の影響**: 計算関数が非同期になり、同期的な合成が不可能になる

### INV-PURE-03: presentation/ .tsx で SQL 文字列を埋め込まない

- **テスト**: `guards/purityGuard.test.ts` — SQL 文字列禁止
- **ロール**: architecture
- **違反時の影響**: Presentation が Infrastructure に暗黙依存し、Engine 境界が崩壊する

### INV-ENGINE-01: DuckDB queries は domain/calculations に依存しない

- **テスト**: `guards/purityGuard.test.ts` — queries → calculations 禁止
- **ロール**: architecture
- **違反時の影響**: Exploration Engine が Authoritative Engine に結合し、二重実装の温床になる

### INV-ENGINE-02: VM/Logic ファイルに Zustand/immer import がない

- **テスト**: `guards/purityGuard.test.ts` — *.vm.ts / *Logic.ts の状態管理依存禁止
- **ロール**: architecture
- **違反時の影響**: ViewModel / 純粋ロジックが store に結合し、テスト不能になる

### INV-ENGINE-03: application/usecases/ に React hook import がない

- **テスト**: `guards/purityGuard.test.ts` — usecases React-free
- **ロール**: architecture
- **違反時の影響**: usecases が React に結合し、Worker 移行や FFI 化が不可能になる

### INV-RATE-01: presentation/ で率を直接計算しない（禁止事項 #10）

- **テスト**: `guards/purityGuard.test.ts` — 率の直接除算禁止
- **ロール**: architecture
- **違反時の影響**: 加重平均が崩壊し、全店合計・経過日集約が不正確になる

## 正本化体系不変条件

### INV-CANON-01: 仕入原価 旧クエリ import 禁止

- **テスト**: `guards/purchaseCostPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: 旧経路で仕入原価を取得し、正本と異なる値が表示される

### INV-CANON-02: 仕入原価 集計逸脱禁止

- **テスト**: `guards/purchaseCostPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: 独自集計が正本と乖離し、ページ間で値が不一致になる

### INV-CANON-03: 仕入原価 正本一貫性

- **テスト**: `guards/purchaseCostPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: 3独立正本（通常仕入・売上納品・移動原価）の構成が崩壊する

### INV-CANON-04: 粗利 calculateGrossProfit 存在・Zod 契約

- **テスト**: `guards/grossProfitPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: 粗利計算の唯一入口が不在になり、独自計算が発生する

### INV-CANON-05: 粗利 conditionSummaryUtils 正本経由

- **テスト**: `guards/grossProfitPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: KPIカードの粗利値が正本と乖離する

### INV-CANON-06: 粗利 インライン計算パターン制限

- **テスト**: `guards/grossProfitPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: presentation 層で粗利の独自計算が散在する

### INV-CANON-07: 売上 readSalesFact 存在・Zod 契約

- **テスト**: `guards/salesFactPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: 売上ファクト正本が不在になり、取得経路が分散する

### INV-CANON-08: 売上 presentation 層旧クエリ import 禁止

- **テスト**: `guards/salesFactPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: presentation が infrastructure のクエリに直接依存する

### INV-CANON-09: 値引き readDiscountFact 存在・Zod 契約

- **テスト**: `guards/discountFactPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: 値引きファクト正本が不在になり、71-74種別の取得が不統一になる

### INV-CANON-10: 値引き presentation 層旧クエリ import 禁止

- **テスト**: `guards/discountFactPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: presentation が classified_sales クエリに直接依存する

### INV-CANON-11: 要因分解 calculateFactorDecomposition 存在・Zod 契約

- **テスト**: `guards/factorDecompositionPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: Shapley 不変条件の runtime 検証が欠落する

### INV-CANON-12: 要因分解 domain 直接 import 許可リスト制限

- **テスト**: `guards/factorDecompositionPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: bridge / readModel を経由せずに decompose 関数が使われ、Zod 検証が迂回される

### INV-CANON-13: 全 readModel ディレクトリ・ファイル構成

- **テスト**: `guards/canonicalizationSystemGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: readModel ディレクトリの構造が不統一になり、正本化パターンが崩壊する

### INV-CANON-14: 全定義書存在

- **テスト**: `guards/canonicalizationSystemGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: 正本の定義が文書化されず、仕様と実装の乖離が発生する

### INV-CANON-15: CLAUDE.md 正本化参照

- **テスト**: `guards/canonicalizationSystemGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: 開発ルールに正本化ルールが記載されず、新規開発で旧経路が作られる

### INV-CANON-16: orchestrator による正本統合

- **テスト**: `guards/salesFactPathGuard.test.ts`, `guards/discountFactPathGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: widget orchestrator が正本を統合配布できず、widget が個別に取得する

## 許可リスト増加防止不変条件

### INV-ALLOW-01: APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST ≤16件

- **テスト**: `guards/presentationIsolationGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: Application→Infrastructure の依存が無秩序に拡大する

### INV-ALLOW-02: PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST ≤1件

- **テスト**: `guards/presentationIsolationGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: Presentation が Infrastructure に直接依存する箇所が増加する

### INV-ALLOW-03: INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST ≤1件

- **テスト**: `guards/presentationIsolationGuard.test.ts`
- **ロール**: architecture
- **違反時の影響**: 依存の逆転（Infra→App）が拡大し、アダプターパターンが崩壊する

## WASM Candidate 数学的不変条件（Phase 5）

以下は Tier 1 Business candidate 6 件の WASM 実装に対する数学的不変条件。
各不変条件は Rust テスト（`wasm/*/tests/invariants.rs`）で機械的に検証される。
candidate → current 昇格（Phase 8）後もそのまま維持する。

### INV-PI-01: PI 値定義恒等式

```
quantityPI = (totalQuantity / customers) × 1,000
amountPI   = (totalSales   / customers) × 1,000
```

- **テスト**: `wasm/pi-value/tests/invariants.rs` — `pi_inv_1_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-012
- **違反時の影響**: 店舗間・カテゴリ間のPI値比較が不正確になる

### INV-PI-02: PI 値結合一貫性

```
calculate_pi_values(q, s, c) = (calculateQuantityPI(q, c), calculateAmountPI(s, c))
```

- **テスト**: `wasm/pi-value/tests/invariants.rs` — `pi_inv_2_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-012

### INV-PI-03: PI 値ゼロ除算安全

```
customers = 0 ⇒ quantityPI = 0 ∧ amountPI = 0
```

- **テスト**: `wasm/pi-value/tests/invariants.rs` — `pi_inv_3_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-012

### INV-PI-04: PI 値再構成恒等式

```
amountPI ≈ quantityPI × (totalSales / totalQuantity)  (totalQuantity ≠ 0)
```

- **テスト**: `wasm/pi-value/tests/invariants.rs` — `pi_inv_4_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-012
- **特記**: 客単価 = (quantityPI / 1000) × 点単価 の関係

### INV-PI-05: PI 値有限保証

```
∀ 有限入力 ⇒ 出力は有限（NaN/Infinity 入力を除く）
```

- **テスト**: `wasm/pi-value/tests/invariants.rs` — `pi_inv_5_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-012

### INV-PI-06: PI 値比例性

```
k × totalQuantity ⇒ k × quantityPI（customers 一定）
```

- **テスト**: `wasm/pi-value/tests/invariants.rs` — `pi_inv_6_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-012

### INV-PI-07: PI 値単調性

```
totalQuantity↑ (customers 一定) ⇒ quantityPI↑
customers↑ (totalQuantity 一定) ⇒ quantityPI↓
```

- **テスト**: `wasm/pi-value/tests/invariants.rs` — `pi_inv_7_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-012

### INV-CG-01: 客数 GAP 定義恒等式

```
quantityCustomerGap = quantityYoY - customerYoY
amountCustomerGap   = salesYoY    - customerYoY
```

- **テスト**: `wasm/customer-gap/tests/invariants.rs` — `cg_inv_1_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-013
- **違反時の影響**: 客数 GAP が YoY 比との整合を失い、要因分析が破綻する

### INV-CG-02: YoY 定義恒等式

```
customerYoY = curCustomers / prevCustomers
quantityYoY = curQuantity / prevQuantity
salesYoY    = curSales / prevSales
```

- **テスト**: `wasm/customer-gap/tests/invariants.rs` — `cg_inv_2_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-013

### INV-CG-03: 等率成長ゼロ GAP

```
全指標が同率で変化 ⇒ quantityCustomerGap = 0 ∧ amountCustomerGap = 0
```

- **テスト**: `wasm/customer-gap/tests/invariants.rs` — `cg_inv_3_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-013

### INV-CG-04: 前期無効時 null 条件

```
prevCustomers ≤ 0 ∨ prevQuantity ≤ 0 ∨ prevSales ≤ 0 ⇒ null
```

- **テスト**: `wasm/customer-gap/tests/invariants.rs` — `cg_inv_4_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-013

### INV-CG-05: 客数 GAP 有限保証

```
∀ 有限入力（有効な前期値） ⇒ 全出力フィールドは有限
```

- **テスト**: `wasm/customer-gap/tests/invariants.rs` — `cg_inv_5_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-013

### INV-CG-06: GAP 符号一貫性

```
quantityCustomerGap > 0 ⇔ quantityYoY > customerYoY（客数以上に点数が伸びている）
```

- **テスト**: `wasm/customer-gap/tests/invariants.rs` — `cg_inv_6_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-013

### INV-RBR-01: 残予算率定義恒等式

```
rate = (budget - totalSales) / Σ dailyBudget[elapsed+1..daysInMonth] × 100
```

- **テスト**: `wasm/remaining-budget-rate/tests/invariants.rs` — `rbr_inv_1_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-008
- **違反時の影響**: 残予算必要達成率が計画進捗と乖離し、巻き返し判断を誤る

### INV-RBR-02: 計画通り恒等式

```
totalSales = Σ dailyBudget[0..elapsed] ⇒ rate = 100%
```

- **テスト**: `wasm/remaining-budget-rate/tests/invariants.rs` — `rbr_inv_2_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-008

### INV-RBR-03: 残予算ゼロ安全

```
Σ dailyBudget[elapsed+1..end] = 0 ⇒ rate = 0（safeDivide fallback）
```

- **テスト**: `wasm/remaining-budget-rate/tests/invariants.rs` — `rbr_inv_3_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-008

### INV-RBR-04: 残予算率有限保証

```
∀ 有限入力 ⇒ 出力は有限
```

- **テスト**: `wasm/remaining-budget-rate/tests/invariants.rs` — `rbr_inv_4_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-008

### INV-RBR-05: 残予算率単調性

```
totalSales↑ (他一定) ⇒ rate↓
elapsedDays↑ (totalSales 一定) ⇒ rate↑
```

- **テスト**: `wasm/remaining-budget-rate/tests/invariants.rs` — `rbr_inv_5_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-008

### INV-OP-01: 経過日数恒等式

```
elapsedDays === lastRecordedSalesDay
```

- **テスト**: `wasm/observation-period/tests/invariants.rs` — `op_inv_1_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-010
- **違反時の影響**: 在庫法/推定法の切替判定が実際のデータ状況と乖離する

### INV-OP-02: 残日数恒等式

```
remainingDays === daysInMonth - elapsedDays
```

- **テスト**: `wasm/observation-period/tests/invariants.rs` — `op_inv_2_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-010

### INV-OP-03: 営業日数上界

```
salesDays ≤ lastRecordedSalesDay ≤ daysInMonth
```

- **テスト**: `wasm/observation-period/tests/invariants.rs` — `op_inv_3_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-010

### INV-OP-04: 販売実績なし ⇒ undefined

```
salesDays = 0 ⇒ status = 'undefined'
```

- **テスト**: `wasm/observation-period/tests/invariants.rs` — `op_inv_4_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-010

### INV-OP-05: ステータス単調性

```
データ増加 ⇒ ステータスは同じか改善（悪化しない）
```

- **テスト**: `wasm/observation-period/tests/invariants.rs` — `op_inv_5_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-010

### INV-OP-06: staleness 独立性

```
stale 警告は status とは独立に発火する（ok + stale が共存可能）
```

- **テスト**: `wasm/observation-period/tests/invariants.rs` — `op_inv_6_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-010

### INV-PIN-01: COGS 恒等式（在庫等式）

```
COGS = openingInventory + totalPurchaseCost - closingInventory
```

- **テスト**: `wasm/pin-intervals/tests/invariants.rs` — `pin_inv_1_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-011
- **違反時の影響**: 棚卸区間の粗利計算が在庫等式に違反し、粗利率が不正確になる
- **特記**: gross-profit WASM (BIZ-001) の在庫法計算と同一の等式

### INV-PIN-02: 粗利恒等式

```
grossProfit = totalSales - COGS
```

- **テスト**: `wasm/pin-intervals/tests/invariants.rs` — `pin_inv_2_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-011

### INV-PIN-03: 粗利率恒等式

```
grossProfitRate = grossProfit / totalSales（totalSales = 0 のとき 0）
```

- **テスト**: `wasm/pin-intervals/tests/invariants.rs` — `pin_inv_3_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-011

### INV-PIN-04: 区間チェーン連続性

```
interval[i].openingInventory === interval[i-1].closingInventory
interval[0].openingInventory === 関数引数の openingInventory
```

- **テスト**: `wasm/pin-intervals/tests/invariants.rs` — `pin_inv_4_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-011
- **違反時の影響**: 棚卸区間が不連続になり、在庫の追跡が途切れる

### INV-PIN-05: 日付被覆（ギャップなし・重複なし）

```
interval[0].startDay = 1
interval[i].startDay = interval[i-1].endDay + 1
```

- **テスト**: `wasm/pin-intervals/tests/invariants.rs` — `pin_inv_5_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-011

### INV-PIN-06: 区間出力有限保証

```
∀ 有限入力 ⇒ COGS, grossProfit, grossProfitRate は有限
```

- **テスト**: `wasm/pin-intervals/tests/invariants.rs` — `pin_inv_6_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-011

### INV-PIN-07: 売上合計一貫性

```
Σ interval.totalSales = Σ dailySales[0..lastPinDay]
```

- **テスト**: `wasm/pin-intervals/tests/invariants.rs` — `pin_inv_7_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-011
- **違反時の影響**: 区間分割により売上が消失または重複計上される

### INV-IC-01: 推定在庫恒等式

```
estimated[d] = openingInventory + cumInventoryCost[d] - cumEstCogs[d]
```

- **テスト**: `wasm/inventory-calc/tests/invariants.rs` — `ic_inv_1_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-009
- **違反時の影響**: 日別推定在庫が期首在庫と累積原価から正しく導出されず、在庫推移グラフが不正確になる

### INV-IC-02: コア売上恒等式（クランプなし）

```
coreSales = sales - flowersPrice - directProducePrice
```

- **テスト**: `wasm/inventory-calc/tests/invariants.rs` — `ic_inv_2_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-009
- **特記**: 日別は max(0) クランプしない（月次集計との整合のため）

### INV-IC-03: 在庫仕入原価恒等式

```
inventoryCost = totalCost - deliverySalesCost
```

- **テスト**: `wasm/inventory-calc/tests/invariants.rs` — `ic_inv_3_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-009

### INV-IC-04: 累積単調性

```
非負入力 ⇒ cumInventoryCost[d] ≥ cumInventoryCost[d-1]
         ∧ cumEstCogs[d] ≥ cumEstCogs[d-1]
```

- **テスト**: `wasm/inventory-calc/tests/invariants.rs` — `ic_inv_4_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-009

### INV-IC-05: 実在庫は最終日のみ

```
actual ≠ null ⇔ (d = daysInMonth ∧ closingInventory ≠ null)
```

- **テスト**: `wasm/inventory-calc/tests/invariants.rs` — `ic_inv_5_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-009

### INV-IC-06: 推定在庫有限保証

```
∀ 有限入力 ⇒ estimated, cumInventoryCost, cumEstCogs は有限
```

- **テスト**: `wasm/inventory-calc/tests/invariants.rs` — `ic_inv_6_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-009

### INV-IC-07: 日番号連続

```
row[d].day = d + 1（1-based 連番）
```

- **テスト**: `wasm/inventory-calc/tests/invariants.rs` — `ic_inv_7_*`
- **ロール**: invariant-guardian
- **契約**: BIZ-009

### INV-SENS-01: ゼロデルタ恒等式

```
δ = 0 ⇒ grossProfitDelta = 0 ∧ salesDelta = 0
```

- **テスト**: `wasm/sensitivity/tests/invariants.rs` — `sens_inv_1_*`
- **ロール**: invariant-guardian
- **契約**: ANA-003
- **違反時の影響**: 変動なしなのにシミュレーション結果が変わり、感度分析の基準が不安定になる

### INV-SENS-02: ベース粗利恒等式

```
baseGP = grossSales - totalCost - totalDiscount - totalCostInclusion
```

- **テスト**: `wasm/sensitivity/tests/invariants.rs` — `sens_inv_2_*`
- **ロール**: invariant-guardian
- **契約**: ANA-003

### INV-SENS-03: 売上差分恒等式

```
salesDelta = simulatedSales - totalSales
```

- **テスト**: `wasm/sensitivity/tests/invariants.rs` — `sens_inv_3_*`
- **ロール**: invariant-guardian
- **契約**: ANA-003

### INV-SENS-04: 粗利差分恒等式

```
gpDelta = simulatedGP - baseGP
```

- **テスト**: `wasm/sensitivity/tests/invariants.rs` — `sens_inv_4_*`
- **ロール**: invariant-guardian
- **契約**: ANA-003

### INV-SENS-05: 客数単調性

```
customersDelta > 0 ⇒ salesDelta > 0（他のδ = 0、有効なベースの場合）
```

- **テスト**: `wasm/sensitivity/tests/invariants.rs` — `sens_inv_5_*`
- **ロール**: invariant-guardian
- **契約**: ANA-003

### INV-SENS-06: 感度分析有限保証

```
∀ 有限入力 ⇒ 全出力フィールドは有限
```

- **テスト**: `wasm/sensitivity/tests/invariants.rs` — `sens_inv_6_*`
- **ロール**: invariant-guardian
- **契約**: ANA-003

### INV-SENS-07: 弾性値符号一貫性

```
売変率改善(δ<0) → GP増加 ∧ 客数増加(δ>0) → GP増加 ∧ 原価率改善(δ<0) → GP増加
```

- **テスト**: `wasm/sensitivity/tests/invariants.rs` — `sens_inv_7_*`
- **ロール**: invariant-guardian
- **契約**: ANA-003
- **違反時の影響**: 弾性値の符号が逆転し、改善施策の判断を誤る

### INV-CORR-01: Pearson r ∈ [-1, 1]

```
∀ 有限入力 ⇒ -1 ≤ r ≤ 1
```

- **テスト**: `wasm/correlation/tests/invariants.rs` — `corr_inv_1_*`
- **ロール**: invariant-guardian
- **契約**: ANA-005
- **違反時の影響**: 相関係数が数学的定義範囲を逸脱し、ヒートマップやクラスタリングが破綻する

### INV-CORR-02: Pearson 対称性

```
corr(X, Y) = corr(Y, X)
```

- **テスト**: `wasm/correlation/tests/invariants.rs` — `corr_inv_2_*`
- **ロール**: invariant-guardian
- **契約**: ANA-005

### INV-CORR-03: コサイン類似度 ∈ [0, 1]（非負ベクトル）

```
非負ベクトル ⇒ 0 ≤ cos(θ) ≤ 1
```

- **テスト**: `wasm/correlation/tests/invariants.rs` — `corr_inv_3_*`
- **ロール**: invariant-guardian
- **契約**: ANA-005

### INV-CORR-04: 正規化値域 [0, 100]

```
normalize_min_max の出力 ∈ [0, 100]
```

- **テスト**: `wasm/correlation/tests/invariants.rs` — `corr_inv_4_*`
- **ロール**: invariant-guardian
- **契約**: ANA-005

### INV-CORR-05: Z スコア統計的性質

```
mean(z_scores) ≈ 0 ∧ var(z_scores) ≈ 1
```

- **テスト**: `wasm/correlation/tests/invariants.rs` — `corr_inv_5_*`
- **ロール**: invariant-guardian
- **契約**: ANA-005

### INV-CORR-06: 移動平均有限性

```
移動平均の出力は全て有限
```

- **テスト**: `wasm/correlation/tests/invariants.rs` — `corr_inv_6_*`
- **ロール**: invariant-guardian
- **契約**: ANA-005

### INV-CORR-07: 有限保証

```
∀ 有限入力 ⇒ 全出力は有限
```

- **テスト**: `wasm/correlation/tests/invariants.rs` — `corr_inv_7_*`
- **ロール**: invariant-guardian
- **契約**: ANA-005
