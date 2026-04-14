# inventory 04 — HeaderFilterState 直接参照 hook / component

> 対応 checklist: Phase 0 #4
> 剥がす Phase: Phase 1（入力契約統一）
> 完了条件: 全行が Phase 1 で `HeaderFilterState → FreePeriodAnalysisFrame`
> adapter 経由に置換されている

## 棚卸し対象

以下のパターンを対象とする:

- `useHeaderFilterState()` を component / hook / VM で直接呼んでいる
- `HeaderFilterState` 型を引数で受け取って query を組み立てている
- `dateFrom` / `dateTo` / `storeIds` / `comparison` を ad hoc に組み合わせている
- `header.filter.dateFrom` のような分割アクセス

## 検出方法

```
Grep: HeaderFilterState|useHeaderFilterState
  glob: app/src/**/*.{ts,tsx}
Grep: header\.filter\.|headerFilter\.
  glob: app/src/**/*.{ts,tsx}
```

`presentation/hooks/useHeaderFilterState.ts` 自体と、その正規 consumer
（adapter 1 箇所）は除外する。

## 棚卸し結果

| Path | Lines | 種別 | 用途 | メモ | Done |
|---|---|---|---|---|---|
| — | — | — | — | **該当 0 件**（`HeaderFilterState` という型・hook は codebase に存在しない） | — |

## 集計

- 件数: 0
- 影響ファイル数: 0
- 種別内訳: 該当なし

## ⚠️ Phase 0 棚卸しで判明した前提の齟齬と実体の特定

`plan.md` Phase 1 および `checklist.md` Phase 1 は `HeaderFilterState → FreePeriodAnalysisFrame` adapter の導入を前提とするが、Phase 0 追加調査の結果、次が判明した:

### 1. `HeaderFilterState` は存在しない（仮名）

- `Grep HeaderFilterState|useHeaderFilterState -- app/src/` → **0 ヒット**
- `plan.md` の型名はプレースホルダー（仮名）であり、実体の型名ではない

### 2. 実体は `PeriodSelection` + `usePeriodSelectionStore`

固定期間ダッシュボードのヘッダ状態は次で管理されている:

| 要素 | パス | 役割 |
|---|---|---|
| 型定義 | `app/src/domain/models/PeriodSelection.ts` | `period1` / `period2` / `comparisonEnabled` / `activePreset` を含む |
| Store | `app/src/application/stores/periodSelectionStore.ts` (`usePeriodSelectionStore`) | source of truth |
| 現行 consumer | `app/src/presentation/hooks/useUnifiedWidgetContext.ts:60` | `usePeriodSelectionStore((s) => s.selection)` を直接 read |

`PeriodSelection` は `period1` / `period2` / `comparisonEnabled` / `activePreset` を持ち、プリセット種別は `prevYearSameMonth` / `prevYearSameDow` / `prevMonth` / `prevWeek` / `prevYearNextWeek` / `custom` の 6 種。plan.md が想定する「固定期間ヘッダ」の入力モデルそのもの。

### 3. `PeriodSelection → FreePeriodAnalysisFrame` adapter は既に存在する（が配線されていない）

- `app/src/domain/models/buildFreePeriodFrame.ts` — `buildFreePeriodFrame(selection, storeIds, elapsedDays)` として実装済み
- 内部で `buildComparisonScope(selection, elapsedDays)` を呼んで `ComparisonScope` を構築
- しかし **consumer 0**: `Grep buildFreePeriodFrame` → 自ファイル + 2 ガードテストのみ
- `analysisFrameGuard.test.ts` / `freePeriodPathGuard.test.ts` が存在を要求するが、実コードから呼ばれていない

### 4. `useFreePeriodAnalysisBundle` bundle hook も既に存在する（が配線されていない）

- `app/src/application/hooks/useFreePeriodAnalysisBundle.ts` — 1 つの `FreePeriodAnalysisFrame` から fact / budget / deptKPI の 3 readModel をまとめて返す
- `Grep useFreePeriodAnalysisBundle` → 自ファイル + 1 audit テストのみ。実 consumer 0

### 5. 実際の現行経路（Phase 1 で置換対象になる箇所）

現状の固定期間ダッシュボードは `useFreePeriodAnalysisBundle` を経由せず次の流れ:

```
usePeriodSelectionStore (store)
  ↓ useUnifiedWidgetContext が直接 read
useComparisonSlice(periodSelection, ...)
useQuerySlice(targetYear, targetMonth, ...)
useWeatherSlice / useChartInteractionSlice
  ↓
個別の StoreResult / readModel を slice が個別に取得
```

Phase 1 はこの流れを次に置換するのが本質:

```
usePeriodSelectionStore
  ↓
buildFreePeriodFrame(selection, storeIds, elapsedDays) [既存]
  ↓
useFreePeriodAnalysisBundle(frame) [既存]
  ↓
widget 入力
```

## 棚卸し結果（実体名ベース再解釈）

`HeaderFilterState` を `PeriodSelection` + `usePeriodSelectionStore` と読み替えた上での直接参照:

| Path | Lines | 種別 | メモ | Done |
|---|---|---|---|---|
| `app/src/presentation/hooks/useUnifiedWidgetContext.ts` | L26, L60 | store 直接 read | `usePeriodSelectionStore((s) => s.selection)` を presentation hook が直接読んでいる。Phase 1 では `buildFreePeriodFrame` 経由に置換する起点 | |

## 集計

- 旧定義（`HeaderFilterState` 文字列）での件数: 0
- 新定義（`PeriodSelection` 実体への直接参照）での件数: **1 箇所 / 1 ファイル**（要追加調査: `useUnifiedWidgetContext` が呼び出している slice / hook も含めると数件に拡大する可能性あり）
- 影響ファイル数: 1 起点 + slice 群（未調査）

## Phase 1 の再定義（提案）

Phase 1 checklist の 4 項目は次に再解釈できる:

| 旧 checkbox | 新 checkbox（提案） | 実態 |
|---|---|---|
| `HeaderFilterState → FreePeriodAnalysisFrame` adapter を 1 箇所に実装する | `PeriodSelection → FreePeriodAnalysisFrame` adapter を 1 箇所に固定する | ✅ 既に `buildFreePeriodFrame` として存在。作業は「固定」= 他経路禁止ガード追加 |
| 既存固定期間画面が adapter 経由で frame を構築するように切り替える | `useUnifiedWidgetContext` を `buildFreePeriodFrame` + `useFreePeriodAnalysisBundle` 経由に切り替える | 未着手。Phase 1 の実作業本体 |
| 画面内部 hook が `HeaderFilterState` を直接参照していないことをガードで保証する | presentation hook が `usePeriodSelectionStore` を直接参照していないことをガードで保証する | 未着手。`buildFreePeriodFrame` 以外の consumer を禁止するガード |
| 比較系 hook の入口を frame ベースに統一する | `useComparisonSlice` を `FreePeriodAnalysisFrame.comparison` 経由で受け取る形に切り替える | 未着手 |

このまま plan.md / checklist.md を更新してよいかは人間判断だが、証拠の強度としては `PeriodSelection` で確定できる。
