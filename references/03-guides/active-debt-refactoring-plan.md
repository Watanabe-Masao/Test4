# Active-Debt リファクタリング計画

## 現状: 32 active-debt エントリ

allowlist 超過3件 + デフォルト上限近傍多数。
4フェーズに分けて段階的に削減する。

---

## Phase A: Limit 縮小 + エントリ削除（テストで検証後に実施）

**目標:** guard テストを走らせ、実測がデフォルト以下のエントリを削除。

| # | カテゴリ | ファイル | 実測 | 現limit | default | アクション |
|---|---------|---------|------|---------|---------|-----------|
| 29 | Fallback | comparisonProjections.ts | 7 | 10 | 7 | limit→8 に縮小 |
| 30 | Fallback | summaryBuilder.ts | 7 | 10 | 7 | limit→8 に縮小 |
| 31 | Fallback | RawDataTabBuilders.ts | 6 | 9 | 7 | limit→8 に縮小 |
| 32 | Fallback | collectionAggregator.ts | 4 | 8 | 7 | limit→8 に縮小 |
| 33 | Fallback | useDayDetailPlan.ts | 5 | 8 | 7 | limit→8 に縮小 |
| 24 | Export | DaySerial.ts | 8 | 9 | 8 | limit→9 (現状維持、最小) |
| 3 | Combined | useCostDetailData.ts | 12 | 13 | 12 | limit→13 (現状維持) |
| 5 | Memo | useComparisonModule.ts | 6 | 7 | 7 | limit→7 (現状維持) |

**期待削減:** limit 縮小のみ。エントリ数は変わらないが、ratchet 効果で将来の悪化を防止。

**工数:** S（allowlist 編集 + guard テスト実行のみ）

---

## Phase B: ファイル分割（export 過多の解消）

**目標:** domain/models の export 過多3件を分割してエントリ削除。

### B-1: ClassifiedSales.ts (16 exports → 目標 ≤8)
- `DiscountEntry.ts` を新設: DiscountTypeDef, DISCOUNT_TYPES, extractDiscountEntries, sumDiscountEntries, addDiscountEntries, ZERO_DISCOUNT_ENTRIES
- `ClassifiedSalesAggregators.ts` を新設: aggregateForStore, aggregateAllStores, classifiedSalesMaxDay, mergeClassifiedSalesData
- 本体に残す: ClassifiedSalesRecord, ClassifiedSalesData, classifiedSalesRecordKey, ClassifiedSalesDaySummary (型定義のみ)
- **期待:** 16→4 exports。allowlist エントリ削除
- **工数:** M（import 変更が広範囲）

### B-2: AsyncState.ts (14 exports → 目標 ≤8)
- `AsyncStateFactories.ts` を新設: asyncIdle, asyncLoading, asyncSuccess, asyncPartial, asyncStale, asyncRetryableError, asyncFatalError
- `AsyncStateConverters.ts` を新設: toAsyncState, fromAsyncState
- 本体に残す: AsyncStatus, AsyncDiagnostics, AsyncState, isUsable (型+判定のみ)
- **期待:** 14→4 exports。allowlist エントリ削除
- **工数:** M（import 変更が広範囲）

### B-3: CalendarDate.ts (9 exports → 目標 ≤8)
- `DateRangeHelpers.ts` を新設: dateRangeDays, dateRangeToKeys, splitDateRangeByMonth, MonthDayChunk
- 本体を8以下に
- **期待:** 9→5 exports。allowlist エントリ削除
- **工数:** S

**Phase B 合計:** active-debt -3件（削除対象: ClassifiedSales, AsyncState, CalendarDate）

---

## Phase C: getState() → callback/selector 移行

**目標:** presentation/ の getState() 直接アクセスを callback props 経由に移行。

### C-1: 小規模（gap ≤2、S工数）5件
| ファイル | getState | アクション |
|---------|----------|-----------|
| conditionSummaryUtils.ts | 1 | settings を引数で受け取る pure function に変更 |
| useCostDetailData.helpers.ts | 1 | settings を引数で受け取る |
| AdminPage.tsx | 2 | useCallback で store 操作をラップ |
| PrevYearMappingTab.tsx | 2 | 親から callback props で受け取る |
| ExecSummaryBarWidget.tsx | 2 | Zustand selector に切り替え |

### C-2: 中規模（gap 5、M工数）1件
| ファイル | getState | アクション |
|---------|----------|-----------|
| StoreKpiTableInner.tsx | 5 | useSelector + callback props 化 |

### C-3: 大規模（gap 12、L工数）1件
| ファイル | getState | アクション |
|---------|----------|-----------|
| InventorySettingsSection.tsx | 12 | 専用 hook (useInventoryActions) を新設 |

**Phase C 合計:** active-debt -7件

---

## Phase D: Hook 複雑性の削減

**目標:** useMemo/useCallback/useState の集約・分離。

### D-1: WeatherPage.tsx (combined 19 → 目標 ≤12)
- `useWeatherDaySelection.ts` を新設: day/range の useState + useCallback (5〜6個を移動)
- `useWeatherForecasts.ts` を新設: forecast 関連の useMemo + useCallback (3〜4個を移動)
- 本体に残す: メイン描画ロジック + 残り hooks
- **期待:** 19→10 combined。allowlist エントリ削除
- **工数:** L（テスト・描画への影響確認が必要）

### D-2: useMonthlyCalendarState.ts (combined 13 → 目標 ≤12)
- range callback を useReducer に統合（setRangeA*/setRangeB* → dispatchRange）
- 4 useCallback → 1 useReducer dispatch
- **期待:** 13→10 combined。allowlist エントリ削除
- **工数:** M

### D-3: Fallback 定数の集約（9件 → 目標 4件以下）
- `application/constants/emptyStates.ts` を新設: 共通の EMPTY_/ZERO_ 定数を集約
- useDataSummary.ts, dailyBuilder.ts, DailyPage.tsx, useComparisonModule.ts の
  重複定数を共通モジュールから import に変更
- **期待:** 高密度ファイル4件のエントリ削除
- **工数:** M（広範囲の import 変更）

### D-4: module-scope let の解消（3件）
- EChart.tsx: WeakMap ベースに移行
- useLoadComparisonData.ts: useMemo ベースキャッシュに変更
- widgetLayout.ts: application 層に移動
- **工数:** S〜M

**Phase D 合計:** active-debt -9〜12件

---

## フェーズ別サマリー

| Phase | 内容 | 削減数 | 工数 | 優先度 |
|-------|------|--------|------|--------|
| **A** | Limit 縮小 | 0（予防のみ） | S | 即時 |
| **B** | Export 分割 | -3 | M | 高 |
| **C** | getState 移行 | -7 | S〜L | 高 |
| **D** | Hook/Fallback 整理 | -9〜12 | M〜L | 中 |
| **合計** | | **-19〜22** | | |

**目標:** active-debt 32 → 10〜13

---

## 実施順序（推奨）

1. Phase A（即時）→ limit 縮小で ratchet 効果確保
2. Phase C-1（5件の小規模 getState 移行）→ 最も確実な削減
3. Phase B（export 分割）→ 構造改善 + 3件削減
4. Phase C-2/C-3 + Phase D-2（中規模リファクタ）
5. Phase D-1（WeatherPage 大規模分割）
6. Phase D-3/D-4（定数集約 + let 解消）
