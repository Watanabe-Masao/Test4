# 設計思想 — 構造で守り、機械で検証する

> 本ドキュメントは CLAUDE.md から詳細を分離したものである。
> 原則の一覧は CLAUDE.md を参照。

以下の原則はリファクタリング全フェーズに共通する設計判断の根拠である。
個別の禁止事項（後述）は「何が壊れるか」を示すが、
本節は「なぜそうしなければならないか」の上位原則を示す。

### 1. アーキテクチャの境界は人の注意力ではなく、機械で守る

レイヤー間の依存ルールは `architectureGuard.test.ts` が全ソースの import 文を
スキャンして検証する。「気をつけて import する」ではなく「違反したらテストが落ちる」。

**適用例:**
- `presentation/ → infrastructure/` の直接 import は許可リスト外でテスト失敗
- `domain/` から外部層への参照はゼロ件であることを自動検証
- 許可リスト自体もテストで存在確認（ファイル削除済みの例外が残らない）
- `dataContract.test.ts` が Domain ↔ DuckDB ↔ Import の構造的整合性を25テストで検証。
  カラム追加忘れ、フォーマット変更、スキーマ不一致を即座に検出する

**原則:** ルールを文書に書くだけでは守られない。テストに書けば壊れた瞬間に検出される。

### 2. データは境界を越えるたびに検証する

外部入力（ファイル、ユーザー操作、URL パラメータ）がシステム内部に入る地点で
バリデーションを行い、不正データが後段に到達することを構造的に不可能にする。

**適用例:**
- SQL クエリパラメータに Branded Type（`ValidatedDateKey`）を導入し、
  検証していない文字列がクエリに渡るとコンパイルエラー
- `storeIdFilter` で SQL インジェクション文字を排除してからクエリ組み立て
- `ImportService` / `ImportDataProcessor` でインポート時にデータソース間の乖離を検出・警告

**原則:** 信頼境界を明確にし、内部では「検証済み」を型で保証する。

### 3. エラーは黙殺せず、構造化して伝播する

「catch して握り潰す」は障害の原因を隠蔽する。全てのエラーパスは
明示的に処理され、ユーザーに何が起きたかが伝わらなければならない。

**適用例:**
- IndexedDB の `QuotaExceededError` を検出し、構造化されたメッセージで reject
- DuckDB `loadMonth` 失敗時に `resetTables` で不整合データをクリアしてから再 throw
- DuckDB ウィジェットで `error` を破壊的に取り出し、フォールバック UI を表示
- `ChartErrorBoundary` でチャート例外を捕捉し、ページ全体の崩壊を防止

**原則:** サイレント失敗は最悪の失敗モード。壊れたなら壊れたと表示する。

### 4. 変更頻度が異なるものは分離する

一つのファイルに「めったに変わらないもの」と「頻繁に変わるもの」を
混ぜると、低リスクの変更が高リスクのコードに影響する。

**適用例:**
- styled-components 定義（`*.styles.ts`）とビジネスロジックフック（`use*Data.ts`）と
  描画コンポーネント（`*.tsx`）を分離（Phase 7）
- インデックス構築（データインポート時に1回）と動的フィルタ（ユーザー操作ごと）を
  分離（データフロー4段階設計）
- DuckDB クエリフック群を責務別ファイルに分割（Phase 6）

**原則:** 1ファイル = 1つの変更理由。ファイルが 300 行を超えたら分割を検討する。

### 5. 不変条件はテストで機械的に保証する

「実装が正しい」ではなく「不変条件が成り立つ」をテストする。
実装の詳細が変わっても、数学的・構造的な不変条件が成り立てば正しい。

**適用例:**
- シャープリー恒等式テスト: `Σ効果 = curSales - prevSales` がランダムデータで成立
- `divisorRules.test.ts`: 全チャートが共通除数関数を使い、独自実装がないことを検証
- アーキテクチャガードテスト: import の方向性が不変条件として保たれる
- データ契約テスト: Domain モデルの全フィールドが DuckDB テーブルカラムに存在し、
  ファイルインポートの構造制約（minRows/minCols）が契約値と一致し、
  全 DuckDB カラム型が Parquet 互換であることを構造的不変条件として検証
- 集約→ドリルダウン一致テスト: `Σ(storeContributions.sales) = entry.sales`、
  `Σ(breakdown.value) = entry.sales` が任意のオフセット・店舗選択で成立。
  集約の副産物（根拠データ）と合計値が常に整合することを保証する

**原則:** 実装をテストするのではなく、制約をテストする。
リファクタリングでテストが壊れるなら、テストが実装に依存しすぎている。

### 6. 具体実装への依存はコンポジションルートに集約する

アプリケーション全体で infrastructure の具体実装を知る場所は
`main.tsx` / `App.tsx`（コンポジションルート）のみ。
他の全てのコードはインターフェース（ポート）を通じて間接的にアクセスする。

**適用例:**
- `DataRepository` インターフェース（domain 層）を `IndexedDBRepository`（infrastructure 層）が実装し、
  `RepositoryProvider`（App.tsx）で注入
- `ExportPort`（application 層）を `ExportService` が実装し、
  presentation 層は `useExport` フック経由でアクセス
- `useI18n` は infrastructure の実装を application 層でブリッジし、
  presentation 層はブリッジ経由で使用

**原則:** 依存の方向を逆転させ、具体実装の差し替えを1箇所の変更で可能にする。

### 7. 後方互換はバレル re-export で保つ

ファイル分割・移動時に既存の import パスを壊さない。
元のファイルをバレル（re-export 集約ファイル）に変換し、
内部構造の変更を外部から見えなくする。

**適用例:**
- `useDuckDBQuery.ts` → `duckdb/index.ts` からの re-export バレルに変換
- `ForecastCharts.tsx` → `ForecastCharts/index.ts` からの re-export
- `hash.ts`（`application/services/` → `domain/utilities/`）、`diffCalculator.ts` の移動時に元パスに re-export を残置
- `useDailySalesData.ts`（`presentation/components/charts/` → `application/hooks/`）の移動時に元パスに re-export を残置
- `DashboardPage.styles.ts` の 5 分割後もバレル re-export で後方互換を維持

**原則:** 内部リファクタリングで外部の import を壊さない。
破壊的変更は「やむを得ない場合」のみ。

### 8. 文字列はロジックから分離する

UI に表示する文字列をコード内にハードコードしない。
メッセージカタログ（`messages.ts`）に一元管理し、
コンポーネントは `useI18n` フック経由で参照する。

**適用例:**
- NavBar のナビゲーションラベル、計算状態表示をメッセージカタログ参照に変換
- ErrorBoundary のエラーメッセージ、リトライボタンラベルを i18n 化
- DuckDB ウィジェットのエラー表示を `messages.errors.dataFetchFailed` に統一

**原則:** 文字列の変更にコードの変更を伴わせない。
多言語対応は副産物であり、主目的は関心の分離。

### 9. 描画コンポーネントは純粋に保ち、メモ化で保護する

描画のみを担うコンポーネント（`*Body.tsx`）は `React.memo` で囲み、
props が変わらない限り再描画しない。
状態管理・データ変換はカスタムフックに分離し、描画と計算を混ぜない。

**適用例:**
- `TimeSlotSalesChart`, `DailySalesChart` 等を `memo` でラップ
- データ変換ロジックを `useCostDetailData`, `useDrilldownData` 等のフックに抽出
- DuckDB ウィジェットはフックの戻り値のみを参照して描画

**原則:** 描画関数は「データ → JSX」の純粋変換。
副作用・状態遷移・データ取得は外側のフックが担う。

### 10. 状態管理は最小セレクタで購読する

ストア全体を購読せず、必要なスライスだけをセレクタで取得する。
無関係な状態変更による不要な再レンダーを構造的に防ぐ。

**適用例:**
- `useAppState()`（3ストア全結合）を廃止し、
  `useDataStore((s) => s.data)` のようなスライスセレクタに移行
- `useSettingsStore((s) => s.settings.targetYear)` で年のみ購読

**原則:** 「何を購読するか」は「何を描画するか」と一致させる。
広すぎる購読はパフォーマンス問題の温床。

### 11. Command と Query を分離する

JS 計算エンジン（Command 側）と DuckDB 探索エンジン（Query 側）は責務が異なる。
Command は単月確定値を決定論的に計算し、Query は任意の日付範囲を探索・集約する。
両者を明示的に分離し、同一の集約ロジックを JS と SQL の両方に実装してはならない。

**適用例:**
- `domain/calculations/`（Command 側）は純粋な JS 関数で粗利計算・要因分解・予測を行い、
  出力は `StoreResult`（WriteModel）
- `application/queries/`（Query 側）は `QueryHandler<TInput, TOutput>` インターフェースに従い、
  DuckDB に SQL を発行。`DailyCumulativeHandler`, `AggregatedRatesHandler` 等が統一パターンで実装
- `architectureGuard.test.ts` が `application/queries/ → domain/calculations/` の import を禁止し、
  Query が Command に依存しないことを機械的に検証
- `application/usecases/calculation/` から `infrastructure/duckdb/` への依存も同テストで禁止し、
  Command が Query に依存しないことを保証

**原則:** 同じ集約ロジックを JS と SQL の両方に実装してはならない。確定値は JS、探索は DuckDB。

### 12. 横断的関心事は Contract で管理する

複数の機能やページに跨る関心事（比較、説明等）を各消費者がバラバラに実装すると、
新モード追加時の変更箇所が爆発する。Contract インターフェースを導入し、
変更箇所を構造的に限定する。

**適用例:**
- `domain/patterns/comparison/ComparisonContract.ts` が比較の横断的関心事を管理。
  `ComparisonEntry<T>` と `ComparisonResult<T>` の型で、Presentation 層は個別の
  比較モード名（`sameDayOfWeek`, `sameDate` 等）を知らずにループ処理で描画する
- 新しい比較モードの追加は 4 箇所に限定: (1) `AlignmentPolicy` に新モード追加、
  (2) `resolveComparisonFrame()` に新ロジック追加、(3) `ComparisonContext` に新 PeriodSnapshot 追加、
  (4) `useComparisonContextQuery` に新クエリ追加
- `architectureGuard.test.ts` が Presentation 層から比較コンテキストの内部モジュールへの
  直接 import を禁止し、`useComparisonContext` 経由のみを許可
- `application/queries/QueryContract.ts` が全 DuckDB クエリの共通インターフェース
  （`QueryHandler<TInput, TOutput>`）を定義し、クエリ追加時の構造を統一

**原則:** 横断的関心事の変更箇所を Contract で限定し、新モード追加を機械的な作業にする。

### 13. 型の粒度は変更頻度に合わせる

変更頻度が異なるフィールドを一つの型に詰め込むと、低頻度のフィールド変更が
高頻度の消費者を巻き込む。変更頻度ごとに型を分離し、消費者は必要最小限の
サブセット型を参照する。これは原則 #4（変更頻度で分離）の型への具体化である。

**適用例:**
- `StoreResult` は `StoreConfigData`（設定値: 在庫・予算）+ `StoreAggregatedData`（集約値: 売上・日別）+
  `StoreDerivedData`（導出値: 予測・レート）の 3 層合成型。構築側は変更頻度ごとに分離し、
  消費側は `StoreResult` を通じて一様にアクセスする
- `StoreResultSubsets.ts` が `StoreSalesView`, `StoreInventoryView`, `StoreBudgetView`,
  `StoreForecastView`, `StoreMarginView`, `StoreCategoryView` の 6 つの Pick 型を提供。
  消費者は必要なフィールドだけに依存し、テスト時のモックが軽量になる
- `QueryContract.ts` が `DateRangeFilter`, `StoreFilter`, `BaseQueryInput` を段階的に合成。
  日付範囲のみ必要なクエリは `DateRangeFilter` だけに依存する

**原則:** 消費者が依存するフィールドを型で明示化し、変更の影響範囲を型システムで制限する。

### 14. 全パターンに例外なし

チャート・Hook・Handler の構造は規模に関わらず同一パターンに従う。
「小さいから省略してよい」「特殊だから別パターンにしてよい」を許可すると、
パターンの判断コストが発生し、AI 開発での自動生成が困難になる。

**適用例:**
- チャートは規模に関わらず `.tsx`（描画）+ `.styles.ts`（スタイル）+ `.vm.ts`（ViewModel）の
  3 ファイル構成。`GrossProfitRateChart/`, `CategoryBoxPlotChart`, `StructuralOverviewChart` 等、
  全チャートが同一構造を持つ
- QueryHandler は `DailyCumulativeHandler`, `AggregatedRatesHandler` 等、
  全て `{ name, execute(conn, input) }` の統一インターフェース。
  入力型（`*Input extends BaseQueryInput`）と出力型（`*Output`）を明示化
- ViewModel（`.vm.ts`）は WriteModel → 描画データの純粋変換関数。
  `buildGrossProfitRateViewModel()` のように `build*ViewModel()` の命名規則に従う

**原則:** 構造の統一は判断コストをゼロにする。例外を作るコストは、統一を維持するコストより常に高い。

### 15. 配置はパスで決まる

ファイルの配置先はパスベースのルールで機械的に判定する。
「このファイルはどこに置くべきか」の曖昧さをゼロにし、
配置の判断を人の裁量に委ねない。

**適用例:**
- CLAUDE.md のファイルパスベース自動ルーティング表: `domain/calculations/` の変更は
  `invariant-guardian` ロールが担当、`infrastructure/duckdb/` は `duckdb-specialist`、
  `application/usecases/explanation/` は `explanation-steward` と機械的に決定
- `architectureGuard.test.ts` がパスベースで依存ルールを検証:
  `domain/` 配下のファイルは外部層への import がゼロ件、
  `presentation/` 配下は `infrastructure/` への直接 import が禁止（許可リスト除く）
- レイヤー構造（`domain/`, `application/`, `infrastructure/`, `presentation/`）自体がパスで
  責務を決定。パスを見れば何層のコードかが分かり、許される依存が自動的に決まる

**原則:** 配置の判断を人に委ねない。パスが配置先を決め、テストが配置ルールを検証する。

### 16. Raw データは唯一の真実源

DuckDB（OPFS 永続化）は `normalized_records`（IndexedDB）の派生キャッシュであり、
真のデータソースではない。破損時は IndexedDB から再構築可能でなければならない。
DuckDB から IndexedDB への書き戻しは禁止する。

**適用例:**
- `rawFileStore.ts` がインポートされた元ファイル（CSV/XLSX の Blob）を IndexedDB に SHA-256 ハッシュ付きで保存。
  これが唯一の原本であり、DuckDB はここから派生する
- `infrastructure/duckdb/recovery.ts` の `rebuildFromIndexedDB()` が全テーブルを DROP → CREATE し、
  IndexedDB に保存された全月分のデータを DuckDB に再投入。DB 破損時の完全復旧を保証
- `useDataRecovery` フックが UI に復旧機能を提供: `rebuildDuckDB()`（IndexedDB → DuckDB 再構築）、
  `clearDuckDBCache()`（OPFS ファイル削除。次回起動時に再構築）
- `architectureGuard.test.ts` が `storage/ → duckdb/queries/` の import を禁止し、
  DuckDB クエリ結果を IndexedDB に書き戻すことを構造的に不可能にしている

**原則:** キャッシュは壊れてもよい。原本は壊してはならない。データの流れは常に一方向（IndexedDB → DuckDB）。

### 17. チャート間のデータ受け渡しは文脈継承で行う

包含型分析ユニット（親→子→孫）において、チャート間のデータ受け渡しは
`SalesAnalysisContext` の継承で行う。子チャートが独自にデータを再取得・再計算しない。

**受け渡しルール:**

| 項目 | 親が決める | 子/孫が決める |
|---|---|---|
| 対象期間（dateRange） | 親 | × |
| 比較文脈（comparisonScope） | 親 | × |
| 対象店舗（selectedStoreIds） | 親 | × |
| カテゴリ階層（hierarchy） | 親 | × |
| 選択日範囲（selectedDayRange） | 親→子 | × |
| 表示モード（lineMode, viewMode） | — | 子/孫が独自に持つ |
| 詳細ビュー切替（detailView） | — | 子/孫が独自に持つ |
| TopN フィルタ | — | 孫が独自に持つ |

**適用例:**
- `IntegratedSalesChart` が `buildSalesAnalysisContext()` で文脈を構築し、
  `TimeSlotChart` は `context` 経由で受領。`deriveChildContext()` で dateRange を上書き
- `DeptHourlyChart`（孫）は `deriveDeptPatternContext()` で親の文脈を継承。
  `TopDepartmentPolicy` のみ孫固有のフォーカスとして追加
- `IntegratedCategoryAnalysis` が `CategoryTrendChart` と `CategoryHierarchyExplorer` に
  同一の文脈を配る。子は prevYearScope を context から取得

**原則:** チャート間のデータ共有は暗黙のグローバル状態ではなく、明示的な文脈継承で行う。
親が authoritative source、子は consume only。

### 18. View に raw domain/query 値を渡さない

Controller/View 分離されたチャートにおいて、View（描画コンポーネント）は
表示モデル（ViewModel）のみを受け取る。Domain 層の生値や Query の結果を
View に直接渡すことを禁止する。

**View に渡してはいけないもの:**
- `weatherCode`（数値コード → 天気アイコン/ラベルに変換してから渡す）
- `DateRange`（日付オブジェクト → フォーマット済み文字列に変換してから渡す）
- `PrevYearScope`（比較スコープ → ラベル文字列に変換してから渡す）
- `AsyncDuckDBConnection`（DuckDB 接続 → Controller が保持）
- raw query result（`Row[]` → ViewModel に変換してから渡す）
- store selection の解決ロジック（解決済みの値のみ渡す）

**View に渡してよいもの:**
- `TimeSlotChartVM`（表示用に変換済みのデータ構造）
- `EChartsOption`（OptionBuilder で構築済みのチャート設定）
- 表示状態（`detailView`, `lineMode` 等の UI ローカル状態）
- click handler（`onSelectHour`, `onDetailViewChange` 等）

**適用例:**
- `TimeSlotChart`（Controller）が `useDuckDBTimeSlotData` でデータ取得し、
  `toWeatherHourlyDisplayList` で weatherCode を表示モデルに変換してから
  `TimeSlotChartView` に渡す
- `DailySalesChart`（Controller）が `DailySalesChartBody`（View）に chartOption と
  KPI サマリーのみを渡す。View は DuckDB 接続を知らない
- `buildTimeSlotChartOption`（OptionBuilder）は Controller 内で呼ばれ、
  結果の `EChartsOption` だけが View に渡る

**原則:** Controller/View/OptionBuilder の三層分離を維持する。
View は「ViewModel → JSX」の純粋変換。ドメイン値の解釈は Controller か OptionBuilder が担う。

### 19. 独立互換のために正本設計を汚さない

包含型分析ユニット（`IntegratedSalesChart`, `IntegratedCategoryAnalysis`）が正本。
暫定互換として残す独立ウィジェット（`UnifiedTimeSlotWidget` 等）のために、
正本側のインターフェースや構造を曲げてはならない。

**禁止パターン:**
- `TimeSlotChart` の context 対応で、旧 props との分岐が Controller の主要ロジックを
  汚染する（旧 props は context 不在時のフォールバックに限定する）
- `IntegratedSalesChart` に、独立利用時のみ必要なフラグや特殊分岐を追加する
- 正本コンテナの Props を、独立ウィジェットの便宜のために緩める

**正しいパターン:**
- `TimeSlotChart` は `context` 優先。旧 props は `@deprecated` + フォールバック。
  context がある場合は旧 props を無視する
- 独立ウィジェットが追加の変換が必要なら、ラッパー側（`UnifiedTimeSlotWidget`）で対応
- 新規改善はすべて包含型コンテナ側に寄せる。独立ウィジェットへの機能追加は停止

**適用例:**
- `TimeSlotChart` の Props: `context?` + `@deprecated currentDateRange?` + `@deprecated selectedStoreIds?`
  + `@deprecated prevYearScope?`。context がある場合は旧 props を全て無視
- `UnifiedTimeSlotWidget` は registry から旧 props を渡すラッパー。正本には含まれない

**原則:** 移行期間中の互換レイヤーは、正本の外側に置く。
正本が互換のために設計を曲げた瞬間、移行は永久に完了しない。

---

## 反例集（やりがちだがダメなパターン）

以下は実際に起きた、または起きかけた問題パターンと、その構造的な解決策である。

### 反例 1: ビジネス用語を文字列リテラルでハードコード

**ダメな例:**

```typescript
// domain/models/Settings.ts
type CustomCategory = '市場仕入' | 'LFC' | 'サラダ' | '加工品' | '消耗品' | '直伝' | 'その他'

// presentation/pages/Category/categoryData.ts
const COLORS: Record<string, string> = {
  '市場仕入': '#f59e0b',
  'LFC': '#3b82f6',
}

// presentation/pages/Admin/AdminPage.tsx
{CUSTOM_CATEGORIES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
```

**何が壊れるか:** カテゴリ名の変更が 126 ファイルに波及する。色マップ・UI 選択・ストア・テストが
全て同じ文字列に依存しており、1箇所の typo で実行時エラー。型チェックでは検出できない。

**正しいパターン:**

```typescript
// domain/constants/customCategories.ts
type PresetCategoryId = 'market_purchase' | 'lfc' | 'salad' | ...
const PRESET_CATEGORY_DEFS = [
  { id: 'market_purchase', label: '市場仕入', isPreset: true },
  ...
]
const PRESET_CATEGORY_LABELS: Record<PresetCategoryId, string> = { ... }

// presentation
const COLORS: Record<PresetCategoryId, string> = {
  market_purchase: '#f59e0b',  // ID で参照
}
{CATEGORIES.map((cc) => <option key={cc.id} value={cc.id}>{cc.label}</option>)}
```

**根拠:** ID（識別）とラベル（表示）を分離する。
ラベルは UI の関心、ID はロジックの関心。混同すると変更が全レイヤーに波及する。

### 反例 2: 売変タイプを条件分岐にハードコード

**ダメな例:**

```typescript
colorHint:
  e.type === '71' ? 'negative'
  : e.type === '72' ? 'warning'
  : e.type === '73' ? 'info'
  : 'secondary'
```

**何が壊れるか:** 新しい売変タイプ（例: `'75'`）追加時に、分岐のどこかで漏れる。
`DISCOUNT_TYPES` 定数は存在するのに参照されず、二重管理になる。

**正しいパターン:**

```typescript
const DISCOUNT_COLOR_HINTS: Record<DiscountType, ColorHint> = {
  '71': 'negative',
  '72': 'warning',
  '73': 'info',
  '74': 'secondary',
}
colorHint: DISCOUNT_COLOR_HINTS[e.type] ?? 'secondary'
```

**根拠:** 定数を定義しても、全箇所で使わなければ意味がない。
マップにすればキーの追加が1行で済み、漏れは型エラーで検出できる。

### 反例 3: 指標 ID に意味を詰め込みすぎる

**ダメな例:**

```typescript
type MetricId = 'salesBudgetAchievementRate' | 'gpBudgetAchievementRate'
// → ID 自体がグルーピング情報を持つ。ID を変えると分類が壊れる。
```

**何が壊れるか:** ID の命名規則に暗黙の構造がエンコードされる。
「sales で始まる指標」「Budget を含む指標」のようなパターンマッチに依存し、
ID をリネームするとフィルタが壊れる。

**正しいパターン:**

```typescript
// ID は安定した識別子（意味を持ちすぎない）
type MetricId = 'budgetAchievementRate' | 'grossProfitBudgetAchievement'

// 構造はメタデータ（tokens）で外付け
const METRIC_DEFS = {
  budgetAchievementRate: {
    tokens: { entity: 'sales', domain: 'budget', measure: 'achievement' },
  },
  grossProfitBudgetAchievement: {
    tokens: { entity: 'gp', domain: 'budget', measure: 'achievement' },
  },
}

// フィルタはトークンで
const budgetMetrics = Object.entries(METRIC_DEFS)
  .filter(([, m]) => m.tokens.domain === 'budget')
```

**根拠:** ID は変えにくい（永続化・URL パラメータに使われる）。
分類は変わりうる（新しいグルーピングが追加される）。
変わるもの（構造）と変えにくいもの（ID）を分離する。

### 反例 4: 平均の種類を混同する

**ダメな例:**

```typescript
// 月平均を日数で割る
const monthlyAverage = yearTotal / 12  // 各月の営業日数が違う！

// 曜日平均を一律で計算
const sundayAverage = sundayTotal / 4  // その月の日曜日が4日とは限らない！
```

**何が壊れるか:** 2月は28日、3月は31日。祝日で営業日が異なる。
一律の除数を使うと、営業日が少ない月の平均が過大評価され、
逆に営業日が多い月は過小評価される。曜日別でも同様。

**正しいパターン:**

```typescript
// 営業日をカウントして使う
const mondayCount = actualMondaysInMonth  // 実際の月曜日数（祝日除外）
const mondayAverage = mondayTotal / mondayCount

// 月平均は営業日ベース
const monthAverage = monthTotal / salesDaysInMonth

// 加重平均が必要な場合は明示する
const weightedAverage = Σ(value_i × weight_i) / Σ(weight_i)
```

**根拠:** 平均には「単純平均」「加重平均」「営業日ベース平均」の区別がある。
売上データでは営業日数が月・曜日で異なるため、除数は実測値を使う。
`averageDailySales = totalSales / salesDays`（営業日ベース）が基本。

### 反例 5: 予算の経過按分を均等日割りで決め打つ

**ダメな例:**

```typescript
const elapsedBudget = totalBudget * (elapsedDays / daysInMonth)
```

**何が壊れるか:** 日別予算が曜日で異なる場合（土日は売上が多い→予算も多い）、
均等日割りでは経過予算を過小/過大評価する。
消化率が実態と乖離し、進捗ギャップが誤った方向を示す。

**正しいパターン:**

```typescript
// 日別予算の累計を使う
let cumulativeBudget = 0
for (let d = 1; d <= elapsedDays; d++) {
  cumulativeBudget += budgetDaily.get(d) ?? 0
}
const budgetElapsedRate = cumulativeBudget / totalBudget
```

**根拠:** 予算は「いつ使う予定か」の情報を含む。
日別予算（`budgetDaily`）が存在するなら、それを累計すべき。
均等日割りはフォールバック（日別予算が無い場合のみ）として使う。

### 反例 6: 計算ロジックを Presentation 層に書く

**ダメな例:**

```typescript
// presentation/pages/Dashboard/PlanActualForecast.tsx
const projectedGP = projectedSales * effectiveGPRate  // ← UI で計算している
const gpAchievement = projectedGP / gpBudget           // ← UI で計算している
```

**何が壊れるか:**
- 同じ計算が複数ページで重複する（DRY 違反）
- テストが困難（React コンポーネントのレンダリングが必要）
- Explanation（説明責任）の対象外になる（Domain/Application 層でしか追跡できない）
- 禁止事項 #6（UI が生データソースを直接参照しない）に違反

**正しいパターン:**

```typescript
// domain/calculations/budgetAnalysis.ts
readonly projectedGrossProfit: number  // Domain で計算
readonly projectedGPAchievement: number

// presentation では結果を参照するだけ
<KpiCard value={result.projectedGPAchievement} />
```

**根拠:** 計算は Domain 層、表示は Presentation 層。
UIは「描画のみ」の原則（設計原則 #9）に従う。

### 反例 7: 子チャートが比較文脈を再計算する

**ダメな例:**

```typescript
// presentation/components/charts/TimeSlotChart.tsx
// 親から dateRange を受けたのに、独自に前年範囲を導出
const prevYearRange = useMemo(() => ({
  from: { ...dateRange.from, year: dateRange.from.year - 1 },
  to: { ...dateRange.to, year: dateRange.to.year - 1 },
}), [dateRange])
```

**何が壊れるか:**
- 親が「前年同曜日比較」を選んでいるのに、子が「前年同日比較」で再計算する
- 閏年・月跨ぎの処理が親と子で異なり、比較データが不整合になる
- 親の comparisonScope に含まれる dowOffset が子で無視される
- 複数の子チャートが各自の前年範囲を持ち、ダッシュボード上で比較基準がバラバラになる

**正しいパターン:**

```typescript
// 親コンテナが文脈を構築
const parentContext = buildSalesAnalysisContext(
  currentDateRange, selectedStoreIds, prevYearScope,
)

// 子は context から受け取るだけ（再計算しない）
<TimeSlotChart context={drillContext} />

// drillContext は deriveChildContext() で dateRange だけ上書き
// comparisonScope は親のものをそのまま継承
const drillContext = deriveChildContext(parentContext, rangeDateRange)
```

**根拠:** 比較文脈（前年/前週/同曜日）の決定は親の責務（設計原則 #17）。
子が独自に再計算すると、同じダッシュボード上で異なる比較基準が混在し、
ユーザーに誤った分析結果を提示するリスクがある。

### 反例 8: View に weatherCode を直接渡す

**ダメな例:**

```typescript
// Controller → View に生の weatherCode を渡す
<TimeSlotChartView
  curWeatherCodes={d.curWeatherAvg.map(w => w.weatherCode)}
/>

// View 内で weatherCode を解釈する
{weatherCode === 0 && <SunIcon />}     // ← 0 は晴れだが falsy！
{weatherCode === 1 && <CloudIcon />}
{!weatherCode && <EmptyIcon />}        // ← weatherCode=0 が欠損扱い
```

**何が壊れるか:**
- `weatherCode=0`（晴天）が falsy チェックで除外される（禁止事項 #13 違反）
- 天気コードの意味解釈が View に分散する
- 新しい天気コード追加時、View 全箇所を修正する必要がある
- テスト困難（View のレンダリングが必要）

**正しいパターン:**

```typescript
// Controller で表示モデルに変換してから View に渡す
const curWeatherDisplay = toWeatherHourlyDisplayList(d.curWeatherAvg)
<TimeSlotChartView curWeather={curWeatherDisplay} />

// View は表示モデルのみ参照（コードの解釈をしない）
{weather.icon && <img src={weather.icon} alt={weather.label} />}
{weather.label}
```

**根拠:** ドメイン値の解釈は Controller か Domain 層で完結させる（設計原則 #18）。
View は変換済みの表示モデルを受け取るだけ。特に `number | null` 型の値は
truthiness チェックが危険（禁止事項 #13）なので、変換前に View に渡してはならない。

### 反例 9: 独立互換のために正本の Props を緩める

**ダメな例:**

```typescript
// IntegratedSalesChart が独立利用も想定して Props を緩める
interface Props {
  // 包含型の場合は context 渡し
  readonly context?: SalesAnalysisContext
  // 独立利用の場合は個別 props
  readonly currentDateRange?: DateRange
  readonly selectedStoreIds?: ReadonlySet<string>
  // 独立利用時のみ必要な特殊フラグ
  readonly standalone?: boolean
  readonly hideSubPanel?: boolean
}
```

**何が壊れるか:**
- 正本コンテナの Props が肥大化し、「どの組み合わせが有効か」が不明確になる
- `standalone` フラグで分岐が増え、テストケースが爆発する
- 互換レイヤーの要求が正本側に漏れ込み、永久に移行が完了しない

**正しいパターン:**

```typescript
// 正本コンテナは包含型の Props のみ持つ
interface Props {
  readonly daily: ReadonlyMap<number, DailyRecord>
  readonly duckConn: AsyncDuckDBConnection | null
  // ... 包含型に必要な props のみ
}

// 独立ウィジェットはラッパー側で変換
// registryChartWidgets.tsx
{
  id: 'chart-timeslot-sales',
  render: (ctx) => <UnifiedTimeSlotWidget ctx={ctx} />,
  // UnifiedTimeSlotWidget 内で旧 props → context 変換
}
```

**根拠:** 互換レイヤーは正本の外側に置く（設計原則 #19）。
正本が互換のために設計を曲げると、新旧の境界が曖昧になり移行が停滞する。
