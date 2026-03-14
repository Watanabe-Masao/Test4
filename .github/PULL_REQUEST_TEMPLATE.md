## 概要

<!-- 変更の目的と概要を記載 -->

## 変更種別

- [ ] feat: 新機能
- [ ] fix: バグ修正
- [ ] refactor: リファクタリング
- [ ] docs: ドキュメント
- [ ] test: テスト
- [ ] chore: ビルド・CI・依存関係

## 影響レイヤー

- [ ] Domain（計算ロジック）
- [ ] Application（hooks / stores / usecases）
- [ ] Infrastructure（DuckDB / storage / import）
- [ ] Presentation（components / pages）

## CI チェック

- [ ] `npm run lint` — エラー 0
- [ ] `npm run format:check` — 準拠
- [ ] `npm run build` — 型エラー 0
- [ ] `npm run build-storybook` — ストーリー健全
- [ ] `npx vitest run --coverage` — lines 55% 以上
- [ ] `npm run test:e2e` — 全シナリオ通過

## KPI 追加の場合（該当時のみ）

> 詳細: [references/extension-playbook.md](../references/03-guides/extension-playbook.md) セクション A

- [ ] `domain/calculations/` に計算関数を追加
- [ ] MetricId / MetricMeta を登録
- [ ] Explanation（L1/L2/L3）を実装
- [ ] `references/03-guides/metric-id-registry.md` を更新
- [ ] 不変条件テストを追加

## DuckDB クエリ追加の場合（該当時のみ）

> 詳細: [references/extension-playbook.md](../references/03-guides/extension-playbook.md) セクション B

- [ ] `references/01-principles/engine-responsibility.md` で責務重複がないことを確認
- [ ] SQL / Runner を実装
- [ ] チャートコンポーネントを追加
- [ ] パフォーマンス計測を実施

## 禁止事項の確認

- [ ] コンパイラ警告を `_` や `eslint-disable` で黙らせていない
- [ ] 引数を無視して別ソースから再計算していない
- [ ] useMemo/useCallback の依存配列から参照値を省いていない
- [ ] domain/ に外部依存・副作用を持ち込んでいない
- [ ] UI が生データソースを直接参照していない
