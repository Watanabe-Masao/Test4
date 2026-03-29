# 仕入原価の正本定義

## 1. 背景

仕入原価（purchase cost）は複数のページ・ウィジェットで表示されるが、
ページによって異なる値を示す症状が発生した。

原因調査の結果、**移動原価（IN/OUT）の扱いが箇所によって異なる**ことが判明した。

## 2. 原価の構成要素

仕入原価は大きく3つに分類される。

### 通常仕入（purchase）

外部の仕入先（帳合先）から仕入れた原価。原価が**新規に発生**する。
各帳合先（supplierCode / supplierName）の内訳を持つ。

| 項目 | 性質 | 備考 |
|------|------|------|
| purchase | 通常仕入 | 帳合先別内訳（supplierBreakdown）を持つ |

### 売上納品（deliverySales）

仕入先からの入庫だが、**売上と仕入が同時に立つ**特殊な仕入。
在庫を経由せず直接売上に紐づく。

| 項目 | 性質 | 備考 |
|------|------|------|
| flowers（花） | 売上納品 | 花卉の仕入。売上と原価が同時計上 |
| directProduce（産直） | 売上納品 | 産直品の仕入。売上と原価が同時計上 |

### 移動原価（transfers）

一度通常仕入で原価が立ったものが、店舗間・部門間を移動する。
**新規仕入ではない**が、商品と金額の移動という意味では仕入の性質を持つ。

| 項目 | 性質 | 備考 |
|------|------|------|
| interStoreIn（店間入） | プラスの仕入 | 他店から商品+原価が入る |
| interStoreOut（店間出） | マイナスの仕入 | 他店へ商品+原価が出る。IN と対になる |
| interDeptIn（部門間入） | プラスの仕入 | 他部門から商品+原価が入る |
| interDeptOut（部門間出） | マイナスの仕入 | 他部門へ商品+原価が出る。IN と対になる |

### 原価算入費（costInclusion）

仕入原価には含まれないが、**粗利計算（推定法）で原価として反映**される費用。

| 項目 | 性質 | 備考 |
|------|------|------|
| costInclusionCost | 原価算入費 | 推定法の推定原価に加算される。在庫法には直接含まれない |

### 全体構造

```
総仕入原価
├── 通常仕入（purchase）
│   └── 帳合先別内訳（supplierBreakdown）
├── 売上納品
│   ├── 花（flowers）
│   └── 産直（directProduce）
└── 移動原価
    ├── 店間入（interStoreIn）   ← プラスの仕入
    ├── 店間出（interStoreOut）  ← マイナスの仕入
    ├── 部門間入（interDeptIn）  ← プラスの仕入
    └── 部門間出（interDeptOut） ← マイナスの仕入

粗利計算
├── 在庫法: 売上原価 = 期首在庫 + 総仕入原価 − 期末在庫
│   （総仕入原価 = 通常仕入 + 売上納品 + 移動原価）
│
└── 推定法: 推定原価 = 粗売上 × (1 − 値入率) + 原価算入費
    （コア売上 = 総売上 − 花売価 − 産直売価）
    （期中仕入原価 = 総仕入原価 − 売上納品原価）
```

### 移動原価の重要な性質

```
外部仕入先 →[purchase]→ A店 →[interStoreOut]→ B店（interStoreIn）

【通常仕入】 外部 → 自店  = プラスの仕入（商品+原価が外部から入る）
【店間入】   他店 → 自店  = プラスの仕入（商品+原価が他店から入る）
【店間出】   自店 → 他店  = マイナスの仕入（商品+原価が他店へ出る）
```

- 通常仕入・移動 IN・移動 OUT は全て**商品と金額の移動**であり、方向が違うだけで同じ性質
- 厳密には外部からの「仕入」ではないが、**商品と原価が移動する**という意味では仕入の性質を持つ
- マイナスの仕入（OUT）も「一度仕入れたものが移動する」という性質を持つ
- **全店合計**で見れば IN と OUT は**相殺されてゼロ**になる
- **単店舗**で見ると、OUT した分は原価が減り、IN した分は原価が増える

## 3. 3つの計算スコープ

コードベースに存在する3つの異なるスコープ:

### 在庫法（invMethod）— 全方向

```
総仕入原価 = purchase + flowers + directProduce
           + interStoreIn + interStoreOut
           + interDeptIn + interDeptOut
```

- **用途:** 会計的実績粗利の算出（売上原価 = 期首在庫 + 総仕入原価 - 期末在庫）
- **移動:** 全方向（IN + OUT）。在庫の出入り全体を捉える
- **実装:** `getDailyTotalCost()` → `StoreResult.totalCost`

### 推定法（estMethod）— 花・産直除外、移動は全方向、原価算入費を加算

```
期中仕入原価(在庫販売分) = totalCost - deliverySales.cost
                        = purchase + interStoreIn + interStoreOut
                          + interDeptIn + interDeptOut

推定原価 = 粗売上 × (1 - 値入率) + 原価算入費
推定期末在庫 = 期首在庫 + 期中仕入原価 - 推定原価
```

- **用途:** 推定期末在庫の算出。在庫推定・異常検知
- **移動:** 全方向。花・産直のみ除外（売上納品 = 在庫を経由しない）
- **原価算入費:** 推定原価に加算される（在庫法の総仕入原価には含まれない）
- **実装:** `inventoryCost` in `storeAssembler.ts`, `calculateEstMethodWithStatus` in `estMethod.ts`

### 仕入分析（現行実装）— IN 方向のみ ⚠️

```
仕入原価 = purchase + flowers + directProduce + interStoreIn + interDeptIn
```

- **用途:** 仕入分析ページの KPI / カテゴリ明細 / 日別ピボット
- **移動:** IN のみ。OUT を含まない
- **実装:** `computeKpiTotals()`, `buildDailyPivot()`, `buildSupplierAndCategoryData()`

## 4. 現行「仕入分析」の移動 IN のみフィルタの問題 ⚠️

### 問題: 移動 IN のみ加算すると二重計上が発生する

```
【単店舗の例】
  A店 purchase:       5,000,000（仕入先から仕入れ）
  A店 interStoreOut:   -500,000（B店へ移動）
  A店 interStoreIn:    +200,000（C店から受入）

  正しいA店の仕入原価:  5,000,000 - 500,000 + 200,000 = 4,700,000
  IN のみの計算:        5,000,000 + 200,000 = 5,200,000 ← OUT が消えない

【全店合計の例】
  全店 purchase 合計:   8,000,000
  全店 interStoreIn:   +1,000,000
  全店 interStoreOut:  -1,000,000（IN と対で相殺）

  正しい全店仕入原価:   8,000,000（IN/OUT 相殺でゼロ）
  IN のみの計算:        8,000,000 + 1,000,000 = 9,000,000 ← IN 分が二重計上
```

### 実測値の差異

```
仕入分析（IN のみ）: 29,116,541
在庫法（全方向）:     28,876,446
差額:                 240,095 = interStoreOut.cost + interDeptOut.cost（未計上分）
```

### 影響箇所（3箇所で同じ IN のみフィルタ）

1. `purchaseComparisonKpi.ts` line 108, 114 — KPI 合計
2. `purchaseComparisonDaily.ts` line 131, 147 — 日別ピボット
3. `purchaseComparisonCategory.ts` line 188 — カテゴリ明細

### 是正方針（要検討）

**移動 IN/OUT を両方含める**ことで在庫法と整合させるべき。
ただし業務ロジックの変更であるため、慎重な検証が必要:

- 全店合計で IN/OUT が正しく相殺されるかデータ検証
- 単店舗表示で移動 OUT がマイナス値として正しく表示されるか
- カテゴリ明細で「店間移動」が IN-OUT のネット値になるか
- 粗利ウォーターフォール（在庫法）との整合性確認

## 5. 正本の統一方針

### 目標: 全スコープで移動を全方向（IN + OUT）に統一

| スコープ | 花・産直 | 移動 | 現状 | 目標 |
|---------|---------|------|------|------|
| 在庫法 | 含む | 全方向 | ✅ 正しい | 変更なし |
| 推定法 | 除外 | 全方向 | ✅ 正しい | 変更なし |
| 仕入分析 | 含む | **IN のみ** ⚠️ | 二重計上リスク | **全方向に修正** |

### 取得経路の正本

```
唯一の正本 read: readPurchaseCost()
  ├→ queryPurchaseDailyBySupplier()  — purchase テーブル
  ├→ querySpecialSalesDaily()        — special_sales テーブル（花・産直）
  └→ queryTransfersDaily()           — transfers テーブル（全方向: IN + OUT）

  結果から JS 集計で導出:
  ├→ KPI 合計
  ├→ カテゴリ別内訳（店間移動・部門間移動は IN-OUT のネット値）
  └→ 日別ピボット
```

### 在庫法の正本

```
正本: getDailyTotalCost() → StoreResult.totalCost
  └→ dailyBuilder で日別に計算、storeAssembler で月合計
```

## 6. 丸め規約

- **金額:** 整数円（`Math.round`）。表示時に `formatCurrency` で適用
- **率（値入率等）:** 丸めない（raw）。表示時に `formatPercent` で小数2位
- **集計中の丸め:** 行わない（raw numeric sum）。最終表示時のみ丸める

## 7. 欠損時の扱い

- DuckDB クエリ: `COALESCE(SUM(cost), 0)` — NULL は 0
- JS 集計: `?? 0` — undefined/null は 0
- 欠損日: 0 として集計（スキップしない）
- `missingDayCount` で欠損日数を記録し、監査可能にする

## 8. ガード条件

- 仕入分析ページは `readPurchaseCost()` 以外から仕入原価を取得してはならない
- `queryPurchaseTotal()` は廃止予定（dailyBySupplier の集計で代替）
- `queryPurchaseBySupplier()` は取引先名解決専用に限定
- presentation 層が購買系クエリを直接 import してはならない
