# Promotion-Ready 判定表 — correlation (CAND-ANA-005)

> Phase 6 Step 9: promotion-ready 判定。**まだ current に編入しない**。

| 項目 | 値 |
|------|-----|
| Candidate ID | CAND-ANA-005 |
| Contract ID | ANA-005 |
| semanticClass | analytic |
| methodFamily | statistical |
| WASM Crate | wasm/correlation/ |
| Bridge | correlationBridge.ts |
| 不変条件 | INV-CORR-01〜07 |
| Rust tests | 29 |
| 特記 | correlationMatrix は string FFI のため candidate 対象外 |

**ステータス: 構造基盤完了、実 WASM 検証待ち**
