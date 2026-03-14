# budgetAnalysis Engine

## Purpose

予算達成率・粗利予算分析。日販平均、残予算、月末見込等の確定 KPI を算出する。

## Current Maturity: observation-ready

| 項目 | 状態 |
|---|---|
| 関数数 | 2（calculateBudgetAnalysis, calculateGrossProfitBudget） |
| Compare | 実装済み（bridge test 通過） |
| Rust crate | `wasm/budget-analysis/` — cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| Observer | FnName 2 件登録済み |
| Invariant tests | B-INV-1〜5（projected >= 0、null → 0、days 整合性） |

## Authoritative Candidate: Yes

両関数とも pure + authoritative。入力は number / number|null のみで FFI 障壁ゼロ。
4 engine 中で最も移行容易（~120 行、変換不要）。

## Next Actions

- 自動観測ハーネスで pass を確認
- promotion-candidate への昇格判定

## Related Docs

- `rust-contract.md` — FFI 境界仕様
- `compare-plan.md` — dual-run compare 計画
- `test-strategy.md` — テスト資産・不変条件
- `ts-responsibility-map.md` — TS 側責務マップ
