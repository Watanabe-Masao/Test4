# Promotion-Ready 判定表 — remainingBudgetRate (CAND-BIZ-008)

> Phase 5 Step 8: promotion-ready 判定。**まだ current に編入しない**（Phase 8 の Promote Ceremony を経る）。

## 候補情報

| 項目 | 値 |
|------|-----|
| Candidate ID | CAND-BIZ-008 |
| Contract ID | BIZ-008 |
| ファイル | remainingBudgetRate.ts |
| semanticClass | business |
| authorityKind | candidate-authoritative |
| methodFamily | budget |
| WASM Crate | wasm/remaining-budget-rate/ |
| Bridge | app/src/application/services/remainingBudgetRateBridge.ts |
| 不変条件 | INV-RBR-01〜05 |
| FFI 特記 | Map→Float64Array 変換を TS adapter で実施 |

## 判定基準チェックリスト

| 条件 | 検証方法 | 状態 |
|------|---------|------|
| Business Contract 定義済み | registry に contractId=BIZ-008 あり | ✅ |
| businessMeaning 記載済み | reason に業務意味あり | ✅ |
| Rust/WASM 実装追加済み | wasm/remaining-budget-rate/ (29 Rust tests) | ✅ |
| テスト 3 ファイル構成 | cross_validation + edge_cases + invariants | ✅ |
| 数学的不変条件登録済み | invariant-catalog.md INV-RBR-01〜05 | ✅ |
| PERCENT_MULTIPLIER 定数化 | ハードコード回避済み | ✅ |
| Bridge モード切替実装済み | 4 モード + rollback | ✅ |
| Dual-run compare テスト実装済み | 5 TS tests | ✅ |
| Guard 全通過 | 54 files / 482 tests PASS | ✅ |

## 判定

**ステータス: 構造基盤完了、実 WASM 検証待ち**
