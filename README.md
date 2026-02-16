# 粗利計算 新旧実装比較ハーネス

このリポジトリでは、以下を実施しています。

1. 代表的な仕入/売上/移動/予算データを `fixtures/representative-dataset.json` で固定化。
2. 主要出力（店舗別粗利、粗利率、日別推移、レポート値）を `snapshots/expected-output.json` に保持。
3. 旧実装（TypeScript）・新実装（TypeScript / Rust）を同一入力で実行し、許容誤差 `1e-6` で比較テスト。
4. CI で `lint + typecheck + unit + snapshot compare` を必須化。
5. 並行運用期間を定義し、差分監視ダッシュボードを `snapshots/diff-dashboard.md` に出力。

## コマンド

```bash
npm run lint
npm run typecheck
npm run generate:snapshot
npm run unit
npm run snapshot:compare
npm run dashboard
```
