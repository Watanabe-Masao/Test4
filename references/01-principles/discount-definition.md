# 値引き（売変）の正本定義

## 1. 背景

売変（値引き）は 71/72/73/74 の4種別で管理され、
部門/ライン/クラス × 店舗 × 日別で頻繁に分析される。

棚卸しの結果、3つの独立パスに分散:
- JS Path: ClassifiedSalesData → DailyRecord.discountEntries
- DuckDB Path: classified_sales → store_day_summary → クエリ
- Metrics Path: StoreResult.discountRate（独立算出）

## 2. 売変の4種別

| コード | 名称 | 説明 |
|--------|------|------|
| 71 | 見切り | 消費期限近い等 |
| 72 | 値下げ | 戦略的値下げ |
| 73 | 特売 | 特売セール |
| 74 | その他 | その他の値引き |

## 3. 正本化方針

売変は `readSalesFact()` に混ぜず、**独立正本 `readDiscountFact()`** として管理。

理由:
- 売変は意味論が売上と異なる（売上のマイナス要因）
- 4種別（71-74）が独立の分析軸
- 時間帯データを持たない（CTS の time_slots に売変はない）

## 4. 正本ファクト粒度

```
storeId × date × deptCode × lineCode × klassCode
```

フィールド:
- `discount71` / `discount72` / `discount73` / `discount74`
- `discountTotal` = Σ(71+72+73+74)

時間帯は持たない（仕様として固定）。

## 5. 導出

- 店舗別合計
- 日別合計
- 階層別合計（部門/ライン/クラス）
- 売変率 = discountTotal / (sales + discountTotal)
- 売変インパクト（discountLossCost）

## 6. 関連ファイル

- `infrastructure/duckdb/queries/categoryDiscount.ts` — DuckDB クエリ
- `domain/calculations/discountImpact.ts` — 売変インパクト計算
- `domain/models/StoreResult.ts` — discountRate, totalDiscount, discountEntries
- `presentation/components/charts/DiscountAnalysisPanel.tsx` — 表示
