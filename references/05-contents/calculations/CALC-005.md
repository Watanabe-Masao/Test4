---
id: CALC-005
kind: calculation
exportName: evaluateObservationPeriod
sourceRef: app/src/domain/calculations/observationPeriod.ts
sourceLine: 71
definitionDoc: references/03-guides/duckdb-data-loading-sequence.md
contractId: BIZ-010
semanticClass: business
authorityKind: business-authoritative
methodFamily: data_quality
canonicalRegistration: current
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: 783a74a
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28
specVersion: 1
---

# CALC-005 — 観測期間ステータス評価

## 1. 概要

`evaluateObservationPeriod(daily, thresholds?)` は **pure 同期関数** で、日次売上 row の連続性 / 欠落 / 異常値から **観測期間の信頼性ステータス** (`ok` / `warning` / `error`) と **bitmask 形式の警告コード**を導出する（データ品質の正本）。`worseObservationStatus` (line 128) は複数 status の最悪値を返す helper。

## 2. Input Contract

- `daily: readonly DailySalesRow[]` — 日次 flat array
- `thresholds`（option、Zod schema: `ObservationThresholdsSchema`）: 警告 / エラー判定の閾値
  - default: `DEFAULT_OBSERVATION_THRESHOLDS` (line 52) を使用
- 入力 row の連続日数 / 欠落 / 異常値 (NaN / 負値 / outlier) を分析

## 3. Output Contract

```ts
{
  status: 'ok' | 'warning' | 'error'
  warnings: number  // bitmask
  details: { gaps, outliers, totalDays, ... }
}
```

- `status`: 期間全体のサマリ
- `warnings`: bitmask の組合せ（個別警告の集合）
- 派生 helper:
  - `worseObservationStatus(a, b)`: 2 status の悪い方を返す（`error > warning > ok`）

## 4. Invariants

- INV-OBS-01: 入力 0 件 → `status: 'error'`、`warnings` には欠落 bit が立つ
- INV-OBS-02: `warnings` bitmask の各 bit が独立（複数警告が共存可能）
- INV-OBS-03: `worseObservationStatus(a, ok) === a`（ok は単位元）
- INV-OBS-04: `thresholds` 不在時は `DEFAULT_OBSERVATION_THRESHOLDS` を適用（暗黙の default 不変）

詳細: `duckdb-data-loading-sequence.md` §「観測期間の信頼性判定」

## 5. Migration Plan

- registry: `BIZ-010`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- **WASM 候補**: `wasm/observation-period/`（`migrationTier: tier1`、`candidate-authoritative`）
- 候補 FFI: `dailySales` flat array + `status/warning bitmask` 出力
- 候補が landed したら CALC-NNN として spec 化、本 spec に `replacedBy` + 候補側に `supersedes: CALC-005` を記録

## 6. Consumers

- `useDuckDB` 起動時の load シーケンス（観測期間の自動評価）
- データロードエラー UI（warning / error の人間可読化）
- `WID-014 forecast-tools` の予測信頼度表示
- `TimeSlot` 系の集計（観測期間が `error` なら集計を保留）

## 7. Co-Change Impact

- `DailySalesRow` schema 変更 → FFI 変更（flat array contract）
- `ObservationThresholdsSchema` 変更 → consumer の閾値 customize 経路修正
- bitmask の bit 割当変更 → 旧 bit を消費する code の修正必要
- `DEFAULT_OBSERVATION_THRESHOLDS` 変更 → 既存判定結果が変わる影響範囲広い

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry での `observationPeriod.ts` 分類整合
- `observationPeriodInvariants.test.ts` — INV-OBS-* 不変条件 test
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
