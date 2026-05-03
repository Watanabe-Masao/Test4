---
id: CALC-017
kind: calculation
exportName: findCoreTime
sourceRef: app/src/domain/calculations/timeSlotCalculations.ts
sourceLine: 35
definitionDoc: references/01-foundation/data-flow.md
contractId: ANA-001
semanticClass: analytic
authorityKind: analytic-authoritative
methodFamily: time_pattern
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

# CALC-017 — 時間帯分析（core / turnaround）

## 1. 概要

`findCoreTime(hourlyMap)` は **pure 同期関数** で、時間帯別売上から **3 連続時間帯の累計合計が最大となるウィンドウ**（コアタイム）を検出する analytic-authoritative 計算（ANA-001、time_pattern family）。同 file の `findTurnaroundHour` / `buildHourlyMap` は補助関数。

## 2. Input Contract

- `hourlyMap: Map<number, number>` — `hour`（0-23）→ `amount`（売上または点数）
- pure 同期。empty map / size<3 は full range 返却で安全
- 集計起点は `buildHourlyMap(data)` ヘルパー（`{ hour, amount }[]` から構築）

## 3. Output Contract

- `CoreTimeResult`（Zod schema: `CoreTimeResultSchema`、nullable）:
  - `startHour` / `endHour`: コアタイム start/end（連続 3 時間帯）
  - `total`: 当該 3 時間帯の累計合計
- empty map → `null`
- `findTurnaroundHour` 戻り値: `TurnaroundHourResult`（`number | null`、累積 50% 到達時刻）

## 4. Invariants

- INV-CT-01: empty / 全 0 入力 → `null`（pure 安全）
- INV-CT-02: `endHour - startHour === 2`（連続 3 時間帯固定）
- INV-CT-03: `total` は max-window の合計と一致（探索結果の可換性）
- INV-CT-04: `findTurnaroundHour` の 50% 累積判定は昇順 hour 走査の単調性を保つ

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | empty Map → `null` 返却（findCoreTime / findTurnaroundHour 双方、INV-CT-01） | tested | high | app/src/domain/calculations/__tests__/timeSlotCalculations.test.ts | - | - |
| CLM-002 | コアタイムは **連続 3 時間帯固定**（`endHour - startHour === 2`、INV-CT-02、可変窓 N の拡張は新 export 必須） | tested | high | app/src/domain/calculations/__tests__/timeSlotCalculations.test.ts | - | - |
| CLM-003 | `findTurnaroundHour` は累積 50% 到達 hour を返す（昇順走査の単調性、INV-CT-04） | tested | medium | app/src/domain/calculations/__tests__/timeSlotCalculationsInvariants.test.ts | - | - |
| CLM-004 | timeSlotBridge WASM 経路との数値同等性 (dual-run observation guard 監視下) | guarded | high | - | app/src/test/observation/timeSlotObservation.test.ts | - |

## 5. Migration Plan

- registry: `ANA-001`、`runtimeStatus: 'current'`、`ownerKind: 'maintenance'`
- candidate 化計画なし（複雑度低、WASM 化メリット薄）

## 6. Consumers

- 時間帯分析 widget / chart（コアタイム / ピーク / 折り返しの可視化）
- presentation 層は raw 走査せず本 calc 出力を mapping するのみ（C9）

## 7. Co-Change Impact

- `CoreTimeResult` schema 変更 → consumer chart の VM 修正必要
- 「3 連続」を「N 連続」に拡張する変更 → 新 export 追加（既存契約破壊禁止）
- hourlyMap の hour 範囲拡張（24h → 48h 等）→ INV-CT-02 / INV-CT-04 再評価

## 8. Guard / Rule References

- `calculationCanonGuard.test.ts` — registry 分類整合
- AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC / LIFECYCLE-FIELDS — 本 spec 整合
