# Phase 6.5 / Step B 設計 — FreePeriodReadModel 次元拡張

> **Status**: Draft (2026-04-15)
> **対象**: `unify-period-analysis` Phase 6 Step B (contract change)
> **依存**: Phase 6 Step A/C/D 完了、`inventory/05-phase6-widget-consumers.md`
> **関連**: `step-c-timeslot-lane-policy.md` (sibling lane パターン)

## 1. なぜ別 phase に切り出すか

Step B は Step A/C/D と性質が違う。A は summary 差し替え、C は sibling lane の追加、
D は presentation → application の pure helper 移管であり、いずれも
**contract (Zod schema + 定義書 + guard) の変更を伴わない**。

Step B は次を同時に変える必要がある:

- `FreePeriodReadModel` の Zod schema (新フィールド追加)
- `free-period-analysis-definition.md` の正本定義
- `useFreePeriodAnalysisBundle` の戻り型
- `presentation/components/widgets/types.ts` の `UnifiedWidgetContext`
- 関連 guard (`freePeriodHandlerOnlyGuard` 等) の期待値
- 消費 widget (`SalesPurchaseComparisonChart` / `YoYWaterfallChart`) の読み口

これは典型的な **contract change + coordinated rollout** であり、Phase 6.5 として
独立の phase で扱うのが筋。本ドキュメントはその起点となる。

## 2. 追加する次元 (inventory/05 由来)

`inventory/05-phase6-widget-consumers.md` が特定した「FreePeriodReadModel に
足りない中間粒度」は 3 つ:

| 次元 | 必要とする widget | 粒度 | 備考 |
|---|---|---|---|
| **A. 店舗別日次シリーズ** | `SalesPurchaseComparisonChart` | `(storeId, dateKey)` → sales / purchaseCost / grossSales | 現在は `StoreResult.daily` を横串で読んでいる |
| **B. category (department) 次元** | `YoYWaterfallChart` | `(deptCode, dateKey)` → Shapley 要素 (sales / customers / txValue) | 現在は CTS raw records を手動集約 |
| **C. 時刻 (hour) 次元** | 時間帯比較 | `(storeId, hour)` | **Step C で別レーン化済み** — 本 Step B の対象外 |

Step B の範囲は **A + B** の 2 次元。C は Step C で `timeSlotLane` として分離済み。

## 3. 設計原則

### 3.1 raw rows を presentation に公開しない (G3-2 踏襲)

`currentRows / comparisonRows` は既に G3-2 で禁止されている。新次元も同じ:

- application 層で pre-aggregated な **projection series** を組み立てる
- presentation は「series を消費するだけ」に留まる
- raw row 型は `StoreAggregationRow` と同じ扱いで raw row guard の対象にする

### 3.2 次元ごとに sibling projection を置く (Step C パターン継承)

Step C は `projectTimeSlotSeries` + `TimeSlotSeries` という単一意味の sibling
を置いた。Step B は同じパターンを 2 次元に対して繰り返す:

- `projectStoreDailySeries(rows, options) → StoreDailySeries` (pure)
- `projectCategoryDailySeries(rows, options) → CategoryDailySeries` (pure)

### 3.3 FreePeriodReadModel を拡張するか、sibling lane を増やすか

**判断: `FreePeriodReadModel` の拡張ではなく、sibling lane を 2 本追加する。**

理由:

- `FreePeriodReadModel.currentSummary` は「期間総計」という 1 つの意味で閉じている。
  ここに店舗別 / category 別 timeseries を足すと、意味責任が肥大化する
- Step C で `timeSlotLane` を sibling として切り出した判断と一貫性が取れる
- `FreePeriodReadModel` の Zod schema を触らずに済む (既存テスト / bridge への
  影響を最小化)

代わりに `ctx` に:

- `ctx.storeDailyLane = { frame, bundle }`
- `ctx.categoryDailyLane = { frame, bundle }`

の 2 本を加える。`timeSlotLane` / `freePeriodLane` の sibling として揃える。

> **注意**: これは `UnifiedWidgetContext` のフィールド数を 49 → 51 に押し上げる
> (AR-003 baseline 更新が必要)。Step B 完了時に他の未使用フィールドを整理できれば
> 相殺可能だが、当面は ratchet-up で受ける。

## 4. 型契約 (design-level)

### 4.1 StoreDailySeries

```ts
export interface StoreDailyEntry {
  readonly storeId: string
  /** dateKey → metrics。欠損日は Map に entry なし */
  readonly daily: ReadonlyMap<string, {
    readonly sales: number
    readonly customers: number
    readonly purchaseCost: number
    readonly grossSales: number
  }>
  /** 期間合計 */
  readonly totals: {
    readonly sales: number
    readonly customers: number
    readonly purchaseCost: number
    readonly grossSales: number
  }
}

export interface StoreDailySeries {
  readonly entries: readonly StoreDailyEntry[]  // storeId 昇順
  readonly grandTotals: {
    readonly sales: number
    readonly customers: number
    readonly purchaseCost: number
    readonly grossSales: number
  }
  readonly dayCount: number
}
```

### 4.2 CategoryDailySeries

```ts
export interface CategoryDailyEntry {
  readonly deptCode: string
  readonly deptName: string
  readonly daily: ReadonlyMap<string, {
    readonly sales: number
    readonly customers: number
    readonly salesQty: number
  }>
  readonly totals: {
    readonly sales: number
    readonly customers: number
    readonly salesQty: number
  }
}

export interface CategoryDailySeries {
  readonly entries: readonly CategoryDailyEntry[]  // deptCode 昇順
  readonly grandTotals: {
    readonly sales: number
    readonly customers: number
    readonly salesQty: number
  }
  readonly dayCount: number
}
```

### 4.3 Bundle / Lane (sibling パターン)

```ts
export interface StoreDailyBundle {
  readonly currentSeries: StoreDailySeries | null
  readonly comparisonSeries: StoreDailySeries | null
  readonly meta: { usedFallback: boolean; provenance: StoreDailyProvenance }
  readonly isLoading: boolean
  readonly errors: Partial<Record<'current' | 'comparison', Error>>
  readonly error: Error | null
}

// CategoryDailyBundle も同形
```

`provenance` の扱いは `TimeSlotProvenance` と同じく `mappingKind` +
`comparisonRange` の 2 必須フィールドで揃える。

## 5. 実装ステップ (Step C と同じ成功パターン)

### Phase 6.5-1: 型契約と pre-work guard (本 step の目的)

1. `StoreDailySeries` / `CategoryDailySeries` 型契約を `application/hooks/` 配下に新設 (実装なし)
2. 対応する raw row consumer の現状 baseline を guard で固定 (ratchet-down 起点)
3. 方針ドキュメント (本ファイル) を固定

### Phase 6.5-2: projection 真理表テスト

1. `projectStoreDailySeries` の truth-table parity test を先に書く (実装前)
2. `projectCategoryDailySeries` も同様
3. 凍結対象:
   - dateKey / storeId (or deptCode) の昇順安定ソート
   - 欠損日 / 欠損 metric の扱い
   - 同一 (key × dateKey) の合算
   - store subset / dept subset のフィルタ
   - grandTotals の整合

### Phase 6.5-3: pure projection の実装

1. `projectStoreDailySeries(rows, options)` pure 関数を実装
2. `projectCategoryDailySeries(rows, options)` pure 関数を実装
3. Phase 6.5-2 の真理表を通す

### Phase 6.5-4: bundle hook + ctx 配布

1. `useStoreDailyBundle(executor, frame)` hook を新設 (Step C の useTimeSlotBundle と同じ形)
2. `useCategoryDailyBundle(executor, frame)` hook を新設
3. `useUnifiedWidgetContext` に `ctx.storeDailyLane` / `ctx.categoryDailyLane` を配布
4. `WidgetContext` 型に追加 (AR-003 baseline 49 → 51)

### Phase 6.5-5: 消費 widget 載せ替え

1. `SalesPurchaseComparisonChart` を `ctx.storeDailyLane.bundle.currentSeries` 経由に切替
2. `YoYWaterfallChart` を `ctx.categoryDailyLane.bundle.currentSeries` 経由に切替
3. 旧 `StoreResult.daily` / CTS raw records 直接消費を削除
4. `phase6SummarySwapGuard` と同じ regression freeze guard を新設

### Phase 6.5-6: 最終クローズ

1. `inventory/05` の HIGH リスク 2 件 (`SalesPurchaseComparisonChart` /
   `YoYWaterfallChart`) を `Done: <commit>` で marker
2. `checklist.md` Phase 6 の Step B 関連 4 checkbox を `[x]` に
3. Phase 6 全体クローズを `HANDOFF.md` に記録

## 6. リスクと mitigation

| リスク | mitigation |
|---|---|
| `FreePeriodReadModel` の Zod schema を触る必要が出る | 本設計では触らず sibling lane 化する。新 bundle は独立の Zod schema を持つ |
| `UnifiedWidgetContext` フィールド数 baseline 49 → 51 の ratchet-up | AR-003 changelog コメントで理由を記録。将来の統合タスクで再減少させる |
| YoYWaterfallChart の Shapley 計算が domain projection と意味論的に合わない | Phase 6.5-2 の truth-table で legacy との parity を凍結。合わない場合は calling convention を先に合わせる |
| widget 差し替え後の UI regression | Step A/D と同じく、widget 単位 parity test を先に作る |

## 7. 非スコープ (Step B では扱わない)

- `FreePeriodReadModel.currentSummary` の拡張 (summary は現状の期間総計で十分)
- `TimeSlotBundle` (Step C で完結済み、Phase 6.5 は touch しない)
- Mobile / Insight 系の載せ替え (Phase 6b で legacy caller は 0 到達済み)
- 新規 handler の追加 (既存 `storeDaySummaryHandler` / `deptKpiMonthlyTrendHandler`
  等の query を再利用する方向で進める)

## 8. 進め方の推奨順序

1. **本設計ドキュメントの承認** (人間レビュー)
2. **型契約ファイル + pre-work guard** (Phase 6.5-1) を 1 commit
3. **projection 真理表テスト** (Phase 6.5-2) を 1 commit
4. **pure projection 実装** (Phase 6.5-3) を 1 commit
5. **bundle + ctx 配布** (Phase 6.5-4) を 1 commit
6. **widget 載せ替え** (Phase 6.5-5) を widget 単位 2 commit に分ける
7. **クローズ** (Phase 6.5-6) を 1 commit

各 step は Step C / Step D と同じサイズ感 (200-500 行程度) に収まる想定。

## 9. 関連

- `projects/unify-period-analysis/inventory/05-phase6-widget-consumers.md` — Step A-D scope 再定義の根拠
- `projects/unify-period-analysis/step-c-timeslot-lane-policy.md` — sibling lane パターンの先行事例
- `app/src/application/hooks/timeSlot/` — Step C の実装 (本 step の参照実装)
- `app/src/application/readModels/freePeriod/FreePeriodTypes.ts` — 既存 readModel contract (触らない)
- `app-domain/gross-profit/rule-catalog/base-rules.ts` — AR-003 fieldMax baseline (更新対象)
