# Forecast TS 側責務マップ

Phase 6D: WASM 移行時に TS 側に残すもの / 移すもの / 整理が必要なものの切り分け

## 1. 責務マップ概要

```
                     ┌─────────────────────────────┐
                     │   Presentation Layer         │
                     │                              │
                     │  ForecastPage.helpers.ts      │ ← ViewModel 変換（TS に残す）
                     │  ForecastChartsCustomer.vm.ts │ ← ViewModel 変換（TS に残す）
                     │  ForecastChartsBase.tsx       │ ← 描画のみ（TS に残す）
                     └──────────┬────────────────────┘
                                │ import
                     ┌──────────▼────────────────────┐
                     │   Application Layer            │
                     │                                │
                     │  useForecast.ts (thin hook)     │ ← useMemo wrapper（TS に残す）
                     │  calculation.ts (barrel)        │ ← re-export（TS に残す）
                     │  forecastBridge.ts (未作成)      │ ← Bridge（新規作成）
                     └──────────┬─────────────────────┘
                                │ import
                     ┌──────────▼─────────────────────┐
                     │   Domain Layer                  │
                     │                                 │
                     │  forecast.ts        ─┐          │
                     │  advancedForecast.ts ─┼─ WASM 化候補（数値計算コア）
                     │  trendAnalysis.ts   ─┘          │
                     └─────────────────────────────────┘
```

## 2. WASM に移す候補（Phase 3 pure 化対象）

### 数値計算コア（Date 非依存）

| 関数 | ファイル | 理由 |
|---|---|---|
| `calculateStdDev` | `forecast.ts` | 純数学、他モジュールからも使用 |
| `detectAnomalies` | `forecast.ts` | Z-score、Map→Array 変換のみ |
| `calculateWMA` | `advancedForecast.ts` | 加重移動平均、Map→Array 変換のみ |
| `linearRegression` | `advancedForecast.ts` | 最小二乗法、Map→Array 変換のみ |
| `analyzeTrend` | `trendAnalysis.ts` | 複数月分析、Date 不使用、POJO 入力 |

### 条件付き移行候補（Date 依存 → 曜日テーブル注入で解決可）

| 関数 | ファイル | Date 使用箇所 | 解決策 |
|---|---|---|---|
| `calculateWeeklySummaries` | `forecast.ts` | `getWeekRanges` 呼び出し | 週範囲を引数で受ける |
| `calculateDayOfWeekAverages` | `forecast.ts` | `new Date().getDay()` | `dayOfWeekTable: number[]` 注入 |
| `projectDowAdjusted` | `advancedForecast.ts` | `new Date().getDay()` | 同上 |
| `calculateMonthEndProjection` | `advancedForecast.ts` | 上記全てを内包 | Facade パターンで分離 |

## 3. TS に残すもの

### カレンダー計算

| 関数 | 理由 |
|---|---|
| `getWeekRanges` | `new Date()` 依存。カレンダー計算は TS/JS の強み。WASM 化の価値なし |

### Application 層 hook

| ファイル | 理由 |
|---|---|
| `useForecast.ts` | React hook（`useMemo`）。TS に残す以外の選択肢なし |
| `useWeekRanges` | 同上 |
| `calculation.ts` | barrel re-export。Bridge 経由に切り替え |

### Presentation 層 ViewModel

| ファイル | 理由 |
|---|---|
| `ForecastPage.helpers.ts` | UI 固有の変換（チャートデータ整形、曜日ラベル付与、累計計算）。domain 計算ではない |
| `ForecastChartsCustomer.vm.ts` | ViewModel パターン。domain 計算ではない |

## 4. hook 内の隠れた計算の有無

### useForecast.ts: ✅ 問題なし

```typescript
// 実装全体（2 関数のみ、完全に thin wrapper）
export function useForecast(input: ForecastInput | null): ForecastResult | null {
  return useMemo(() => (input ? calculateForecast(input) : null), [input])
}
export function useWeekRanges(year: number, month: number) {
  return useMemo(() => getWeekRanges(year, month), [year, month])
}
```

- 独自計算なし
- useMemo のみ
- 禁止事項 #9（pure+authoritative を制御層に新規実装）に該当しない

## 5. Presentation 層の計算混在チェック

### ForecastPage.helpers.ts: ⚠️ 境界的

以下の関数群は **ViewModel 変換** として正当だが、内部に数値計算を含む:

| 関数 | 計算内容 | 判定 |
|---|---|---|
| `buildForecastInput` | Map 構築（`sales - cost` = 粗利計算） | ⚠️ 粗利計算は domain 責務だが、ここでは Map 変換の一部。現状は許容範囲 |
| `computeStackedWeekData` | 曜日別売上の再集計 | ⚠️ `calculateDayOfWeekAverages` と類似だがチャート構造が異なる。ViewModel として正当 |
| `buildDailyCustomerData` | `calculateTransactionValue` 呼び出し | ✅ domain 関数を呼んでいるだけ |
| `buildMovingAverages` | 移動平均計算 | ⚠️ `calculateWMA` と類似。ただし客数・客単価含むため別物。ViewModel として正当 |
| `buildRelationshipData` | 指数化（平均比） | ✅ UI 固有の正規化 |
| `buildDailyDecomposition` | `decompose2` 呼び出し + 累計計算 | ✅ domain 関数呼び出し + ViewModel 加工 |
| `buildDowDecomposition` | 曜日別集計 | ✅ ViewModel 集計 |
| `buildWeeklyDecomposition` | 週別集計 | ✅ ViewModel 集計 |

**結論:** 現状の Presentation 層に domain 責務の流出はない。
`buildForecastInput` の粗利計算（`sales - cost`）は domain の `grossProfit` 計算と
同一だが、Map 構築の一部として許容範囲。将来の分離候補として記録のみ。

## 6. Bridge 設計の方針

### factorDecomposition との差異

| 観点 | factorDecomposition | forecast |
|---|---|---|
| エントリポイント数 | 3（decompose2/3/5） | 2 推奨（calculateForecast, calculateMonthEndProjection） |
| 入力型 | plain number | `ReadonlyMap<number, number>`（要変換） |
| 出力型 | plain object | plain object（変換不要） |
| Date 依存 | なし | あり（一部関数） |
| 不変条件 | シャープリー恒等式 | 週合計==日合計、R²範囲、CI 順序 |
| dual-run compare | 実装済み | 未実装（同パターンで拡張可能） |

### Bridge エントリポイント設計案

```typescript
// forecastBridge.ts（新規作成）

type ForecastMode = 'ts-only' | 'wasm-only' | 'dual-run-compare'

// エントリポイント 1: 基本予測
function calculateForecastBridged(input: ForecastInput): ForecastResult {
  // Map → Array 変換 → WASM 呼び出し → 結果返却
}

// エントリポイント 2: 月末予測
function calculateMonthEndProjectionBridged(
  year: number, month: number,
  dailySales: ReadonlyMap<number, number>
): MonthEndProjection {
  // Map → Array 変換 → WASM 呼び出し → 結果返却
}

// エントリポイント 3: トレンド分析
function analyzeTrendBridged(
  dataPoints: readonly MonthlyDataPoint[]
): TrendAnalysisResult {
  // POJO → WASM → 結果返却（変換不要）
}
```

### compare 時の不変条件チェック

```typescript
function compareForecastResults(ts: ForecastResult, wasm: ForecastResult): boolean {
  // F-INV-4: 週合計一致
  const tsSalesSum = ts.weeklySummaries.reduce((s, w) => s + w.totalSales, 0)
  const wasmSalesSum = wasm.weeklySummaries.reduce((s, w) => s + w.totalSales, 0)
  if (Math.abs(tsSalesSum - wasmSalesSum) > 1) return false

  // 各週の値比較（許容差 ±1）
  for (let i = 0; i < ts.weeklySummaries.length; i++) {
    if (Math.abs(ts.weeklySummaries[i].totalSales - wasm.weeklySummaries[i].totalSales) > 1) return false
  }

  // 曜日別平均比較（許容差 ±1e-10）
  // 異常値検出比較（day + isAnomaly の一致）
  return true
}
```

## 7. 次ステップ: Phase 3 pure 化対象リスト

WASM 移行前に TS 側で実施すべき準備作業:

| # | 作業 | 対象 | 理由 |
|---|---|---|---|
| 1 | 不変条件テスト追加 | `forecast.test.ts` | F-INV-4, F-INV-7 が未テスト |
| 2 | 閏年テスト追加 | `forecast.test.ts` | E-10 が未テスト |
| 3 | `analyzeTrend` テスト追加 | `trendAnalysis.test.ts` | F-INV-12, F-INV-13 の検証 |
| 4 | Date 分離リファクタ | `forecast.ts` | `calculateWeeklySummaries` に曜日テーブル注入パラメータ追加（オプショナル） |
| 5 | Bridge 骨格作成 | `forecastBridge.ts` | `ts-only` モードのみで開始 |
| 6 | dual-run observer 拡張 | `dualRunObserver.ts` | forecast 用のメトリクス定義 |
