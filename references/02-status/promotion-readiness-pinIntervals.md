# Promotion-Ready 判定表 — pinIntervals (CAND-BIZ-011)

> Phase 5 Step 8: promotion-ready 判定。**まだ current に編入しない**（Phase 8 の Promote Ceremony を経る）。

## 候補情報

| 項目 | 値 |
|------|-----|
| Candidate ID | CAND-BIZ-011 |
| Contract ID | BIZ-011 |
| ファイル | pinIntervals.ts |
| semanticClass | business |
| authorityKind | candidate-authoritative |
| methodFamily | accounting |
| WASM Crate | wasm/pin-intervals/ |
| Bridge | app/src/application/services/pinIntervalsBridge.ts |
| 不変条件 | INV-PIN-01〜07 |
| FFI 特記 | flat contract (dailySales + dailyTotalCost 2列 + pinDays/pinClosingInventory 列分離) |

## 判定基準チェックリスト

| 条件 | 検証方法 | 状態 |
|------|---------|------|
| Business Contract 定義済み | registry に contractId=BIZ-011 あり | ✅ |
| businessMeaning 記載済み | reason に業務意味あり | ✅ |
| Rust/WASM 実装追加済み | wasm/pin-intervals/ (24 Rust tests) | ✅ |
| テスト 3 ファイル構成 | cross_validation + edge_cases + invariants | ✅ |
| 数学的不変条件登録済み | invariant-catalog.md INV-PIN-01〜07 | ✅ |
| pins 列分離 | pinDays: Int32Array + pinClosingInventory: Float64Array | ✅ |
| TS adapter 実装済み | normalizePinIntervalsInput() + normalizePins() | ✅ |
| Bridge モード切替実装済み | 4 モード + rollback | ✅ |
| Dual-run compare テスト実装済み | 5 TS tests | ✅ |
| Guard 全通過 | 54 files / 482 tests PASS | ✅ |

## 判定

**ステータス: 構造基盤完了、実 WASM 検証待ち**
