---
id: CALC-020
kind: calculation
exportName: calculateMonthEndProjection
sourceRef: app/src/domain/calculations/algorithms/advancedForecast.ts
sourceLine: 181
definitionDoc: references/01-foundation/authoritative-calculation-definition.md
contractId: ANA-002
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: forecasting
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

# CALC-020 — 高度な月末予測（複数手法 + 信頼区間）

## 1. 概要

`calculateMonthEndProjection(year, month, dailySales)` は **pure 同期関数** で、複数手法（線形 / 曜日調整 / 加重移動平均 / 線形回帰）と **95% 信頼区間** を一括計算する analytic-authoritative 計算（ANA-002、forecasting family）。同 file の `calculateWMA` / `linearRegression` / `projectDowAdjusted` は本 calc の構成部品。

## 2. Input Contract

- `year: number` / `month: number` — 1-indexed（`new Date(year, month, 0)` で末日取得）
- `dailySales: ReadonlyMap<number, number>` — `day`（1-based）→ `sales`
- pure 同期。`v > 0` の entries のみ有効（0 値は除外）
- `WMAEntrySchema` / `MonthEndProjectionSchema` / `LinearRegressionResultSchema` で結果検証可

## 3. Output Contract

- `MonthEndProjection`（Zod schema: `MonthEndProjectionSchema`）:
  - `linearProjection`: 単純平均 × 残日数 + 経過実績
  - `dowAdjustedProjection`: 曜日係数調整済み着地予測（`projectDowAdjusted`）
  - `wmaProjection`: 直近 WMA × 残日数 + 経過実績
  - `regressionProjection`: 線形回帰外挿（`max(0, slope*d + intercept)` の残日累積）
  - `confidenceInterval: { lower, upper }`: 3 手法平均 ± 95% Z 不確実性
  - `dailyTrend`: 線形回帰の slope（日次トレンド）
- 全 field は `Math.round` 済（整数化）。entries=0 → 全 0 安全

## 4. Invariants

- INV-AF-01: empty `dailySales` → 全 field 0（pure 安全）
- INV-AF-02: `confidenceInterval.lower >= 0`（`Math.max(0, ...)`）
- INV-AF-03: `bestEstimate = mean(linearProjection, dowAdjustedProjection, wmaProjection)`
- INV-AF-04: `regressionProjection` の slope*d 寄与は `>= 0` クランプ（負売上禁止）
- INV-AF-05: 95% Z = `CONFIDENCE_95_ZSCORE`（domain/constants）固定、変更時は不確実性帯再評価

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | empty `dailySales` → 全 field 0（pure 安全、INV-AF-01、entries.filter で `v > 0` 経由） | tested | high | app/src/domain/calculations/advancedForecast.test.ts | - | - |
| CLM-002 | `confidenceInterval.lower = max(0, bestEstimate - projectionUncertainty)`（負売上禁止クランプ、INV-AF-02） | tested | high | app/src/domain/calculations/advancedForecast.test.ts | - | - |
| CLM-003 | `bestEstimate = mean(linearProjection, dowAdjustedProjection, wmaProjection)`（3 手法平均、INV-AF-03、regressionProjection は別系列で参考値） | tested | medium | app/src/domain/calculations/advancedForecast.test.ts | - | - |
| CLM-004 | 95% Z は `CONFIDENCE_95_ZSCORE` (domain/constants) に固定（INV-AF-05、変更時は信頼区間幅が全 caller 波及するため reviewed） | reviewed | high | - | - | 定数固定の宣言は domain/constants の declarative 配置で構造的保証。変更時の全 caller 波及は INV-AF-05 invariant + import path guard で検出 |

## 5. Migration Plan

- registry: `ANA-002`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate 化計画なし（forecast core は既に WASM bridge 稼働、本 calc は補助手法）

## 6. Consumers

- forecast feature の月末予測 chart / KPI（複数手法比較表示）
- presentation 層は raw 走査せず本 calc の `MonthEndProjection` を VM 経由 mapping（C9）

## 7. Co-Change Impact

- `MonthEndProjection` schema 変更 → consumer chart / KPI card 修正必要
- `CONFIDENCE_95_ZSCORE` 変更 → 信頼区間幅が全体波及
- `calculateWMA` / `linearRegression` / `projectDowAdjusted` 部品変更 → 本 calc の数値全変動
- `DEFAULT_WMA_WINDOW`（`domain/constants`）変更 → WMA projection の挙動波及

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- `forecastInvariants.test.ts` — 既存 forecast 不変条件（peer test）
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
