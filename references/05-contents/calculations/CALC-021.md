---
id: CALC-021
kind: calculation
exportName: pearsonCorrelation
sourceRef: app/src/domain/calculations/algorithms/correlation.ts
sourceLine: 57
definitionDoc: references/01-principles/authoritative-calculation-definition.md
contractId: ANA-005
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: statistical
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: f43b5bd
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-021 — 相関分析（Pearson / matrix / 正規化 / divergence）

## 1. 概要

`pearsonCorrelation(xs, ys)` は **pure 同期関数** で、ピアソンの積率相関係数を計算する analytic-authoritative 計算（ANA-005、statistical family）。同 file の `correlationMatrix` / `normalizeMinMax` / `detectDivergence` は本 calc を core にした orchestration。CALC-014 `prevYearCostApprox` も ANA-005 contractId を共有（contract は logical group、spec は file 単位）。

## 2. Input Contract

- `pearsonCorrelation(xs, ys)` — `xs: readonly number[]` / `ys: readonly number[]`
  - `n = min(xs.length, ys.length)`、長さ不一致は短い方に切り詰め
  - `n < 2` → `{ r: 0, n }`（データ不足）
- `correlationMatrix(series)` — `{ name, values }[]` の上三角全ペアワイズ
- `normalizeMinMax(values)` — Min-Max 0-100 正規化（全値同一 → 全 50）
- pure 同期。`safeDivide` 経由でゼロ除算回避

## 3. Output Contract

- `pearsonCorrelation` → `CorrelationResult`（Zod schema: `CorrelationResultSchema`）:
  - `r: number` — 相関係数、`[-1, 1]` クランプ済（浮動小数点誤差吸収）
  - `n: number` — 有効サンプル数
- `correlationMatrix` → `readonly CorrelationMatrixCell[]`（上三角）
- `normalizeMinMax` → `NormalizedSeries`（`values` / `min` / `max` / `range`）
- `detectDivergence` → `readonly DivergencePoint[]`（背反点系列）

## 4. Invariants

- INV-CORR-01: `r ∈ [-1, 1]`（出力時 clamp）
- INV-CORR-02: `n < 2` → `r = 0`（pure 安全、データ不足時のフォールバック）
- INV-CORR-03: `varX = 0 ∨ varY = 0` → `r = 0`（`safeDivide` がゼロ分母を吸収）
- INV-CORR-04: `correlationMatrix` は上三角のみ（`i < j`）— 自己相関 / 重複ペア除外
- INV-CORR-05: `normalizeMinMax` で `range = 0` → 全値 = `NORMALIZATION_MIDPOINT`(50)

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards |
|---|---|---|---|---|---|
| CLM-001 | `r ∈ [-1, 1]` 出力時 clamp（浮動小数点誤差吸収、INV-CORR-01、Math.max/min で clamp）| tested | high | app/src/domain/calculations/algorithms/correlation.test.ts | - |
| CLM-002 | `n < 2` または `varX = 0 ∨ varY = 0` → `r = 0` フォールバック（INV-CORR-02 / INV-CORR-03、`safeDivide` がゼロ分母吸収）| tested | high | app/src/domain/calculations/algorithms/correlation.test.ts | - |
| CLM-003 | `correlationMatrix` は上三角のみ（`i < j`）— 自己相関 / 重複ペアを除外（INV-CORR-04、出力配列長 = `n*(n-1)/2`）| tested | medium | app/src/domain/calculations/algorithms/correlation.test.ts | - |
| CLM-004 | candidate (`candidate/algorithms/correlation.ts`) との数値同等性 (dual-run observation guard 監視下)| guarded | high | - | app/src/test/observation/correlationCandidateObservation.test.ts |

## 5. Migration Plan

- registry: `ANA-005`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate file（`candidate/algorithms/correlation.ts`）が registry に存在（candidate-authoritative）。Promote Ceremony 着手条件: 数値同等性 invariant 検証 + 既存 callers 全て切替 + dual-run guard exit（**Phase D Step 6+ 以降**）

## 6. Consumers

- 統合タイムライン chart の正規化レイヤー（異スケール指標重ね描き）
- 相関分析 widget / KPI（複数系列ペアワイズ）
- presentation 層は raw 走査せず本 calc 出力を mapping（C9）

## 7. Co-Change Impact

- `CorrelationResult` / `NormalizedSeries` schema 変更 → consumer chart の VM 修正
- `NORMALIZATION_MIDPOINT` / `NORMALIZATION_SCALE` 変更 → 全正規化結果の数値変動
- `safeDivide` の挙動変更 → INV-CORR-03 再評価
- candidate 昇格時 → CALC-021 deprecated + supersedes 後継の Promote Ceremony 1 PR 5 同期

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- `correlation.test.ts`（既存）— 数値検証 peer test
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
