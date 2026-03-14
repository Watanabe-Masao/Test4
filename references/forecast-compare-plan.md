# forecast Dual-Run Compare 計画

## 目的

compare-ready まで到達している forecast に対して、
実装直前仕様を compare plan として固定する。
このフェーズでは compare 実装の前段までを対象とし、Date 依存は引き続き対象外とする。

## compare 対象（5 関数）

| # | 関数 | ファイル | 入力型 | 出力型 |
|---|---|---|---|---|
| 1 | `calculateStdDev` | `forecast.ts` | `readonly number[]` | `{ mean, stdDev }` |
| 2 | `detectAnomalies` | `forecast.ts` | `ReadonlyMap<number, number>` | `AnomalyDetectionResult[]` |
| 3 | `calculateWMA` | `advancedForecast.ts` | `ReadonlyMap<number, number>` | `WMAEntry[]` |
| 4 | `linearRegression` | `advancedForecast.ts` | `ReadonlyMap<number, number>` | `LinearRegressionResult` |
| 5 | `analyzeTrend` | `trendAnalysis.ts` | `readonly MonthlyDataPoint[]` | `TrendAnalysisResult` |

全て Date 非依存の pure core。

## compare 対象外（Date 依存）

| 関数 | ファイル | 除外理由 |
|---|---|---|
| `getWeekRanges` | `forecast.ts` | `new Date()` 直接使用。カレンダー計算 |
| `calculateDayOfWeekAverages` | `forecast.ts` | `new Date().getDay()` 直接使用 |
| `calculateWeeklySummaries` | `forecast.ts` | `getWeekRanges` 経由で Date 依存 |
| `projectDowAdjusted` | `advancedForecast.ts` | `new Date()` 直接使用 |
| `calculateMonthEndProjection` | `advancedForecast.ts` | `new Date()` 直接 + `projectDowAdjusted` 経由 |
| `calculateForecast` | `forecast.ts` | 内部 2/3 が Date 依存（composite） |

Date 依存関数の WASM 化は将来 Phase 2 で曜日テーブル注入により対応可能。

## ReadonlyMap<number, number> 変換仕様

### 課題

WASM（Rust）の FFI 境界では JavaScript の `Map` を直接受け渡しできない。
compare 対象 5 関数のうち 3 関数（`detectAnomalies`, `calculateWMA`, `linearRegression`）が
`ReadonlyMap<number, number>` を入力に取る。

### 変換フォーマット

**入力（TS → WASM）:**

```typescript
Array.from(map.entries()).sort(([a], [b]) => a - b)
// → [key, value][] のソート済み配列
```

ソート順はキー（day 番号）の昇順で固定（再現性の保証）。

**出力（WASM → TS）:**

出力型はすべて POJO（`WMAEntry[]`, `LinearRegressionResult`, `AnomalyDetectionResult[]`）であり、
Map への逆変換は不要。

### 変換の配置

| 層 | 変換の有無 | 理由 |
|---|---|---|
| Domain | なし | pure 関数は `ReadonlyMap` をそのまま受ける。FFI 関心事を持ち込まない |
| Bridge | **ここで変換する** | Bridge の責務は mode dispatch と型変換 |
| Presentation | なし | Bridge を通じて呼ぶだけ |

### compare 時の変換フロー

```
呼び出し元 (Map)
    │
    ├── TS 実装にも Map のまま渡す → TS 結果（POJO）
    │
    ├── Bridge: Map → sorted [key, value][] → WASM 実装に渡す → WASM 結果（POJO）
    │
    └── compare(TS結果, WASM結果) → 差分があれば observer に報告
```

## 関数別比較基準

### calculateStdDev

**比較項目:**
- `mean: number`
- `stdDev: number`

**invariant:**
- F-INV-1: stdDev ≥ 0
- F-INV-2: 全要素が同値 → stdDev == 0
- finite

**tolerance:** 1e-10

### detectAnomalies

**比較項目:**
- 件数一致
- 各要素の `day`, `value`, `zScore`, `isAnomaly` 一致

**invariant:**
- F-INV-3: isAnomaly == (|zScore| > threshold)
- 件数は意味差として扱う（tolerance 不適用）
- 順序一致

**tolerance:** 数値差 1e-10、件数差は意味差

### calculateWMA

**比較項目:**
- 各要素の `day`, `wma` 一致
- 配列長一致

**invariant:**
- F-INV-5: WMA は入力値の range 内
- finite

**tolerance:** 1e-10

### linearRegression

**比較項目:**
- `slope: number`
- `intercept: number`
- `rSquared: number`

**invariant:**
- F-INV-6: 0 ≤ R² ≤ 1
- F-INV-7: 完全線形データ → R² ≈ 1
- finite

**tolerance:** 1e-10（R² は範囲 invariant を優先）

### analyzeTrend

**比較項目:**
- `trend: 'up' | 'down' | 'stable'`（exact match）
- `score: number`
- `slope: number`
- `movingAverages: number[]`
- `seasonalIndices: number[]`

**invariant:**
- F-INV-8: trend direction は score の符号と一致
- finite

**tolerance:** 数値差 1e-10、trend direction は exact match（意味差）

## tolerance 定義

| 種類 | 許容差 | 備考 |
|---|---|---|
| 個別数値差 | 1e-10 | 標準 |
| 分析系（R² 等） | 1e-8 まで許容 | 浮動小数点精度の限界を考慮 |
| anomaly 件数 | exact match | 意味差として扱う |
| anomaly 順序 | exact match | 意味差として扱う |
| trend direction | exact match | 意味差として扱う |

## 既存 invariant tests との対応

| compare 対象 | 対応する invariant test |
|---|---|
| calculateStdDev | F-INV-1, F-INV-2 |
| detectAnomalies | F-INV-3, F-INV-4 |
| calculateWMA | F-INV-5 |
| linearRegression | F-INV-6, F-INV-7 |
| analyzeTrend | F-INV-8, F-INV-9, F-INV-10 |

全 compare 対象関数に対応する invariant test が存在する。

## compare 導入時に必要な bridge test の雛形

```
1. ts-only モード: 5 関数の bridge vs 直接呼び出し一致
2. wasm-only + idle: TS フォールバック
3. wasm-only + loading/error: TS フォールバック
4. dual-run-compare + idle: compare なし、warn なし
5. ForecastMismatchLog shape: 5 関数のモック WASM 差分検出
6. 一致時は silent: warn なし
7. ReadonlyMap 変換: Map 入力が bridge 経由で正しく処理される
8. F-INV invariants via bridge: 既存 invariant が bridge 経由でも成立
```

## dualRunObserver.ts への追加（将来）

compare 実装時に以下の 5 関数名を `FnName` に追加:
- `'calculateStdDev'`
- `'detectAnomalies'`
- `'calculateWMA'`
- `'linearRegression'`
- `'analyzeTrend'`

## mismatch 分類

| 分類 | 条件 |
|---|---|
| `numeric-within-tolerance` | maxAbsDiff ≤ 1e-10 かつ invariant ok |
| `numeric-over-tolerance` | maxAbsDiff > 1e-10 かつ invariant ok |
| `semantic-mismatch` | anomaly 件数/順序差、trend direction 不一致 |
| `invariant-violation` | R² 範囲外、stdDev 負値、finite 違反 |

## 実装状態（Phase 10 完了）

- ✅ compare 実装本体（forecastBridge.ts の書き換え）
- ✅ forecastWasm.ts の作成（スタブ — Rust 未実装）
- ✅ forecastBridge.test.ts の作成（36 テスト）
- ✅ dualRunObserver.ts への forecast 5 関数追加（FnName 19 関数）

## 未実施（将来フェーズ）

- Rust 実装
- WASM 接続（isWasmReady を getForecastWasmExports に変更）
- Date 依存関数の pure 化（曜日テーブル注入）
- observer / authoritative 昇格
