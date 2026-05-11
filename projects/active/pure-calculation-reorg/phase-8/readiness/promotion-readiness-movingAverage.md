# Promotion-Ready 判定表 — computeMovingAverage (CAND-ANA-009)

> Phase 6 Step 9: promotion-ready 判定。**まだ current に編入しない**。

| 項目 | 値 |
|------|-----|
| Candidate ID | CAND-ANA-009 |
| Contract ID | ANA-009 |
| semanticClass | analytic |
| methodFamily | time_series |
| WASM Crate | wasm/moving-average/ |
| Bridge | movingAverageBridge.ts |
| 不変条件 | INV-MA-01〜06 |
| Rust tests | 19 |
| FFI 特記 | nullable value + enum status の flat contract |

**ステータス: 構造基盤完了、実 WASM 検証待ち**
