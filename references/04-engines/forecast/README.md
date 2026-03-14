# forecast Engine

## Purpose

売上予測・統計分析。標準偏差、異常値検出、加重移動平均、線形回帰、トレンド分析を提供する。

## Current Maturity: compare-implemented → rust-implemented (進行中)

| 項目 | 状態 |
|---|---|
| 関数数 | 11（うち compare 対象 5、Date 依存 6） |
| Compare | 実装済み（Date 非依存 5 関数のみ） |
| Rust crate | `wasm/forecast/` — 実装完了、cargo test 全通過 |
| WASM | wasm-pack build 済み。wasmEngine.ts 接続済み |
| Observer | FnName 登録済み |
| Invariant tests | F-INV-1〜13 + F-BIZ-1〜4 |

## Compare 対象/対象外

| 関数 | Compare | Date 依存 | 分類 |
|---|---|---|---|
| `calculateStdDev` | 対象 | なし | Pure Utility |
| `detectAnomalies` | 対象 | なし | Pure Analytics |
| `calculateWMA` | 対象 | なし | Pure Analytics |
| `linearRegression` | 対象 | なし | Pure Analytics |
| `analyzeTrend` | 対象 | なし | Pure Analytics |
| `getWeekRanges` | 対象外 | あり | TS に残す |
| `calculateDayOfWeekAverages` | 対象外 | あり | TS に残す |
| `calculateWeeklySummaries` | 対象外 | あり | TS に残す |
| `projectDowAdjusted` | 対象外 | あり | TS に残す |
| `calculateMonthEndProjection` | 対象外 | あり | TS に残す |
| `calculateForecast` | 対象外 | あり（内部 2/3 が Date 依存） | TS に残す |

## Next Actions

- WASM ビルド + npm install 確認
- 自動観測ハーネスで compare 対象 5 関数の pass を確認
- observation-ready への昇格

## Related Docs

- `rust-contract.md` — FFI 境界仕様（Float64Array packing）
- `compare-plan.md` — dual-run compare 計画
- `test-strategy.md` — テスト資産・不変条件
- `ts-responsibility-map.md` — TS 側責務マップ
