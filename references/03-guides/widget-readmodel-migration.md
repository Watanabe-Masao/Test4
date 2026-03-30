# Widget readModels 消費 移行ガイド

> widget が正本化済みの readModel / calculateModel を消費するだけの構造へ寄せる。

## Widget 分類

各 widget を 3 区分に分類する。

| Type | 定義 | readModels 要否 | 例 |
|------|------|----------------|-----|
| **Type 1** | 日別×店舗の粒度データが必要 | 必要 | GrossProfitHeatmap |
| **Type 2** | 期間合計（StoreResult）で十分 | 不要 | WaterfallChart, ExecSummaryBarWidget |
| **Type 3** | DuckDB QueryHandler 経由のチャート固有クエリ | orchestrator 拡張待ち | ConditionMatrixTable, CategoryDrilldown |

### Type 1 — readModels 消費対象

| Widget | 必要な readModel | 状態 |
|--------|-----------------|------|
| GrossProfitHeatmap | salesFact + purchaseCost | ✅ 移行済み |
| （今後追加される日別×店舗ビュー） | — | 未定 |

### Type 2 — StoreResult で十分

| Widget | データソース | 理由 |
|--------|-------------|------|
| WaterfallChart | `r.totalSales`, `r.totalCost` 等 | 期間合計のみ |
| ExecSummaryBarWidget | `r.totalSales`, `r.budget` 等 | 同上 |
| PlanActualForecast | `r.totalSales`, `r.budget` 等 | 同上 |
| ConditionSummary 系 | `r.*` (StoreResult フィールド) | 同上 |
| MonthlyCalendar | `r.daily`, `r.budgetDaily` | StoreResult の日別データ |
| DowGapKpiCard | `ctx.dowGap` | 比較サブシステム経由 |

### Type 3 — orchestrator 拡張待ち

| Widget | 現在のクエリ | 備考 |
|--------|-------------|------|
| ConditionMatrixTable | conditionMatrixHandler | QueryHandler 経由（正当） |
| CategoryDrilldown | CTS 系クエリ | 階層ドリルダウン固有 |
| UnifiedTimeSlotWidget 系 | 時間帯クエリ | 時間帯粒度は readModels 未対応 |

## Widget 移行ルール

### やること

1. **ViewModel を .vm.ts に抽出する**（純粋関数、React 非依存）
2. **readModels が available なら正本経路を使う**
3. **readModels が null なら StoreResult にフォールバックする**
4. **描画ロジックは変更しない**（データソースの切替のみ）

### やらないこと

- widget 内で business calculation をしない
- widget 内で fallback ルールを持たない
- widget 内で query を増やさない
- 1 PR で readModel 移行とレイアウト改修を混ぜない

## 消費パターン

```typescript
// ✅ 正しいパターン: VM 関数 + フォールバック
const storeRows = useMemo(() => {
  if (ctx.readModels?.salesFact && ctx.readModels?.purchaseCost) {
    return buildFromReadModels(ctx.readModels.salesFact, ctx.readModels.purchaseCost)
  }
  return buildFromStoreResults(ctx.allStoreResults)
}, [ctx.readModels, ctx.allStoreResults])

// ❌ 誤ったパターン: widget 内で readModel を直接集計
const total = ctx.readModels?.salesFact?.daily.reduce((s, r) => s + r.totalAmount, 0)
```

## 参照

- `application/hooks/useWidgetDataOrchestrator.ts` — 3 正本を並列取得
- `presentation/components/widgets/types.ts` — `UnifiedWidgetContext.readModels`
- `presentation/pages/Dashboard/widgets/GrossProfitHeatmap.vm.ts` — 実装例
