# Active-Debt リファクタリング計画（v3 — 残り 7 件）

## 進捗

| Phase | active-debt | 変化 | 状態 |
|-------|------------|------|------|
| 開始時 | 33 | — | — |
| A〜G-4 | **7** | **-26** | **完了** |

## 残り 7 件の分析

### 実行可能（コード変更で解消可能）: 4 件

| # | ファイル | 種別 | Guard計測 | limit | 最小修正 | 工数 | リスク |
|---|---------|------|---------|-------|---------|------|--------|
| 1 | WeatherPage.tsx | combined | 17 | 17 | useWeatherDaySelection 抽出 | L | LOW |
| 2 | InventorySettingsSection.tsx | getState | 12 | 13 | 親から callback props | L | MED-HIGH |
| 3 | useCostDetailData.ts | useMemo | 12 | 13 | flow builders 抽出 | M | MEDIUM |
| 4 | useMonthDataManagement.ts | useState | 6 | 7 | delete workflow useReducer | S | LOW |

### Guard 制約上の限界: 3 件

| # | ファイル | 種別 | Guard計測 | limit | 状況 |
|---|---------|------|---------|-------|------|
| 5 | useCostDetailData.ts | combined | 12 | 13 | #3 と同一ファイル。#3 修正で同時解消 |
| 6 | CategoryBenchmarkChart.vm.ts | useState | 6 | 7 | Guard が import 行を計上。default 以下 |
| 7 | useCostDetailData.ts | useState | 6 | 7 | 同上。default 以下 |

**#5 は #3 修正で自動解消。#6, #7 は guard 改善（import 除外）まで維持。**

---

## Phase H: WeatherPage hook 抽出

### H-1: useWeatherDaySelection.ts 新設

**抽出対象（WeatherPage.tsx から移動）:**
- useState: selectedDays, selectedDows (2 個)
- useCallback: handleDowChange, goPrev, goNext, handleMonthScroll,
  handleChartDayClick, handleDayRangeSelect (6 個)

**WeatherPage に残す:**
- useState: uiState (modal 状態)
- useMemo: filteredDaily, prevYearCurrentMonth, monthSummary,
  prevMonthSummary, selectedDaySummary 等 (7 個)
- useCallback: handleChartDayDblClick, handleForecastClick,
  handleLocationSave (3 個)

**期待結果:** combined 17→9 (default 12 以下) → allowlist 削除

**リスク: LOW**
- 抽出対象は selectedDays/selectedDows に閉じた操作
- 描画ロジックとの循環依存なし
- 子コンポーネントへの props 変更なし

**工数: L**（handler 間の依存整理 + テスト確認）

---

## Phase I: InventorySettingsSection getState 移行

### I-1: 親コンポーネントに callback props を追加

**現在のパターン（6 対の getState）:**
```
useDataStore.getState().updateInventory(id, field)
useUiStore.getState().invalidateCalculation()
```

**提案パターン:**
```
// 親（呼び出し元）で:
const updateInventory = useDataStore(s => s.updateInventory)
const invalidateCalculation = useUiStore(s => s.invalidateCalculation)
const onInventoryUpdate = (id, cfg) => {
  updateInventory(id, cfg)
  calculationCache.clear()
  invalidateCalculation()
}

// InventorySettingsSection に props で渡す:
<InventorySettingsSection onInventoryUpdate={onInventoryUpdate} ... />
```

**期待結果:** getState 12→0 → allowlist 削除

**リスク: MEDIUM-HIGH**
- コンポーネント API の変更（props 追加）
- 呼び出し元の特定と更新が必要

**工数: L**

---

## Phase J: useCostDetailData useMemo 削減

### J-1: flow aggregation を builder に抽出

**抽出対象（3 useMemo → 1 useMemo + external builder）:**
- flows = aggregateFlows(days, inField, outField, stores)
- groupedFlows = buildFlowGroups(flows, stores)
- maxFlowCost = max(flows)

→ 1 つの useMemo で `buildFlowData(days, inField, outField, stores)` を呼び出し

**期待結果:** useMemo 12→10 → featuresMemoLimits 削除 + combinedLimits 削除

**リスク: MEDIUM**（memo identity がセレクタに影響する可能性）

**工数: M**

---

## Phase K: useMonthDataManagement useReducer 統合

### K-1: delete workflow を useReducer に統合

**現在:**
```
const [deleteTarget, setDeleteTarget] = useState(null)
const [deleting, setDeleting] = useState(false)
```

**提案:**
```
const [deleteOp, dispatchDelete] = useReducer(deleteReducer, { target: null, deleting: false })
```

**期待結果:** useState guard 計測 6→5 → allowlist 削除

**リスク: LOW**

**工数: S**

---

## 実施優先順序

| 順番 | Phase | 削減 | 工数 | 理由 |
|------|-------|------|------|------|
| 1 | **K** (useMonthDataManagement) | -1 | S | 最小工数で 1 件解消 |
| 2 | **J** (useCostDetailData) | -2 | M | 2 エントリ同時解消（combined + useMemo） |
| 3 | **H** (WeatherPage) | -1 | L | 最大の技術負債 |
| 4 | **I** (InventorySettings) | -1 | L | API 変更あり、慎重に |

**最終目標:** active-debt 7 → 2（#6, #7 の import 計上問題のみ残留）
