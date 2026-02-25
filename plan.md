# 参照テーブルバンドル設計（DashboardViewModel）

## 目標

「グラフは元のテーブル（ImportedData, CategoryTimeSalesData.records等）の存在を意識しない」

## 現状の問題

```
ImportedData (ソース)
  ↓
DashboardPage が records[] を直接フィルタ
  ↓
WidgetContext に raw records を含めて渡す
  categoryTimeSales: { records: [...] }     ← 生データ
  prevYearCategoryTimeSales: { records: [...] } ← 生データ
  departmentKpi: { records: [...] }         ← 生データ
  ↓
各チャートが records.filter().reduce() をインラインで実行
```

10以上のチャートが `categoryTimeSales.records` を直接走査している。

## 設計: 3層の参照テーブル

```
層1: ソース（ImportedData）
  → データ分離を維持、UIからは不可視

層2: 参照テーブル（個別）
  → StoreResult          (計算パイプラインが生成)
  → StoreDaySummaryIndex (summaryBuilderが生成)
  → CategoryTimeSalesIndex (indexBuilderが生成)
  → DepartmentKpiData    (そのまま)

層3: バンドル（DashboardViewModel）
  → 全参照テーブルを1つにまとめる
  → チャートはこれだけを受け取る
  → raw records を含まない
```

## WidgetContext 変更

### 削除するフィールド
- `categoryTimeSales: CategoryTimeSalesData` → raw records、もう渡さない
- `prevYearCategoryTimeSales: PrevYearCategoryTimeSalesData` → raw records

### 残すフィールド（全て参照テーブル）
- `result: StoreResult` — 計算済み
- `allStoreResults` — 計算済み
- `stores` — マスタ
- `ctsIndex: CategoryTimeSalesIndex` — インデックス（O(1)）
- `prevCtsIndex: CategoryTimeSalesIndex` — インデックス（O(1)）
- `departmentKpi: DepartmentKpiData` — 部門KPIサマリー
- `prevYear: PrevYearData` — 前年比較済み
- `budgetChartData` — 予算チャートデータ
- `explanations` — 説明
- その他メタデータ（year, month, daysInMonth 等）

## チャート側の移行

各チャートは現在 `categoryTimeSales.records` を直接操作しているが、
Application層の既存集約関数を通すように変更する:

| チャート | 現在のアクセス | 移行後 |
|---|---|---|
| TimeSlotSalesChart | records.filter() | queryIndex(ctsIndex) → aggregateHourly() |
| TimeSlotHeatmapChart | records.filter() | queryIndex(ctsIndex) → aggregateHourDow() |
| DeptHourlyPatternChart | records.filter() | queryIndex(ctsIndex) → aggregateByLevel() |
| StoreTimeSlotComparisonChart | records.filter() | queryIndex(ctsIndex) → aggregateByStore() |
| CategoryHierarchyExplorer | records.filter() | queryIndex(ctsIndex) → aggregateByLevel() |
| TimeSlotKpiSummary | records.reduce() | queryIndex(ctsIndex) → aggregateHourly() |
| YoYWaterfallChart | records.filter() | queryIndex(ctsIndex) + 既存の分解関数 |
| CategoryDrilldown | records.filter() | queryIndex(ctsIndex) → aggregateByLevel() |
| MonthlyCalendar | records 渡し | queryIndex(ctsIndex) で日別取得 |
| HourlyChart | records 走査 | queryIndex(ctsIndex) → aggregateHourly() |

集約関数はすでに `application/usecases/categoryTimeSales/aggregation.ts` に存在:
- `aggregateHourly()` — 時間帯別
- `aggregateByLevel()` — 部門/ライン/クラス別
- `aggregateHourDow()` — 時間帯×曜日
- `aggregateByStore()` — 店舗別

フィルタ関数も既存:
- `queryIndex(index, params)` — インデックスから条件に合うレコードを抽出
- `filterByDow()` — 曜日フィルタ

## 実装ステップ

### Step 1: WidgetContext から raw records を削除
- `types.ts`: `categoryTimeSales` と `prevYearCategoryTimeSales` を削除
- `DashboardPage.tsx`: raw records のフィルタ useMemo を削除

### Step 2: registry.tsx の isVisible / render を更新
- `isVisible`: `ctx.categoryTimeSales.records.length > 0` → `ctx.ctsIndex.recordCount > 0`
- `render`: raw records props を削除、代わりに ctsIndex / prevCtsIndex を渡す

### Step 3: 各チャートコンポーネントを移行（1つずつ、各回でビルド確認）
- props から `categoryTimeSales: CategoryTimeSalesData` を削除
- props に `ctsIndex: CategoryTimeSalesIndex` を追加（まだない場合）
- inline の records.filter().reduce() を queryIndex() + 集約関数に置換
- 前年データは `prevCtsIndex` + `queryIndex()` に置換

### Step 4: autoInjectDataWidgets の更新
- `categoryTimeSales` 引数を `ctsIndex` に変更
- records.length チェックを recordCount チェックに変更

### Step 5: DashboardPage の不要コード削除
- `filteredCategoryTimeSales` の useMemo を削除
- `filteredPrevYearCTS` の useMemo を削除
- `appState.data.categoryTimeSales` への直接参照がゼロになることを確認

### Step 6: テスト・ビルド確認
- 全ステップで lint + build + test を通す
- registry.test / widgetVisibility.test を更新
