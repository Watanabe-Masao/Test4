# 課題管理

> 管理責任: documentation-steward ロール。
> 更新日: 2026-03-07

課題を3分類し、不要なアクセスを最小化する。

---

## 1. 現在の課題（対応が必要）

| # | 課題 | 優先度 | 詳細 |
|---|---|---|---|
| C-1 | hash.ts の配置ミス（Infrastructure→Application 逆依存） | High | `application/services/hash.ts` が infrastructure から import されており層間依存違反。`domain/utilities/hash.ts` へ移動が必要 |
| C-2 | MetricId レジストリの数値不整合 | High | コード上 81 MetricId が定義済みだが `metric-id-registry.md` は 50、`implementation-plan-constants-metrics.md` は 41 と記載。実態に合わせて更新が必要 |
| C-3 | CSV ロジック二重実装 | Medium | `csvExporter.ts:toCsvString()` と `reportExportWorker.ts:toCsvStringInWorker()` が同一ロジック。Worker 制約上やむを得ないがパリティテストが未作成 |
| C-4 | サイレントエラー握り潰し（8箇所以上） | Medium | `.catch(() => {})` パターンでエラーが完全に無視されている。最低限 `console.warn` を追加すべき |
| C-5 | api.md の Hook 構成が古い | Medium | api.md は単一ファイル `useDuckDBQuery.ts` を記載するが、実際は `application/hooks/duckdb/` に 12 ファイルに分割済み |

## 2. 将来のリスク（いま壊れていないが放置すると問題になる）

| # | リスク | 優先度 | 詳細 |
|---|---|---|---|
| R-1 | Application→Infrastructure 直接 import（ポート抽象不足） | Medium | DuckDB・Storage への直接 import が 10+ ファイル。`ExportPort` のみポート化済み |
| R-2 | Presentation 層内のデータ集計フック | Medium | `useCategoryExplorerData.ts`, `useDailySalesData.ts`, `useTimeSlotData.ts` が presentation/ に配置されているが純粋なデータ変換であり application/ に属すべき |
| R-3 | DailyPage.tsx 内のデータ集計関数 | Medium | `collectSupplierKeys()`, `collectTransferKeys()`, `cumulativeData` useMemo が UI 層に直接定義されている（禁止事項 #6/#7 違反） |
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
