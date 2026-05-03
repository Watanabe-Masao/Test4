# 二期間比較の入力契約定義

## 1. 問題

14 チャートが DualPeriodSlider で個別に期間管理を行っている。
`year - 1` + offset の日付計算を各自で独自実装しており、
閏年・月跨ぎ・alignment 不整合のバグ温床になっている。

## 2. 二期間比較の定義

| 用語 | 定義 | 例 |
|------|------|-----|
| **current** | 分析対象期間（当期） | 2026年3月1日〜3月30日 |
| **previous** | 比較基準期間（前期） | 2025年3月1日〜3月30日 |
| **comparisonBasis** | 比較の基準 | `previous-year` / `previous-period` |

## 3. 入力契約

```typescript
interface DualPeriodInput {
  readonly current: {
    readonly dateFrom: string  // 'YYYY-MM-DD'
    readonly dateTo: string    // 'YYYY-MM-DD'
  }
  readonly previous: {
    readonly dateFrom: string
    readonly dateTo: string
  }
  readonly comparisonBasis: 'previous-year' | 'previous-period'
}
```

## 4. 責務分離

| 層 | 責務 | やらないこと |
|------|------|-------------|
| **Page** | 期間の決定（periodSelectionStore 経由） | 値の計算 |
| **Widget** | 渡された期間での表示 | 期間の再構成 |
| **Chart** | 渡されたデータの描画 | 期間の解釈・変換 |
| **DualPeriodSlider** | 期間選択の UI | 指標値の計算 |

### 禁止事項

- chart 内で `year - 1` を計算して前年期間を構成しない
- chart 内で current / previous の解釈を変えない
- DualPeriodSlider に指標意味を持たせない
- 欠損時の挙動を chart ごとに独自定義しない

## 5. 片方欠損時の扱い

| 状態 | 表示 |
|------|------|
| current あり / previous あり | 両期間を表示 |
| current あり / previous なし | 当期のみ表示（「前年データなし」注記） |
| current なし | 表示しない |

## 6. 推奨方針

ページレベルの期間制御に統一する:

1. `periodSelectionStore` + `ctx.currentDateRange` で当期を管理
2. `ctx.prevYearDateRange` を `comparison.prevYearScope` から導出して追加
3. 個別チャートは `DualPeriodInput` props を受け取るだけ
4. DualPeriodSlider はページヘッダーに1つだけ配置

## 7. 対象チャート（11ファイル）

- BudgetTrendChart.tsx
- BudgetVsActualChart.tsx
- EstimatedInventoryDetailChart.tsx
- GrossProfitAmountChart.tsx
- GrossProfitRateChart.tsx
- PrevYearComparisonChart.tsx
- SalesPurchaseComparisonChart.tsx
- ShapleyTimeSeriesChart.tsx
- YoYVarianceChart.tsx
- ConditionMatrixTable.tsx
- YoYWaterfallChart.tsx

## 8. 実施順序

1. 代表 1〜2 チャートで PoC（統一入力契約を適用）
2. PoC 成功後、残りのチャートを段階的に移行
3. 全移行後、個別 DualPeriodSlider + useDualPeriodRange を廃止
