---
id: CALC-014
kind: calculation
exportName: buildPrevYearCostApprox
sourceRef: app/src/domain/calculations/prevYearCostApprox.ts
sourceLine: 35
definitionDoc: null
contractId: ANA-005
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: approximation
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: d8d3282
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-014 — 前年日別近似原価マップ構築

## 1. 概要

`buildPrevYearCostApprox(prevYear)` は **pure 同期関数** で、前年データから日別近似原価マップ（売上 - 売変）を構築する **analytic-authoritative** 計算（ANA-005、approximation family）。SP-B ADR-B-004 PR2 で `registryChartWidgets.tsx` 内 inline helper から本 file に抽出された。

## 2. Input Contract

- `prevYear: PrevYearData` — 前年同期 data (`hasPrevYear` / `daily` 等)
- pure 同期、I/O なし

## 3. Output Contract

- `Map<dayKey, costApprox>`: 日別近似原価
- 計算: `salesAmount - discountAmount` の差で原価近似（粗利率 inverse での推定）
- `rateOwnership: engine`

## 4. Invariants

- INV-PYC-01: `prevYear.hasPrevYear === false` → 空 Map
- INV-PYC-02: pure 計算、I/O / random なし
- INV-PYC-03: SP-B で抽出された inline helper の I3 残留 reference (registry 行で `buildPrevYearCostApprox(ctx.prevYear)` 呼び出し)

## 5. Migration Plan

- registry: `ANA-005`、`runtimeStatus: 'current'`、`tag: 'required'`、`zodAdded: false`（後続で Zod schema 追加検討）
- candidate 化計画なし
- SP-B 由来: registry inline helper → domain calc 抽出が完了済

## 6. Consumers

- **CHART-005 GrossProfitAmountChart**（registry 行で本 calc を呼び出して `prevYearCostMap` props を構築）
- WID-003 chart-gross-profit-amount の registry layer

## 7. Co-Change Impact

- `PrevYearData` 構造変更 → input 構築箇所修正
- 戻り値 Map type 変更 → consumer の Map iteration 修正
- 近似式（`salesAmount - discountAmount`）変更 → 粗利近似の意味自体が変わる

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- `registryInlineLogicGuard.test.ts` — registry I3 (`buildPrevYearCostApprox` の registry 行参照は permissioned permanent floor)
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
