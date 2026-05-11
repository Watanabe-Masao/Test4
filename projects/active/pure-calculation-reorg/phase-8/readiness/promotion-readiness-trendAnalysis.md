# Promotion-Ready 判定表 — trendAnalysis (CAND-ANA-004)

> Phase 6 Step 9: promotion-ready 判定。**まだ current に編入しない**。

| 項目 | 値 |
|------|-----|
| Candidate ID | CAND-ANA-004 |
| Contract ID | ANA-004 |
| semanticClass | analytic |
| methodFamily | temporal_pattern |
| WASM Crate | wasm/trend-analysis/ |
| Bridge | trendAnalysisBridge.ts |
| 不変条件 | INV-TREND-01〜06 |
| Rust tests | 18 |
| FFI 特記 | years+months+totalSales 3列 flat contract。dataPoints パススルーは TS 側 |

**ステータス: 構造基盤完了、実 WASM 検証待ち**
