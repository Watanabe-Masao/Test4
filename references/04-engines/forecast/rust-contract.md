# forecast Rust/WASM FFI Contract

## Overview

forecast WASM crate (`wasm/forecast/`) は 5 つの Date-free pure 関数を Rust で実装し、
`wasm_bindgen` 経由で JavaScript から呼び出し可能にする。

## FFI 境界仕様

### calculate_stddev

| 項目 | 仕様 |
|---|---|
| Rust 入力 | `&[f64]` (values) |
| Rust 出力 | `StdDevResult { mean, std_dev }` |
| WASM 戻り値 | `Float64Array[2]` — `[mean, stdDev]` |
| TS adapter | `forecastWasm.ts: calculateStdDevWasm()` |

### detect_anomalies

| 項目 | 仕様 |
|---|---|
| Rust 入力 | `&[f64]` (keys), `&[f64]` (values), `f64` (threshold) |
| Rust 出力 | `Vec<AnomalyEntry>` |
| WASM 戻り値 | `Float64Array[1 + N*6]` — `[count, day₀, value₀, mean₀, stdDev₀, zScore₀, isAnomaly₀, ...]` |
| isAnomaly encoding | `1.0` = true, `0.0` = false |
| TS adapter | `forecastWasm.ts: detectAnomaliesWasm()` |
| 前処理（TS 側） | `Map → entries.filter(v > 0).sort(key asc) → parallel arrays` |

### calculate_wma

| 項目 | 仕様 |
|---|---|
| Rust 入力 | `&[f64]` (keys), `&[f64]` (values), `u32` (window) |
| Rust 出力 | `Vec<WmaEntry>` |
| WASM 戻り値 | `Float64Array[1 + N*3]` — `[count, day₀, actual₀, wma₀, ...]` |
| TS adapter | `forecastWasm.ts: calculateWMAWasm()` |
| 前処理（TS 側） | `Map → entries.filter(v > 0).sort(key asc) → parallel arrays` |

### linear_regression

| 項目 | 仕様 |
|---|---|
| Rust 入力 | `&[f64]` (keys), `&[f64]` (values) |
| Rust 出力 | `RegressionResult { slope, intercept, r_squared }` |
| WASM 戻り値 | `Float64Array[3]` — `[slope, intercept, rSquared]` |
| TS adapter | `forecastWasm.ts: linearRegressionWasm()` |
| 前処理（TS 側） | `Map → entries.filter(v > 0) → parallel arrays` |

### analyze_trend

| 項目 | 仕様 |
|---|---|
| Rust 入力 | `&[f64]` (years), `&[f64]` (months), `&[f64]` (totalSales) |
| Rust 出力 | `TrendResult` (computed fields only) |
| WASM 戻り値 | Packed `Float64Array` (下記レイアウト) |
| TS adapter | `forecastWasm.ts: analyzeTrendWasm()` |
| dataPoints | Rust は返さない。TS 側で sorted dataPoints と計算結果を組み合わせる |

**Float64Array layout:**

```
[0]           = N (dataPointCount)
[1..N]        = momChanges (NaN = null)
[N+1..2N]     = yoyChanges (NaN = null)
[2N+1..3N]    = movingAvg3 (NaN = null)
[3N+1..4N]    = movingAvg6 (NaN = null)
[4N+1..4N+12] = seasonalIndex (12 values)
[4N+13]       = overallTrend (0=up, 1=down, 2=flat)
[4N+14]       = averageMonthlySales
```

## null 表現

| 文脈 | 表現方法 |
|---|---|
| Rust 内部 | `f64::NAN` |
| FFI (Float64Array) | `NaN` |
| TS 変換 | `Number.isNaN(v) ? null : v` |

## 不変条件 (F-INV)

| ID | 条件 | 検証箇所 |
|---|---|---|
| F-INV-1 | stdDev >= 0 | Rust tests + Bridge tests |
| F-INV-2 | 全同値 → stdDev == 0 | Rust tests |
| F-INV-3 | mean == sum / count | Rust tests |
| F-INV-8 | 0 <= R² <= 1 | Rust tests + Bridge tests |
| F-INV-10 | isAnomaly == (\|zScore\| > threshold) | Rust tests |
| F-INV-12 | seasonalIndex.length == 12 | Rust tests |
| F-INV-13 | overallTrend ∈ {up, down, flat} | Rust tests |

## ファイル一覧

| レイヤー | ファイル | 責務 |
|---|---|---|
| Rust FFI | `wasm/forecast/src/lib.rs` | FFI 境界のみ |
| Rust pure | `wasm/forecast/src/{stddev,anomalies,wma,regression,trend}.rs` | 純粋計算 |
| Rust types | `wasm/forecast/src/types.rs` | 結果構造体 |
| Rust utils | `wasm/forecast/src/utils.rs` | safe_divide |
| TS adapter | `app/src/application/services/forecastWasm.ts` | Float64Array → TS 型変換 |
| TS engine | `app/src/application/services/wasmEngine.ts` | 初期化・状態管理 |
| TS bridge | `app/src/application/services/forecastBridge.ts` | 3 モード切替 |
