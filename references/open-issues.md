# 課題管理

> 管理責任: documentation-steward ロール。
> 更新日: 2026-03-08

課題を3分類し、不要なアクセスを最小化する。

---

## 1. 現在の課題（対応が必要）

なし（全件解決済み）

## 2. 将来のリスク（いま壊れていないが放置すると問題になる）

| # | リスク | 優先度 | 詳細 |
|---|---|---|---|
| R-1 | Application→Infrastructure 直接 import（ポート抽象不足） | Medium | DuckDB・Storage への直接 import が 10+ ファイル。`ExportPort` のみポート化済み |
| R-4 | God コンポーネント（300行超）10 ファイル | Low | DashboardPage(547行), DailyPage(595行), DuckDBTimeSlotChart(651行) 等。段階的な分離が必要 |
| R-5 | DashboardPage.styles.ts（1,272行） | Low | 7つのスタイル関心事が 1 ファイルに集約 |
| R-6 | ImportService.ts（736行） | Low | 5つの関心事が混在。オーケストレーション・処理・正規化に分割検討 |

## 3. 解決済みの課題（アーカイブ）

> 以下は対応完了済み。参考情報として残す。

| # | 課題 | 解決日 | 対応内容 |
|---|---|---|---|
| S-1 | WidgetContext からの生データ除去 | 2026-03 | `categoryTimeSales` を `ctsIndex` に置換完了 |
| S-2 | バレルエクスポート不整合 | 2026-03 | `factorDecomposition`, `causalChain` 等をバレルに追加 |
| S-3 | 純粋関数の重複定義 | 2026-03 | `divisor.ts` に統一、`periodFilterUtils.ts` を re-export 化 |
| S-4 | engine-responsibility.md の責務マトリクスが不完全 | 2026-03 | 未記載の JS 計算モジュール5件を追加、両エンジン共存概念の区別表を追加 |
| S-5 | CTS → DuckDB 統一が一部未完了 | 2026-03 | CategoryHierarchyExplorer, CategoryPerformanceChart を DuckDB 専用に変換済み（commit d3f0e0d）。ただし `application/usecases/categoryTimeSales/` は存続中（useCtsQueries.ts 経由で利用） |
| S-6 | PWA オフライン戦略が未設計 | 2026-03 | sw.js（3層キャッシュ戦略）+ IndexedDB 永続化 + registerSW.ts で実装済み |
| S-7 | DevTools の本番ビルド除外方針が未定義 | 2026-03 | QueryProfilePanel が `import.meta.env.DEV` ガードで本番除外済み。architectureGuard 許可リストに登録 |
| S-8 | documentConsistency.test.ts のカバー範囲が限定的 | 2026-03 | 不変条件カタログ↔ガードテスト相互参照、エンジン責務↔実コード、CLAUDE.md 参照パス、連携プロトコル相互参照の4検証を追加（5→12テスト） |
| S-9 | Storybook の CI 位置づけ未定義 | 2026-03 | `build-storybook` を CI 第4ステップに追加、5段階→6段階ゲートに更新 |
| S-10 | Import/Modal 系8コンポーネントの Storybook 未カバー | 2026-03 | FileDropZone, UploadCard, ImportProgressBar, ImportWizard, ValidationModal, DiffConfirmModal, RestoreDataModal, SettingsModal の全8ストーリーを作成 |
| S-11 | fileParseWorker.ts が未使用 | 2026-03-07 | ファイル削除済み。architectureGuard.test.ts の allowlist からも除去済み |
| S-12 | conditionResolver.ts のテスト未作成 | 2026-03-07 | `domain/calculations/__tests__/conditionResolver.test.ts` 作成済み |
| S-13 | ESLint が storybook-static/ を lint 対象にしていた | 2026-03-07 | `eslint.config.js` の `globalIgnores` に `storybook-static` を追加 |
| S-14 | ChartAnnotation.tsx の react-hooks/refs エラー | 2026-03-07 | floating-ui の `elements` パターンに変更し `refs` のレンダー中アクセスを回避 |
| S-15 | hash.ts の配置ミス（Infrastructure→Application 逆依存） | 2026-03-08 | `application/services/hash.ts`（re-export）を削除。全 import を `@/domain/utilities/hash` に統一 |
| S-16 | MetricId レジストリの数値不整合 | 2026-03-08 | コード上の MetricId は 50 件。CLAUDE.md・metric-id-registry.md・implementation-plan の誤記（81件）を修正 |
| S-17 | CSV ロジック二重実装 | 2026-03-08 | `domain/utilities/csv.ts` に一元化。`csvExporter.ts` は re-export、`reportExportWorker.ts` は直接 import に変更。重複コード削除 |
| S-18 | サイレントエラー握り潰し | 2026-03-08 | `IndexedDBStore.test.ts` の空 `.catch(() => {})` に `console.warn` を追加。他34箇所は適切にハンドリング済みを確認 |
| S-19 | api.md の Hook 構成が古い | 2026-03-08 | api.md セクション4は既に12ファイル分割構成を正しく記載。`useDuckDBQuery.ts` の後方互換 re-export も記載済み |
