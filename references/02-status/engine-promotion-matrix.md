# Engine Promotion Matrix — 昇格状況一覧

## 目的

4 engine の現在地・blocker・次条件を一目で把握できるようにする。
`engine-maturity-matrix.md` がステージ定義を、本文書が各 engine の個別状況を管理する。

---

## 一覧表

| Engine | Current State | Compare | Rust | WASM | Observation | Blocker | Next Action | Risk | Rollback Ready |
|---|---|---|---|---|---|---|---|---|---|
| factorDecomposition | observation-ready | ✅ | ✅ | ✅ | 未実施 | 自動観測ハーネス未整備 | 自動観測ハーネス構築 | Low | ✅ |
| grossProfit | observation-ready | ✅ | ✅ | ✅ | 未実施 | 自動観測ハーネス未整備 | 自動観測ハーネス構築 | Low | ✅ |
| budgetAnalysis | observation-ready | ✅ | ✅ | ✅ | 未実施 | 自動観測ハーネス未整備 | 自動観測ハーネス構築 | Low | ✅ |
| forecast | observation-ready | ✅ | ✅ | ✅ | 未実施 | 自動観測ハーネス未整備 | 自動観測ハーネス構築 | Low | ✅ |

---

## Engine 別詳細

### factorDecomposition

| 項目 | 状態 |
|---|---|
| 関数数 | 4（decompose2, decompose3, decompose5, decomposePriceMix） |
| maturity | observation-ready |
| compare | 実装済み。bridge test 通過 |
| Rust crate | `wasm/factor-decomposition/` — cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| observer | FnName 4 件登録済み。DevTools アクセス可 |
| invariant tests | decomposition sum identity（effects 合計 = delta） |
| cross-validation | TS golden fixture との一致確認済み |
| edge cases | ゼロ / 負値 / NaN / 大値カバー済み |

**Blocker:** 自動観測ハーネス未整備。固定フィクスチャによる自動 dual-run compare + summary 回収の仕組みがない。

**次の一手:** 自動観測ハーネスを構築し、固定フィクスチャで compare 対象 4 関数の call coverage + mismatch summary を自動取得できるようにする。

**promotion-candidate までに必要なこと:**
- 自動観測ハーネスが pass
- compare 対象 4 関数の expected call coverage を満たす（各 call count ≥ 1）
- フィクスチャ群（normal / zero-null / extreme / boundary）で fail なし
- invariant-violation = 0 / null-mismatch = 0 / numeric-over-tolerance = 0
- fallback / rollback テスト pass

---

### grossProfit

| 項目 | 状態 |
|---|---|
| 関数数 | 8 |
| maturity | observation-ready |
| compare | 実装済み。bridge test 通過 |
| Rust crate | `wasm/gross-profit/` — cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| observer | FnName 8 件登録済み。DevTools アクセス可 |
| invariant tests | GP-INV-1〜12（COGS 等式、粗利等式、null 伝播等） |
| cross-validation | TS golden fixture との一致確認済み |
| edge cases | ゼロ / 負値 / NaN / 大値カバー済み |

**Blocker:** 自動観測ハーネス未整備。固定フィクスチャによる自動 dual-run compare + summary 回収の仕組みがない。

**次の一手:** 自動観測ハーネスを構築し、固定フィクスチャで compare 対象 8 関数（特に invMethod / estMethod の null 在庫パターン）の call coverage + mismatch summary を自動取得できるようにする。

**promotion-candidate までに必要なこと:**
- 自動観測ハーネスが pass
- compare 対象 8 関数の expected call coverage を満たす
- inventory path / estimated path / markup-transfer path の経路 coverage
- フィクスチャ群で fail なし
- invariant-violation = 0 / null-mismatch = 0 / numeric-over-tolerance = 0
- fallback / rollback テスト pass

---

### budgetAnalysis

| 項目 | 状態 |
|---|---|
| 関数数 | 2（calculateBudgetAnalysis, calculateGrossProfitBudget） |
| maturity | observation-ready |
| compare | 実装済み。bridge test 通過 |
| Rust crate | `wasm/budget-analysis/` — cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| observer | FnName 2 件登録済み。DevTools アクセス可 |
| invariant tests | B-INV-1〜5（残予算、進捗率、累計単調性等） |
| cross-validation | TS golden fixture との一致確認済み |
| edge cases | ゼロ予算 / ゼロ売上 / 月末境界カバー済み |

**Blocker:** 自動観測ハーネス未整備。固定フィクスチャによる自動 dual-run compare + summary 回収の仕組みがない。

**注意:** `calculateAggregateBudget` は compare 対象外。coverage 条件に含めない。

**次の一手:** 自動観測ハーネスを構築し、固定フィクスチャで compare 対象 2 関数の call coverage + mismatch summary を自動取得できるようにする。

**promotion-candidate までに必要なこと:**
- 自動観測ハーネスが pass
- compare 対象 2 関数の expected call coverage を満たす
- single-store budget / gross profit budget の経路 coverage
- フィクスチャ群で fail なし
- invariant-violation = 0 / null-mismatch = 0 / numeric-over-tolerance = 0
- fallback / rollback テスト pass

---

### forecast

| 項目 | 状態 |
|---|---|
| 関数数 | 5 pure（Date 非依存）+ 5 Date 依存（compare 対象外） |
| maturity | observation-ready |
| compare | 実装済み。bridge test 通過 |
| Rust crate | `wasm/forecast/` — cargo test 全通過（unit 34 + cross_validation 12 + edge_cases 19 + invariants 12 = 77テスト） |
| WASM | wasm-pack build 済み。forecastBridge.ts + forecastWasm.ts 接続済み |
| observer | FnName 5 件登録済み。DevTools アクセス可 |
| invariant tests | F-INV-1〜13 + F-BIZ-1〜4（TS）、F-INV-1/2/3/8/10/12/13 + finiteness（Rust） |
| cross-validation | TS golden fixture との一致確認済み（cross_validation.rs 12テスト通過） |
| edge cases | 空入力 / 単一値 / 極値 / 負値 / 未ソート入力カバー済み（edge_cases.rs 19テスト通過） |

**Blocker:** 自動観測ハーネス未整備。固定フィクスチャによる自動 dual-run compare + summary 回収の仕組みがない。

**次の一手:** 自動観測ハーネスを構築し、固定フィクスチャで compare 対象 5 関数の call coverage + mismatch summary を自動取得できるようにする。

**promotion-candidate までに必要なこと:**
- 自動観測ハーネスが pass
- compare 対象 5 関数の expected call coverage を満たす（各 call count ≥ 1）
- フィクスチャ群（normal / zero-null / extreme / boundary）で fail なし
- invariant-violation = 0 / null-mismatch = 0 / numeric-over-tolerance = 0
- fallback / rollback テスト pass

---

## 昇格ロードマップ

```
現在                                            目標
────────────────────────────────────────────────────

factorDecomposition  [observation-ready]  →  promotion-candidate  →  wasm-only trial  →  authoritative
grossProfit          [observation-ready]  →  promotion-candidate  →  wasm-only trial  →  authoritative
budgetAnalysis       [observation-ready]  →  promotion-candidate  →  wasm-only trial  →  authoritative
forecast             [observation-ready]  →  promotion-candidate  →  wasm-only trial  →  authoritative
```

### 優先順序の推奨

1. **factorDecomposition** — 最も関数数が少なく（4）、最初に実証済みのため最もリスクが低い
2. **budgetAnalysis** — 関数数が少ない（2）。scalar のみで null sentinel も限定的
3. **forecast** — 関数数 5。Date 非依存の純粋統計関数のみが対象
4. **grossProfit** — 関数数が最多（8）。null sentinel パターンあり。慎重に

---

## 更新ルール

- engine の状態が変わったら本文書を更新する
- blocker が解消されたら「次の一手」を更新する
- promotion-candidate に到達したら該当セクションに判定日と verdict を記録する
