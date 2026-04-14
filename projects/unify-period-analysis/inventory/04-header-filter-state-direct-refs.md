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

## ⚠️ Phase 0 棚卸しで判明した前提の齟齬

`plan.md` Phase 1 および `checklist.md` Phase 1 は `HeaderFilterState → FreePeriodAnalysisFrame` adapter の導入を前提とするが、実際には:

- **`HeaderFilterState` / `useHeaderFilterState` は存在しない**（ `Grep HeaderFilterState|useHeaderFilterState -- app/src/` → 0 ヒット）
- `FreePeriodAnalysisFrame` は `app/src/domain/models/AnalysisFrame.ts` に既に存在し、`buildFreePeriodFrame.ts` / `useFreePeriodAnalysisBundle.ts` / `analysisFrameGuard.test.ts` で運用されている

実際のヘッダ状態は次のいずれか（または組み合わせ）で管理されている:

| 候補 | パス | 備考 |
|---|---|---|
| `UnifiedFilter` | `app/src/domain/models/UnifiedFilter.ts` | 統合フィルタ型 |
| `useFilterSelectors` | `app/src/application/hooks/useFilterSelectors.ts` | 選択系 hook |
| `periodFilterHooks` | `app/src/presentation/components/charts/periodFilterHooks.ts` | period フィルタ |
| `PeriodSelection` | `app/src/domain/models/PeriodSelection.ts` | 期間選択モデル |
| `useUnifiedWidgetContext` | `app/src/presentation/hooks/useUnifiedWidgetContext.ts` | widget 入口 |

Phase 1 に着手する前に、**plan.md の `HeaderFilterState` が指していた実体がどれか**を確定する必要がある。候補を絞って本 inventory を再実行するか、plan.md を現実の型名に書き換えるか、どちらかを人間判断で選ぶ。

## Phase 1 再定義の提案

1. 現実のヘッダ状態ソースを 1 つ（または複数）選ぶ（例: `useUnifiedWidgetContext` + `UnifiedFilter`）
2. そこから `FreePeriodAnalysisFrame` への adapter が既に存在するか確認する（`buildFreePeriodFrame.ts` の consumer から逆引き）
3. 直接参照 vs adapter 経由の比率を再棚卸しする（本 inventory ファイルを新しい検索パターンで上書き）
4. `plan.md` / `checklist.md` Phase 1 の型名を実体に合わせて更新する
