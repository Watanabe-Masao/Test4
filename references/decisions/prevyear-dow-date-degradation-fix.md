# 前年同曜日比較の日付劣化バグ — 根本原因分析と再発防止

> 作成日: 2026-03-13
> 対象ブランチ: `claude/fix-prevyear-weekday-mapping-QwL1T`
> コミット: 11件（`12236ca`〜`20c5fa7`）

---

## 1. 現象

前年同曜日比較（prevYearSameDow）で、月末の比較値が 0 になる、
または誤った日の売上が表示される。

具体例: 2026年2月の同曜日比較で、2/28（土曜）の前年比較先は 2025/3/1（土曜）。
しかし UI には 0 が表示されていた。

---

## 2. 根本原因（3層構造）

バグは単一の箇所ではなく、3層にまたがる構造的問題だった。

### 層1: sourceMonth の誤選択（集計層）

**場所**: `buildComparisonAggregation.ts` — `findSourceMonth()`

`ComparisonScope.queryRanges.period2`（候補窓）の中央値から `sourceMonth` を導出していた。
候補窓は `targetMonth の日数 + 14日` の幅を持つため、月をまたぐ場合に中央値が
隣接月を指すことがあった。

```
例: 2026/2 の候補窓 = 2025/2/1 〜 2025/3/14（42日間）
    中央値 = 2025/2/22 → sourceMonth = 2 ← 正しい

    しかし月の組み合わせ次第で中央値がずれる
```

**修正**: `alignmentMap` の最頻月（実際にマッピングされた日の過半数が属する月）から導出。

### 層2: DayMappingRow の日付情報不足（型設計）

**場所**: `comparisonTypes.ts` — `DayMappingRow`

元々 `DayMappingRow` は `prevDay`（日番号のみ）しか持っておらず、
`prevMonth` / `prevYear` がなかった。月跨ぎ時に「日番号 1 は何月の 1 日か」が不明。

**修正**: `prevMonth` / `prevYear` フィールドを追加。

### 層3: UI 側の情報劣化（**根本原因**）

**場所**: `SalesAnalysisWidgets.tsx` — `buildPrevSameDowMap()`

```typescript
// 修正前: sourceDate を失う変換
function buildPrevSameDowMap(dailyMapping: readonly DayMappingRow[])
  : ReadonlyMap<number, { sales: number; customers: number }>
```

この関数が `DayMappingRow`（prevYear/prevMonth/prevDay/currentDay/sales/customers）を
`Map<number, { sales, customers }>` に劣化させていた。

**この時点で、以後の表・グラフは「その値がどの実日付から来たか」を復元できない。**

同様の劣化は `conditionPanelYoY.vm.ts` の `buildDailyYoYRows()` 内にもあった。

**修正**: `SameDowPoint` 型を導入し、`buildSameDowPoints()` を唯一の変換入口とした。

---

## 3. なぜ層3が「根本」か

層1・層2 は個別のバグであり、テストで発見・修正できた。
しかし層3（情報劣化）は**構造的な弱点**であり、層1・層2 を直しても残る。

```
DayMappingRow (prevYear=2025, prevMonth=3, prevDay=1, currentDay=28)
    ↓ buildPrevSameDowMap()  ← ここで情報が消える
Map { 28 → { sales: 1722, customers: 80 } }
    ↓
UI: 「28日の前年売上は 1722」
    → でも、それは何月何日の値？ → 分からない
```

この構造では:
- デバッグ時に出典を追跡できない
- ツールチップに「前年 3/1 の値」と表示できない
- 同じ劣化を別の場所で再実装するリスクがある

---

## 4. 修正の全体像

### コミット履歴（時系列）

| # | コミット | 層 | 内容 |
|---|---|---|---|
| 1 | `12236ca` | 集計 | `deriveDowOffset` の候補窓月ずれバグ修正 |
| 2 | `ed23003` | 移行 | 旧式 `usePrevYearData` hook 削除 |
| 3 | `8d40733` | 移行 | 比較移行ガードテスト追加 + `usePrevYearMonthlyKpi` 削除 |
| 4 | `2610146` | 型 | `PrevYearData.daily` を `Map<number>` → `Map<string>` (DateKey) に移行 |
| 5 | `d48e159` | 集計 | `buildAlignmentMap` に per-day DOW 解決を追加 |
| 6 | `c31c106` | style | Prettier 修正 |
| 7 | `055e6c8` | UI | 曜日平均・週別サマリーの前年値参照を `sameDow.dailyMapping` に統一 |
| 8 | `eb36eb9` | 型 | `DayMappingRow` に `prevMonth` / `prevYear` 追加 |
| 9 | `896e570` | 集計 | `SourceDataIndex` 抽象で allAgg リナンバリングを封じ込め |
| 10 | `779ada1` | 集計 | `sourceMonth` を alignmentMap 最頻月から導出 |
| 11 | `20c5fa7` | UI | `SameDowPoint` 型で sourceDate を末端まで保持 |

### 新しいデータフロー

```
aggregateKpiByAlignment()
  ↓ DayMappingRow[] (prevYear/prevMonth/prevDay/currentDay/sales/customers)
buildSameDowPoints()           ← 唯一の変換入口
  ↓ Map<number, SameDowPoint>  (currentDay → { sourceDate, sales, customers })
UI widgets                     ← sourceDate を保持したまま消費
```

---

## 5. 再発防止ルール

### ルール1: 比較データを UI 用に変換するとき source date を落とさない

**これが最重要ルール。** 今回のバグの直接原因。

```typescript
// 禁止: source date を落とす変換
Map<number, { sales: number; customers: number }>

// 必須: SameDowPoint を使う
Map<number, SameDowPoint>  // sourceDate を必ず保持
```

### ルール2: sameDow 系 UI は `buildSameDowPoints()` を唯一の入口とする

- `SalesAnalysisWidgets.tsx` の曜日平均・週別サマリー
- `conditionPanelYoY.vm.ts` の日別前年比
- 将来追加される同曜日比較 UI

すべて `buildSameDowPoints(kpi.sameDow.dailyMapping)` を経由する。
個別に `dailyMapping` をループして独自 Map を作らない。

### ルール3: UI は `prevYear.daily` を直接見ない

`PrevYearData.daily` は経過日数キャップ付きの合算結果であって、
グラフ表示用の完全な対応表ではない。

同曜日比較のグラフ・表には `PrevYearMonthlyKpi.sameDow.dailyMapping` を使う。

### ルール4: 型で防ぐ

`SameDowPoint` は `sourceDate` を readonly で保持する。
`number` だけを返す helper を作らない。

```typescript
export interface SameDowPoint {
  readonly currentDay: number
  readonly sourceDate: {
    readonly year: number
    readonly month: number
    readonly day: number
  }
  readonly sales: number
  readonly customers: number
}
```

---

## 6. テストによる保証

### 既存テスト（集計層の不変条件）

| 不変条件 ID | 内容 | テストファイル |
|---|---|---|
| INV-AGG-01 | Σ(storeContributions.sales) = entry.sales | `buildComparisonAggregation.test.ts` |
| INV-AGG-02 | Σ(storeContributions.customers) = entry.customers | 同上 |
| INV-AGG-03 | Σ(dailyMapping.prevSales) = entry.sales | 同上 |
| INV-AGG-04 | Σ(dailyMapping.prevCustomers) = entry.customers | 同上 |
| INV-CMP-05 | period2 は候補窓（1:1 比較期間ではない） | `ComparisonScopeInvariant.test.ts` |

### 新規テスト（UI adapter の不変条件）

| テスト | 内容 | テストファイル |
|---|---|---|
| sourceDate 保持 | `buildSameDowPoints()` が prevYear/prevMonth/prevDay を保持する | `sameDowPoint.test.ts` |
| 月跨ぎ保持 | 2026/2/28 → 2025/3/1 で sourceDate.month=3 を失わない | 同上 |
| 売上合計一致 | Σ(points.sales) = Σ(dailyMapping.prevSales) | 同上 |
| 客数合計一致 | Σ(points.customers) = Σ(dailyMapping.prevCustomers) | 同上 |
| currentDay 一致 | points のキー集合 = dailyMapping の currentDay 集合 | 同上 |
| 年跨ぎ保持 | 2026/1/1 → 2024/12/27 で sourceDate を保持 | 同上 |

---

## 7. 構造的な学び

### 集計層は健全だった

`alignmentMap` + `SourceDataIndex` による月跨ぎ吸収は正しく機能していた。
テストでも 2026/2/28 → 2025/3/1 のケースが確認されていた。

### 壊したのは UI 側の中間変換

集計層が正しく作った `DayMappingRow` を、UI 側で
`currentDay → number` に劣化させたことが原因。

### 「気をつける」では防げない

今回の修正で得た教訓:

1. **型で防ぐ**: `SameDowPoint` に `sourceDate` を必須にすれば、落としたくても型で落とせない
2. **入口を1つにする**: `buildSameDowPoints()` 以外の変換経路を作らない
3. **テストで検証する**: sourceDate 保持と合計整合性を CI で機械的に確認する

これは CLAUDE.md の設計思想「機械で守る — ルールはテストに書く。文書だけでは守られない」
（原則1）の具体例である。

---

## 8. 影響範囲

### 変更ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `application/comparison/comparisonTypes.ts` | `SameDowPoint` 型 + `buildSameDowPoints()` 追加 |
| `application/comparison/buildComparisonAggregation.ts` | `findSourceMonth` 修正、`SourceDataIndex` 導入 |
| `application/comparison/comparisonProjections.ts` | sourceMonth 導出ロジック修正 |
| `presentation/pages/Dashboard/widgets/SalesAnalysisWidgets.tsx` | `buildPrevSameDowMap()` → `buildSameDowPoints()` |
| `presentation/pages/Dashboard/widgets/conditionPanelYoY.vm.ts` | インライン dayMap → `buildSameDowPoints()` |
| `application/comparison/__tests__/sameDowPoint.test.ts` | 新規: 不変条件テスト7件 |

### 影響を受ける UI

| ウィジェット | 修正内容 |
|---|---|
| 曜日平均テーブル | `buildSameDowPoints` 経由で前年売上を取得 |
| 週別サマリーテーブル | 同上 |
| 売上前年比日別テーブル | `buildDailyYoYRows` が `buildSameDowPoints` を使用 |
| 客数前年比日別テーブル | 同上 |
