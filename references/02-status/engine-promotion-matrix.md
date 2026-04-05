# Engine Promotion Matrix — 昇格状況一覧（2026-03-29 更新）

## 目的

4+1 engine の現在地・blocker・次条件を一目で把握できるようにする。
`engine-maturity-matrix.md` がステージ定義を、本文書が各 engine の個別状況を管理する。

---

## 一覧表

| Engine | Current State | Compare | Rust | WASM | Observation | Blocker | Next Action | Risk | Rollback Ready |
|---|---|---|---|---|---|---|---|---|---|
| factorDecomposition | **authoritative** ✅ | ✅ | ✅ | ✅ | ✅ 18 pass | — | 完了（2026-04-05 昇格） | — | — |
| grossProfit | **authoritative** ✅ | ✅ | ✅ | ✅ | ✅ 16 pass | — | 完了（2026-04-05 昇格） | — | — |
| budgetAnalysis | **authoritative** ✅ | ✅ | ✅ | ✅ | ✅ 12 pass | — | 完了（2026-04-05 昇格） | — | — |
| forecast | **authoritative** ✅ | ✅ | ✅ | ✅ | ✅ 21 pass | — | 完了（2026-04-05 昇格） | — | — |
| timeSlot | **authoritative** ✅ | ✅ | ✅ | ✅ | ✅ 25 pass | — | 完了（2026-04-05 昇格） | — | — |

---

## Engine 別詳細

### factorDecomposition

| 項目 | 状態 |
|---|---|
| 関数数 | 4（decompose2, decompose3, decompose5, decomposePriceMix） |
| maturity | **authoritative** ✅（2026-04-05 昇格） |
| compare | 不要（authoritative 昇格済み。dual-run compare 削除） |
| Rust crate | `wasm/factor-decomposition/` — cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| observer | FnName 削除済み（authoritative のため観測不要） |
| observation test | 18 テスト pass — 不変条件テストとして維持 |
| invariant tests | decomposition sum identity（effects 合計 = delta） |
| cross-validation | TS golden fixture との一致確認済み |
| edge cases | ゼロ / 負値 / NaN / 大値カバー済み |

**Blocker:** なし。全条件クリア済み。

**次の一手:** wasm-only trial を実行し、TS フォールバックを一時停止して実環境で検証する。

---

### grossProfit

| 項目 | 状態 |
|---|---|
| 関数数 | 8 |
| maturity | **promotion-candidate** ✅ |
| compare | 実装済み。bridge test 通過 |
| Rust crate | `wasm/gross-profit/` — cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| observer | FnName 8 件登録済み。DevTools アクセス可 |
| observation test | 16 テスト pass（2026-03-29 確認） |
| invariant tests | GP-INV-1〜12（COGS 等式、粗利等式、null 伝播等） |
| cross-validation | TS golden fixture との一致確認済み |
| edge cases | ゼロ / 負値 / NaN / 大値カバー済み |

**Blocker:** なし。全条件クリア済み。

**次の一手:** wasm-only trial を実行。invMethod / estMethod の null 在庫パターンに特に注意。

---

### budgetAnalysis

| 項目 | 状態 |
|---|---|
| 関数数 | 2（calculateBudgetAnalysis, calculateGrossProfitBudget） |
| maturity | **authoritative** ✅（2026-04-05 昇格） |
| compare | 不要（authoritative 昇格済み。dual-run compare 削除） |
| Rust crate | `wasm/budget-analysis/` — cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| observer | FnName 削除済み（authoritative のため観測不要） |
| observation test | 12 テスト pass — 不変条件テストとして維持 |
| invariant tests | B-INV-1〜5（残予算、進捗率、累計単調性等） |
| cross-validation | TS golden fixture との一致確認済み |
| edge cases | ゼロ予算 / ゼロ売上 / 月末境界カバー済み |
| 類型 | B — scalar は WASM authoritative、dailyCumulative は TS 補完 |

**Blocker:** なし。全条件クリア済み。

**注意:** `calculateAggregateBudget` は compare 対象外。

**次の一手:** wasm-only trial を実行。

---

### forecast

| 項目 | 状態 |
|---|---|
| 関数数 | 5 pure（Date 非依存）+ 5 Date 依存（compare 対象外） |
| maturity | **authoritative** ✅（2026-04-05 昇格） |
| compare | 不要（authoritative 昇格済み。dual-run compare 削除） |
| Rust crate | `wasm/forecast/` — cargo test 全通過（77 テスト） |
| WASM | wasm-pack build 済み。forecastBridge.ts + forecastWasm.ts 接続済み |
| observer | FnName 削除済み（authoritative のため観測不要） |
| observation test | 21 テスト pass — 不変条件テストとして維持 |
| invariant tests | F-INV-1〜13 + F-BIZ-1〜4（TS）、F-INV-1/2/3/8/10/12/13 + finiteness（Rust） |
| cross-validation | TS golden fixture との一致確認済み |
| edge cases | 空入力 / 単一値 / 極値 / 負値 / 未ソート入力カバー済み |
| 類型 | B — pure 5 は WASM authoritative、Date-dependent 5 は TS 直接委譲 |

**Blocker:** なし。全条件クリア済み。

**次の一手:** wasm-only trial を実行。

---

### timeSlot（第 5 engine）

| 項目 | 状態 |
|---|---|
| 関数数 | 2（findCoreTime, findTurnaroundHour） |
| maturity | **authoritative** ✅（2026-04-05 昇格） |
| compare | 不要（authoritative 昇格済み。dual-run compare 削除） |
| Rust crate | `wasm/time-slot/` — 実装済み |
| WASM | wasm-pack build 済み。timeSlotWasm.ts 接続済み |
| bridge | timeSlotBridge.ts — WASM authoritative + TS fallback（174→36 行） |
| observer | 退役（dualRunObserver.ts 全体が退役済み） |
| observation test | 25 テスト pass — 不変条件テストとして維持 |

**次の一手:**
1. compare 計画策定（compare plan 文書作成）
2. timeSlotObservation.test.ts を作成
3. 観測ログ蓄積 → promotion-candidate 判定

---

## 昇格ロードマップ

```
現在                                            目標
────────────────────────────────────────────────────

factorDecomposition  [authoritative] ✅  ← 完了（2026-04-05）
grossProfit          [authoritative] ✅  ← 完了（2026-04-05）
budgetAnalysis       [authoritative] ✅  ← 完了（2026-04-05）
forecast             [authoritative] ✅  ← 完了（2026-04-05）
timeSlot             [authoritative] ✅  ← 完了（2026-04-05）
```

### 優先順序の推奨

1. **factorDecomposition** — 最も関数数が少なく（4）、最初に実証済みのため最もリスクが低い
2. **budgetAnalysis** — 関数数が少ない（2）。scalar のみで null sentinel も限定的
3. **forecast** — 関数数 5。Date 非依存の純粋統計関数のみが対象
4. **grossProfit** — 関数数が最多（8）。null sentinel パターンあり。慎重に
5. **timeSlot** — compare 計画から開始が必要

---

## 更新ルール

- engine の状態が変わったら本文書を更新する
- blocker が解消されたら「次の一手」を更新する
- wasm-only trial の結果は trial 日・期間・verdict を記録する
- authoritative 昇格時は日付・TS fallback 削除の commit hash を記録する
