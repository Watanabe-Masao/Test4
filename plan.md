# ウィジェット統合・整理計画

## 現状分析

### 重複しているウィジェット（6組）

| # | 分析領域 | レガシー | DuckDB | 統合方針 |
|---|---|---|---|---|
| 1 | **時間帯別売上** | `TimeSlotSalesChart` (610行) | `DuckDBTimeSlotChart` (371行) | **レガシーの機能をDuckDBに統合** |
| 2 | **時間帯×曜日ヒートマップ** | `TimeSlotHeatmapChart` (510行) | `DuckDBHeatmapChart` (404行) | **レガシーの機能をDuckDBに統合** |
| 3 | **部門×時間帯パターン** | `DeptHourlyPatternChart` | `DuckDBDeptHourlyChart` (388行) | **レガシーの機能をDuckDBに統合** |
| 4 | **店舗×時間帯比較** | `StoreTimeSlotComparisonChart` | `DuckDBStoreHourlyChart` (370行) | **レガシーの機能をDuckDBに統合** |
| 5 | **前年比較（日次）** | `PrevYearComparisonChart` + `YoYVarianceChart` | `DuckDBYoYChart` (225行) | **レガシーの機能をDuckDBに統合** |
| 6 | **カテゴリ×時間帯** | `CategoryHierarchyExplorer` 内の時間帯部分 | `DuckDBCategoryHourlyChart` (403行) | **レガシーの機能をDuckDBに統合** |

### レガシーにしかない機能（重複ウィジェット内の差分）

| # | レガシーにある機能 | DuckDBに不足 |
|---|---|---|
| 1-a | KPIタブ（コアタイム、折り返し時間、ピーク時間帯等6指標） | なし |
| 1-b | 自動インサイト生成（テキスト） | なし |
| 1-c | 金額/点数メトリック切替 | なし |
| 1-d | WoW（前週）比較モード | 前年比較のみ |
| 1-e | 階層フィルタ（部門/ライン/クラス絞り込み） | なし |
| 2-a | 前年比増減モード（緑/赤グラデーション） | 金額モードのみ |
| 2-b | 階層フィルタ | なし |
| 3-a | ピアソン相関スコア（ベンチマーク比較） | なし |
| 5-a | 差異のウォーターフォール表示 | 差分バーのみ |

### レガシー固有ウィジェット（DuckDB化対象外 → そのまま残す）

以下はレガシー独自のもので、今回の統合対象外。
- 要因分解系: `WaterfallChart`, `YoYWaterfallChart`, `DrilldownWaterfall`, `CategoryFactorBreakdown`
- 予実管理系: `BudgetVsActualChart`, `PlanActualForecast`, `ForecastTools`
- 粗利・原価系: `GrossProfitRateChart`, `GrossProfitAmountChart`, `DiscountTrendChart`, `InventoryTrendChart`
- 統計系: `PerformanceIndexChart`, `CustomerScatterChart`, `MultiKpiSparklines`
- 日次売上系: `DailySalesChart`（9ビューモードは独自価値が高い）
- Forecastページ系: 全チャート
- テーブル系: `exec-dow-average`, `exec-weekly-summary` 等

### DuckDB固有ウィジェット（そのまま残す）

- `DuckDBCumulativeChart` (累積売上)
- `DuckDBFeatureChart` (異常検知)
- `DuckDBDeptTrendChart` (部門KPI月次トレンド)
- `DuckDBDowPatternChart` (曜日パターン)
- `DuckDBHourlyProfileChart` (時間帯プロファイル)
- `DuckDBCategoryTrendChart` (カテゴリ日次トレンド)
- `DuckDBCategoryMixChart` (カテゴリ構成比推移)
- `DuckDBStoreBenchmarkChart` (店舗ベンチマーク)
- `DuckDBDateRangePicker` (日付範囲コントロール)

---

## 実装計画

### Phase 1: 時間帯別売上の統合（最大の重複・最優先）

**対象**: `TimeSlotSalesChart` (レガシー) → `DuckDBTimeSlotChart` に機能統合

レガシー版の以下の機能をDuckDB版に追加:
1. **KPIタブ**: コアタイム、折り返し時間、ピーク時間帯、平均売上等をSQLで算出
2. **メトリック切替**: 金額/点数の切替（新SQLクエリ `queryHourlyQuantityAggregation` を追加）
3. **階層フィルタ**: 部門/ライン/クラスでの絞り込みパラメータをSQLに追加
4. **前週比較モード**: 日付範囲を7日シフトしたクエリを追加
5. **インサイト生成**: SQL結果からコアタイム・折り返し時間を算出するロジックを追加

**変更ファイル**:
- `infrastructure/duckdb/queries/categoryTimeSales.ts` — クエリ拡張
- `application/hooks/duckdb/useCategoryTimeSalesQueries.ts` — フック拡張
- `presentation/components/charts/DuckDBTimeSlotChart.tsx` — UI統合
- `presentation/pages/Dashboard/widgets/registry.tsx` — レガシー版をDuckDB版で置換

### Phase 2: ヒートマップの統合

**対象**: `TimeSlotHeatmapChart` → `DuckDBHeatmapChart` に機能統合

1. **前年比増減モード**: 前年の hour×dow マトリクスを取得し、差分計算
2. **階層フィルタ**: カテゴリ絞り込みパラメータ追加

**変更ファイル**:
- `infrastructure/duckdb/queries/categoryTimeSales.ts` — 前年比マトリクスクエリ追加
- `application/hooks/duckdb/useCategoryTimeSalesQueries.ts` — フック追加
- `presentation/components/charts/DuckDBHeatmapChart.tsx` — モード切替UI追加

### Phase 3: 部門×時間帯パターンの統合

**対象**: `DeptHourlyPatternChart` → `DuckDBDeptHourlyChart` に機能統合

1. **ピアソン相関**: 部門間の時間帯パターン相関をSQL or フック側で算出

**変更ファイル**:
- `presentation/components/charts/DuckDBDeptHourlyChart.tsx` — 相関スコア表示追加

### Phase 4: 店舗×時間帯比較の統合

**対象**: `StoreTimeSlotComparisonChart` → `DuckDBStoreHourlyChart` に機能統合

DuckDB版は既に金額/構成比モードを持っており、機能的に上位。
レガシーを削除し、レジストリのIDを引き継ぐ。

**変更ファイル**:
- `presentation/pages/Dashboard/widgets/registry.tsx` — ID統合

### Phase 5: 前年比較の統合

**対象**: `PrevYearComparisonChart` + `YoYVarianceChart` → `DuckDBYoYChart` に機能統合

1. **差異ウォーターフォール表示**: 日次差異のウォーターフォール表示モード追加

**変更ファイル**:
- `presentation/components/charts/DuckDBYoYChart.tsx` — ビューモード追加

### Phase 6: レジストリ整理・レガシーウィジェット削除

各Phase完了後、統合済みレガシーウィジェットを:
1. レジストリから削除（またはDuckDB版にIDマッピング）
2. レイアウトプリセット更新
3. `autoInjectDataWidgets` の更新
4. 不要になったレガシーコンポーネントファイルを削除

### Phase 7: テスト・検証

1. `npm run lint` — エラー0
2. `npm run build` — TypeScript strict mode パス
3. `npm test` — 全テスト合格
4. アーキテクチャガードテスト通過確認
5. レジストリの整合性確認（存在しないウィジェットIDが残っていないか）

---

## 実装順序の理由

Phase 1（時間帯別売上）を最優先にする理由:
- 最も重複が大きく、機能差も最も多い
- ここで確立したパターン（SQLクエリ拡張→フック→UI統合）を後続Phaseで再利用
- ユーザーが最も頻繁に使う分析ウィジェット

## リスクと対策

| リスク | 対策 |
|---|---|
| レガシー削除でユーザーのレイアウト設定が壊れる | IDマッピング or localStorage マイグレーション |
| SQL クエリの肥大化 | クエリ関数を責務別に分割（既存パターン踏襲） |
| Phase途中でビルドが壊れる | 各Phase内でレガシーを残しつつDuckDB版を先に完成→確認→削除 |
