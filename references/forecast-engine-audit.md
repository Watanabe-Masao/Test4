# Forecast Engine 監査メモ

Phase 6A〜6B: Authoritative Engine 次候補の事前監査 + FFI 適合性評価

## 1. 対象モジュール

| ファイル | 行数 | 役割 |
|---|---|---|
| `domain/calculations/forecast.ts` | 195 | 週別集計・曜日別平均・異常値検出 |
| `domain/calculations/algorithms/advancedForecast.ts` | 245 | WMA・線形回帰・月末予測 |
| `domain/calculations/algorithms/trendAnalysis.ts` | 185 | 複数月トレンド分析・季節性 |

合計約 625 行。factorDecomposition（約 300 行）より大きいが、3 ファイルに分割済み。

## 2. 公開関数一覧

### forecast.ts（6 関数）

| 関数 | 引数 | 戻り値 | 用途 |
|---|---|---|---|
| `calculateStdDev` | `readonly number[]` | `{ mean, stdDev }` | 統計基盤 |
| `getWeekRanges` | `year, month` | `{ weekNumber, startDay, endDay }[]` | カレンダー計算 |
| `calculateWeeklySummaries` | `ForecastInput` | `WeeklySummary[]` | 週別売上集計 |
| `calculateDayOfWeekAverages` | `ForecastInput` | `DayOfWeekAverage[]` | 曜日別平均 |
| `detectAnomalies` | `ReadonlyMap, threshold?` | `AnomalyDetectionResult[]` | Z-score 異常検出 |
| `calculateForecast` | `ForecastInput` | `ForecastResult` | 上記 3 つの統合 |

### advancedForecast.ts（4 関数）

| 関数 | 引数 | 戻り値 | 用途 |
|---|---|---|---|
| `calculateWMA` | `ReadonlyMap, window?` | `WMAEntry[]` | 加重移動平均 |
| `linearRegression` | `ReadonlyMap` | `LinearRegressionResult` | 線形回帰 |
| `projectDowAdjusted` | `year, month, ReadonlyMap, dataEndDay` | `number` | 曜日調整予測 |
| `calculateMonthEndProjection` | `year, month, ReadonlyMap` | `MonthEndProjection` | 複合月末予測 |

### trendAnalysis.ts（1 関数）

| 関数 | 引数 | 戻り値 | 用途 |
|---|---|---|---|
| `analyzeTrend` | `readonly MonthlyDataPoint[]` | `TrendAnalysisResult` | 複数月トレンド |

## 3. 入出力型一覧

### FFI 不向き要素

| 型 | 使用箇所 | 問題 | 対策 |
|---|---|---|---|
| `ReadonlyMap<number, number>` | `ForecastInput.dailySales`, `dailyGrossProfit`, `calculateWMA`, `linearRegression`, `projectDowAdjusted`, `calculateMonthEndProjection`, `detectAnomalies` | JSON 非直列化 | `Array<[number, number]>` に変換 |
| `Date` | `getWeekRanges`, `calculateDayOfWeekAverages`, `projectDowAdjusted` | 内部のみ（getDay/getDate） | Rust 側で chrono 使用、または事前に曜日テーブルを渡す |

### FFI 適合な型（変換不要）

- `WeeklySummary`, `DayOfWeekAverage`, `AnomalyDetectionResult` — 全フィールド `number | boolean`
- `WMAEntry`, `LinearRegressionResult`, `MonthEndProjection` — 全フィールド `number`
- `TrendAnalysisResult` — `(number | null)[]` + `'up' | 'down' | 'flat'` + `MonthlyDataPoint[]`
- `MonthlyDataPoint` — 全フィールド `number | null`

## 4. 呼び出し元一覧

### Domain 層内

- `advancedForecast.ts` → `forecast.ts`（`calculateStdDev` を import）
- `forecast.barrel.ts` → 全 forecast 関数を re-export
- `index.ts` → barrel 経由で公開

### Application 層

| ファイル | import 対象 | 責務 |
|---|---|---|
| `hooks/useForecast.ts` | `calculateForecast`, `getWeekRanges` | useMemo ラッパー（thin） |
| `hooks/calculation.ts` | barrel re-export | Presentation への窓口 |
| `hooks/useStatistics.ts` | `calculateStdDev` | 統計 hook |

### Presentation 層

| ファイル | 責務 |
|---|---|
| `Forecast/ForecastPage.helpers.ts` | `buildForecastInput`, `computeStackedWeekData` 等（ViewModel 変換） |
| `Forecast/ForecastChartsBase.tsx` | 週別・曜日別チャート描画 |
| `Forecast/ForecastChartsCustomer.tsx` | 客数・客単価チャート |
| `Forecast/ForecastChartsCustomer.vm.ts` | ViewModel（データ整形） |
| `Forecast/ForecastChartsDecomp.tsx` | 要因分解チャート |
| `Dashboard/widgets/ForecastTools.tsx` | ダッシュボードウィジェット |
| `Dashboard/widgets/PlanActualForecast.tsx` | 計画実績対比 |
| `Insight/InsightTabForecast.tsx` | インサイトタブ |

## 5. 純粋性・Authoritative 判定

### Pure 判定: ✅ 完全に pure

- 副作用なし（DOM/IO/state なし）
- 外部依存なし（`safeDivide` のみ、これも pure）
- `Date` は内部カレンダー計算のみ、戻り値に含まれない
- `ReadonlyMap` は入力で受けるが、`.get()` と `.entries()` しか呼ばない

### Authoritative 判定: ⚠️ 混合

| 関数群 | 判定 | 理由 |
|---|---|---|
| `calculateWeeklySummaries` | **Authoritative** | 週別売上・粗利率は確定値として UI に表示 |
| `calculateDayOfWeekAverages` | **Authoritative** | 曜日別平均は確定統計量 |
| `detectAnomalies` | **Pure Analytics** | Z-score 検出は分析補助（表示の正確さが求められるが、業務確定値ではない） |
| `calculateStdDev` | **Pure Utility** | 数学ユーティリティ |
| `getWeekRanges` | **Pure Utility** | カレンダー計算 |
| `calculateWMA` | **Pure Analytics** | 予測用中間値 |
| `linearRegression` | **Pure Analytics** | 回帰統計 |
| `projectDowAdjusted` | **Pure Analytics** | 予測値（確定ではない） |
| `calculateMonthEndProjection` | **Pure Analytics** | 複合予測（確定ではない） |
| `analyzeTrend` | **Pure Analytics** | トレンド判定 |

**結論:** factorDecomposition と異なり、全関数が authoritative ではない。
週別集計・曜日別平均は authoritative、予測系は analytics substrate。
WASM 化の価値は「計算速度」よりも「Rust 型安全性による数学的正確さの保証」にある。

## 6. FFI 適合性評価

### 変換が必要な箇所

```
TS (Map) → Bridge (serialize) → WASM (Vec<(u32, f64)>) → Bridge (deserialize) → TS (POJO)
```

**入力マーシャリング:**
```typescript
// Map → Array<[number, number]>
const serialized = {
  year: input.year,
  month: input.month,
  dailySales: Array.from(input.dailySales.entries()),
  dailyGrossProfit: Array.from(input.dailyGrossProfit.entries()),
}
```

**出力:** 変換不要（全て POJO + プリミティブ）

### Date 処理の選択肢

| 選択肢 | メリット | デメリット |
|---|---|---|
| A: Rust 側で chrono | 完全 Rust 化 | chrono crate の WASM サイズ |
| B: TS 側で曜日テーブル事前計算 | WASM サイズ削減 | 入力が増える |
| C: Date 系関数を TS に残す | 最小変更 | 分割が増える |

**推奨:** 選択肢 C。`getWeekRanges` と `calculateDayOfWeekAverages` は TS に残し、
数値計算コア（stdDev, WMA, linearRegression, anomaly detection）を WASM 化。

### 判定サマリー

| 関数 | FFI 判定 | 備考 |
|---|---|---|
| `calculateStdDev` | ✅ そのまま移行可 | `number[]` → `f64[]` |
| `calculateWMA` | ✅ Map 変換のみ | `Map → Vec<(u32, f64)>` |
| `linearRegression` | ✅ Map 変換のみ | 出力は 3 つの f64 |
| `detectAnomalies` | ✅ Map 変換のみ | 出力は POJO 配列 |
| `calculateWeeklySummaries` | ⚠️ Date 依存 | `getWeekRanges` を TS 側で事前計算すれば可 |
| `calculateDayOfWeekAverages` | ⚠️ Date 依存 | 曜日テーブルを渡せば可 |
| `getWeekRanges` | ❌ TS に残す | Date 依存、カレンダー計算 |
| `projectDowAdjusted` | ⚠️ Date 依存 | 同上 |
| `calculateMonthEndProjection` | ⚠️ 複合 | 内部で上記関数を全て呼ぶ |
| `analyzeTrend` | ✅ そのまま移行可 | Date 不使用、純数値 |

## 7. Rust/WASM 候補としての難所

### 難所 1: ReadonlyMap の FFI 越え

factorDecomposition では入力が plain object だった。forecast は `ReadonlyMap<number, number>` を
多用するため、Bridge 層で Map→Array 変換が必須。性能への影響は軽微（数十エントリ）だが、
全公開関数の入力を変換する必要がある。

### 難所 2: Date 依存のカレンダー計算

`getWeekRanges`, `calculateDayOfWeekAverages`, `projectDowAdjusted` は内部で
`new Date()` を使う。WASM には Date API がない。

**対策案:**
- 数値計算コアのみ WASM 化し、Date 依存関数は TS に残す
- または、呼び出し元から曜日テーブル `dayOfWeekTable: number[]`（day→dow mapping）を渡す

### 難所 3: 関数群の粒度

factorDecomposition は `decompose2/3/5` + `calculateForecast` という明確なエントリポイントがあった。
forecast は 11 関数が細粒度で公開されており、Bridge のエントリポイント設計が重要。

**推奨:** `calculateForecast`（統合関数）と `calculateMonthEndProjection` の 2 つを
Bridge エントリポイントとし、個別関数は Rust 内部で呼ぶ。

### 難所 4: trendAnalysis の入力サイズ

`analyzeTrend` は `MonthlyDataPoint[]`（14 フィールド × N ヶ月）を受ける。
N が小さい（通常 12〜36 ヶ月）ため性能問題はないが、
入力の直列化コストが factorDecomposition より大きい。

## 8. 移行優先度の提案

### Phase 1 候補（Date 非依存、高価値）

1. `calculateStdDev` — ユーティリティ、他モジュールからも使用
2. `linearRegression` — 数学コア、R² 計算含む
3. `calculateWMA` — 数値配列処理
4. `detectAnomalies` — Z-score 計算
5. `analyzeTrend` — 複数月分析（Date 不使用）

### Phase 2 候補（Date 依存、要設計）

6. `calculateWeeklySummaries` — 曜日テーブル注入で対応可
7. `calculateDayOfWeekAverages` — 同上
8. `projectDowAdjusted` — 同上
9. `calculateMonthEndProjection` — 上記全てを内包

### TS に残す

10. `getWeekRanges` — 純カレンダー計算、WASM 化の価値なし
