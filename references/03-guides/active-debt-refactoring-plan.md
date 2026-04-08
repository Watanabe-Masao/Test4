# Active-Debt リファクタリング計画（v2 — 残り 20 件）

## 進捗

| Phase | 内容 | 結果 | 状態 |
|-------|------|------|------|
| ~~A~~ | Limit 縮小 | ratchet 予防 | **完了** |
| ~~C-1~~ | getState 小規模 5 件 | -5 | **完了** |
| ~~B~~ | Export 分割 3 件 | -3 | **完了** |
| ~~C-2~~ | StoreKpiTableInner getState | -1 | **完了** |
| ~~D-4~~ | module-scope let 3 件 | -3 | **完了** |
| **合計実績** | | **33 → 20 (−13)** | |

---

## 残り 20 件の内訳

### グループ 1: Hook 複雑性 (9 件) — コード変更必須

| ファイル | 種別 | 実測 | limit | default | 工数 |
|---------|------|------|-------|---------|------|
| WeatherPage.tsx | combined | 19 | 17 | 12 | **L** |
| useMonthlyCalendarState.ts | combined | 13 | 14 | 12 | **M** |
| useCostDetailData.ts | combined | 12 | 13 | 12 | S |
| useCostDetailData.ts | useMemo | 12 | 13 | 7 | M |
| useMonthDataManagement.ts | useState | 6 | 7 | 6 | S |
| StorageDataViewers.tsx | useState | 7 | 8 | 6 | M |
| CategoryBenchmarkChart.vm.ts | useState | 6 | 7 | 6 | S |
| CategoryBoxPlotChart.vm.ts | useState | 7 | 8 | 6 | S |
| useCostDetailData.ts | useState | 6 | 7 | 6 | S |

### グループ 2: getState 残り (1 件)

| ファイル | getState | limit | 工数 |
|---------|----------|-------|------|
| InventorySettingsSection.tsx | 12 | 13 | **L** |

### グループ 3: Fallback 定数密度 (9 件)

| ファイル | 実測 | limit | default | 工数 |
|---------|------|-------|---------|------|
| useDataSummary.ts | 15 | 18 | 7 | S |
| dailyBuilder.ts | 11 | 14 | 7 | S |
| DailyPage.tsx | 11 | 14 | 7 | S |
| useComparisonModule.ts | 10 | 12 | 7 | S |
| comparisonProjections.ts | 9 | 10 | 7 | S |
| summaryBuilder.ts | 9 | 10 | 7 | S |
| RawDataTabBuilders.ts | 8 | 8 | 7 | S |
| collectionAggregator.ts | 7 | 8 | 7 | S |
| useDayDetailPlan.ts | 7 | 8 | 7 | S |

### グループ 4: Export 残り (1 件)

| ファイル | 実測 | limit | default | 工数 |
|---------|------|-------|---------|------|
| DaySerial.ts | 8 | 9 | 8 | S |

---

## Phase E: Fallback 定数の共通モジュール集約

**目標:** 重複する EMPTY_/ZERO_ 定数を共通モジュールに集約し、密度を default 以下に。

### E-1: 共通定数モジュール新設
- `application/constants/zeroDefaults.ts` を新設
  - `ZERO_COST_PRICE_PAIR`: dailyBuilder, summaryBuilder, collectionAggregator で重複
  - `ZERO_DISCOUNT_ENTRIES`: 既に DiscountEntry.ts に存在 → re-import
  - `ZERO_COST_INCLUSION_DAILY`: dailyBuilder, summaryBuilder で重複
- `application/constants/emptyCollections.ts` を新設
  - `EMPTY_MAP`, `EMPTY_STORES`, `EMPTY_RECORDS` 等

### E-2: 各ファイルから定数を削除・import に変更
- 対象: dailyBuilder, summaryBuilder, collectionAggregator, useDayDetailPlan (4 件)
- **期待:** 4 件のエントリ削除。残り 3 件は limit 縮小で ratchet
- **工数:** M

### E-3: DailyPage/useDataSummary の空状態集約
- DailyPage.tsx: EMPTY_PREV_YEAR 等を emptyCollections から import
- useDataSummary.ts: EMPTY_OVERVIEW 等を emptyCollections から import
- **期待:** 2 件のエントリ削除
- **工数:** M

**Phase E 合計:** active-debt -6〜8 件

---

## Phase F: InventorySettingsSection の getState 除去

**目標:** 12 件の getState() を専用 hook に移行。

### F-1: useInventoryActions hook 新設
- `useInventoryActions(storeId)` を新設
  - updateInventory, setBudget, setGPBudget 等を Zustand selector 経由で提供
  - 全 getState() を hook 内で selector 化
- InventorySettingsSection.tsx の getState() を全て除去
- **期待:** allowlist エントリ削除
- **工数:** L（12 箇所の getState 置換 + テスト）

**Phase F 合計:** active-debt -1 件

---

## Phase G: Hook 複雑性の段階的削減

### G-1: useMonthlyCalendarState (combined 13 → ≤12)
- range 操作の 4 useCallback を useReducer に統合
- **期待:** 13→9 combined → allowlist エントリ削除
- **工数:** M

### G-2: WeatherPage (combined 19 → ≤12)
- `useWeatherDaySelection.ts` を新設（day/range state + handlers）
- `useWeatherForecasts.ts` を新設（forecast useMemo + handlers）
- **期待:** 19→10 combined → allowlist エントリ削除
- **工数:** L

### G-3: useCostDetailData useMemo 削減
- 集計ロジックを pure builder 関数に抽出
- **期待:** useMemo 12→6 → featuresMemo エントリ削除
- **工数:** M

### G-4: features useState 5 件
- CategoryBenchmarkChart/BoxPlot: drill state を useReducer に統合
- StorageDataViewers: preview 状態を子コンポーネントに分離
- **期待:** 3〜5 件のエントリ削除
- **工数:** S〜M

**Phase G 合計:** active-debt -5〜8 件

---

## 実施優先順序

| 順番 | Phase | 削減 | 工数 | 理由 |
|------|-------|------|------|------|
| 1 | **E-1/E-2** | -4 | M | 最もコスパが良い（定数移動のみ） |
| 2 | **G-1** | -1 | M | 1 ファイルで完結、useReducer パターン |
| 3 | **E-3** | -2 | M | E-1 の延長 |
| 4 | **G-4** | -3〜5 | S〜M | features の小規模改善 |
| 5 | **F** | -1 | L | 影響範囲大だが確実 |
| 6 | **G-2** | -1 | L | 最大の技術負債、慎重に |
| 7 | **G-3** | -1 | M | useCostDetailData 統合改善 |

**最終目標:** active-debt 20 → 5〜7

---

## 完了条件

- active-debt ≤ 10 を達成
- 全 guard テスト pass
- health: Healthy | Hard Gate PASS
- 計画ドキュメントを実績で更新
