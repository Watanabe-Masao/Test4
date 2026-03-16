# 凍結 allowlist 解消計画

## 現状サマリ

全凍結ファイル19件を精査した結果、以下の3カテゴリに分類。

| カテゴリ | 件数 | 方針 |
|----------|------|------|
| A. 分割で解消可能 | 7件 | 今回対応 |
| B. 正当な複雑さ（構造的に妥当） | 7件 | allowlist を「凍結」から「許容」に格上げ |
| C. Domain/Infra の pure ファイル | 5件 | 除外リスト維持（hook でないため R11 対象外） |

---

## A. 分割で解消するファイル（7件）

### Phase 1: Query hook 分割（useMemo 10→5+5）

#### A-1. useJsAggregationQueries.ts（useMemo 10, 282行）
- **現状:** 10個の DuckDB クエリを1 hook にまとめている
- **方針:** 売上系クエリ / 仕入系クエリに2分割
  - `useJsSalesQueries.ts`（売上・客数・客単価系 5クエリ）
  - `useJsPurchaseQueries.ts`（仕入・値入・原価系 5クエリ）
  - 元ファイルはバレル re-export で後方互換
- **ガード更新:** allowlist から削除（各5 < 基準7）

#### A-2. useCtsQueries.ts（useMemo 10, 339行）
- **現状:** カテゴリ×時間帯の10クエリを1 hook に集約
- **方針:** カテゴリ集計 / 時間帯集計に2分割
  - `useCtsCatego ryQueries.ts`（カテゴリ階層・ベンチマーク系 5クエリ）
  - `useCtsPeriodQueries.ts`（時間帯・日別トレンド系 5クエリ）
  - 元ファイルはバレル re-export
- **ガード更新:** allowlist + 行数 allowlist の両方から削除

### Phase 2: useState 集約（useReducer 化）

#### A-3. useDuckDB.ts（useState 9, 302行）
- **現状:** DuckDB ライフサイクルの9状態を個別 useState で管理
- **方針:** `useReducer` で状態を1つの `DuckDBState` に集約
  - `type DuckDBState = { engineState, isLoading, error, dataVersion, ... }`
  - `type DuckDBAction = { type: 'INIT_START' | 'INIT_SUCCESS' | 'LOAD_START' | ... }`
  - reducer は純粋関数として `duckdbReducer.ts` に分離
- **ガード更新:** useState allowlist + 行数 allowlist から削除

#### A-4. useAutoImport.ts（useState 8, 224行）
- **現状:** フォルダスキャンの8状態を個別管理
- **方針:** `useReducer` で `AutoImportState` に集約
  - reducer は `autoImportReducer.ts` に分離
- **ガード更新:** useState allowlist から削除

### Phase 3: 大型 Pure Logic 分割

#### A-5. purchaseComparisonBuilders.ts（595行）
- **現状:** 5つの build* 関数。`buildSupplierAndCategoryData` が180行
- **方針:** 仕入先系 / カテゴリ系に分離
  - `purchaseComparisonKpi.ts`（buildKpi + buildStoreData）
  - `purchaseComparisonCategory.ts`（buildSupplierAndCategoryData + buildDailyPivot）
  - `purchaseComparisonDaily.ts`（buildDailyData）
  - 元ファイルはバレル re-export
- **ガード更新:** 行数 allowlist から削除

### Phase 4: Presentation 分割

#### A-6. CvTimeSeriesChart.tsx（690行, Tier 2）
- **現状:** 3つの表示モード（cvLine / salesCv / heatmap）が1コンポーネントに混在
- **方針:**
  - `useCvTimeSeriesData.ts` — クエリ + topCodes + trendPoints を hook 化
  - `CvLineView.tsx` / `SalesCvView.tsx` / `CvHeatmapView.tsx` — 表示モード別
  - `CvTimeSeriesChart.tsx` — thin wrapper（モード切替 + 共通 UI のみ）
- **ガード更新:** Tier 2 allowlist から削除（400行以下になる）

#### A-7. useMetricBreakdown.ts（useMemo 8, useState 5, 282行）
- **現状:** ナビゲーション状態 + 表示データ構築が混在
- **方針:**
  - `useMetricBreakdownNavigation.ts` — tab/history/expand の状態管理を分離
  - `useMetricBreakdown.ts` — データ構築のみ（useMemo 5-6個）
- **ガード更新:** useMemo + useState allowlist から削除

---

## B. 正当な複雑さ（allowlist 維持、コメント更新）

| ファイル | 理由 |
|----------|------|
| useComparisonModule.ts（useMemo 8） | ファサードの composition pipeline。8段の useMemo が責務そのもの。分割すると facade の意味がなくなる |
| usePersistence.ts（useState 6） | ストレージライフサイクルの独立状態。基準値ちょうど |
| useAutoBackup.ts（useState 6） | バックアップライフサイクルの独立状態。基準値ちょうど |
| categoryBenchmarkLogic.ts（398行） | Pure 関数。400行上限内。統計計算の凝集性が高い |
| usePeriodAwareKpi.ts（300行） | 基準値ちょうど。期間マージの pure 関数が含まれ凝集的 |
| TimeSlotChart.tsx（637行, Tier 2） | useState 0 / useMemo 0。hook に全委譲済みの理想形。JSX が長いだけ |
| useLoadComparisonData.ts（R2） | 92行。reducer 抽出済み。.then() 2行のみの例外 |

→ これらは「凍結（次回改修時に分割義務）」から「**許容（理由付き）**」にコメント変更。

---

## C. Domain/Infra 除外リスト（維持）

| ファイル | 行数 | 理由 |
|----------|------|------|
| metricDefs.ts | 454 | 純粋カタログ。分割すると参照性が下がる |
| PeriodSelection.ts | 403 | 日付操作 + ビルダー。凝集的 |
| rawAggregation.ts | 438 | 集計純粋関数群 |
| ComparisonScope.ts | 339 | 比較ロジック純粋関数 |
| schemas.ts | 338 | DDL 定数。分割不要 |

→ 現状の除外コメントを維持。

---

## 実行順序

```
Phase 1 (A-1, A-2)  ← 最も機械的。パターン同一
    ↓
Phase 2 (A-3, A-4)  ← useState → useReducer。テスト追加
    ↓
Phase 3 (A-5)       ← Pure 関数分割。テスト移動
    ↓
Phase 4 (A-6, A-7)  ← Presentation。影響範囲確認
    ↓
ガード更新 + B のコメント更新
    ↓
CI 全ゲート通過確認
```

## 完了基準

- [x] hookComplexityGuard.test.ts の全 allowlist から A-1〜A-7 を削除
- [x] R12 の Tier 2 から CvTimeSeriesChart を削除
- [x] B のコメントを「凍結」→「許容（理由）」に更新
- [x] CI 6段階ゲート全通過（214テスト 4302アサーション全通過、lint/format/tsc clean）
- [x] 新規ファイルは全て基準値以下（useMemo ≤7, useState ≤6, hook 300行, component 400行）

**完了日:** 2026-03-16
