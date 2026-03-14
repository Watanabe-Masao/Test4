# Observation Automation Plan — 自動観測ハーネス設計

## 目的

dual-run compare の観測を、人手ではなく自動実行・自動判定・自動レポートで回す。
vitest integration test として実装し、CI で自動実行可能にする。

## アーキテクチャ決定

### なぜ vitest ベースか（E2E ではなく）

E2E テスト（Playwright）は `npm run preview`（本番ビルド）で実行される。
本番ビルドでは `import.meta.env.DEV === false` となり、dual-run compare は無効化される。
`__dualRunStats` も DEV 限定で登録される。

したがって、observation harness は **vitest integration test** として実装する。
vitest は Vite DEV 環境で動作するため、`import.meta.env.DEV === true` であり、
dual-run compare パイプラインが完全に動作する。

### 構成

```
app/src/test/observation/
├── observationRunner.ts         — ハーネスコア（reset / summary / log 回収）
├── observationAssertions.ts     — pass / warning / fail 判定ロジック
├── observationReport.ts         — JSON / Markdown レポート生成
├── fixtures/
│   ├── grossProfitFixtures.ts   — grossProfit 用 4 カテゴリ
│   ├── budgetAnalysisFixtures.ts
│   ├── forecastFixtures.ts
│   └── factorDecompositionFixtures.ts
├── grossProfitObservation.test.ts
├── budgetAnalysisObservation.test.ts
├── forecastObservation.test.ts
└── factorDecompositionObservation.test.ts
```

## 各 engine の主要経路定義

### grossProfit（8 関数）

| 経路 | 対応関数 | フィクスチャで踏む条件 |
|---|---|---|
| inventory path | calculateInvMethod | openingInventory / closingInventory あり / null |
| estimated path | calculateEstMethod | coreSales + discountRate + markupRate |
| core sales path | calculateCoreSales | totalSales - flower - directProduce |
| discount rate path | calculateDiscountRate | discountAmount / salesAmount |
| discount impact path | calculateDiscountImpact | coreSales × markupRate × discountRate |
| markup path | calculateMarkupRates | purchase + delivery + transfer |
| transfer path | calculateTransferTotals | 4 方向合計 |
| inventory cost path | calculateInventoryCost | totalCost - deliverySalesCost |

### budgetAnalysis（2 関数）

| 経路 | 対応関数 | フィクスチャで踏む条件 |
|---|---|---|
| single-store budget | calculateBudgetAnalysis | daily budget + daily sales + elapsed |
| gross profit budget | calculateGrossProfitBudget | grossProfit + budget + elapsed |

### forecast（5 pure 関数）

| 経路 | 対応関数 | フィクスチャで踏む条件 |
|---|---|---|
| stddev path | calculateStdDev | dailySales Map |
| anomalies path | detectAnomalies | dailySales Map |
| WMA path | calculateWMA | dailySales Map (≥2 entries) |
| regression path | linearRegression | dailySales Map (≥2 entries) |
| trend path | analyzeTrend | monthlyData array (≥3 entries) |

### factorDecomposition（4 関数）

| 経路 | 対応関数 | フィクスチャで踏む条件 |
|---|---|---|
| 2-factor | decompose2 | prevSales / curSales / prevCust / curCust |
| 3-factor | decompose3 | + prevQty / curQty |
| 5-factor | decompose5 | + categories |
| price-mix | decomposePriceMix | categories のみ |

## フィクスチャカテゴリ

| カテゴリ | 目的 |
|---|---|
| normal | 通常値。主要経路の基本動作を確認 |
| null-zero-missing | 欠損・ゼロ値。null propagation と zero divisor safety を確認 |
| extreme | 大値（1e10〜1e12）。数値安定性を確認 |
| boundary | 境界値（最小入力、100% 達成率等）。edge case を確認 |

## 動作フロー

```
1. observer.reset()
2. setExecutionMode('dual-run-compare')
3. mock WASM → TS passthrough（clean 検証）
4. bridge 経由で全関数を固定フィクスチャで実行
5. getSummary() → verdict / callCounts / mismatchCounts
6. judgeObservation() → pass / warning / fail
7. buildJsonReport() → JSON レポート
8. vitest assertion で判定を検証
```

## CI 統合

```bash
# 観測ハーネスを含む全テスト実行
cd app && npm test

# 観測ハーネスのみ実行
cd app && npx vitest run src/test/observation/
```

## mismatch 検出テスト

各 engine の観測テストには「WASM が異なる値を返す」ケースも含まれている。
これにより、mismatch detection pipeline 自体が正しく動作することも自動検証する。

## E2E 観測（Playwright ベース）

vitest integration test に加え、DEV サーバーを利用した E2E 観測も実装済み。
実 WASM バイナリ + 実 TS の dual-run compare をブラウザ環境で検証する。

### なぜ E2E も必要か

vitest ベースの観測は WASM を mock している。実 WASM の FFI 境界（Float64Array の
packing/unpacking、NaN ↔ null 変換、precision）はブラウザ環境でしか検証できない。

### 前提条件

- DEV サーバー（`npm run dev`）で `import.meta.env.DEV === true`
- `__dualRunStats` / `__runObservation` が window に登録済み
- 全 4 engine の WASM モジュールが初期化済み（main.tsx で init）
- `playwright.observation.config.ts` を使用（PROD preview ではなく DEV server）

### 構成

```
app/e2e/
├── dual-run-observation.spec.ts       — メイン E2E spec
├── utils/
│   ├── dualRunStatsClient.ts          — __dualRunStats Playwright wrapper
│   ├── observationMode.ts             — localStorage 経由の mode 切替 + reload
│   ├── observationAssertions.ts       — pass / warning / fail 判定
│   ├── observationExpectations.ts     — 全 engine × 関数名の期待値定義
│   ├── observationReport.ts           — JSON / Markdown レポート生成
│   └── observationRunner.ts           — 観測オーケストレータ
├── fixtures/observation/
│   ├── grossProfit-normal.json
│   ├── grossProfit-null-zero-missing.json
│   ├── budgetAnalysis-normal.json
│   └── forecast-normal.json
app/src/application/services/
└── observationEntry.ts                — DEV-only __runObservation ハンドラ
app/playwright.observation.config.ts   — DEV server 向け Playwright config
```

### 動作フロー

```
1. Playwright → page.goto('/') + waitForLoadState('networkidle')
2. setObservationMode(page, 'dual-run-compare') → localStorage 書込み + reload
3. resetDualRunStats(page) → observer.reset()
4. runObservation(page, engine, fixtureData) → window.__runObservation() 呼出し
5. getDualRunSummary(page) → verdict / callCounts / mismatchCounts 回収
6. getDualRunLog(page) → mismatch 詳細ログ回収
7. evaluateObservation() → pass / warning / fail 判定
8. buildJsonReport() / buildMarkdownReport() → レポート生成
```

### テストカバレッジ

| describe | テスト内容 | テスト数 |
|---|---|---|
| Infrastructure | __dualRunStats / __runObservation 可用性、reset 動作、mode 切替 | 4 |
| grossProfit | normal (8関数)、null-zero-missing (safe execution) | 2 |
| budgetAnalysis | normal (2関数) | 1 |
| forecast | normal (5関数) | 1 |
| Cross-engine report | 全 3 engine の JSON + Markdown レポート生成 | 1 |

### 実行方法

```bash
cd app && npx playwright test --config=playwright.observation.config.ts
```

### 判定基準

- **pass**: 全関数が呼ばれ、mismatch なし（または numeric-within-tolerance のみ）
- **warning**: tolerance 内の mismatch あり（WASM 精度差は想定内）
- **fail**: invariant-violation / null-mismatch / 未呼出関数あり

## 制限事項

- vitest 観測: WASM は mock（実 WASM バイナリはロードしない）
- E2E 観測: DEV サーバー必須（PROD ビルドでは dual-run compare 無効）
- E2E 観測: WASM 未初期化の場合、ts-only にフォールバック（compare は発生しない）
- 観測ハーネスは TS 実装の正しさを 4 フィクスチャ × 全関数で保証する
