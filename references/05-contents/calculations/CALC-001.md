---
id: CALC-001
kind: calculation
exportName: calculateCustomerGap
sourceRef: app/src/domain/calculations/customerGap.ts
sourceLine: 78
definitionDoc: references/01-principles/customer-gap-definition.md
contractId: BIZ-013
semanticClass: business
authorityKind: business-authoritative
methodFamily: behavioral
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: 50018d335f84f9bcc380fea410d95a85a5485f97
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-27
specVersion: 1
---

# CALC-001 — 客数 GAP 計算

## 1. 概要

`calculateCustomerGap(input)` は **pure 同期関数** で、当期と前年同期の客数・販売点数から「客数 GAP」（来店客数の伸び率と販売点数の伸び率の差）を導出し、`CustomerGapResult | null` を返す（`customer-gap-definition.md` 準拠）。

## 2. Input Contract

- `CustomerGapInput`（Zod schema: `CustomerGapInputSchema`）:
  - `currentCustomers`: 当期客数
  - `prevYearCustomers`: 前年同期客数
  - `currentQuantity`: 当期販売点数
  - `prevYearQuantity`: 前年同期販売点数
- 入力がいずれか欠損 (`null` / `undefined` / `0` 母数) → `null` を返す（fallback policy: `none`）

## 3. Output Contract

`CustomerGapResult | null`（Zod schema: `CustomerGapResultSchema`）:

- `customerGrowthRate`: (current - prev) / prev
- `quantityGrowthRate`: (current - prev) / prev
- `gap`: `customerGrowthRate - quantityGrowthRate`（客数の伸び − 点数の伸び）
- `signal`: `'customer-led' | 'quantity-led' | 'balanced'`（gap の符号 + 閾値で分類）

## 4. Invariants

- INV-CGAP-01: `prev = 0` のとき結果は `null`（除算回避）
- INV-CGAP-02: 入力が全て pure number → 出力は finite（NaN/Infinity 不可）
- INV-CGAP-03: Zod parse は input/output 双方で fail-fast（汚染データの計算層流入を防ぐ）

詳細: `customer-gap-definition.md` §「客数 GAP の意味」、`invariant-catalog.md` §CGAP

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `prev = 0` で `null` を返し除算回避 | tested | high | app/src/domain/calculations/__tests__/customerGap.test.ts | - | - |
| CLM-002 | Zod input/output 双方で fail-fast（汚染データを domain 層に流入させない） | tested | high | app/src/domain/calculations/__tests__/customerGap.test.ts | - | - |
| CLM-003 | 取得経路の唯一性（客数 GAP は本 calc のみが正本） | guarded | high | - | app/src/test/guards/customerGapPathGuard.test.ts | - |

## 5. Migration Plan

- registry: `BIZ-013`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- **WASM 候補**: `wasm/customer-gap/`（`migrationTier: tier1`、`candidate-authoritative`）
- 候補の物理 file は未生成（`candidate/customerGap.ts` は registry 上の予約 path）
- 候補が landed したら CALC-002（仮）として spec 化、本 spec に `replacedBy: CALC-XXX`（移行完了時）+ candidate 側に `supersedes: CALC-001` を記録
- Promote Ceremony は `references/03-guides/promote-ceremony-pr-template.md` の手順で実施

## 6. Consumers

- `customerGapPathGuard.test.ts` 監視下の取得経路
- `analysis-causal-chain` widget（因果チェーン分析）
- `SensitivityDashboard`（客数感度分析の補助指標）
- `RegressionInsightChart`（回帰分析の説明変数候補）

## 7. Co-Change Impact

以下が変わると本 calc が壊れうる:

- `CustomerGapInput` / `CustomerGapResult` schema 変更 → 全 consumer の Zod parse 修正必要
- `signal` 分類の閾値変更 → INV-CGAP の更新と invariant test 修正
- `null` 返却の fallback policy 変更 → consumer の null check 経路修正
- WASM candidate landing 時、`bridge` の signature が変わる → TS fallback との同値性確保が必要

## 8. Guard / Rule References

- `customerGapPathGuard.test.ts` — 取得経路の唯一性
- `calculationCanonGuard.test.ts` — `calculationCanonRegistry` の `customerGap.ts` 分類整合
- `canonicalizationSystemGuard.test.ts` — domain/calculations 配下の semantic 分類
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle field 整合（active なら replacedBy=null 等）
