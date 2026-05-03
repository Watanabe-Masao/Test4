# Promotion-Ready 判定表 — dowGapAnalysis (CAND-ANA-007)

> Phase 6 Step 9: promotion-ready 判定。**まだ current に編入しない**。

| 項目 | 値 |
|------|-----|
| Candidate ID | CAND-ANA-007 |
| Contract ID | ANA-007 |
| semanticClass | analytic |
| methodFamily | calendar_effect |
| WASM Crate | wasm/dow-gap/ |
| Bridge | dowGapBridge.ts |
| 不変条件 | INV-DG-01〜06 |
| Rust tests | 18 |
| FFI 特記 | countDowsInMonth は TS adapter、3統計手法 (mean/median/adjustedMean)、文字列生成は TS 側 |

**ステータス: 構造基盤完了、実 WASM 検証待ち**
