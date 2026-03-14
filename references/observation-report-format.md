# Observation Report Format — 観測レポート仕様

## 目的

自動観測ハーネスの出力を、PR / 週次報告 / promotion 判定に使える形式で定義する。

## JSON レポート仕様

### フィールド定義

| フィールド | 型 | 説明 |
|---|---|---|
| engine | string | 対象 engine 名 |
| fixture | string | フィクスチャカテゴリ名 |
| mode | string | 実行モード（dual-run-compare / ts-only / wasm-only） |
| status | string | 判定結果（pass / warning / fail） |
| callCounts | Record<string, number> | 関数名 → 呼び出し回数 |
| mismatchCounts | object | mismatch 種別ごとの件数 |
| maxAbsDiff | number | 数値差の最大値 |
| totalCalls | number | 総呼び出し回数 |
| verdict | string | observer の verdict（clean / tolerance-only / needs-investigation） |
| notes | string[] | 判定理由・備考 |

### mismatchCounts の内訳

| フィールド | 型 | 説明 |
|---|---|---|
| numericWithinTolerance | number | tolerance 内の数値差 |
| numericOverTolerance | number | tolerance 超の数値差 |
| nullMismatch | number | null 不一致 |
| invariantViolation | number | 不変条件違反 |

### JSON 例

```json
{
  "engine": "grossProfit",
  "fixture": "normal",
  "mode": "dual-run-compare",
  "status": "pass",
  "callCounts": {
    "calculateInvMethod": 1,
    "calculateEstMethod": 1,
    "calculateCoreSales": 1,
    "calculateDiscountRate": 1,
    "calculateDiscountImpact": 1,
    "calculateMarkupRates": 1,
    "calculateTransferTotals": 1,
    "calculateInventoryCost": 1
  },
  "mismatchCounts": {
    "numericWithinTolerance": 0,
    "numericOverTolerance": 0,
    "nullMismatch": 0,
    "invariantViolation": 0
  },
  "maxAbsDiff": 0,
  "totalCalls": 8,
  "verdict": "clean",
  "notes": []
}
```

## Markdown レポート仕様

`buildMarkdownReport()` が複数の JSON レポートからサマリ Markdown を生成する。

### 構成

1. **Summary テーブル** — 全 engine × fixture の一覧
2. **Failures** — fail がある場合の詳細
3. **Warnings** — warning がある場合の詳細
4. **Call Coverage** — 関数ごとの呼び出し回数

### Markdown 例

```markdown
# Observation Report

Generated: 2026-03-14T12:00:00.000Z

## Summary

| Engine | Fixture | Status | Calls | Mismatches | maxAbsDiff | Verdict |
|---|---|---|---|---|---|---|
| grossProfit | normal | PASS pass | 8 | 0 | 0 | clean |
| grossProfit | null-zero-missing | PASS pass | 8 | 0 | 0 | clean |
| budgetAnalysis | normal | PASS pass | 2 | 0 | 0 | clean |
| forecast | normal | PASS pass | 5 | 0 | 0 | clean |

## Call Coverage

### grossProfit / normal

| Function | Calls |
|---|---|
| calculateInvMethod | 1 |
| calculateEstMethod | 1 |
| ... | ... |
```

## 判定基準との整合

- **status: pass** → promotion-criteria.md の必須条件を満たす
- **status: warning** → promotion の blocking 条件ではないが記録対象
- **status: fail** → promotion-candidate 判定で NG

詳細は `observation-evaluation-guide.md` を参照。
