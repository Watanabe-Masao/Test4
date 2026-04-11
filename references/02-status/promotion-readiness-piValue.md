# Promotion-Ready 判定表 — piValue (CAND-BIZ-012)

> Phase 5 Step 8: promotion-ready 判定。**まだ current に編入しない**（Phase 8 の Promote Ceremony を経る）。

## 候補情報

| 項目 | 値 |
|------|-----|
| Candidate ID | CAND-BIZ-012 |
| Contract ID | BIZ-012 |
| ファイル | piValue.ts |
| semanticClass | business |
| authorityKind | candidate-authoritative |
| methodFamily | retail_kpi |
| WASM Crate | wasm/pi-value/ |
| Bridge | app/src/application/services/piValueBridge.ts |

## 判定基準チェックリスト

| 条件 | 検証方法 | 状態 |
|------|---------|------|
| Business Contract 定義済み | registry に contractId=BIZ-012 あり | ✅ |
| businessMeaning 記載済み | reason に業務意味（PI値）あり | ✅ |
| Rust/WASM 実装追加済み | wasm/pi-value/ に crate あり | ✅ |
| Registry candidate エントリ追加済み | calculationCanonRegistry に candidate/piValue.ts あり | ✅ |
| Bridge モード切替実装済み | 4モード（current-only/candidate-only/dual-run-compare/fallback-to-current） | ✅ |
| wasmEngine 登録済み | WASM_CANDIDATE_MODULE_NAMES に piValue あり | ✅ |
| 型宣言追加済み | wasm.d.ts に pi-value-wasm 宣言あり | ✅ |
| vite/CI 設定更新済み | optimizeDeps/external/build:wasm/setup-wasm に追加 | ✅ |
| Dual-run compare テスト実装済み | piValueCandidateObservation.test.ts | ✅ |
| Rollback テスト実装済み | rollbackToCurrentOnly() のテスト | ✅ |
| 値一致 | dual-run compare で全フィクスチャ差分なし | ✅（mock ベース） |
| null 一致 | customers=0 → quantityPI=0, amountPI=0 の伝播一致 | ✅ |
| warning 一致 | 警告なし（純粋計算） | ✅（該当なし） |
| scope 一致 | 対象スコープの制約なし（単店舗 pure 計算） | ✅（該当なし） |
| Rollback 確認済み | candidate 失敗 → current-only に復帰可能 | ✅ |
| Direct import なし | bridge 経由のみ（bridge 未接続のため既存 direct import は維持） | ⚠️ 後続で接続 |
| Guard 全通過 | Phase 5 guard + Phase 0-4 guard | 🔲 確認中 |

## 未完了項目

1. **実 WASM バイナリでの dual-run**: 現在は mock ベース。wasm-pack build 後に実バイナリで検証が必要
2. **既存 UI の bridge 接続**: piValue.ts の direct import を piValueBridge.ts 経由に切り替え（Phase 5 実装完了後に実施）
3. **WASM 実バイナリの観測期間**: 一定期間の安定稼働を確認

## 判定

**ステータス: 構造基盤完了、実 WASM 検証待ち**

Promote Ceremony（Phase 8）に進むには、上記の未完了項目の解消が必要。
判定主体は「AAG 証拠収集 → AI 提案 → **人間承認**」（実装 AI の自己承認禁止）。
