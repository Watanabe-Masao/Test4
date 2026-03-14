# Observation Evaluation Guide — 観測評価ガイド

## 目的

dual-run compare の観測結果を、手動確認に依存せず評価できるようにする。
本ガイドは、各 engine の自動観測ハーネスが出力する

- summary JSON
- mismatch log JSON
- call coverage
- mode 別実行結果
- rollback / fallback 結果

を主な判断材料として扱う。

本ガイドの役割は、**観測結果を promotion 判定に使える形で読む基準を固定すること** である。

---

## 基本原則

### 1. 観測の主対象は自動出力である

評価の主対象は次に限定する。

- `__dualRunStats()` 由来の summary
- `__dualRunStats('log')` 由来の詳細ログ
- E2E 観測ハーネスの pass / fail
- compare bridge tests
- mode 別テスト
- fallback / rollback テスト
- JSON / Markdown レポート

### 2. 手動観測は補助情報である

DevTools 確認、画面目視、runbook の手入力は補助情報としてのみ扱う。
これらが存在しなくても、一次評価が完了できることを前提とする。

### 3. 評価は「意味差」を優先する

数値差そのものより、次を重く扱う。

- invariant violation
- null mismatch
- compare 対象関数が踏まれていない
- fallback 不全
- rollback 不全
- compare 対象外境界の破壊

### 4. 観測結果は engine 単位ではなく、経路単位でも見る

同じ engine でも、経路により結果が異なることがある。
したがって評価は次の 3 軸で行う。

- **engine 単位** — engine 全体の verdict
- **path 単位** — 特定の UI 操作経路やデータ経路
- **fixture 単位** — 入力データのカテゴリ（normal / zero / extreme / boundary）

---

## 観測で使う入力

### 1. summary

`__dualRunStats()` の集計結果。最低限次が読めることを想定する。

- function ごとの call count
- mismatch count
- maxAbsDiff
- mismatch kind 別件数
- verdict または同等の集約指標

### 2. detail log

`__dualRunStats('log')` の詳細ログ。個別 mismatch の内容を確認するために使う。

### 3. 自動観測レポート

観測ハーネスが出力する JSON / Markdown。
promotion 判定では、summary より上位の集約材料として使ってよい。

### 4. テスト結果

- invariant tests
- compare bridge tests
- wasm-only tests
- fallback / rollback tests

これらは観測評価における**前提条件**であり、fail がある場合は観測評価以前に NG とする。

---

## Mismatch Taxonomy の評価基準

### numeric-within-tolerance

| 項目 | 内容 |
|---|---|
| 意味 | 比較対象の数値差が定義済み tolerance 内に収まっている |
| 評価 | **原則 pass** |
| 記録 | 件数・偏り・分布を記録する |
| promotion blocking | **No** — blocking 条件ではない |
| 調査トリガー | 特定関数に偏る / 特定 fixture でのみ頻発 / maxAbsDiff が tolerance 上限に張り付き |

### numeric-over-tolerance

| 項目 | 内容 |
|---|---|
| 意味 | 比較対象の数値差が tolerance を超えている |
| 評価 | **原則 fail** |
| promotion blocking | **Yes** — promotion-candidate 判定で NG。wasm-only trial 開始条件を満たさない |
| 例外扱い条件 | 原因明確 + invariant 保持 + null mismatch なし + 業務意味影響なし + promotion matrix に記録済み |
| 自動判定 | fail とし、例外判断は別途レビュー対象 |

### null-mismatch

| 項目 | 内容 |
|---|---|
| 意味 | TS と WASM の間で nullable field の null / number 判定が不一致 |
| 評価 | **即 fail** |
| promotion blocking | **Yes** — 意味差。promotion-candidate 判定で NG |
| 典型例 | TS は null、WASM は number（またはその逆） |
| 重み | 数値差より重い。nullable 契約のズレは設計差または adapter 差を示す |

### invariant-violation

| 項目 | 内容 |
|---|---|
| 意味 | 対象 engine の恒等式・境界条件・整合条件のいずれかが破れている |
| 評価 | **即 fail** |
| promotion blocking | **Yes** — 最重。観測結果は promotion 判定に使えない |
| wasm-only trial 中 | 停止条件 |
| 典型例 | COGS 恒等式不成立 / grossProfit 整合不成立 / 0 ≤ R² ≤ 1 不成立 / finite 条件不成立 |

---

## Call Coverage の評価

### 目的

「観測したつもりで compare 対象関数が一度も呼ばれていない」事故を防ぐ。

### 必須条件

各 engine は、観測対象経路に対応する compare 対象関数の call count が **1 以上** でなければならない。

### 評価ルール

| 結果 | 条件 |
|---|---|
| **pass** | 期待した関数がすべて 1 回以上呼ばれている |
| **fail** | 期待した関数のうち 1 つでも call count = 0 |
| **warning** | 呼ばれてはいるが想定より少なく、経路踏破が不十分な可能性 |

---

## Engine 別の最低 Coverage 目安

### factorDecomposition

**最低限見る関数:**
- decompose2
- decompose3
- decompose5
- decomposePriceMix

**最低経路:** 標準分解 / price-mix / time-series

### grossProfit

**最低限見る関数:**
- calculateInvMethod
- calculateEstMethod
- calculateMarkupRates
- calculateTransferTotals
- calculateDiscountImpact

**最低経路:** inventory path / estimated path / markup-transfer path

### budgetAnalysis

**最低限見る関数:**
- calculateBudgetAnalysis
- calculateGrossProfitBudget

**最低経路:** single-store budget analysis / gross profit budget path

**注意:** `calculateAggregateBudget` は compare 対象外。coverage 条件に入れない。

### forecast

**最低限見る関数:**
- calculateStdDev
- detectAnomalies
- calculateWMA
- linearRegression
- analyzeTrend

**最低経路:** stddev path / anomalies path / regression-trend path

**注意:** Date 依存関数は compare 対象外。coverage 条件に含めない。

---

## Fixture Coverage の評価

### 目的

特定の正常系だけ clean でも昇格候補にしないため。

### 最低フィクスチャ群

各 engine は少なくとも次を自動観測で通すこと。

| フィクスチャ | 内容 |
|---|---|
| normal | 通常値 |
| zero / null / missing | 欠損系 |
| extreme | 大値・小値 |
| boundary | 境界値 |

### 評価

| 結果 | 条件 |
|---|---|
| **pass** | 全 fixture で fail 条件なし |
| **fail** | 1 fixture でも fail 条件あり |
| **warning** | すべて pass だが numeric-within-tolerance の偏りがある |

---

## maxAbsDiff の扱い

### 目的

数値差の最大値を横断的に見る。

### 評価原則

- 単独では fail 条件にしない
- mismatch kind とセットで読む
- numeric-over-tolerance を伴うなら fail
- numeric-within-tolerance のみなら参考値

### 使い方

- engine 間比較
- fixture 間比較
- 同一関数の偏り確認

**注意:** maxAbsDiff が小さくても invariant violation があれば fail。
maxAbsDiff は主判定ではなく補助指標。

---

## 観測結果の最終判定

### pass

以下をすべて満たす。

- expected call coverage を満たす
- invariant-violation = 0
- null-mismatch = 0
- numeric-over-tolerance = 0
- fallback / rollback 条件を満たす
- compare 対象境界が壊れていない

### warning

以下のいずれかを満たす。

- numeric-within-tolerance > 0
- maxAbsDiff がやや大きい
- fixture 間で差分分布が偏る
- coverage は満たすが件数が少ない

warning は promotion の blocking 条件ではないが、**記録対象** とする。

### fail

以下のいずれかを満たす。

- invariant-violation > 0
- null-mismatch > 0
- numeric-over-tolerance > 0
- expected call coverage 不足
- fallback 失敗
- rollback 失敗
- compare 対象外境界の破壊

---

## 観測結果テンプレート

### 必須記録欄

- 実施日
- engine
- path
- fixture
- execution mode
- wasm state
- expected functions
- observed call counts
- mismatch counts
- maxAbsDiff
- pass / warning / fail
- notes

### 推奨 JSON 例

```json
{
  "engine": "budgetAnalysis",
  "path": "single-store-budget",
  "fixture": "normal",
  "mode": "dual-run-compare",
  "wasmState": "ready",
  "callCounts": {
    "calculateBudgetAnalysis": 3,
    "calculateGrossProfitBudget": 1
  },
  "mismatchCounts": {
    "numericWithinTolerance": 0,
    "numericOverTolerance": 0,
    "nullMismatch": 0,
    "invariantViolation": 0
  },
  "maxAbsDiff": 0,
  "status": "pass",
  "notes": []
}
```

---

## Promotion Criteria との関係

このガイドは `promotion-criteria.md` の入力資料である。
promotion 判定では、ここで定義した

- pass / warning / fail
- coverage
- fixture 要件
- mismatch kind の扱い

をそのまま参照する。

**重要:** promotion 判定において、手動観測記録は必須入力ではない。
このガイドに従い、自動観測の出力だけで一次判定できることを原則とする。

---

## Rollback Policy との関係

観測結果が fail の場合、`rollback-policy.md` に従う。
特に次は即 rollback 候補とする。

- invariant violation
- null mismatch
- numeric-over-tolerance
- fallback 不全
- rollback 不全

---

## 実務運用上の要約

観測結果は、人が頑張って読むログではなく、**自動判定の入力** として扱う。
人手で見るのは、fail または説明が必要な warning が出た場合のみでよい。
