# 計算キャッシュ責務マトリクス

## Context

計算パイプラインのキャッシュは `CalculationFrame` を通じて frame-aware に統一済み。
今後の自由期間分析で cache 系統を分離する際の方針を文書化する。

## 現在の cache 体系

| データ種別 | version / key | invalidation trigger | 場所 |
|-----------|--------------|---------------------|------|
| **StoreResult（単月確定値）** | `authoritativeDataVersion` + `AppSettings` hash + `CalculationFrame` | `currentMonthData` 変更 / `updateInventory` / settings 変更 | `calculationCache` |
| **比較分析（PrevYearData）** | `comparisonDataVersion` | `prevYear` データ変更 / `setPrevYearMonthData` | `useComparisonModule` 内 useMemo |
| **DuckDB fingerprint** | `MonthlyData` record counts + storedMonthsKey | data / prevYear 変更 | `duckdbFingerprint` |

## cache key の構造

### StoreResult cache（`computeCacheKey`）

```
v{authoritativeDataVersion}:s{settingsHash}:d{frame.daysInMonth}:e{frame.effectiveDays}
```

- `authoritativeDataVersion`: store state の世代番号（currentMonthData 変更でインクリメント）
- `settingsHash`: AppSettings の計算影響フィールドの MurmurHash
- `frame.daysInMonth`: 月の日数
- `frame.effectiveDays`: 有効日数（dataEndDay cap 済み）

### store-level fingerprint（`computeFingerprint`）

MurmurHash of:
- storeId
- settings（計算影響フィールドのみ）
- CalculationFrame（全フィールド）
- 店舗固有レコード（purchase, classifiedSales, etc.）
- prevYear classifiedSales（比較用）

### global fingerprint（`computeGlobalFingerprint`）

全店舗の store-level fingerprint + グローバルレコード数。

## 将来の自由期間分析 cache（hook-in point）

| データ種別 | 想定 key | 備考 |
|-----------|---------|------|
| 自由期間 fact | `AnalysisFrame` hash | frame 変更で invalidation |
| 自由期間比較 | `AnalysisFrame` hash + `ComparisonScope` hash | 比較条件変更で invalidation |

### 分離方針

- StoreResult cache（単月確定値）と自由期間分析 cache は**別系統**
- StoreResult は `authoritativeDataVersion` ベース（O(1) lookup）
- 自由期間分析は `AnalysisFrame` hash ベース（frame 変更検知）
- comparison 変更時に StoreResult は invalidation **不要**（現状通り）

## 原則

1. cache key と計算条件の定義は**一致**させる（hidden dependency 禁止）
2. frame は **factory（`buildCalculationFrame`）でのみ生成**する
3. cache invalidation は store の version counter で駆動する（polling 禁止）
4. 将来の自由期間分析 cache 追加時は、この文書を更新すること
