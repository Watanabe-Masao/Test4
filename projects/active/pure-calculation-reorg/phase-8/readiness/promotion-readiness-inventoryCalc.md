# Promotion-Ready 判定表 — inventoryCalc (CAND-BIZ-009)

> Phase 5 Step 8: promotion-ready 判定。**まだ current に編入しない**（Phase 8 の Promote Ceremony を経る）。

## 候補情報

| 項目 | 値 |
|------|-----|
| Candidate ID | CAND-BIZ-009 |
| Contract ID | BIZ-009 |
| ファイル | inventoryCalc.ts |
| semanticClass | business |
| authorityKind | candidate-authoritative |
| methodFamily | accounting |
| WASM Crate | wasm/inventory-calc/ |
| Bridge | app/src/application/services/inventoryCalcBridge.ts |
| 不変条件 | INV-IC-01〜07 |
| FFI 特記 | 6列 flat contract。closingInventory: 契約 null → FFI NaN 分離。markupRate/discountRate: rateOwnership=engine の入力仮定 |

## 判定基準チェックリスト

| 条件 | 検証方法 | 状態 |
|------|---------|------|
| Business Contract 定義済み | registry に contractId=BIZ-009 あり | ✅ |
| businessMeaning 記載済み | reason に業務意味あり | ✅ |
| Rust/WASM 実装追加済み | wasm/inventory-calc/ (24 Rust tests) | ✅ |
| テスト 3 ファイル構成 | cross_validation + edge_cases + invariants | ✅ |
| 数学的不変条件登録済み | invariant-catalog.md INV-IC-01〜07 | ✅ |
| 6 列 flat contract adapter 実装済み | normalizeInventoryCalcInput() | ✅ |
| closingInventory null/NaN 分離 | 契約 null → FFI NaN を adapter で変換 | ✅ |
| rateOwnership 明示 | markupRate/discountRate の正本参照を契約コメントに明記 | ✅ |
| openingInventory 必須 | BIZ-009 では null 不可（BIZ-011 とは異なる） | ✅ |
| Bridge モード切替実装済み | 4 モード + rollback | ✅ |
| Dual-run compare テスト実装済み | 4 TS tests | ✅ |
| Guard 全通過 | 54 files / 482 tests PASS | ✅ |

## 判定

**ステータス: 構造基盤完了、実 WASM 検証待ち**
