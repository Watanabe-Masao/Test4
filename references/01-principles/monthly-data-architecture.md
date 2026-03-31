# 月次データアーキテクチャ（ADR）

## 意思決定

1. **authoritative は月次正本（MonthlyData）からのみ算出する**
2. **自由期間分析は ComparisonScope / AnalysisFrame から算出する**
3. **ImportedData は互換レイヤーのみに閉じ込め、正本に戻さない**

## MonthlyData の所有範囲

| フィールド | MonthlyData に含む | 理由 |
|-----------|-------------------|------|
| classifiedSales | ✅ | DailyRecord 構築の primary source（domain calculations） |
| purchase | ✅ | 仕入原価の正本 |
| interStoreIn/Out | ✅ | 店間移動データ |
| flowers | ✅ | 花の売上 |
| directProduce | ✅ | 産直の売上 |
| consumables | ✅ | 消耗品原価 |
| categoryTimeSales | ✅ | カテゴリ×時間帯分析 |
| departmentKpi | ✅ | 部門KPI |
| stores | ✅ | 店舗マスタ |
| suppliers | ✅ | 取引先マスタ |
| settings | ✅ | 在庫設定 |
| budget | ✅ | 予算 |
| prevYearClassifiedSales | ❌ | 別月の MonthlyData.classifiedSales |
| prevYearCategoryTimeSales | ❌ | 別月の MonthlyData.categoryTimeSales |
| prevYearFlowers/Purchase/etc | ❌ | 別月の MonthlyData の各フィールド |

## 型の関係

```
MonthlyData          — 単月の normalized records 正本
AppData              — current + prevYear を持つアプリ状態
ImportedData         — 互換レイヤー（当年+前年同居の旧モデル）
ComparisonScope      — 期間比較の唯一の真実源
```

## 前年データの扱い

「前年」は特別な概念ではなく、**単に「別の月の MonthlyData」**。
`AppData.prevYear: MonthlyData | null` で保持する。

旧 `ImportedData.prevYear*` フィールドは `LegacyComparisonSlices` として
互換 adapter 経由でのみ構築される。

## 移行ルール

- 新規コードは `MonthlyData` / `AppData` を使う
- `ImportedData` が必要な場合は `monthlyDataAdapter.ts` 経由
- `ImportedData` の direct import は増加禁止（guard で強制）
