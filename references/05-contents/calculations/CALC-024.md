---
id: CALC-024
kind: calculation
exportName: computeMovingAverage
sourceRef: app/src/domain/calculations/temporal/computeMovingAverage.ts
sourceLine: 36
definitionDoc: references/01-principles/temporal-scope-semantics.md
contractId: ANA-009
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: time_series
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: b2b3be8b34e6f3bcf3c8b7ca75abee2c5d9ea150
owner: architecture
specVersion: 1
---

# CALC-024 — 日次系列 trailing 移動平均（missingness policy 対応）

## 1. 概要

`computeMovingAverage(series, windowSize, policy)` は **pure 同期関数** で、`MovingAveragePoint` 系列に対して trailing window 移動平均を計算する analytic-authoritative 計算（ANA-009、time_series family）。`strict` / `partial` の 2 種 missingness policy に対応し、欠損日の扱いを差別化する。DuckDB / React / QueryHandler 非依存（A2 純粋）。

## 2. Input Contract

- `series: readonly MovingAveragePoint[]`（Zod schema: `MovingAveragePointSchema`）:
  - `value: number | null`、`status: 'ok' | 'missing'`
  - `requiredRange` の全日を含む前提（`anchorRange` 切り戻しは handler 側責務）
- `windowSize: number` — trailing window 幅（1 以上）
- `policy: MovingAverageMissingnessPolicy` — `'strict' | 'partial'`
- pure 同期、副作用なし

## 3. Output Contract

- `readonly MovingAveragePoint[]`（入力と同形）:
  - `value: number | null`（`null` = 計算不能）
  - `status: 'ok' | 'missing'`
- 配列長は入力と一致（element-wise mapping）

## 4. Invariants

- INV-MA-01: `windowSlice.length < windowSize` → `value=null, status='missing'`（窓不足は ok 扱い禁止）
- INV-MA-02: `policy === 'strict'` のとき窓内 missing が 1 件でも → `null`
- INV-MA-03: `policy === 'partial'` のとき okValues のみで平均、全 missing → `null`
- INV-MA-04: `windowSize === 1` → ok 値はそのまま透過
- INV-MA-05: 出力配列長 = 入力配列長（C8 単純さ、変換は要素数を保つ）

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `windowSlice.length < windowSize` → `value=null, status='missing'`（窓不足は ok 扱い禁止、INV-MA-01） | tested | high | app/src/domain/calculations/temporal/computeMovingAverage.test.ts | - | - |
| CLM-002 | `policy='strict'` で窓内 missing が 1 件でも → `null`、`policy='partial'` で okValues のみで平均（INV-MA-02 / INV-MA-03、policy 切替で挙動完全分岐） | tested | high | app/src/domain/calculations/temporal/computeMovingAverage.test.ts | - | - |
| CLM-003 | 出力配列長 = 入力配列長（INV-MA-05、要素数保存則、`map` で要素単位変換） | tested | medium | app/src/domain/calculations/temporal/computeMovingAverage.test.ts | - | - |
| CLM-004 | candidate (`candidate/temporal/computeMovingAverage.ts`) との数値同等性 (dual-run observation guard 監視下) | guarded | high | - | app/src/test/observation/movingAverageCandidateObservation.test.ts | - |

## 5. Migration Plan

- registry: `ANA-009`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate file（`candidate/temporal/computeMovingAverage.ts`）が registry に存在（candidate-authoritative）。Promote Ceremony 着手条件: 数値同等性 invariant 検証 + 既存 callers 全て切替 + dual-run guard exit（**Phase D Step 7+ 以降**）

## 6. Consumers

- temporal series chart（移動平均レイヤー、欠損吸収）
- DuckDB QueryHandler が anchorRange 切り戻し前提で消費
- presentation 層は raw 走査せず本 calc 出力を mapping（C9）

## 7. Co-Change Impact

- `MovingAveragePoint` schema 変更 → series 入力源（QueryHandler）+ consumer 全て修正必要
- `MovingAverageMissingnessPolicy` enum 拡張 → 全 caller の policy 引数見直し
- `requiredRange` / `anchorRange` の境界規約変更 → handler 側との contract 再定義（temporal-scope-semantics）

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- `temporalScopeGuard.test.ts` — 期間スコープ分離（temporal-scope-semantics）
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
