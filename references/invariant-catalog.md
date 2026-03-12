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

- **テスト**: `architectureGuard.test.ts` — `domain/ は外部層に依存しない`
- **ロール**: architecture

### INV-ARCH-02: application → infrastructure は許可リストのみ

```
許可リスト外の application/ → infrastructure/ インポート = 0件
```

- **テスト**: `architectureGuard.test.ts` — `application/ は infrastructure/ に直接依存しない`
- **ロール**: architecture
- **許可リスト**: DuckDB フック（14件）、ストレージ永続化（3件）、インポート（4件）、エクスポート（1件）、i18n（1件）

### INV-ARCH-03: presentation → infrastructure は許可リストのみ

```
許可リスト外の presentation/ → infrastructure/ インポート = 0件
```

- **テスト**: `architectureGuard.test.ts` — `presentation/ は infrastructure/ に直接依存しない`
- **ロール**: architecture
- **許可リスト**: DevTools/QueryProfilePanel.tsx のみ

### INV-ARCH-04: application → presentation の依存なし

- **テスト**: `architectureGuard.test.ts` — `application/ は presentation/ に依存しない`
- **ロール**: architecture

### INV-ARCH-05: infrastructure → presentation の依存なし

- **テスト**: `architectureGuard.test.ts` — `infrastructure/ は presentation/ に依存しない`
- **ロール**: architecture

### INV-ARCH-06: 許可リストのファイルが実在する

- **テスト**: `architectureGuard.test.ts` — `許可リストのファイルが実在する`
- **ロール**: architecture
- **目的**: ファイル削除後に許可リストの残骸が残らないことを保証

### INV-ARCH-07: presentation は domain/calculations のビジネス関数を直接 import しない

- **テスト**: `architectureGuard.test.ts` — `presentation/ は domain/calculations/ のビジネス計算関数を直接 import しない`
- **ロール**: architecture
- **許可**: `import type` は OK（型のみ）。`domain/calculations/utils` のフォーマット関数は OK。

### INV-ARCH-08: presentation は getDailyTotalCost を直接使用しない

- **テスト**: `architectureGuard.test.ts` — `presentation/ は getDailyTotalCost を直接使用しない`
- **ロール**: architecture
- **代替**: `rec.totalCost`（事前計算済みフィールド）を使用

## フック複雑度不変条件

### INV-HOOK-01: hooks/ に @internal export が存在しない

- **テスト**: `hookComplexityGuard.test.ts` — `R3: hooks/ に @internal export がない`
- **ロール**: architecture
- **違反時の影響**: テストのためだけの export が設計を歪める

### INV-HOOK-02: テストに typeof === 'function' アサーションが存在しない

- **テスト**: `hookComplexityGuard.test.ts` — `R3: テストに typeof === "function" アサーションがない`
- **ロール**: architecture
- **違反時の影響**: 存在確認テストがカバレッジを水増しする

### INV-HOOK-03: hooks/ の export にカバレッジ目的のコメントが存在しない

- **テスト**: `hookComplexityGuard.test.ts` — `R10: hooks/ の export にカバレッジ目的のコメントがない`
- **ロール**: architecture
- **違反時の影響**: カバレッジ回復のための設計変更が混入する

### INV-STORE-01: stores/ の set() コールバック内に算術式が存在しない

- **テスト**: `hookComplexityGuard.test.ts` — `R7: stores/ の set() コールバック内に算術式がない`
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
