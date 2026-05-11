# Engine Maturity Matrix — 定義 (split)

> **disposition: split 完遂 (= AAG-COA Sub-3 sub-PR 4)**: 旧 doc は (1) maturity ステージ定義 (= 本 doc、stable canonical) + (2) 現在の状態 snapshot (= 全 5 engine authoritative 完遂、`engine-promotion-matrix.md` に articulate) + (3) 次にやること TODO (= 全 engine authoritative 昇格済、stale 化 = 削除) の責務複合だった。本 doc は **stable definitions** のみを保持。state は `engine-promotion-matrix.md`、根本的な promotion 基準は `promotion-criteria.md` を参照。

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

詳細遷移条件・昇格基準は `references/04-tracking/promotion-criteria.md` を参照。

## Aggregate Boundary

| モジュール | single-store core | aggregate | 備考 |
|---|---|---|---|
| factorDecomposition | decompose2/3/5, decomposePriceMix | - | aggregate なし |
| grossProfit | 8 関数 | - | aggregate なし |
| budgetAnalysis | calculateBudgetAnalysis, calculateGrossProfitBudget | calculateAggregateBudget | aggregate は application 層に残す |
| forecast | 5 pure 関数 | calculateForecast（composite） | composite は Date 依存のため application 層 |
| timeSlot | findCoreTime, findTurnaroundHour | - | aggregate なし |

**原則:** single-store authoritative core を先に移す。
multi-store orchestration / composite は application 側に残す。

## Bridge Infrastructure（5 engine 共通）

| コンポーネント | ファイル | 役割 |
|---|---|---|
| Bridge | `application/services/*Bridge.ts` | 3モード dispatch（ts-only / wasm-only / dual-run-compare） |
| WASM Wrapper | `application/services/*Wasm.ts` | Rust WASM → TS 型変換アダプター |
| WASM Engine | `application/services/wasmEngine.ts` | 5 WASM モジュールのライフサイクル管理 |
| Observer | `application/services/dualRunObserver.ts` | dual-run 統計の蓄積・tolerance 判定（1e-10） |
| DevTools | `main.tsx` | `__dualRunStats()` / `__runObservation()` API |
| Observation Test | `test/observation/*Observation.test.ts` | 自動観測ハーネス（4 engine 分） |
