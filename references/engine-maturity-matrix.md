# Engine Maturity Matrix

## ステージ定義

| ステージ | 意味 | 完了条件 |
|---|---|---|
| **audited** | TS 実装の責任範囲を監査済み | responsibility map 作成済み |
| **bridge-ready** | bridge パターン実装済み（ts-only） | bridge 経由で全呼び出し統一 |
| **compare-ready** | compare 計画策定済み | compare plan 文書完成 |
| **compare-implemented** | dual-run compare 実装済み | bridge test 全通過 |
| **rust-implemented** | Rust crate 実装済み | cargo test 全通過 |
| **wasm-callable** | WASM ビルド + TS 接続済み | npm test 全通過 |
| **observation-ready** | 観測ログ収集可能 | DevTools で __dualRunStats() 確認可 |
| **promotion-candidate** | 観測完了、昇格可能 | verdict: clean or tolerance-only |
| **authoritative** | WASM が authoritative | TS フォールバック削除済み |

## 現在の状態（Phase 10 完了時点）

| Engine | 関数数 | audited | bridge | compare-ready | compare-impl | rust | wasm | obs | promo | auth |
|---|---|---|---|---|---|---|---|---|---|---|
| factorDecomposition | 4 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| grossProfit | 8 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| budgetAnalysis | 2 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | - |
| forecast | 5+5 | ✅ | ✅ | ✅ | ✅ | - | - | - | - | - |

### forecast 詳細

| 関数 | compare 対象 | Rust | 備考 |
|---|---|---|---|
| calculateStdDev | ✅ | - | Date 非依存 |
| detectAnomalies | ✅ | - | Date 非依存 |
| calculateWMA | ✅ | - | Date 非依存 |
| linearRegression | ✅ | - | Date 非依存 |
| analyzeTrend | ✅ | - | Date 非依存 |
| getWeekRanges | ❌ | - | Date 依存 |
| calculateDayOfWeekAverages | ❌ | - | Date 依存 |
| calculateWeeklySummaries | ❌ | - | Date 依存 |
| calculateMonthEndProjection | ❌ | - | Date 依存 |
| calculateForecast | ❌ | - | Date 依存（composite） |

## 次にやること

| Engine | 次のステージ | 必要な作業 |
|---|---|---|
| factorDecomposition | promotion-candidate | 観測ログ蓄積 + verdict 確認 |
| grossProfit | promotion-candidate | 観測ログ蓄積 + verdict 確認 |
| budgetAnalysis | promotion-candidate | 観測ログ蓄積 + verdict 確認 |
| forecast | rust-implemented | Rust crate 作成 + 5 pure 関数実装 |

## Aggregate Boundary

| モジュール | single-store core | aggregate | 備考 |
|---|---|---|---|
| factorDecomposition | decompose2/3/5, decomposePriceMix | - | aggregate なし |
| grossProfit | 8 関数 | - | aggregate なし |
| budgetAnalysis | calculateBudgetAnalysis, calculateGrossProfitBudget | calculateAggregateBudget | aggregate は application 層に残す |
| forecast | 5 pure 関数 | calculateForecast（composite） | composite は Date 依存のため application 層 |

**原則:** single-store authoritative core を先に移す。
multi-store orchestration / composite は application 側に残す。
