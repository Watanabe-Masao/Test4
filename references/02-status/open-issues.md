# 課題管理

> 管理責任: documentation-steward ロール。
> 更新日: 2026-03-20

課題を3分類し、不要なアクセスを最小化する。

---

## 1. 現在の課題（対応が必要）

なし（全件解決済み）

## 2. 将来のリスク（いま壊れていないが放置すると問題になる）

| # | リスク | 優先度 | 詳細 |
|---|---|---|---|
| R-1 | Application→Infrastructure 直接 import（ポート抽象不足） | Medium | 調査完了（2026-03-08）: 25ファイル40箇所の直接importを特定。ExportPort パターンに倣い DuckDBPort / StoragePort拡張 / ImportPort / I18nPort の4ポートを Phase 5 で新設予定 |
| R-4 | God コンポーネント（300行超）10 ファイル | Low | .vm.ts ViewModel 抽出を10ファイルで実施済み（2026-03-08）。CvTimeSeriesChart を3ビューに分割（690→261行、Tier 2 解消）。残: TimeSlotChart（660行 Tier 2）+ チャート500行超ファイルの .vm.ts 作成は Phase 6 で継続 |
| R-6 | ~~FileImportService.ts（632行）~~ | **解決済み** | importValidation.ts 分離 + ImportOrchestrator 抽出 + multiMonthImport/singleMonthImport 分離により 632→194行に縮小。300行上限を大幅に下回り、3関心事（delegation/extraction/filter）は全てインポート業務に閉じているため追加分割は不要 |
| R-7 | 既存コードのサブバレル移行が未完了 | Medium | Phase 1C でサブバレル構造を作成済みだが、既存消費者（数百ファイル）はメインバレル経由のまま。一貫性のため Phase 7（縦スライス）までに全件をサブバレル直接 import に移行する。対象: hooks/(data,calculation,analytics,ui), charts/(core,duckdb,advanced,chartInfra), models/(record,storeTypes,calendar,analysis), calculations/(grossProfit,forecast.barrel,decomposition), common/(layout,forms,tables,feedback) |
| R-9 | ロールシステムのAI単体セッション最適化 | Medium | 9ロール×2ファイル=18ファイルの読み込みコストが高い。AI単体セッションではロールの切り替えが十分に機能していない。軽量ロール設計（ロール統合 or CLAUDE.md への集約）を検討する |
| R-8 | ~~null/0 棲み分け（カテゴリ・時間帯データ）~~ | **解決済み** | Phase 1（2026-03-16）: クエリ時フィルタリング完了。Phase 2（2026-03-20）: UI 改善完了。HierarchyItem に handledDayCount/totalDayCount を追加し、CategoryExplorerTable に「取扱日率」列を追加（100%=全日取扱: 通常色、部分取扱: caution 色、未取扱: negative 色）|

## 3. 解決済みの課題（アーカイブ）

> 以下は対応完了済み。参考情報として残す。

| # | 課題 | 解決日 | 対応内容 |
|---|---|---|---|
| S-27 | WASM 空モック（vitest import 解決の band-aid） | 2026-03-20 | 空モック（Promise.reject）を4つの型付きモック（TS passthrough）に置換。wasmEngine init が成功し state='ready' に到達。init/fallback/rollback テスト追加。CI では pkg/ 存在時に実 WASM を使用する条件分岐を vitest.config に追加。4エンジンを observation-ready → promotion-candidate に昇格 |
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
| S-20 | DashboardPage.styles.ts（1,272行） | 2026-03-08 | 5分割完了（バレル re-export で後方互換維持）。現在19行のバレルファイル |
| S-21 | P→I 違反: useUnifiedWidgetContext.ts | 2026-03-16 | `useStoreCostPriceQuery` hook を `application/hooks/duckdb/` に抽出。infrastructure 直接 import を除去。architectureGuard allowlist から削除 |
| S-22 | P→I 違反: ConditionSummaryEnhanced.tsx | 2026-03-16 | `useStoreDailyMarkupRateQuery` hook を `application/hooks/duckdb/` に抽出。60行超のインライン query+useEffect を hook 呼出+useMemo に置換。allowlist から削除 |
| S-23 | 禁止事項#10: departmentKpi.ts SQL 率計算 | 2026-03-16 | SQL を `SUM(rate * sales)` → weighted sum（分子のみ）に変更。率の算出は `useDeptKpiQueries.ts` の `resolveSummary()` で `safeDivide` を使い domain 層に委譲 |
| S-24 | ドメインのマジックナンバー定数化 | 2026-03-16 | `calculationConstants.ts` に12定数を集約。forecast.ts, trendAnalysis.ts, correlation.ts, ComparisonScope.ts, PeriodSelection.ts, dowGapAnalysis.ts, advancedForecast.ts, formatting/index.ts の全ハードコード値を名前付き定数に置換 |
| S-25 | Silent error handler: DataManagementSidebar.tsx | 2026-03-16 | `autoImport.scanNow().catch(() => {})` のエラー握り潰しを修正。成功時/失敗時それぞれトースト表示に変更 |
| S-26 | 凍結 allowlist 7件解消 | 2026-03-16 | Phase 1: useJsAggregationQueries / useCtsQueries を各2分割（barrel化）。Phase 2: useDuckDB / useAutoImport を useReducer 化（reducer 純粋関数を分離）。Phase 3: purchaseComparisonBuilders を3分割（barrel化）。Phase 4: CvTimeSeriesChart を3ビューに分割（690→261行）、useMetricBreakdown の useMemo 統合（7→6）。結果: useMemo allowlist 4→1、useState allowlist 5→2、行数 allowlist 5→2、R12 Tier 2 から CvTimeSeriesChart 除去 |
