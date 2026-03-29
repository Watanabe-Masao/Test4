# 仕入原価の正本定義

## 1. 背景

仕入原価（purchase cost）は複数のページ・ウィジェットで表示されるが、
ページによって異なる値を示す症状が発生した。

原因調査の結果、**2つの異なる定義が混在**していることが判明した。

## 2. 2つの定義

### 定義A: 仕入分析定義（operational sourcing cost）

**用途:** 仕入分析ページの KPI / カテゴリ明細 / 日別ピボット

```
仕入原価 = purchase + flowers + directProduce + interStoreIn + interDeptIn
```

- 移動は **IN 方向のみ**（仕入れとして受け入れた分）
- OUT 方向（他店・他部門への払い出し）は含まない
- 「いくら仕入れたか」の観点

### 定義B: 在庫法定義（inventory method total cost）

**用途:** StoreResult.totalCost / DailyRecord.totalCost / 粗利ウォーターフォール

```
総仕入原価 = purchase + flowers + directProduce
           + interStoreIn + interStoreOut
           + interDeptIn + interDeptOut
```

- 移動は **全方向**（IN + OUT）
- 在庫法の算式: 売上原価 = 期首在庫 + 総仕入原価 - 期末在庫
- 「在庫の出入り全体」の観点

### 値の差異

```
定義A（IN のみ）: 29,116,541
定義B（全方向）:  28,876,446
差額:             240,095 = interStoreOut.cost + interDeptOut.cost
```

## 3. 正本の選定

### 仕入分析ページの正本: 定義A（IN 方向のみ）

理由:
- 仕入分析は「いくら仕入れたか」を分析する目的
- 払い出し（OUT）は仕入行為ではない
- カテゴリ別・取引先別の内訳は IN 方向のみが意味を持つ

### 在庫法 / 粗利計算の正本: 定義B（全方向）

理由:
- 在庫法の算式で「総仕入原価」は在庫の増減全体を捉える必要がある
- OUT 方向も在庫変動の一部

### ラベルの区別

| 定義 | 正式ラベル | 略称 |
|------|-----------|------|
| 定義A | 仕入原価（sourcing） | `purchaseCost` |
| 定義B | 総仕入原価（inventory） | `totalCost` |

## 4. 含む項目の詳細

| 項目 | 定義A (purchaseCost) | 定義B (totalCost) |
|------|---------------------|-------------------|
| purchase（通常仕入） | ✅ | ✅ |
| flowers（花） | ✅ | ✅ |
| directProduce（産直） | ✅ | ✅ |
| interStoreIn（店間入） | ✅ | ✅ |
| interStoreOut（店間出） | ❌ | ✅ |
| interDeptIn（部門間入） | ✅ | ✅ |
| interDeptOut（部門間出） | ❌ | ✅ |

## 5. 丸め規約

- **金額:** 整数円（`Math.round`）。表示時に `formatCurrency` で適用
- **率（値入率等）:** 丸めない（raw）。表示時に `formatPercent` で小数2位
- **集計中の丸め:** 行わない（raw numeric sum）。最終表示時のみ丸める

## 6. 欠損時の扱い

- DuckDB クエリ: `COALESCE(SUM(cost), 0)` — NULL は 0
- JS 集計: `?? 0` — undefined/null は 0
- 欠損日: 0 として集計（スキップしない）
- `missingDayCount` で欠損日数を記録し、監査可能にする

## 7. 取得経路の正本

### 仕入分析（定義A）

```
唯一の正本 read: readPurchaseCost()
  ├→ queryPurchaseDailyBySupplier()  — purchase テーブル
  ├→ querySpecialSalesDaily()        — special_sales テーブル（花・産直）
  └→ queryTransfersDaily()           — transfers テーブル（IN 方向のみ）

  結果から JS 集計で導出:
  ├→ KPI 合計
  ├→ カテゴリ別内訳
  └→ 日別ピボット
```

### 在庫法（定義B）

```
正本: getDailyTotalCost() → StoreResult.totalCost
  └→ dailyBuilder で日別に計算、storeAssembler で月合計
```

## 8. ガード条件

- 仕入分析ページは `readPurchaseCost()` 以外から仕入原価を取得してはならない
- `queryPurchaseTotal()` は廃止予定（dailyBySupplier の集計で代替）
- `queryPurchaseBySupplier()` は取引先名解決専用に限定
- presentation 層が購買系クエリを直接 import してはならない
