# Analytic Kernel 移行計画

> Phase 6: Analytic Kernel 候補の移行基盤

## 1. 目的

`semanticClass: 'analytic'` の計算群について、candidate 移行の構造基盤を整備する。
Business Semantic Core（Phase 5）とは別トラックで管理する。

## 2. 原則

1. **Analytic Kernel は Business Semantic Core と同じ棚に置かない**（別トラック）
2. **analysis 用の pure kernel だけを対象にする**
3. **技法・数学的不変条件・再利用性を重視する**（business の「業務意味一致」とは評価軸が異なる）
4. **candidate/analytics として育て、current 群へ最初から混ぜない**
5. **bridge/analytics を唯一入口にする**
6. **分析技法を使う business core と analytic kernel 自体を混同しない**（factorDecomposition は対象外）

## 3. Analytic 候補一覧

### 3区分サマリ

| 区分 | 対象 | 件数 |
|------|------|------|
| **candidate 移行** | ANA-003, ANA-004, ANA-005, ANA-007, ANA-009 | 5 件 |
| **current 品質整備** | ANA-001 (Zod追加), ANA-002 (residual明文化), ANA-006 (residual明文化) | 3 件 |
| **non-target 除外** | ANA-008 (JS-native / FFI 便益薄) | 1 件 |

### 全9件の詳細

| # | ファイル | contractId | methodFamily | invariant 例 | 移行難度 |
|---|---------|-----------|-------------|-------------|---------|
| 1 | timeSlotCalculations.ts | ANA-001 | time_pattern | コアタイム ⊂ 営業時間 | 中（bridge 済み） |
| 2 | algorithms/advancedForecast.ts | ANA-002 | forecasting | WMA 重み合計 = 1.0 | 中 |
| 3 | algorithms/sensitivity.ts | ANA-003 | what_if | 感度 ∈ [0, ∞) | 低 |
| 4 | algorithms/trendAnalysis.ts | ANA-004 | temporal_pattern | MoM/YoY 比較基準の一致 | 低 |
| 5 | algorithms/correlation.ts | ANA-005 | statistical | pearson ∈ [-1, 1] | 低 |
| 6 | forecast.ts | ANA-006 | anomaly_detection | 異常値閾値 > 0 | 中（bridge 済み） |
| 7 | dowGapAnalysis.ts | ANA-007 | calendar_effect | 曜日合計 = 週合計 | 低 |
| 8 | dowGapActualDay.ts | ANA-008 | calendar_effect | 実日数 ≥ 0 | 低 |
| 9 | temporal/computeMovingAverage.ts | ANA-009 | time_series | 窓幅 ≥ 1 | 低 |

### 3.1 factorDecomposition は対象外

factorDecomposition は技法が Shapley（analytic）だが意味責任は business（BIZ-004）。
Analytic Kernel の移行対象にしてはならない。

## 4. Business との評価軸の違い

| 評価軸 | Business (Phase 5) | Analytic (Phase 6) |
|-------|--------------------|--------------------|
| **主な検証** | 業務意味の一致 | 数学的不変条件の一致 |
| **parity 基準** | 値一致 + 業務解釈の一致 | 値一致 + shape 一致 + ordering 一致 |
| **contract 要件** | businessMeaning 必須 | methodFamily + invariantSet 必須 |
| **bridge** | business bridge | analytics bridge |
| **authorityKind** | candidate-authoritative | candidate-authoritative |

## 5. 3トラック別の JS Current Reference

### 5.1 Candidate Migration Track（5件 — WASM 移行対象）

registry: `runtimeStatus: 'candidate'`, `authorityKind: 'candidate-authoritative'`

| ファイル | contractId | 主要関数 | Zod 契約 | Bridge | WASM crate |
|---------|-----------|---------|---------|--------|-----------|
| algorithms/sensitivity.ts | ANA-003 | `calculateSensitivity()` | ✅ | ✅ sensitivityBridge | ✅ wasm/sensitivity |
| algorithms/trendAnalysis.ts | ANA-004 | `analyzeTrend()` | ✅ | ✅ trendAnalysisBridge | ✅ wasm/trend-analysis |
| algorithms/correlation.ts | ANA-005 | `pearsonCorrelation()` | ✅ | ✅ correlationBridge | ✅ wasm/correlation |
| dowGapAnalysis.ts | ANA-007 | `analyzeDowGap()` | ❌ | ✅ dowGapBridge | ✅ wasm/dow-gap |
| temporal/computeMovingAverage.ts | ANA-009 | `computeMovingAverage()` | ✅ | ✅ movingAverageBridge | ✅ wasm/moving-average |

### 5.2 Current Quality Track（3件 — Zod / residual 品質整備）

registry: `runtimeStatus: 'current'`, `authorityKind: 'analytic-authoritative'`。
WASM 移行ではなく、current のまま品質を上げるトラック。

| ファイル | contractId | 主要関数 | 品質課題 | Bridge |
|---------|-----------|---------|---------|--------|
| timeSlotCalculations.ts | ANA-001 | `findCoreTime()`, `findTurnaroundHour()` | Zod 契約未追加 | ✅ timeSlotBridge |
| algorithms/advancedForecast.ts | ANA-002 | `calculateWMA()`, `linearRegression()` | residual 明文化 | ✅ forecastBridge |
| forecast.ts | ANA-006 | `calculateForecast()`, `detectAnomalies()` | residual 明文化 | ✅ forecastBridge |

### 5.3 Non-Target（1件 — 移行対象外）

registry: `runtimeStatus: 'non-target'`, `authorityKind: 'non-authoritative'`

| ファイル | contractId | 除外理由 |
|---------|-----------|---------|
| dowGapActualDay.ts | ANA-008 | JS-native / FFI 便益薄。WASM 化の実用的効果がない |

## 6. 9 ステップ移行プロセス

| Step | 内容 | 実施時期 | 成果物 |
|------|------|---------|--------|
| 1 | 候補確定 | ✅ Phase 6 基盤 | 本文書 §3 |
| 2 | Analytic Contract 固定 | ✅ Phase 3 | contract-definition-policy.md |
| 3 | JS current reference 固定 | ✅ Phase 6 基盤 | 本文書 §5 |
| 4 | candidate/analytics 実装追加 | Phase 6 実装 | wasm/ に新 crate + registry エントリ |
| 5 | analytics bridge 接続 | Phase 6 実装 | bridge にモード切替を追加 |
| 6 | dual-run 比較 | Phase 6 実装 | 値一致 + shape + ordering + 不変条件 |
| 7 | invariant 検証 | Phase 6 実装 | 各候補固有の不変条件テスト |
| 8 | rollback 確認 | Phase 6 実装 | candidate 失敗 → current reference に復帰 |
| 9 | promotion-ready 判定 | Phase 6 実装 | 判定表（まだ current に編入しない） |

## 7. Phase 6 Guard

| Guard ID | severity | 内容 |
|----------|----------|------|
| AR-CAND-ANA-CONTRACT-REQUIRED | hard | Analytic Contract なしで candidate 化禁止 |
| AR-CAND-ANA-NO-BUSINESS-BRIDGE | hard | analytic candidate を business bridge に接続禁止 |
| AR-CAND-ANA-METHOD-REQUIRED | hard | candidate/analytics に methodFamily 未設定禁止 |
| AR-CAND-ANA-INVARIANT-REQUIRED | hard | candidate/analytics に invariantSet 未定義禁止 |
| AR-CAND-ANA-NO-DIRECT-IMPORT | ratchet | candidate の direct import 増加禁止 |
| AR-CAND-ANA-NO-CURRENT-BIZ-MIX | hard | candidate → current/business 混入禁止 |
| AR-CAND-ANA-NO-FACTOR-DECOMP | hard | factorDecomposition を analytics 候補登録禁止 |

## 8. 関連文書

- `references/03-implementation/contract-definition-policy.md` — ANA 契約テンプレート
- `references/03-implementation/current-maintenance-policy.md` — current/analytics 保守観点
- `references/03-implementation/tier1-business-migration-plan.md` — Phase 5 との対比
- `references/01-foundation/semantic-classification-policy.md` — 意味分類ポリシー
- `app/src/test/calculationCanonRegistry.ts` — Master Registry
