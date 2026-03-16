# 期間スコープの意味論（Temporal Scope Semantics）

## 設計原則

**同じ「前年売上」でも、取得方法（スコープ）が異なれば別の値になる。**
**変数名・型・取得パスで明示的に区別し、暗黙の混同を仕組みで防ぐ。**

## 問題の本質

小売業の業務データには「同じ概念名だが取得スコープが異なる値」が多数存在する。

例: 「前年売上」

| スコープ | 値の性質 | 用途 |
|---|---|---|
| alignment経由（当期に対応付け） | 当期の取り込み期間に連動して変化 | 日別比較・曜日効果分析 |
| 月間トータル（全日合計） | 取り込み期間に非依存の固定値 | 予算前年比・成長率 |
| 経過日数キャップ付き | elapsedDays で制限された部分合計 | 期中進捗比較 |

これらを区別せず同一の変数名で扱うと、
「取り込み期間フィルターが暗黙的に適用される」バグが発生する。

## ルール

### R1: 月間固定値と期間連動値を型で分離する

```typescript
// ✅ 明確に分離された型
interface PrevYearMonthlyKpi {
  // alignment経由: period1に連動
  sameDate: PrevYearMonthlyKpiEntry
  sameDow: PrevYearMonthlyKpiEntry
  // alignment不要: 月間固定値
  monthlyTotal: PrevYearMonthlyTotal
}
```

```typescript
// ❌ 同一型で暗黙的に意味が異なる
prevYearMonthlyKpi.sameDate.sales  // ← これは「月間」ではない可能性がある
```

### R2: 変数名にスコープを含める

```typescript
// ✅ スコープが変数名に表現されている
const prevYearMonthlySales = kpi.monthlyTotal.sales   // 月間固定
const prevYearAlignedSales = kpi.sameDate.sales        // alignment経由

// ❌ どのスコープか不明
const prevYearSales = ...  // 月間？alignment？キャップ付き？
```

### R3: 予算関連指標は月間固定値のみ使用

予算は月間で設定される。予算との比較に使う前年値も月間トータルでなければ意味がない。

```typescript
// ✅ 月間固定値で予算前年比を計算
budgetVsPrevYear = budget / monthlyTotal.sales

// ❌ alignment経由の値で予算前年比を計算（取り込み期間で変動する）
budgetVsPrevYear = budget / sameDate.sales
```

### R4: 新しいスコープを追加する際は型として明示する

将来、新しい期間スコープが必要になった場合:

1. 新しい型（interface）を定義する
2. 変数名にスコープを含める
3. JSDoc に取得方法とフィルタ条件を記載する
4. 既存の値を「ついでに」流用しない

## 適用パターン

### パターン1: 予算コンテキストヘッダ

```
月間売上予算     ← result.budget（月間固定）
月間前年売上     ← monthlyTotal.sales（月間固定）
予算前年比       ← budget / monthlyTotal.sales（月間固定同士の比較）
```

### パターン2: 日別比較チャート

```
前年同日売上     ← sameDate.dailyMapping（alignment経由、日別対応）
前年同曜日売上   ← sameDow.dailyMapping（alignment経由、曜日対応）
```

### パターン3: 期中進捗比較

```
前年同期間売上   ← PrevYearData.totalSales（elapsedDaysキャップ付き）
```

## 禁止パターン

| パターン | 問題 |
|---|---|
| `sameDate.sales` を「月間トータル」として使用 | alignment経由のため period1 変更時に値が変わる |
| 変数名に `prevYear` のみでスコープなし | どのスコープか不明 |
| 予算比較に alignment 経由の値を使用 | 取り込み期間で比率が変動する |
| 新しい期間スコープを既存変数に混ぜる | 暗黙のフィルタ適用バグの温床 |

## 機械的検証

- TypeScript の型システムで分離を強制（`PrevYearMonthlyTotal` vs `PrevYearMonthlyKpiEntry`）
- `buildBudgetHeader` は `monthlyTotal` のみ参照（レビューで確認）
- 新規コードで `sameDate.sales` を予算計算に使用した場合、レビューで差し戻し
