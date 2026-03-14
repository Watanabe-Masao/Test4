# factorDecomposition Engine

## Purpose

シャープリー値に基づく売上要因分解。客数効果・点数効果・単価効果・構成比効果を算出する。

## Current Maturity: observation-ready

| 項目 | 状態 |
|---|---|
| 関数数 | 4（decompose2, decompose3, decompose5, decomposePriceMix） |
| Compare | 実装済み（bridge test 通過） |
| Rust crate | `wasm/factor-decomposition/` — cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| Observer | FnName 4 件登録済み |
| Invariant tests | decomposition sum identity（effects 合計 = sales delta） |

## Authoritative Candidate: Yes

全 4 関数が pure + authoritative。シャープリー恒等式が数学的不変条件。

## Next Actions

- 自動観測ハーネスで pass を確認
- promotion-candidate への昇格判定

## Related Docs

- `observation-status.md` — 観測ログ
- `../../03-guides/compare-conventions.md` — compare 共通規約
- `../../02-status/engine-promotion-matrix.md` — 昇格状況
