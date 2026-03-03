# 課題管理

> 管理責任: documentation-steward ロール。
> 更新日: 2026-03

課題を3分類し、不要なアクセスを最小化する。

---

## 1. 現在の課題（対応が必要）

| # | 課題 | 影響範囲 | 対応ロール |
|---|---|---|---|
| C-1 | Storybook の開発プロセス位置づけ未定義（CI 必須/任意、カバー範囲） | presentation | architecture |
| C-2 | P2 コンポーネントの Storybook 未カバー（DataTable, DayRangeSlider 等5つ） | presentation | implementation |
| C-3 | CTS → DuckDB 統一が未完了（CategoryHierarchyExplorer, CategoryPerformanceChart） | application, presentation | duckdb-specialist |

## 2. 将来のリスク（いま壊れていないが放置すると問題になる）

| # | リスク | なぜ問題になるか | 対応ロール |
|---|---|---|---|
| R-1 | PWA オフライン戦略が未設計 | IndexedDB + DuckDB のデータ整合性が保証されない | architecture |
| R-2 | DevTools の本番ビルド除外方針が未定義 | バンドルサイズ肥大化・ユーザーへの情報漏洩 | architecture |
| R-3 | documentConsistency.test.ts のカバー範囲が限定的 | ドキュメント乖離が検出されない領域が存在する | invariant-guardian |

## 3. 解決済みの課題（アーカイブ）

> 以下は対応完了済み。参考情報として残す。

| # | 課題 | 解決日 | 対応内容 |
|---|---|---|---|
| S-1 | WidgetContext からの生データ除去 | 2026-03 | `categoryTimeSales` を `ctsIndex` に置換完了 |
| S-2 | バレルエクスポート不整合 | 2026-03 | `factorDecomposition`, `causalChain` 等をバレルに追加 |
| S-3 | 純粋関数の重複定義 | 2026-03 | `divisor.ts` に統一、`periodFilterUtils.ts` を re-export 化 |
