---
id: CALC-023
kind: calculation
exportName: analyzeTrend
sourceRef: app/src/domain/calculations/algorithms/trendAnalysis.ts
sourceLine: 57
definitionDoc: references/01-foundation/authoritative-calculation-definition.md
contractId: ANA-004
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: temporal_pattern
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastSourceCommit: f4cb25218832d738dca401f8fe0094289f05b65c
owner: architecture
specVersion: 1
---

# CALC-023 — 複数月トレンド分析

## 1. 概要

`analyzeTrend(dataPoints)` は **pure 同期関数** で、IndexedDB 保存の過去月 KPI を横断的に分析し、前月比 / 前年同月比 / 移動平均 (3 / 6 ヶ月) / 季節性指数 / 全体トレンド方向 を一括算出する analytic-authoritative 計算（ANA-004、temporal_pattern family）。

## 2. Input Contract

- `dataPoints: readonly MonthlyDataPoint[]`（Zod schema: `MonthlyDataPointSchema`）:
  - `year` / `month` / `totalSales` / `storeCount`（必須）
  - `totalCustomers` / `grossProfit` / `grossProfitRate` / `budget` / `budgetAchievement` / `discountRate` / `costRate` / `costInclusionRate` / `averageMarkupRate`（全て nullable）
- pure 同期。空配列 → 全 0 / `'flat'` 初期値

## 3. Output Contract

- `TrendAnalysisResult`（Zod schema: `TrendAnalysisResultSchema`）:
  - `dataPoints`: 時系列ソート済み配列
  - `momChanges`: 前月比（`null` = データ不足 or 前月 0）
  - `yoyChanges`: 前年同月比（同月前年実績不在 → `null`）
  - `movingAvg3` / `movingAvg6`: 短 / 中期移動平均（窓不足は `null`）
  - `seasonalIndex`: `MONTHS_PER_YEAR=12` 要素配列（年内月別季節性）
  - `overallTrend`: `'up' | 'down' | 'flat'`（`TREND_CHANGE_THRESHOLD` で閾値判定）
  - `averageMonthlySales`: 全期間平均

## 4. Invariants

- INV-TR-01: 入力空配列 → `seasonalIndex` は 12 要素全て `1`（季節性中立）
- INV-TR-02: `dataPoints` ソート順は `year asc, month asc`（重複時は安定）
- INV-TR-03: 前月 `totalSales === 0` → `momChanges[i] = null`（ゼロ除算禁止）
- INV-TR-04: 同月前年データ不在 → `yoyChanges[i] = null`
- INV-TR-05: `movingAvgN` の最初 `N-1` 要素は `null`（trailing window、窓不足）
- INV-TR-06: `overallTrend` は `TREND_CHANGE_THRESHOLD`（domain/constants）で `up`/`down`/`flat` 判定

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | 入力空配列 → `seasonalIndex` は 12 要素全て `1` 返却（季節性中立、INV-TR-01、`MONTHS_PER_YEAR` 固定長） | tested | high | app/src/domain/calculations/trendAnalysis.test.ts | - | - |
| CLM-002 | 前月 `totalSales === 0` → `momChanges[i] = null`（ゼロ除算禁止、INV-TR-03、null 伝播 = D2） | tested | high | app/src/domain/calculations/trendAnalysis.test.ts | - | - |
| CLM-003 | `movingAvgN` の最初 `N-1` 要素は `null`（trailing window 窓不足、INV-TR-05、先頭埋め禁止） | tested | medium | app/src/domain/calculations/trendAnalysis.test.ts | - | - |
| CLM-004 | candidate (`candidate/algorithms/trendAnalysis.ts`) との数値同等性 (dual-run observation guard 監視下) | guarded | high | - | app/src/test/observation/trendAnalysisCandidateObservation.test.ts | - |

## 5. Migration Plan

- registry: `ANA-004`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate file（`candidate/algorithms/trendAnalysis.ts`）が registry に存在（candidate-authoritative）。Promote Ceremony 着手条件: 数値同等性 invariant 検証 + 既存 callers 全て切替 + dual-run guard exit（**Phase D Step 7+ 以降**）

## 6. Consumers

- トレンド分析 widget / 複数月推移 chart（IndexedDB 過去月 KPI 横断）
- presentation 層は raw 走査せず本 calc 出力の `dataPoints` / `momChanges` / `yoyChanges` を mapping（C9）

## 7. Co-Change Impact

- `MonthlyDataPoint` field 追加削除 → IndexedDB 保存 schema + 全 caller 修正必要
- `TrendAnalysisResult` schema 変更 → consumer chart の VM 修正
- `TREND_CHANGE_THRESHOLD` / `SHORT_TERM_MA_MONTHS` / `MEDIUM_TERM_MA_MONTHS`（domain/constants）変更 → 判定境界全変動
- candidate 昇格時 → CALC-023 deprecated + supersedes 後継の Promote Ceremony 1 PR 5 同期

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- `trendAnalysis.test.ts`（既存）— 数値検証 peer test
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
