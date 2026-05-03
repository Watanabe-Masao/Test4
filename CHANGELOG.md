# 変更履歴（CHANGELOG）

本プロジェクトの主要な変更を記録します。
フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠します。

## バージョニングポリシー

[Semantic Versioning 2.0.0](https://semver.org/lang/ja/) に従います。

- **MAJOR** (x.0.0): 破壊的変更（データ形式の非互換、API 削除等）
- **MINOR** (0.x.0): 機能追加・改善（後方互換あり）
- **PATCH** (0.0.x): バグ修正・ドキュメント修正

> 注: v0.9.0〜v1.5.1 は開発初期に厳密な semver 運用が行われていなかった時期のバージョンです。
> v1.6.0 以降は上記ポリシーに従います。
>
> **役割分担:** 本ファイルはリリース単位の要約。
> 内部向けの詳細変更記��は `references/02-status/recent-changes.md` を参照。
> `docs/contracts/project-metadata.json` の `appVersion` と最新バージョンを一致させること。

## [v1.10.0] - 2026-04-13

### AAG 5.2 — Collector-Governance Symmetry

collector (`project-checklist-collector.ts`) と governance §3 の規約の間に残っていた
**構造的非対称**を解消。collector が「やってはいけないこと」「常時チェック」「最重要項目」
の見出し配下を正規表現で除外していた一方、規約はこれらを checklist に書かないと定めて
いた。本リリースで collector の heading 抑制ロジックを削除し、format guard を全 project
で strict 化。規約と実装の対称性を `checklistGovernanceSymmetryGuard` で恒久的に保証する。

- **pure-calculation-reorg/checklist.md 純化**: Phase 内 prohibition 19 件 + 常時チェック 6 件 + 最重要項目 4 件を `plan.md` の新設「Phase 別禁止事項テーブル」「Phase 11 完了後確認項目」および `CONTRIBUTING.md` の「PR 作成前のローカル確認」に移動。Phase 0-11 の達成条件 checkbox は不変
- **`FORMAT_EXEMPT_PROJECT_IDS` 空集合化**: `checklistFormatGuard` (F3/F4/F5) を全 live project に適用
- **`countCheckboxes` 純化**: heading 抑制ロジックを削除。「format guard が通る範囲 = collector が集計する範囲」の対称性を回復
- **新規ガード**: `checklistGovernanceSymmetryGuard` (S1/S2/S3)。禁止見出しそのものの存在を検出する最終防波堤
- **governance §3/§8 更新**: 機械検証の 2 層 (format guard + symmetry guard) を明記、関連実装表に symmetry guard を追加
- **version triplet 同期**: `shiire-arari` 1.9.0 → 1.10.0 / AAG 5.1 → 5.2 を version sync registry 経由で 4 ペア同期
- **project archive**: `aag-collector-purification` 自身を `projects/completed/` に移動

## [v1.9.0] - 2026-04-12

### AAG 5.1 — Project Lifecycle Management & Documentation/Task Separation

ドキュメントと課題の分離 + project ライフサイクル制御 + version sync registry。
本リリースは AAG framework の Layer 4A System Operations に新しい骨格を追加する。

- **projects/ 一元化**: live な作業項目の正本を `projects/<id>/checklist.md` のみに集約。references/ から live task table を全削除し導線だけ残置
- **6 + 1 live project スケルトン**: data-load-idempotency-hardening / presentation-quality-hardening / architecture-decision-backlog / aag-rule-splitting-execution / pure-calculation-reorg + quick-fixes (collection)。verified LIVE 項目のみを checklist に転記
- **project bootstrap template**: `projects/_template/` から AI が新規 project を立ち上げられる骨格 + 10 ステップの bootstrap 手順
- **project checklist collector**: `tools/architecture-health/src/collectors/project-checklist-collector.ts`。`derivedStatus` を checklist から動的判定（empty / in_progress / completed / archived / collection）
- **generated project-health**: `references/02-status/generated/project-health.{json,md}` を docs:generate で生成。全 project の derivedStatus + progress を一覧化
- **checklist format guard** (F1-F5): 必須ファイル / checkbox 形式 / 「やってはいけないこと」「常時チェック」「最重要項目」セクション内の checkbox を機械検出
- **completion consistency guard** (C1-C4): completed なのに archive 未実施 / CURRENT_PROJECT.md の active 整合 / dead-link to projects/ を機械検出
- **architecture-health 統合**: `project.checklist.completedNotArchivedCount` を **hard gate** で固定。consistency guard と二重防御で「completed → archive 強制」を実現
- **kind: collection 概念**: 大きな project と小さな fix を分けて扱う。quick-fixes は continuous で archive しない
- **archive lifecycle**: `projects/completed/` 物理 archive 先 + governance §6.2 に必須 8 ステップ + 関連正本更新義務 + §6.3 に立ち上げからクローズまでの 10 ステップ例
- **version sync registry (Core)**: `app/src/test/versionSyncRegistry.ts` (Schema) + `versionSyncGuard.test.ts` (Execution)。`package.json` / `project-metadata.json` / `CHANGELOG.md` / `recent-changes.md` の 4 値の整合性を宣言的に管理。新ペア追加は registry に 1 entry 足すだけ
- **AAG 5.1 への bump**: aag-5-constitution.md Layer 4A に project-checklist-governance.md / open-issues.md / versionSyncRegistry.ts を登録
- **self-host 動作確認**: 本リリースに含まれる docs-and-governance-cohesion project 自身が、確立した「完了 → archive 強制」の仕組みの最初の利用者となり、`projects/completed/docs-and-governance-cohesion` に archive 済み

### 新規追加ファイル

- `references/05-aag-interface/operations/project-checklist-governance.md` (規約の正本、§0-12)
- `tools/architecture-health/src/collectors/project-checklist-collector.ts`
- `tools/architecture-health/src/renderers/project-health-renderer.ts`
- `app/src/test/versionSyncRegistry.ts`
- `app/src/test/guards/versionSyncGuard.test.ts`
- `app/src/test/guards/checklistFormatGuard.test.ts`
- `app/src/test/guards/projectCompletionConsistencyGuard.test.ts`
- `projects/_template/`, `projects/quick-fixes/`, `projects/completed/`
- `projects/data-load-idempotency-hardening/`, `presentation-quality-hardening/`, `architecture-decision-backlog/`, `aag-rule-splitting-execution/`

### Read-path 重複耐性 (Pre-1.9.0 — branch 内で先行 merged)

- **idempotent load contract Phase 0-3 の追加防御**: duplicate-injected mock conn helper / FRAGILE 6 件への構造的回帰テスト / @risk JSDoc + @defense 防御コメント
- **FRAGILE 1/2/6 の pre-aggregate refactor**: `purchaseComparison.ts` の UNION ALL 2 件と `freePeriodFactQueries.ts` の cs 側を `store_day_summary` VIEW と同じパターンに書き換え、FRAGILE → SAFE 昇格

## [v1.8.0] - 2026-04-10

### Pure 計算責務再編 Phase 3-7

- **Phase 3 契約固定**: BIZ-001〜013 / ANA-001〜009 契約テンプレート。registry 契約値埋め 22 件。bridge JSDoc に semanticClass + contractId。wasmEngine に WASM_MODULE_METADATA
- **Phase 4 current 保守**: current 群保守ポリシー。7 WASM crate に `[package.metadata.semantic]`
- **Phase 5 Business 移行計画**: Tier 1 候補 6 件の移行計画（8 ステップ + promotion-ready 判定基準）
- **Phase 6 Analytic 移行計画**: Analytic 候補 9 件の移行計画（9 ステップ + 不変条件検証）
- **Phase 7 Guard 統合**: 全 guard マップ + JS 正本縮退 4 段階ポリシー + 違反レスポンス設計
- **Promote Ceremony**: 昇格提案書テンプレート + 実施手順 + 巻き戻し手順

## [v1.7.0] - 2026-04-02

### アーキテクチャ改善

- **God Hook 分割**: `useUnifiedWidgetContext`（49フィールド/29依存）を 3 bundle に分割（useComparisonBundle / useQueryBundle / useChartInteractionBundle）
- **readModel pure builder 化**: 5 readModel を pure builder に変換し、app→infra 依存を 12→7 に削減
- **comparison VM 共通基盤**: `ComparisonPoint` / `DailyYoYRow` / `aggregateContributions` を共通化
- **Category チャート移動**: 35 ファイルを `features/category/ui/charts/` に移動（バレル re-export で後方互換維持）
- **query-access audit 拡張**: features/ スキャン + bundle hook 検出を追加
- **Orchestrator 改善**: `errors: Partial<Record<...>>` で個別 readModel エラー観測可能に

### バグ修正

- **前年客数=0**: flowers を `ClassifiedSalesDaySummary` に JOIN し、`getFlowers` 個別参照を `summary.customers` に統合
- **PI値分析ラベル**: 点数PI選択時に金額PIラベルが表示されるバグを修正（series name を view-aware に変更）
- **base path ハードコード**: SW / manifest / index.html の `/Test4/` をビルド時注入に変更

### パフォーマンス

- **日別点数クエリ並列化**: `DailyQuantityPairHandler` で当年+前年を `Promise.all` で並列取得（debounce 50ms × 2 の待ち時間を解消）

### 新機能

- **ダブルクリック→時間帯遷移**: 日別売上チャートでダブルクリック → 時間帯チャートに自動ドリルダウン
- **free-period Explanation**: 自由期間分析の L1/L2 説明責任接続（5 MetricId + ビルダー）
- **free-period Bundle Hook**: `useFreePeriodAnalysisBundle` で 3 readModel を 1 hook から並列取得

### CI/CD

- **failure artifact upload**: Playwright / coverage レポートを失敗時にアップロード
- **permissions 最小化**: workflow レベルで `contents: read` を明示

### レガシーコード削除

- `useFreePeriodAnalysis.ts` 削除（`useFreePeriodAnalysisBundle` に完全置換）
- `DiscountTrendChart` の dead import コメント削除
- `purchaseComparisonKpi` の廃止済み関数コメント削除

## [v1.6.0] - 2026-03-31

### UI 改善

- **コンディションサマリー**: 予算達成・前年比較セクションを折りたたみ式に変更、カードの横スクロール+矢印ナビゲーション
- **客数GAP ドリルダウン**: 点数客数GAP / 金額客数GAP の店舗別詳細モーダルを追加
- **チャート選択**: ブラシ選択のハイライトを維持、範囲選択で自動ドリルダウン遷移
- **要因分解**: 日/範囲選択時に売上が正しく反映されるよう修正、チャート高さをコンパクト化
- **PI値チャート**: 棒グラフを前年と並列表示に変更、点数PIを正しく計算
- **売変チャート**: 棒グラフから折れ線に変更
- **仕入日別表**: 累計差異・累計前年比の4列を追加
- **CTS カバー率**: 警告メッセージに診断情報（店舗数・日数・件数）を追加
- **取込データ一覧**: 時間帯売上（CTS）タブを追加
- **ChartCard**: ツールバーボタンクリックで折りたたみが発動するバグを修正
- **日付チップ**: 全サブタブ（日次推移・カテゴリ棒・ドリルダウン分析）で表示維持

### パフォーマンス最適化

- **useQueryWithHandler**: WeakMap ベースの共有キャッシュ + in-flight dedupe で重複クエリ排除
- **useDuckDB**: 全テーブル再構築から月単位の差分ロードに変更（年月切替が劇的に高速化）
- **useUnifiedWidgetContext**: ctx オブジェクトを useMemo 化し widget の不要再レンダリングを回避
- **Vite chunk 分離**: echarts (941KB) と framer-motion (167KB) をメインバンドルから分離

### features/ 縦スライス移行

全 8 feature の移行完了:
- **sales**: domain + application(dailySalesTransform) + ui(SalesAnalysisWidgets)
- **storage-admin**: application(useMonthDataManagement) + ui(6 sections)
- **budget**: application(useBudgetChartData) + ui(InsightTabBudget)
- **forecast**: application(useForecast) + ui(InsightTabForecast)
- **purchase**: application(purchaseAnalysisHelpers) + ui(DailyPivot + Tables + Chart)
- **category**: application(categoryData + vm) + ui(8 components)
- **cost-detail**: application(useCostDetailData) + ui(3 tabs)
- **reports**: ui(ReportSummaryGrid + ReportDeptTable)

### 構造品質

- **Widget Ownership Manifest**: 全31 Dashboard widget に owner を定義、3 guard テストで CI 強制
- **WidgetId 型安全化**: ownership manifest から WidgetId を型導出、WidgetDef.id を string → WidgetId に
- **Deep import guard**: features/ への外部 import は barrel 経由のみ許可
- **Cross-slice isolation guard**: features 間の直接依存を禁止

### CI/CD

- **WASM ビルド統一**: deploy.yml の手書きビルドを `npm run build:wasm` に統一
- **Composite action**: Rust+wasm-pack セットアップを `.github/actions/setup-wasm/` に抽出
- **Vite base path**: 環境変数 `VITE_BASE_PATH` で切り替え可能に

### ドキュメント

- **README**: 技術詳細を削減し、機能・クイックスタート中心にシンプル化
- **CONTRIBUTING**: 新規参加者向け「読む順番」セクションを追加
- **features/README.md**: 縦スライスルール + widget ownership ルールを文書化
- **features-migration-status.md**: 全 8 feature + widget ownership の進捗管理

## [v1.5.1] - 2026-03-26

### ドキュメント全面更新 + Temporal Phase 5 統合

#### Temporal Analysis Phase 0-5 完了
- **Phase 5**: 日別売上チャートに移動平均 overlay 最小統合（metric=sales, windowSize=7, policy=strict）
- **dateKey 集約修正**: store×day rows を日別合計に集約してから rolling 計算に渡すルールを確立
- **temporal-analysis-policy.md**: Phase 5 到達点・dateKey 集約ルール・UI 統合パターン・禁止事項5改定を反映

#### P5/DuckDB 収束
- **useDuckDB composition root 整理**: weather hook 分離、QueryHandler 移行完了（allowlist 33→0）
- **buildTypedWhere 完全移行**: 6型 discriminated union、buildWhereClause を @deprecated 化
- **WidgetContext 整理**: UnifiedWidgetContext 派生化、observationStatus 昇格

#### ドキュメント圧縮・再構成
- **CLAUDE.md 圧縮**: 525行→371行。コーディング規約・即差し戻し条件・許可リスト運用を references/ と roles/ に抽出
- **設計原則体系統一**: prohibition-quick-ref.md 廃止。全ロールの参照を design-principles.md（A1-G7）に統一
- **review-gate ROLE.md**: 禁止事項数不一致解消、CI 用語を「3ジョブ・7ステップ」に統一
- **README.md 数値更新**: WASM 4→5、チャート 59→73、ウィジェット 91→124 等
- **references/02-status/recent-changes.md**: #673-#692 の変更詳細を別紙化
- **references/03-guides/coding-conventions.md**: CLAUDE.md から抽出
- **PLAN.md / plan.md**: 完了済みのため references/99-archive/ へ移動

## [v1.5.0] - 2026-03-22

### 包含型分析ユニット + 天気チャート改善

#### 包含型分析ユニットの完成

- **AnalysisNodeContext の導入**: 分析ノードの階層モデル（daily-sales → time-slot → dept-pattern, category-trend → category-drilldown）を型で表現。親子孫の文脈継承を構造化
- **ContainedAnalysisPanel**: 包含型分析パネルの共通UI枠。role: 'child' | 'grandchild' で視覚階層を統一
- **IntegratedCategoryAnalysis**: カテゴリ分析ユニットの正本コンテナ。CategoryTrendChart + CategoryHierarchyExplorer を包含
- **部門別時間帯パターンの孫配置**: DeptHourlyChart を TimeSlotChart の下に孫として包含
- **TopDepartmentPolicy 型**: 「上位5部門」の選定基準を型で仕様化（criterion, count, includeComparison）
- **deriveNodeContext / deriveDeptPatternContext / deriveCategoryDrilldownContext**: 孫用文脈導出の純粋関数

#### 天気チャートの軸改善

- **降水量モード右軸固定化**: 0〜5mm 基本、段階的拡張（5-10mm→0-10, 10mm超→0-20mm）で少量降水の誇張を防止
- **気温モード準固定軸**: データ min/max を 5°C 刻みに丸め、0°C 跨ぎ対応
- **温度帯バンド表示**: 寒冷/低温/涼快/暖/高温の5段階を markArea で背景帯表示
- **valueYAxis に interval オプション追加**: 固定スケール用の軸目盛り間隔指定

#### ドキュメント整備

- **設計原則 16→19 に拡張**: #17 チャート間データ文脈継承、#18 View に raw 値を渡さない、#19 独立互換で正本を汚さない
- **反例集に3件追加**: 子チャートの比較文脈再計算、View への weatherCode 直渡し、独立互換による Props 肥大化
- **README.md 全面更新**: チャートライブラリ Recharts→ECharts 移行の意思決定・背景・現在の移行状態を明記
- **天気データ基盤**: 観測所=気象台(s1)のみ使用、AMeDAS(a1)は仕組みで除外を明記
- **包含型分析ユニットの設計ルール4つと移行状態**を README に追加
- **references/README.md 正本一覧拡充**: 天気基盤・ウィジェット連携・表示ルール・品質監査等を追加
- **禁止事項 9→13件**: CLAUDE.md・README.md・references/README.md を同期更新

---

## [v1.4.0] - 2026-03-22

### グラフ改善 + 売上推移分析ユニット -- UI/分析体験の全面刷新

#### 売上推移分析ユニットの確立

- **包含型分析ユニット**: DailySalesChart（overview）と TimeSlotChart（drilldown）を `IntegratedSalesChart` の配下に統合。ダッシュボード上で1つの連続した分析として扱う
- **SalesAnalysisContext の導入**: 分析ユニットの共通文脈型を Application 層に定義。親コンテナが文脈を構築し、派生ビューに配る「仕様継承 + 合成」パターン
- **AnalysisViewEvents の導入**: 子→親のインタラクション契約型。CrossChartSelectionContext への伝播を標準化
- **TimeSlotChart Controller/View 分離**: 598行の monolith を Controller（150行）+ View（409行）+ OptionBuilder（227行）に分割
- **chartOption 構築の純粋関数化**: `TimeSlotChartOptionBuilder.ts` に React 非依存の純粋関数として抽出
- **context 渡し + 廃止予定互換**: `TimeSlotChart` は `context?: SalesAnalysisContext` 経由で文脈を受領。従来の独立 props は `@deprecated` として暫定維持

#### データパイプライン統一

- **サブパネルのデータソースを DuckDB に統一**: 全サブ分析パネル（カテゴリ推移・要因分解・売変分析・天気相関）が DuckDB 経由でデータ取得。DailyRecord Map への直接依存を排除
- **天気データの供給経路一元化**: `ctx.weatherDaily` 経由での天気データ配信を標準化。分散していた取得ロジックを集約
- **ヒートマップ・天気・部門増減のデータソース統一**: 全チャートが共通パイプライン経由でデータを受領
- **DuckQueryContext 型の導入**: DuckDB クエリに必要な共通コンテキスト（duckConn, duckDataVersion, dateRange, storeIds, prevYearScope）を型で集約

#### UI/グラフ技術スタックの刷新

- **グラフレイアウトの統一**: チャート・テーブル・ヒートマップの時間帯列幅を `GRID_LEFT/GRID_RIGHT` で揃える
- **ChartCard variant システム**: `variant='section'` によるサブパネルのデザイン統一を構造化
- **実線/破線の統一ルール**: 当年=実線、前年=破線で全チャートを統一
- **ヒートマップのセル数字表示**: データ値を直接セル上に表示し視認性向上
- **ツールバーの視認性改善**: 各種切替UIの配置とスタイルを統一

#### 日別売上チャートの大幅改善

- **4 ビュー構成**: 標準（日別棒）/ 累計（エリア）/ 差分（ウォーターフォール）/ 達成率
- **右軸モード切替**: 点数 / 客数 / 売変 / 気温の 4 モードで右軸データを切替
- **サブ分析パネル**: 右軸モードに連動するサブパネル（カテゴリ推移 / 要因分解 / 売変分析 / 天気相関）
- **累計チャート**: 達成率ビューと帯グラフ、予算差・売変差の表示
- **差分ウォーターフォール**: 前年差 / 予算差のウォーターフォール + 累計線
- **X 軸トリミング**: データ有効期間でのみ表示
- **曜日フィルタ**: DowPresetSelector による曜日での絞り込み

#### 時間帯別チャートの改善

- **統合ビュー**: 日別売上と時間帯別売上を IntegratedSalesChart に統合
- **ドリルダウン**: 日別チャートのバークリック/ドラッグで時間帯チャートにズームイン遷移
- **前年棒グラフ化**: 時間帯チャートの前年を折れ線から棒グラフに変更
- **部門選択ツールバー統合**: 部門/ライン/クラスの階層選択をツールバーに統合

#### 要因分解の改善

- **トルネードチャート**: 部門別要因分解をトルネード（ダイバージング棒）チャートに変更
- **日別積み上げ棒**: 要因分解パネルを日別積み上げ棒グラフに刷新
- **残差検証**: 額合わせ残差許容閾値を 1% → 0.01% に厳格化、共通定数化

#### バグ修正

- **前年日付計算の閏年バグ**: `resolvePrevDate` を domain/ に集約し閏年・月跨ぎを正しく処理
- **前年同曜日の累計範囲**: day:1 始まりで日数超過するバグを修正
- **ヒートマップ初回表示**: コンテナサイズ不正のバグを修正
- **モーダル経過予算計算**: `calendarDaysInMonth` に統一

#### テスト

- **スコープ整合性ガードテスト**: prevYearScope の日付範囲整合性を機械的に検証
- **境界値不変条件テスト**: 閏年・月末・年越しの境界値テスト追加

#### リファクタリング

- **不要ウィジェット 5 件削除**: 使用されていない分析ウィジェットを整理
- **DuckDB フックガード精度改善**: バレルチェーン簡素化、偽陽性削減
- **DuckQueryContext 型集約**: サブパネル Props を共通コンテキスト型で整理
- **ChartCard variant 追加**: `variant='section'` でサブパネルのデザインを構造的に統一

#### 新規ファイル

- `application/models/SalesAnalysisContext.ts` — 分析ユニットの共通文脈型 + 構築純粋関数
- `application/models/AnalysisViewEvents.ts` — 子→親のインタラクション契約型
- `presentation/components/charts/TimeSlotChartView.tsx` — 描画専用コンポーネント
- `presentation/components/charts/TimeSlotChartOptionBuilder.ts` — ECharts option 構築純粋関数

#### ドキュメント

- `widget-coordination-architecture.md` に「売上推移分析ユニット — 標準実装リファレンス」を追加
- `weather-architecture.md` を新規作成（天気データ基盤の全体像）
- `duckdb-architecture.md`, `data-models.md`, `data-flow.md`, `engine-boundary-policy.md` を天気関連で更新
- `CHANGELOG.md` に v1.3.0, v1.4.0 を追記

---

## [v1.3.0] - 2026-03-21

### 天気データ基盤 -- 気象庁 ETRN 統合

#### 天気データ統合

- **ETRN 天気 API 統合**: 気象庁 ETRN（電子閲覧室）から時間帯別気象データを取得。Cloudflare Worker プロキシ経由で CORS 対応
- **天気データの DuckDB 永続化**: `weather_hourly` テーブルに時間帯別気象データを永続化。月跨ぎデータのサポート
- **天気アイコン表示**: 日別チャートの X 軸に天気アイコン + 気温を表示。前年天気データも同曜日対応で表示
- **時間帯チャートの折れ線切替**: 点数 / 気温 / 降水量の 3 モードで折れ線グラフを切替
- **天気テーブル**: グラフ直下に天気アイコンのみのコンパクトテーブルを配置
- **天気-売上相関分析**: `WeatherAnalysisPanel` で気温と売上・客数の相関を可視化
- **ETRN 概況テキスト**: 昼/夜の天気概況をパースしツールチップに表示
- **weatherCode 責務の集約**: Domain/Application 層に天気コード解釈を集約し、UI から意味解釈を除去

#### アーキテクチャ

- **Domain 層の天気計算**: `weatherAggregation.ts` に純粋関数（aggregateHourlyToDaily, categorizeWeatherCode, deriveWeatherCode, toWeatherDisplay）を配置
- **WeatherLoadService**: ETRN データの取得→パース→DuckDB 永続化の 3 段パイプライン
- **ETRN 観測所選択**: 静的 JSON リストベースに刷新、AMeDAS(a1) を仕組みで除外し気象台(s1)のみ使用
- **月跨ぎ対応**: dowOffset による同曜日比較時の前年天気データを正しく取得

#### バグ修正

- **weatherCode=0 問題**: 晴天コード 0 が falsy チェックで除外されるバグを修正。**禁止事項 #13 を新設**（`number | null` の欠損判定に truthiness を使用禁止）
- **天気データの月跨ぎバグ**: dowOffset による前年天気取得で月境界を正しく処理
- **weatherCode=0 ガードテスト**: truthiness チェック禁止の構造的再発防止テスト追加

---

## [v1.2.0] - 2026-02-28

### アーキテクチャリファクタリング -- 設計思想の体系化と構造改善

#### アーキテクチャ改善

- **Zustand ストア移行**: `AppStateContext`（useReducer）から 3 つの Zustand ストア（`dataStore`, `settingsStore`, `uiStore`）へ移行。最小セレクタによる購読で不要な再レンダーを排除
- **ユースケース層の導入**: `application/usecases/` に計算・インポート・説明責任・エクスポート・カテゴリ時間帯・部門 KPI のユースケースを分離
- **ポートインターフェース**: `ExportPort` による依存性逆転。具体実装の差し替えをコンポジションルートのみで完結
- **Web Worker**: 計算パイプラインの非同期実行（メインスレッド非ブロック）
- **アーキテクチャガードテスト**: `guards/layerBoundaryGuard.test.ts` がレイヤー間依存を機械的に検証

#### コンポーネント改善

- **フック抽出**: `useCostDetailData`, `useDrilldownData` 等のデータ変換フックを描画コンポーネントから分離
- **スタイル分離**: styled-components 定義を `*.styles.ts` ファイルに分離
- **React.memo**: 純粋描画コンポーネントをメモ化で保護
- **バレル re-export**: ファイル分割時に既存の import パスを維持

#### インフラストラクチャ

- **i18n**: メッセージカタログ（`messages.ts`）による文字列の一元管理。`useI18n` フック経由で参照
- **PWA**: サービスワーカー登録（`pwa/registerSW.ts`）
- **DuckDB セキュリティ**: SQL インジェクション防止（`storeIdFilter`、Branded Type `ValidatedDateKey`）
- **エラーハンドリング強化**: `QuotaExceededError` の構造化検出、`ChartErrorBoundary` によるチャート例外捕捉

#### テスト

- テストファイル数: 45 → **90**（v1.2.0 時点）→ 現在 **171 ファイル / 3,121 テスト**（2026-03-07 計測）
- アーキテクチャガードテスト、DuckDB クエリテスト、ストアテスト、不変条件テストを追加

#### ドキュメント

- **設計思想 16 原則** を `CLAUDE.md` に体系化（機械的検証、境界バリデーション、エラー伝播、変更頻度分離、不変条件テスト、コンポジションルート、バレル re-export、i18n、描画純粋性、最小セレクタ、Command/Query 分離、Contract 管理、型粒度、全パターン統一、パス配置、Raw データ唯一源泉）
- 全ドキュメント（README, architecture.md, development-guide.md, CONTRIBUTING.md）をリファクタリング後の構成に同期

---

## [v1.1.0] - 2026-02-27

### DuckDB-WASM Phase 2 -- 高度分析チャート 14 種追加

#### 追加された機能

- **累積売上チャート** (`useDuckDBDailyCumulative`): 日別売上の累積推移を可視化
- **前年比日次比較** (`useDuckDBYoyDaily`): 当年と前年の日別売上を重ね合わせ表示
- **部門トレンド** (`useDuckDBDeptKpiTrend`): 部門別 KPI の月次推移
- **曜日パターン** (`useDuckDBDowPattern`): 曜日ごとの売上パターン分析
- **時間帯プロファイル** (`useDuckDBHourlyProfile`): 時間帯別の売上構成比
- **時間帯別集約** (`useDuckDBHourlyAggregation`): 時間帯別の数量・金額集約
- **ヒートマップ** (`useDuckDBHourDowMatrix`): 時間帯 x 曜日のマトリクス分析
- **部門別時間帯** (`useDuckDBDeptKpi`): 部門 KPI ランキング + サマリー一括取得
- **店舗別時間帯** (`useDuckDBStoreAggregation`): 店舗別 x 時間帯の集約分析
- **カテゴリトレンド** (`useDuckDBCategoryDailyTrend`): カテゴリ別日次売上推移
- **カテゴリ時間帯** (`useDuckDBCategoryHourly`): カテゴリ別 x 時間帯集約
- **カテゴリ構成比** (`useDuckDBCategoryMixWeekly`): カテゴリ構成比の週次推移
- **店舗ベンチマーク** (`useDuckDBStoreBenchmark`): 店舗間の週次ランキング推移
- **DateRangePicker**: 日付範囲選択 UI コンポーネント

#### 追加されたクエリモジュール

- `queries/advancedAnalytics.ts`: `queryCategoryMixWeekly`, `queryStoreBenchmark`
- `queries/features.ts`: `queryDailyFeatures`, `queryHourlyProfile`, `queryDowPattern`, `queryDeptDailyTrend`
- `queries/yoyComparison.ts`: `queryYoyDailyComparison`, `queryYoyCategoryComparison`

#### 追加されたフック

- `useDuckDBQuery.ts` に 14 個の専用クエリフックを追加
- 汎用 `useAsyncQuery` による非同期状態管理（loading / error / data）

---

## [v1.0.0] - 2026-02-26

### DuckDB-WASM Phase 1 -- DuckDB クエリエンジン統合

#### 追加された機能

- **DuckDB-WASM エンジン統合**: ブラウザ内で SQL 分析を実行可能に
- **テーブルスキーマ定義** (`schemas.ts`): 8 テーブル + 1 VIEW の DDL
  - `classified_sales`, `category_time_sales`, `time_slots`, `purchase`,
    `special_sales`, `transfers`, `consumables`, `department_kpi`
  - `store_day_summary` VIEW（6 テーブル LEFT JOIN）
- **クエリランナー** (`queryRunner.ts`): Arrow Table -> JS Object 変換、snake_case -> camelCase 自動変換
- **データローダー** (`dataLoader.ts`): ImportedData -> DuckDB テーブルへの一括ロード
- **エンジン管理** (`engine.ts`): DuckDB-WASM のライフサイクル管理（初期化・接続・状態遷移）

#### クエリモジュール（6 モジュール）

- `queries/categoryTimeSales.ts`: 時間帯・階層・店舗別集約、曜日除数マップ
- `queries/storeDaySummary.ts`: 店舗日次サマリー、累積売上、集約レート
- `queries/yoyComparison.ts`: 前年比較（日次・カテゴリ別）
- `queries/features.ts`: 日別特徴量、時間帯プロファイル、曜日パターン
- `queries/advancedAnalytics.ts`: カテゴリ構成比週次、店舗ベンチマーク
- `queries/departmentKpi.ts`: 部門 KPI ランキング、サマリー、月別トレンド

#### フック

- `useDuckDB.ts`: DuckDB ライフサイクル管理フック（初期化・データロード・マルチ月対応）
- `useDuckDBQuery.ts`: DuckDB クエリフック群

#### インフラ

- `infrastructure/duckdb/` レイヤーの新設
- IndexedDB -> DuckDB テーブルへの自動データ同期
- マルチ月データの同一テーブルへの追記ロード

---

## [v0.9.0] - 2026-02-20

### 初期リリース -- ダッシュボード・計算エンジン・ファイルインポート基盤

#### 追加された機能

- **ダッシュボード**: KPI カード、ウォーターフォールチャート、各種分析チャート
- **計算エンジン**: 粗利計算（在庫法・推計法）、値入率、売変率、構成比算出
- **要因分解**: シャープリー値ベースの 2 要素・3 要素・5 要素売上要因分解
- **ファイルインポート**: ドラッグ & ドロップによる複数ファイル種別のインポート
  - 分類別売上 CSV、仕入 Excel、花 Excel、産直 Excel、移動 Excel、時間帯 CSV、部門 KPI
- **説明責任（Explanation）**: 全主要指標に計算式・入力値・ドリルダウンを付与
- **予算分析**: 予算達成率、消化率、予測売上、残余予算
- **テーマ対応**: ダーク / ライトテーマの切替
- **IndexedDB 永続化**: インポートデータのブラウザ内保存
- **Web Worker**: 計算パイプラインの非同期実行

#### アーキテクチャ

- 4 層アーキテクチャ: Domain / Application / Infrastructure / Presentation
- 4 段階データフロー: データソース組み合わせ -> 計算 -> データセット構築 -> 動的フィルタ
- TypeScript strict mode + ESLint + Prettier による品質管理
