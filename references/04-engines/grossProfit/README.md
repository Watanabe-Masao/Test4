# grossProfit Engine

## Purpose

在庫法・推定法による粗利計算。売変率、値入率、移動合計、在庫原価を含む 8 関数群。
システムの中核計算であり、全 KPI の基礎。

## Current Maturity: observation-ready

| 項目 | 状態 |
|---|---|
| 関数数 | 8（calculateInvMethod, calculateEstMethod, calculateCoreSales, calculateDiscountRate, calculateDiscountImpact, calculateMarkupRates, calculateTransferTotals, calculateInventoryCost） |
| Compare | 実装済み（bridge test 通過） |
| Rust crate | `wasm/gross-profit/` — cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| Observer | FnName 8 件登録済み |
| Invariant tests | GP-INV-1〜12（COGS 等式、粗利等式、null 伝播等） |

## Authoritative Candidate: Yes

全 8 関数が pure + authoritative。入力は number / number|null のみで FFI 障壁ゼロ。

## Module Structure

| ファイル | 公開関数 | FFI 評価 |
|---|---|---|
| `invMethod.ts` | `calculateInvMethod` | A（変換不要） |
| `estMethod.ts` | `calculateEstMethod`, `calculateCoreSales`, `calculateDiscountRate` | A |
| `discountImpact.ts` | `calculateDiscountImpact` | A |
| `markupRate.ts` | `calculateMarkupRates` | A |
| `costAggregation.ts` | `calculateTransferTotals`, `calculateInventoryCost` | A |

## Next Actions

- 自動観測ハーネスで pass を確認
- promotion-candidate への昇格判定

## Related Docs

- `rust-contract.md` — FFI 境界仕様
- `compare-plan.md` — dual-run compare 計画
- `test-strategy.md` — テスト資産・不変条件
- `ts-responsibility-map.md` — TS 側責務マップ
