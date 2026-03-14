# Engine Promotion Matrix — 昇格状況一覧

## 目的

4 engine の現在地・blocker・次条件を一目で把握できるようにする。
`engine-maturity-matrix.md` がステージ定義を、本文書が各 engine の個別状況を管理する。

---

## 一覧表（Phase 11 時点）

| Engine | Current State | Compare | Rust | WASM | Observation | Blocker | Next Action | Risk | Rollback Ready |
|---|---|---|---|---|---|---|---|---|---|
| factorDecomposition | observation-ready | ✅ | ✅ | ✅ | 未実施 | 観測量不足 | 観測ログ蓄積 | Low | ✅ |
| grossProfit | observation-ready | ✅ | ✅ | ✅ | 未実施 | 観測量不足 | 観測ログ蓄積 | Low | ✅ |
| budgetAnalysis | observation-ready | ✅ | ✅ | ✅ | 未実施 | 観測量不足 | 観測ログ蓄積 | Low | ✅ |
| forecast | compare-implemented | ✅ | ❌ | ❌ | 未実施 | Rust 未実装 | Rust crate 作成 | Medium | ✅（TS stub） |

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

**Blocker:** 観測量不足。dual-run-compare モードでの実利用による観測ログが蓄積されていない。

**次の一手:** dev 環境で dual-run-compare モードを有効にし、通常の開発利用を通じて観測ログを蓄積する。`__dualRunStats()` で verdict を定期確認する。

**promotion-candidate までに必要なこと:**
- 主要分解経路（2/3/5 要因 + priceMix）を各 1 回以上観測
- 複数セッションで verdict が `clean` or `tolerance-only` を確認
- null-mismatch / invariant-violation がゼロであることを確認

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

**Blocker:** 観測量不足。dual-run-compare モードでの実利用による観測ログが蓄積されていない。

**次の一手:** dev 環境で dual-run-compare モードを有効にし、grossProfit に関連する画面操作（在庫法・推定法の粗利表示）を通じて観測ログを蓄積する。

**promotion-candidate までに必要なこと:**
- 8 関数の主要経路を各 1 回以上観測（特に invMethod / estMethod の null 在庫パターン）
- 複数セッションで verdict 確認
- null-mismatch / invariant-violation がゼロであることを確認

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

**Blocker:** 観測量不足。dual-run-compare モードでの実利用による観測ログが蓄積されていない。

**次の一手:** dev 環境で dual-run-compare モードを有効にし、予算分析画面を通じて観測ログを蓄積する。

**promotion-candidate までに必要なこと:**
- 2 関数の主要パターン（通常 / ゼロ予算 / 月途中 / 月末）を観測
- 複数セッションで verdict 確認
- null-mismatch / invariant-violation がゼロであることを確認

---

### forecast

| 項目 | 状態 |
|---|---|
| 関数数 | 5 pure（Date 非依存）+ 5 Date 依存（compare 対象外） |
| maturity | compare-implemented |
| compare | 実装済み（TS stub 同士の比較）。bridge test 通過 |
| Rust crate | **未実装** |
| WASM | **未実装** |
| observer | FnName 5 件登録済み。DevTools アクセス可 |
| invariant tests | F-INV-1〜13 + F-BIZ-1〜4 |
| cross-validation | 未実施（Rust 未実装のため） |
| edge cases | 未実施（Rust 未実装のため） |

**Blocker:** Rust crate が未実装。現在の compare は TS stub 同士の比較であり、実質的な観測にならない。

**次の一手:** forecast 用 Rust crate を作成し、5 pure 関数（calculateStdDev, detectAnomalies, calculateWMA, linearRegression, analyzeTrend）を実装する。

**promotion-candidate までに必要なこと:**
1. Rust crate 作成 + cargo test 通過
2. wasm-pack build + adapter 接続
3. observation-ready 到達
4. 観測ログ蓄積
5. verdict 確認

**Risk:** Medium — ReadonlyMap 入力の変換（sorted `[key, value][]`）が forecast 固有の複雑さ。`forecast-compare-readiness.md` に変換戦略を記載済み。

---

## 昇格ロードマップ

```
現在                                            目標
────────────────────────────────────────────────────

factorDecomposition  [observation-ready]  →  promotion-candidate  →  wasm-only trial  →  authoritative
grossProfit          [observation-ready]  →  promotion-candidate  →  wasm-only trial  →  authoritative
budgetAnalysis       [observation-ready]  →  promotion-candidate  →  wasm-only trial  →  authoritative
forecast             [compare-implemented]  →  rust-impl → wasm → obs-ready → promo-candidate → ...
```

### 優先順序の推奨

1. **factorDecomposition** — 最も関数数が少なく（4）、最初に実証済みのため最もリスクが低い
2. **budgetAnalysis** — 関数数が少ない（2）。scalar のみで null sentinel も限定的
3. **grossProfit** — 関数数が最多（8）。null sentinel パターンあり。慎重に
4. **forecast** — Rust 未実装のため最後。Date 非依存の 5 関数のみが対象

---

## 更新ルール

- engine の状態が変わったら本文書を更新する
- blocker が解消されたら「次の一手」を更新する
- promotion-candidate に到達したら該当セクションに判定日と verdict を記録する
