# 課題管理

> 管理責任: documentation-steward ロール。
> 更新日: 2026-03

課題を3分類し、不要なアクセスを最小化する。

---

## 1. 現在の課題（対応が必要）

| # | 課題 | 影響範囲 | 対応ロール |
|---|---|---|---|
| C-1 | Storybook の CI 位置づけ未定義（`build-storybook` を CI に含めるか任意か） | presentation | architecture |
| C-2 | Import 系4件 + Modal 系4件の Storybook 未カバー（FileDropZone, UploadCard, ImportProgressBar, ImportWizard, ValidationModal, DiffConfirmModal, RestoreDataModal, SettingsModal） | presentation | implementation |

## 2. 将来のリスク（いま壊れていないが放置すると問題になる）

（現在なし）

## 3. 解決済みの課題（アーカイブ）

> 以下は対応完了済み。参考情報として残す。

| # | 課題 | 解決日 | 対応内容 |
|---|---|---|---|
| S-1 | WidgetContext からの生データ除去 | 2026-03 | `categoryTimeSales` を `ctsIndex` に置換完了 |
| S-2 | バレルエクスポート不整合 | 2026-03 | `factorDecomposition`, `causalChain` 等をバレルに追加 |
| S-3 | 純粋関数の重複定義 | 2026-03 | `divisor.ts` に統一、`periodFilterUtils.ts` を re-export 化 |
| S-4 | engine-responsibility.md の責務マトリクスが不完全 | 2026-03 | 未記載の JS 計算モジュール5件を追加、両エンジン共存概念の区別表を追加 |
| S-5 | CTS → DuckDB 統一が未完了 | 2026-03 | CategoryHierarchyExplorer, CategoryPerformanceChart を DuckDB 専用に変換済み（commit d3f0e0d） |
| S-6 | PWA オフライン戦略が未設計 | 2026-03 | sw.js（3層キャッシュ戦略）+ IndexedDB 永続化 + registerSW.ts で実装済み |
| S-7 | DevTools の本番ビルド除外方針が未定義 | 2026-03 | QueryProfilePanel が `import.meta.env.DEV` ガードで本番除外済み。architectureGuard 許可リストに登録 |
| S-8 | documentConsistency.test.ts のカバー範囲が限定的 | 2026-03 | 不変条件カタログ↔ガードテスト相互参照、エンジン責務↔実コード、CLAUDE.md 参照パス、連携プロトコル相互参照の4検証を追加（5→12テスト） |
