---
id: CALC-008
kind: calculation
exportName: calculateForecast
sourceRef: app/src/domain/calculations/forecast.ts
sourceLine: 198
definitionDoc: references/03-guides/duckdb-data-loading-sequence.md
contractId: ANA-006
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: anomaly_detection
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

# CALC-008 — 予測・週次サマリー・異常値検出

## 1. 概要

`calculateForecast(input)` は **pure 同期関数** で、日次売上 row から **週次サマリー** + **曜日平均** + **異常値検出** + **着地予測**を統合した `ForecastResult` を導出する分析正本（`analytic-authoritative`、`forecastBridge` 経由 WASM 部分稼働、`analytic_decomposition` ではなく `anomaly_detection` family）。

## 2. Input Contract

- `ForecastInput`（Zod schema: `ForecastResultSchema` の input サブセット）:
  - 日次売上 row の readonly 配列
  - 週開始曜日設定（`getWeekRanges` で展開）
- 派生 export（同 module）:
  - `calculateStdDev(values)` (line 61) — 平均 / 標準偏差 helper
  - `calculateWeeklySummaries(input)` (line 109) — 週次サマリーのみ
  - `calculateDayOfWeekAverages(input)` (line 140) — 曜日平均のみ
  - `detectAnomalies(...)` (line 167) — 異常値検出のみ
  - `getWeekRanges(...)` (line 79) — 週境界計算 helper

## 3. Output Contract

`ForecastResult`（Zod schema: `ForecastResultSchema`）:

- `weeklySummaries`: 週ごとの sales 合計 / 平均 / outlier 判定
- `dayOfWeekAverages`: 曜日（月〜日）ごとの平均
- `anomalies`: 検出された異常値 (`AnomalyDetectionResult[]`)
- `forecast`: 着地予測値（残期間の推定）

## 4. Invariants

- INV-FCS-01: 週次集計の sum = 元日次の sum（保存則）
- INV-FCS-02: 曜日平均は 7 buckets を持つ（`undefined` 曜日不可）
- INV-FCS-03: 異常値判定は ±2σ（`calculateStdDev` の標準偏差ベース）
- INV-FCS-04: 入力 0 件 → `weeklySummaries=[]` / `dayOfWeekAverages` 全 0 / `anomalies=[]` / `forecast=null`

詳細: `duckdb-data-loading-sequence.md` §「予測層」、`forecastInvariants.test.ts`

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `calculateForecast` は `weeklySummaries` / `dayOfWeekAverages` / `anomalies` の 3 系列を一括返却（部分計算 silent skip 禁止） | tested | high | app/src/domain/calculations/forecast.test.ts | - | - |
| CLM-002 | anomaly 検出は z-score 閾値ベース `abs(zScore) > threshold`（数学的判定で magic number 排除） | tested | high | app/src/domain/calculations/forecastInvariants.test.ts | - | - |
| CLM-003 | `stdDev = 0` で `safeDivide` が 0 を返し z-score 0 化（ゼロ除算回避、anomaly 全不検出） | tested | high | app/src/domain/calculations/forecast.test.ts | - | - |
| CLM-004 | forecastBridge WASM 経路との数値同等性（dual-run observation guard 監視下） | guarded | high | - | app/src/test/observation/forecastObservation.test.ts | - |

## 5. Migration Plan

- registry: `ANA-006`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- WASM: `forecast-wasm` で **WASM bridge 部分稼働中**（`forecastBridge` 経由）
- 旧経路: なし。本 calc が canonical
- candidate 化計画: 現状なし（WASM が ready なら使われる、未 ready で TS fallback）

## 6. Consumers

- `WID-014 forecast-tools` widget（着地予測 + ゴールシーク）
- `WID-035 insight-forecast`（Insight ページの予測タブ）
- `useForecastToolsState` hook
- 異常値表示 chart

## 7. Co-Change Impact

- `ForecastResult` schema 変更 → consumer の Zod parse 修正
- `getWeekRanges` の週開始曜日仕様変更 → 全 consumer の集計境界が変わる
- 異常値判定の ±2σ → 別の閾値（±1.5σ 等）変更時、INV-FCS-03 修正必要
- WASM bridge signature 変更 → TS fallback との同値性検証
- `analytic-authoritative` のため I3「current と candidate を混ぜない」原則を堅守

## 8. Guard / Rule References

- `forecastInvariants.test.ts` — INV-FCS-* 不変条件 test
- `calculationCanonGuard.test.ts` — registry での `forecast.ts` 分類整合
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC — 本 spec の registry 整合
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
