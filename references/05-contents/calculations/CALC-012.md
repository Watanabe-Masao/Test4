---
id: CALC-012
kind: calculation
exportName: analyzeDowGap
sourceRef: app/src/domain/calculations/dowGapAnalysis.ts
sourceLine: 62
definitionDoc: null
contractId: ANA-007
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: calendar_effect
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: f43b5bd7c84d8475dfe8b26c3f7f9fe16c6a1396
owner: architecture
specVersion: 1
---

# CALC-012 — 曜日ギャップ分析

## 1. 概要

`analyzeDowGap(input)` は **pure 同期関数** で、月別の曜日数差分（前月との曜日 mix の差）を分析し `DowGapAnalysis` を返す **analytic-authoritative** 計算（calendar_effect family、ANA-007）。`countDowsInMonth(year, month)` (line 41) と `ZERO_DOW_GAP_ANALYSIS` 定数 (line 192) を派生 export として持つ。

## 2. Input Contract

- 当月 / 前月の `year` / `month`
- 各曜日の売上 array（曜日 × 月）
- pure 同期、I/O なし

## 3. Output Contract

`DowGapAnalysis`:

- 各曜日 (月〜日) の current / prev 曜日数 + 差分
- `dowGap`: 曜日 mix 差による売上影響の推定値
- `ZERO_DOW_GAP_ANALYSIS`: 入力 0 件 / 同月計算時の zero-state 定数

## 4. Invariants

- INV-DOW-01: `countDowsInMonth(year, month)` は 7 buckets を返す（曜日網羅）
- INV-DOW-02: 入力 0 件 → `ZERO_DOW_GAP_ANALYSIS` を返す（pure 安全動作）
- INV-DOW-03: `analytic-authoritative` のため I3「current と candidate を混ぜない」原則

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `countDowsInMonth(year, month)` は常に長さ 7 配列を返す（曜日網羅、INV-DOW-01） | tested | high | app/src/domain/calculations/__tests__/dowGapAnalysis.test.ts | - | - |
| CLM-002 | `prevDowSales` 未指定 / 該当曜日 0 → `dailyAverageSales` でフォールバック（safeDivide で前年データ欠損時も計算継続） | tested | medium | app/src/domain/calculations/__tests__/dowGapAnalysis.test.ts | - | - |
| CLM-003 | `isSameStructure` 検出時 `estimatedImpact = 0` で warning 付与（曜日構成同一は平均法では影響額計算不能） | tested | medium | app/src/domain/calculations/__tests__/dowGapAnalysis.test.ts | - | - |
| CLM-004 | candidate (`candidate/dowGapAnalysis.ts`) との数値同等性 (dual-run observation guard 監視下、Promote Ceremony 着手前の数値検証経路) | guarded | high | - | app/src/test/observation/dowGapCandidateObservation.test.ts | - |

## 5. Migration Plan

- registry: `ANA-007`、`runtimeStatus: 'current'`、`tag: 'review'`（zodAdded=false で Zod schema 未追加、後続で追加検討）
- candidate 化計画なし（dowGapAnalysis は legacy 系の analytic 計算）

## 6. Consumers

- `WID-009 exec-dow-average`（曜日平均表示）
- 比較分析の補助指標（前年同月比較で曜日 mix 差を control）

## 7. Co-Change Impact

- `DowGapAnalysis` 型変更 → consumer の参照修正
- `countDowsInMonth` の曜日 enum 変更（月始まり等）→ 全 caller 影響大

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
