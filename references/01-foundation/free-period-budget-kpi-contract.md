# 自由期間 Budget/KPI の粒度契約

## Context

自由期間分析で Budget/KPI を扱う際、月跨ぎ・比較・累積で
集計粒度と按分規則がぶれやすい。実装前に規則を固定する。

## 入力粒度

| 業務値 | 正本粒度 | 取得元 |
|--------|---------|--------|
| 売上 | 日別×店舗 | classified_sales (DuckDB) |
| 仕入 | 日別×店舗 | purchase (DuckDB) |
| 客数 | 日別×店舗 | classified_sales.customers |
| 売変 | 日別×店舗 | classified_sales.discount_71〜74 |
| 予算 | **月別×店舗** | budget テーブル / StoreResult.budget |
| KPI (部門) | 日別×部門 | department_kpi (DuckDB) |

## 集約規則

### 売上・仕入・客数・売変

- 集約: 日別行の **単純合計**
- dayCount: **ユニーク dateKey 数**（自然日）
- 営業日ベースの dayCount は使わない（sales > 0 の日数は observationPeriod で管理）

### 予算

**月予算の日割り按分** を使う。

| 条件 | 按分方法 |
|------|---------|
| budget.daily が存在 | 対象期間内の日別予算を合計 |
| budget.daily が空 | budget.total / daysInMonth × 対象日数 |
| 月跨ぎ | 各月の budget を独立に按分し合算 |

理由: 予算は月単位で設定されるため、任意期間では日割りが最も自然。
月末値そのままでは期間の長さと予算の関係が崩れる。

### KPI (部門別)

- 集約: 日別行の **単純合計**
- 部門粒度: dept_code 単位
- 月跨ぎ: 各月の department_kpi を独立に取得し合算

## 比較規則

| モード | 規則 |
|--------|------|
| sameDate | ComparisonScope.alignmentMap で 1:1 日付対応 |
| sameDayOfWeek | ComparisonScope.alignmentMap + dowOffset |
| period-total | 当期合計 vs 比較期合計（日対応なし） |

自由期間分析の比較は **ComparisonScope ベースの day-aligned** を原則とする。
period-total 比較は day-aligned の上位集約として導出する。

## dayCount の扱い

| 種別 | 定義 | 用途 |
|------|------|------|
| 自然日数 | ユニーク dateKey 数 | averageDailySales 計算 |
| 営業日数 | sales > 0 の dateKey 数 | observationPeriod |
| 暦日数 | 期間の from〜to の日数 | 予算按分 |

自由期間分析の dayCount は **自然日数**（ユニーク dateKey）を使う。
これは既存の `computeFreePeriodSummary` と一致する。

## 粗利の導出

自由期間の粗利は **推定法ベース** で導出する。

```
粗利 = 売上 - 推定原価
推定原価 = coreSales × (1 - markupRate) + costInclusion
```

在庫法（開始在庫・期末在庫）は月次前提のため、任意期間では使用しない。

## 禁止事項

- SQL と JS で同一集約の二重実装
- presentation 層での比較先独自計算
- dayCount の営業日/自然日の暗黙切替
- 月予算を按分せずにそのまま比較に使うこと
