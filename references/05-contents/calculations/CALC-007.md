---
id: CALC-007
kind: calculation
exportName: decompose5
sourceRef: app/src/domain/calculations/factorDecomposition.ts
sourceLine: 202
definitionDoc: references/01-principles/authoritative-calculation-definition.md
contractId: BIZ-004
semanticClass: business
authorityKind: business-authoritative
methodFamily: analytic_decomposition
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: 8be44bc8586399e3c84ee527289d2dcbcfbe6842
owner: architecture
specVersion: 1
---

# CALC-007 — Shapley 5 要素分解（domain math 層）

## 1. 概要

`decompose5(current, prev)` は **pure 同期関数** で、当期 / 比較期の 5 要素（数量×単価×粗利率×値引率×構成比）の差分を **Shapley 公平分配**で `total` の和と完全一致するよう分解する domain math 層の正本（`authoritative-calculation-definition.md` 準拠、`invariant-catalog.md` §INV-SHAPLEY-5）。RM-006 `calculateFactorDecomposition` の内部実装。

## 2. Input Contract

- `current`: 当期 5 要素値 `{ quantity, unitPrice, grossProfitRate, discountRate, compositionRatio }`
- `prev`: 比較期 5 要素値（同形）
- 派生 export（同 module）:
  - `decompose2(current, prev)` (line 68) — 2 要素 Shapley
  - `decompose3(current, prev)` (line 95) — 3 要素 Shapley
  - `decomposePriceMix(current, prev)` (line 133) — Price/Mix 専用 2 要素

## 3. Output Contract

`FactorContribution[5]`:

- 各 element: `{ factor: string, contribution: number }`
- 5 要素 Shapley 公平分配により `sum(contributions) === current_total - prev_total`（INV-SHAPLEY-5）
- `factor` 名: `'quantity'` / `'unitPrice'` / `'grossProfitRate'` / `'discountRate'` / `'compositionRatio'`

## 4. Invariants

- INV-SHAPLEY-5: 5 要素分解の sum = 全体差分（`shapleyIdentityInvariant.test.ts` で検証）
- INV-SHAPLEY-2: 2 要素分解（`decompose2`）も同じ恒等式
- INV-SHAPLEY-3: 3 要素分解（`decompose3`）も同じ恒等式
- INV-FAC-NONNEG: `compositionRatio` 入力は [0, 1]
- INV-FAC-PURE: 入力が pure number → 出力 finite (NaN/Infinity 不可)

詳細: `invariant-catalog.md` §SHAPLEY、`authoritative-calculation-definition.md`

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | 5 要素 Shapley 恒等式: sum(factors) === total が常に成立 | tested | high | app/src/test/shapleyIdentityInvariant.test.ts | - | - |
| CLM-002 | 2/3 要素 Shapley 恒等式（decompose2 / decompose3）も同じ恒等式 | tested | high | app/src/test/shapleyIdentityInvariant.test.ts | - | - |
| CLM-003 | 取得経路の唯一性（要因分解は本 calc + RM-006 wrapper のみが正本） | guarded | high | - | app/src/test/guards/factorDecompositionPathGuard.test.ts | - |
| CLM-004 | calculationCanonRegistry での `factorDecomposition.ts` 分類整合 | guarded | medium | - | app/src/test/guards/calculationCanonGuard.test.ts | - |

## 5. Migration Plan

- registry: `BIZ-004`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- WASM: `wasm/factor-decomposition/` で **既に WASM bridge 稼働中**（部分的）。`forecastBridge` 系列とは別系統
- 旧経路: なし。本 calc が canonical で、RM-006 が wrap して上位に提供
- candidate 化計画: 現状なし（WASM bridge が ready なら使われる、未 ready で TS fallback）

## 6. Consumers

- **RM-006 calculateFactorDecomposition**（直接 wrap）
- `WaterfallChartWidget`（粗利分解）
- `DecompositionTabContent` (Insight ページ)
- `analysis-causal-chain` widget（因果チェーン）
- `RegressionInsightChart`（回帰分析の入力）

## 7. Co-Change Impact

- 5 要素の field 名 / 順序変更 → 全 consumer の名前参照破壊
- `decompose5` の signature 変更 → RM-006 wrapper 修正必要、WASM bridge 同期
- INV-SHAPLEY-5 不変条件は **絶対に破らない**（数学的に不変）
- WASM signature 変更時の TS fallback 同値性 → `shapleyIdentityInvariant.test.ts` で検証

## 8. Guard / Rule References

- `factorDecompositionPathGuard.test.ts` — 取得経路の唯一性
- `shapleyIdentityInvariant.test.ts` — Shapley 恒等式（INV-SHAPLEY-2/3/5）
- `calculationCanonGuard.test.ts` — registry での `factorDecomposition.ts` 分類整合
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS / CANONICAL-REGISTRATION-SYNC — 本 spec の lifecycle / registry 整合
