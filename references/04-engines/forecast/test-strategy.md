# Forecast テスト戦略

Phase 6C: Rust/WASM 移行に向けたテスト資産の棚卸しと不変条件の明文化

## 1. 既存テスト資産

### Domain 層テスト

| ファイル | テスト数 | カバー関数 | 品質 |
|---|---|---|---|
| `forecast.test.ts` | 12 | `calculateStdDev`(4), `getWeekRanges`(3), `calculateWeeklySummaries`(2), `calculateDayOfWeekAverages`(2), `detectAnomalies`(4), `calculateForecast`(1) | ✅ edge case 充実 |
| `advancedForecast.test.ts` | 9 | `calculateWMA`(3), `linearRegression`(4), `projectDowAdjusted`(2), `calculateMonthEndProjection`(2) | ✅ 正常系 + 空データ |

### Application 層テスト

| ファイル | テスト数 | 内容 |
|---|---|---|
| `useForecast.test.ts` | 軽量 | hook re-export の疎通確認 |

### Presentation 層テスト

| ファイル | テスト数 | 内容 |
|---|---|---|
| `ForecastPage.helpers.test.ts` | 多数 | ViewModel 変換（`buildForecastInput`, `computeStackedWeekData` 等） |

## 2. 不変条件カタログ

### 数学的不変条件

| ID | 条件 | 対象関数 | 検証方法 |
|---|---|---|---|
| F-INV-1 | `stdDev >= 0` | `calculateStdDev` | 任意入力で非負 |
| F-INV-2 | `mean(values) == 値の総和 / 個数` | `calculateStdDev` | 定義の直接検証 |
| F-INV-3 | 全値同一 → `stdDev == 0` | `calculateStdDev` | 同一値配列で検証 |
| F-INV-4 | `Σ(weekSales) == Σ(dailySales)` | `calculateWeeklySummaries` | 週合計 == 日合計 |
| F-INV-5 | 週範囲が月の全日をカバー（隙間なし・重複なし） | `getWeekRanges` | `allDays == [1..daysInMonth]` |
| F-INV-6 | `weekNumber` が 1 から連続 | `getWeekRanges` | 連番検証 |
| F-INV-7 | `Σ(dowAverage.count) == 売上>0 の日数` | `calculateDayOfWeekAverages` | カウント合計 |
| F-INV-8 | `0 <= rSquared <= 1` | `linearRegression` | 決定係数の範囲 |
| F-INV-9 | 完全線形データ → `rSquared ≈ 1.0` | `linearRegression` | `y = ax + b` データで検証 |
| F-INV-10 | `abs(zScore) > threshold ⟺ isAnomaly` | `detectAnomalies` | 全結果の一貫性 |
| F-INV-11 | `confidenceInterval.lower <= confidenceInterval.upper` | `calculateMonthEndProjection` | 区間の順序 |
| F-INV-12 | `seasonalIndex` の長さ == 12 | `analyzeTrend` | 配列長 |
| F-INV-13 | `overallTrend ∈ {'up', 'down', 'flat'}` | `analyzeTrend` | 列挙値 |

### 業務的不変条件

| ID | 条件 | 理由 |
|---|---|---|
| F-BIZ-1 | 売上 0 の日は営業日数にカウントしない | 休業日除外の業務ルール |
| F-BIZ-2 | 予測値は非負（`Math.max(0, ...)` ） | 売上がマイナスになることはない |
| F-BIZ-3 | 3 件未満のデータでは異常値検出しない | 統計的に無意味 |
| F-BIZ-4 | 週は月曜始まり | 小売業の標準的な週区切り |

## 3. Cross-Validation ケース（TS ↔ WASM 比較用）

### 同値テストケース

factorDecomposition で確立した dual-run compare パターンを forecast に適用する。
以下のケースで TS 実装と WASM 実装の出力を比較する。

| ケース | 入力特性 | 検証ポイント |
|---|---|---|
| CV-1 | 均一売上（全日同額） | 全関数の基本出力一致 |
| CV-2 | 線形増加（d * 10000） | WMA・回帰の数値精度 |
| CV-3 | 週末高売上パターン | 曜日別平均の精度 |
| CV-4 | 異常値含み（1 日だけ 10 倍） | anomaly detection の閾値一致 |
| CV-5 | 歯抜けデータ（休業日あり） | 0 フィルタの一貫性 |
| CV-6 | 1 日のみ | edge case（回帰不可） |
| CV-7 | 空データ | 全関数のゼロ値一致 |
| CV-8 | 28 日 vs 31 日 vs 29 日（閏年） | カレンダー計算の一致 |
| CV-9 | 大数値（売上 10 億超） | 浮動小数点精度 |
| CV-10 | 12 ヶ月分 MonthlyDataPoint | analyzeTrend の季節性一致 |

### 精度許容差

| 対象 | TS 型 | 許容差 | 理由 |
|---|---|---|---|
| 売上合計 | `number` | `±1`（整数） | 丸め差 |
| 粗利率 | `number` | `±1e-10` | f64 精度 |
| stdDev | `number` | `±1e-10` | 平方根の実装差 |
| rSquared | `number` | `±1e-10` | 累積誤差 |
| zScore | `number` | `±1e-10` | 除算精度 |
| 予測値（Math.round 済み） | `number` | `±1` | 丸め差 |
| seasonalIndex | `number` | `±1e-10` | 除算精度 |
| overallTrend | `string` | 完全一致 | 離散値 |

## 4. Edge Case 列挙

### 入力 edge case

| # | 条件 | 期待動作 |
|---|---|---|
| E-1 | `dailySales` が空 Map | 各関数がデフォルト値を返す |
| E-2 | 全日の売上が 0 | 営業日数 0、平均 0 |
| E-3 | 1 日のみ売上あり | WMA = 実績値、回帰不可 |
| E-4 | 2 日のみ売上あり | 回帰可（2 点）、異常値検出不可（3 件未満） |
| E-5 | 月末日のみ売上あり | 週サマリーは最終週のみ非ゼロ |
| E-6 | 負の売上値 | 現状は想定外（入力バリデーション未実装） |
| E-7 | 非常に大きい値（`Number.MAX_SAFE_INTEGER`） | f64 精度限界 |
| E-8 | `threshold = 0` で異常値検出 | 全データが異常値 |
| E-9 | `window = 1` で WMA | WMA = 実績値 |
| E-10 | `month = 2`, 閏年 | 29 日間の正確な週分割 |

### trendAnalysis edge case

| # | 条件 | 期待動作 |
|---|---|---|
| E-11 | dataPoints が空 | デフォルト値（seasonalIndex = [1,1,...,1]） |
| E-12 | 1 ヶ月分のみ | momChanges = [null], yoyChanges = [null] |
| E-13 | 全月同額 | overallTrend = 'flat', seasonalIndex ≈ [1,...,1] |
| E-14 | 3 ヶ月未満 | movingAvg3 = [null, null, value] |
| E-15 | 前年データなし | yoyChanges = [null,...] |

## 5. Rust 移行後も守るべき性質

以下は「Rust に移した後も TS テストで検証し続ける」性質。
TS 参照実装を残す間は dual-run compare で自動検証する。

### 必須保証

1. **F-INV-4（週合計 == 日合計）** — データ欠損がないことの証明
2. **F-INV-5（週範囲の完全カバー）** — カレンダー計算の正確性
3. **F-INV-8（0 <= R² <= 1）** — 回帰の数学的整合性
4. **F-INV-10（zScore と isAnomaly の一貫性）** — 検出ロジックの正確性
5. **F-INV-11（CI lower <= upper）** — 信頼区間の順序
6. **F-BIZ-1（売上 0 日の除外）** — 業務ルールの保持
7. **F-BIZ-2（予測値非負）** — 業務的妥当性

### ガードテスト追加候補

現在のテストにない検証で、移行前に追加すべきもの:

| テスト | 対象 | 理由 |
|---|---|---|
| 週合計 == 日合計（F-INV-4） | `calculateWeeklySummaries` | 既存テストは行数確認のみ |
| 曜日カウント合計検証（F-INV-7） | `calculateDayOfWeekAverages` | 既存テストは部分的 |
| R² 範囲検証（F-INV-8） | `linearRegression` | 既存テストは `< 1` のみ、`>= 0` 未検証 |
| 閏年テスト（E-10） | `getWeekRanges` | 未テスト |
| seasonalIndex 長さ（F-INV-12） | `analyzeTrend` | 未テスト |
