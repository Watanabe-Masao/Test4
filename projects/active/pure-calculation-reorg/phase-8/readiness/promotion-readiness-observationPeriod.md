# Promotion-Ready 判定表 — observationPeriod (CAND-BIZ-010)

> Phase 5 Step 8: promotion-ready 判定。**まだ current に編入しない**（Phase 8 の Promote Ceremony を経る）。

## 候補情報

| 項目 | 値 |
|------|-----|
| Candidate ID | CAND-BIZ-010 |
| Contract ID | BIZ-010 |
| ファイル | observationPeriod.ts |
| semanticClass | business |
| authorityKind | candidate-authoritative |
| methodFamily | data_quality |
| WASM Crate | wasm/observation-period/ |
| Bridge | app/src/application/services/observationPeriodBridge.ts |
| 不変条件 | INV-OP-01〜06 |
| FFI 特記 | flat contract (dailySales 1列)。status を数値エンコード、warnings をビットフラグ化 |

## 判定基準チェックリスト

| 条件 | 検証方法 | 状態 |
|------|---------|------|
| Business Contract 定義済み | registry に contractId=BIZ-010 あり | ✅ |
| businessMeaning 記載済み | reason に業務意味あり | ✅ |
| Rust/WASM 実装追加済み | wasm/observation-period/ (29 Rust tests) | ✅ |
| テスト 3 ファイル構成 | cross_validation + edge_cases + invariants | ✅ |
| 数学的不変条件登録済み | invariant-catalog.md INV-OP-01〜06 | ✅ |
| TS adapter 実装済み | normalizeObservationPeriodInput() | ✅ |
| Bridge モード切替実装済み | 4 モード + rollback | ✅ |
| Dual-run compare テスト実装済み | 6 TS tests | ✅ |
| Guard 全通過 | 54 files / 482 tests PASS | ✅ |

## 判定

**ステータス: 構造基盤完了、実 WASM 検証待ち**
