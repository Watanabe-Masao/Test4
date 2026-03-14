# Forecast Compare 準備完了レポート

Lane 2: forecast compare preparation の最終確認ドキュメント。
Bridge 完成後の compare 導入可否を関数単位で確定する。

## 1. compare 対象関数の確定

forecastBridge.ts が公開する全 10 関数を、dual-run compare の対象/対象外に分類する。

### compare 対象（pure, Date 非依存）

| 関数 | ファイル | 根拠 |
|---|---|---|
| `calculateStdDev` | `forecast.ts` | 入力 `readonly number[]`、出力 `{ mean, stdDev }`。純数学。Date 不使用 |
| `detectAnomalies` | `forecast.ts` | 入力 `ReadonlyMap<number, number>`。Z-score 計算は Map→Array 変換後の数値演算のみ。`calculateStdDev` を内部呼び出しするが Date 不使用 |
| `calculateWMA` | `advancedForecast.ts` | 入力 `ReadonlyMap<number, number>`。加重移動平均は sort + 窓計算のみ。Date 不使用 |
| `linearRegression` | `advancedForecast.ts` | 入力 `ReadonlyMap<number, number>`。最小二乗法 + R² 計算。Date 不使用 |
| `analyzeTrend` | `trendAnalysis.ts` | 入力 `readonly MonthlyDataPoint[]`（POJO 配列）。移動平均・季節性・前月比/前年比の全計算が `year`/`month` の数値比較のみで `new Date()` を一切使わない |

### compare 対象外（Date 依存 or Date 依存関数を内包）

| 関数 | ファイル | 除外理由 |
|---|---|---|
| `getWeekRanges` | `forecast.ts` | `new Date(year, month, 0).getDate()` と `new Date(year, month - 1, day).getDay()` を直接使用。カレンダー計算そのもの |
| `calculateDayOfWeekAverages` | `forecast.ts` | 内部で `new Date(year, month - 1, d).getDay()` を使用し、曜日を判定。Date API に直接依存 |
| `calculateWeeklySummaries` | `forecast.ts` | 内部で `getWeekRanges(year, month)` を呼び出し。週範囲の決定が Date 依存 |
| `projectDowAdjusted` | `advancedForecast.ts` | 内部で `new Date(year, month, 0).getDate()` と `new Date(year, month - 1, day).getDay()` を使用。未来日の曜日判定が Date 依存 |
| `calculateMonthEndProjection` | `advancedForecast.ts` | `new Date(year, month, 0).getDate()` を直接使用し、さらに内部で `projectDowAdjusted`（Date 依存）と `calculateWMA`・`linearRegression` を呼び出す複合関数。Date 依存パスが含まれるため compare 対象外 |

### calculateForecast の判定: compare 対象外

`calculateForecast` は以下 3 関数を統合する composite 関数:

```
calculateForecast
  ├── calculateWeeklySummaries  ← Date 依存（getWeekRanges 経由）
  ├── calculateDayOfWeekAverages ← Date 依存（new Date().getDay()）
  └── detectAnomalies            ← Date 非依存
```

3 つの内部呼び出しのうち 2 つが Date 依存のため、composite 全体として compare 対象外とする。
`detectAnomalies` は個別関数として compare 対象に含まれているため、カバレッジの欠損はない。

## 2. ReadonlyMap<number, number> 変換方針

### 課題

WASM（Rust）の FFI 境界では JavaScript の `Map` オブジェクトを直接受け渡しできない。
compare 対象の 5 関数のうち 3 関数（`detectAnomalies`, `calculateWMA`, `linearRegression`）が
`ReadonlyMap<number, number>` を入力に取る。

### 変換ルール

**入力（TS → WASM）:**

```
ReadonlyMap<number, number> → Array.from(map.entries()).sort(([a], [b]) => a - b)
```

- `Map` を `[key, value][]` のソート済み配列に変換する
- ソート順はキー（day 番号）の昇順で固定する（再現性の保証）

**出力（WASM → TS）:**

出力型はすべて POJO（`WMAEntry[]`, `LinearRegressionResult`, `AnomalyDetectionResult[]`）であり、
Map への逆変換は不要。

### 変換の配置

| 層 | 変換の有無 | 理由 |
|---|---|---|
| Domain | なし | pure 関数は `ReadonlyMap` をそのまま受ける。Domain 層に FFI 関心事を持ち込まない |
| Bridge | **ここで変換する** | Bridge の責務は mode dispatch と型変換。Map→Array 変換はこの責務に含まれる |
| Presentation | なし | Bridge を通じて呼ぶだけ。変換の存在を知る必要はない |

### compare 時の変換フロー

```
呼び出し元 (Map)
    │
    ▼
Bridge: Map → sorted [key, value][] ─→ WASM 実装に渡す
    │                                      │
    │                                      ▼
    │                                  WASM 結果（POJO）
    │
    ├── TS 実装にも Map のまま渡す
    │       │
    │       ▼
    │   TS 結果（POJO）
    │
    ▼
compare(TS結果, WASM結果) → 差分があれば observer に報告
```

## 3. Date 依存と pure core の境界

| 関数 | Date 依存 | Pure core | Compare 対象 | 備考 |
|---|---|---|---|---|
| `calculateStdDev` | なし | Yes | **Yes** | 数学ユーティリティ。他モジュールからも使用 |
| `detectAnomalies` | なし | Yes | **Yes** | Map→Array 後は純数値演算 |
| `calculateWMA` | なし | Yes | **Yes** | sort + 窓計算 |
| `linearRegression` | なし | Yes | **Yes** | 最小二乗法。出力は 3 つの f64 |
| `analyzeTrend` | なし | Yes | **Yes** | POJO 入力。Date API 不使用 |
| `getWeekRanges` | `new Date()` 直接 | No | No | 月曜始まり週分割。カレンダー計算 |
| `calculateDayOfWeekAverages` | `new Date().getDay()` 直接 | No | No | 曜日判定に Date 必要 |
| `calculateWeeklySummaries` | `getWeekRanges` 経由 | No | No | 週範囲が Date 依存 |
| `projectDowAdjusted` | `new Date()` 直接 | No | No | 未来日の曜日判定 |
| `calculateMonthEndProjection` | `new Date()` 直接 + `projectDowAdjusted` 経由 | No | No | 複合。Date 依存パスを含む |
| `calculateForecast` | 内部 2/3 が Date 依存 | No | No | composite。Date 依存関数を内包 |

**境界の要約:**

- **compare 対象: 5 関数** — 全て Date 非依存の pure core
- **compare 対象外: 6 関数** — 全て Date 依存（直接 or 間接）
- Date 依存関数の WASM 化は将来の Phase 2 で曜日テーブル注入により対応可能だが、compare の前提条件ではない

## 4. 残タスク

### 現在の状態: 「compare を入れるだけ」

forecast モジュールは以下の準備が全て完了しており、dual-run compare の導入準備が整っている。

**完了済み:**

- [x] **Bridge 完成** — forecastBridge.ts に全 10 関数を配置済み。`ts-only` モードで動作
- [x] **全ランタイム呼び出しパスが Bridge 経由** — Application 層（useForecast.ts）と Presentation 層（ForecastPage.helpers.ts 等）は Bridge 経由で domain 関数を呼び出す
- [x] **不変条件テスト** — F-INV-1〜F-INV-13 の数学的不変条件と F-BIZ-1〜F-BIZ-4 の業務的不変条件をカタログ化済み（forecast-test-strategy.md）
- [x] **FFI 適合性評価完了** — ReadonlyMap の変換方針、Date 依存の分類が確定（forecast-engine-audit.md）
- [x] **compare 対象/対象外の分類確定** — 本ドキュメントで 5 関数を compare 対象として確定

**次ステップ（今週のスコープ外）:**

- [ ] Bridge に dual-run compare モードを追加（factorDecompositionBridge と同一パターン）
- [ ] compare 対象 5 関数に対する精度許容差の定義（forecast-test-strategy.md §3 に記載済み）
- [ ] dualRunObserver.ts に forecast 用メトリクス定義を追加

**将来（WASM 実装後）:**

- [ ] Date 依存関数の曜日テーブル注入による pure 化（Phase 2 候補）
- [ ] pure 化後の関数を compare 対象に昇格
