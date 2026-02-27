# CLAUDE.md - 開発ルール

## プロジェクト概要

仕入荒利管理システム（shiire-arari）。小売業の仕入・売上・在庫データから粗利計算・
予算分析・売上要因分解・需要予測を行うSPA。

## プロジェクト構成

```
app/                          # アプリケーション本体
├── src/
│   ├── domain/               # ドメイン層（フレームワーク非依存）
│   │   ├── models/           # 型定義・データモデル
│   │   ├── calculations/     # 計算ロジック（粗利・予測・分解）
│   │   ├── repositories/     # リポジトリインターフェース
│   │   └── constants/        # 定数
│   ├── application/          # アプリケーション層
│   │   ├── context/          # React Context（状態管理）
│   │   ├── hooks/            # カスタムフック（useDuckDBQuery 含む）
│   │   ├── services/         # 計算キャッシュ・ハッシュ
│   │   ├── stores/           # Zustand ストア
│   │   ├── usecases/         # ユースケース
│   │   │   ├── calculation/  # 計算パイプライン（dailyBuilder, storeAssembler）
│   │   │   ├── explanation/  # 説明責任（ExplanationService）
│   │   │   └── import/       # ファイルインポート（FileImportService）
│   │   └── workers/          # Web Worker（計算の非同期実行）
│   ├── infrastructure/       # インフラ層
│   │   ├── dataProcessing/   # ファイルパーサー・プロセッサ
│   │   ├── duckdb/           # DuckDB-WASM（インブラウザ分析エンジン）
│   │   │   ├── engine.ts     # DB初期化・接続管理
│   │   │   ├── schemas.ts    # CREATE TABLE DDL
│   │   │   ├── dataLoader.ts # IndexedDB → DuckDB テーブルへのデータ投入
│   │   │   ├── queryRunner.ts # 汎用クエリ実行ユーティリティ
│   │   │   └── queries/      # SQL クエリモジュール群
│   │   ├── fileImport/       # ファイル種別判定・スキーマ定義
│   │   ├── storage/          # IndexedDB・localStorage
│   │   ├── sync/             # データ同期
│   │   ├── export/           # CSV/Excel出力
│   │   └── i18n/             # 国際化
│   └── presentation/         # プレゼンテーション層
│       ├── components/       # 共通コンポーネント・チャート（DuckDB ウィジェット含む）
│       ├── hooks/            # プレゼンテーション層フック
│       ├── pages/            # ページコンポーネント
│       └── theme/            # テーマ定義
.github/workflows/ci.yml     # CI パイプライン
```

### レイヤー間の依存ルール

`Presentation → Application → Domain ← Infrastructure`

- **domain/** はどの層にも依存しない（純粋なビジネスロジック）
- **application/** は domain/ のみに依存
- **infrastructure/** は domain/ のみに依存
- **presentation/** は application/ と domain/ に依存
- infrastructure/ と presentation/ は直接依存しない

## コマンド

```bash
cd app && npm run lint          # ESLint（エラー0で通ること）
cd app && npm run build         # tsc -b（型チェック）+ vite build
cd app && npm test              # vitest run（全テスト）
cd app && npx vitest run <path> # 特定テスト実行
cd app && npm run format:check  # Prettier フォーマットチェック
cd app && npm run test:e2e      # Playwright E2Eテスト
```

### CI パイプライン（PR・push to main で自動実行）

1. `npm run lint` — ESLint（**エラー0必須**、warningは許容）
2. `npm run build` — tsc -b + vite build（**TypeScript strict mode**）
3. `npm test` — vitest（**全テスト合格必須**）

## コーディング規約

### 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| 型・インターフェース | PascalCase | `StoreResult`, `DailyRecord` |
| 変数・関数 | camelCase | `totalSales`, `calculateGrossProfit` |
| 定数 | UPPER_SNAKE_CASE | `MAX_DAYS`, `DEFAULT_RATE` |
| コンポーネント | PascalCase | `DashboardPage`, `KpiCard` |
| テストファイル | `*.test.ts(x)` | `factorDecomposition.test.ts` |
| Boolean | is/has/should/needs 接頭辞 | `isCalculated`, `hasPrevYear` |

### TypeScript

- **strict mode 有効**（tsconfig.app.json）
- `noUnusedLocals: true` / `noUnusedParameters: true` — ビルドで強制
- パスエイリアス: `@/` → `src/`（import は `@/domain/...` の形式）
- `readonly` を積極的に使用（イミュータブル設計）

### スタイリング

- styled-components 6 を使用
- テーマトークン経由でカラー・スペーシングを参照
- ダーク/ライトテーマ対応

## データフローアーキテクチャ

### 設計思想: 4つの役割

データは以下の4段階を経てUIに到達する。各段階の責務を混ぜてはならない。

```
  役割1              役割2              役割3             役割4
  データソース        計算               データセット構築    動的フィルタ
  の組み合わせ                          （インデックス化）   ＋表示用変換

  infrastructure    domain/            application/       application/
  + application     calculations       usecases           hooks
```

| 役割 | 責務 | やらないこと |
|---|---|---|
| **1. 組み合わせ** | 複数ファイル由来のデータを店舗×日で突き合わせる | 計算、UI表示 |
| **2. 計算** | 導出値の算出（粗利、値入率、売変率、構成比等） | データ取得、UI表示 |
| **3. データセット構築** | 計算済みの値をUIが使いやすい構造にまとめる | ユーザー操作への応答 |
| **4. 動的フィルタ** | ユーザー操作（店舗選択、日付範囲、ドリルダウン）に応じてデータセットを絞り込み、表示用データを生成する | 生データの走査、ビジネスロジック計算 |

### なぜ4段階か

**役割3と4を分ける理由:**
- 役割3（インデックス構築）はデータインポート時に1回だけ実行する重い処理
- 役割4（動的フィルタ）はユーザー操作のたびに実行する軽い処理
- 両者を混ぜると、ユーザーがスライダーを動かすたびにインデックス再構築が走るか、
  またはUIが生レコード配列を毎回走査することになる

### データフロー図

```
  ファイル群               計算パイプライン           インデックス
 ┌──────────┐           ┌──────────────┐         ┌────────────────┐
 │ 分類別売上 │─┐         │ dailyBuilder │         │ StoreResult    │
 │ 仕入Excel │─┤ 役割1    │ storeAssemb. │ 役割2-3  │ TimeSlotIndex  │
 │ 花Excel  │─┼────→    │ (計算+構築)  │────→    │ CategoryIndex  │
 │ 産直Excel │─┤         └──────────────┘         └───────┬────────┘
 │ 移動Excel │─┤                                          │
 │ 時間帯CSV │─┤                                     役割4 │
 │ 部門KPI  │─┘                                    (hooks) │
 └──────────┘                                             ↓
                                                 ┌────────────────┐
                                                 │ 表示用データ    │
                                                 │ (View Models)  │
                                                 └───────┬────────┘
                                                         │
                                                         ↓
                                                 ┌────────────────┐
                                                 │ UI（描画のみ） │
                                                 └────────────────┘
```

### UI の責務

UIコンポーネントは**描画のみ**を行う。具体的には:

- hooks が返した表示用データを受け取り、チャート・テーブル・KPIに描画する
- ユーザー操作（スライダー、ドロップダウン、タブ切替）の**状態**を管理する
- ユーザー操作の結果を hooks に渡して表示用データの再生成をトリガーする

UIが**やってはならない**こと:

- 生レコード配列（`records[]`）を直接走査してフィルタ・集約する
- `computeDivisor` 等の計算ロジックをインラインで実装する
- 複数のデータソースの値を突き合わせて独自に計算する

### 純粋関数の一元管理

フィルタリング・除数計算等の純粋関数は一箇所で定義し、全チャートが共有する。
インラインでの独自実装は禁止。詳細は `PeriodFilter.tsx` の設計ルール
（RULE-1〜RULE-6）を参照。

| ID | 関数名 | 役割 |
|---|---|---|
| TR-DIV-001 | `computeDivisor` | mode + day数 → 除数（>= 1 保証） |
| TR-DIV-002 | `countDistinctDays` | records → distinct day 数 |
| TR-DIV-003 | `computeDowDivisorMap` | records → 曜日別除数 Map |
| TR-FIL-001 | `filterByStore` | records + storeIds → 店舗絞込 |

### 既知の課題と移行方針

既存の時間帯・カテゴリ系ウィジェットでは `categoryTimeSales`（分類別時間帯売上）と
`departmentKpi`（部門別KPI）の生データが `WidgetContext` 経由でUIに渡されている。
DuckDB ウィジェット群はこの問題を SQL 集約で解決しているが、
既存ウィジェットでは引き続きこの状態が残っている。

**移行方針（既存ウィジェット向け）:**
1. Application層にインデックス構築関数を作成し、生レコードを検索・集約しやすい
   構造に変換する
2. Application層の hooks がインデックス + ユーザー選択 → 表示用データを生成する
3. UIコンポーネントは hooks が返した表示用データのみを参照する
4. `WidgetContext` から `categoryTimeSales: CategoryTimeSalesData` を除去する

**移行時の注意:**
- 既存の `PeriodFilter.tsx` の純粋関数（computeDivisor 等）は活用する
- `divisorRules.test.ts` のアーキテクチャガードテストを維持する
- 段階的に1コンポーネントずつ移行し、各段階でテスト・ビルドを通す
- DuckDB ウィジェットでは上記の問題は既に解消済み（SQL 集約 → hooks → UI の流れ）

### データソースの分離

本システムの売上データは複数ファイルに由来し、合計が一致する保証がない:

| データ | 由来 | 用途 |
|---|---|---|
| `classifiedSales` | 分類別売上CSV | 総売上・売変・客数（`StoreResult` の基準値） |
| `categoryTimeSales` | 分類別時間帯CSV | 時間帯分析・カテゴリドリルダウン |

- 丸め誤差・集計タイミング差・対象範囲差により数%乖離する
- 計算パイプラインは常に `classifiedSales` 由来の値（`StoreResult.totalSales`）に
  アンカーする
- `FileImportService.ts`（`application/usecases/import/`）の `validateImportedData`
  で1%以上の乖離を警告表示

## DuckDB-WASM インブラウザ分析

### 概要

DuckDB-WASM をインブラウザ SQL エンジンとして統合し、月制約を超えた自由日付範囲での
分析を可能にした。既存の JS 集約パス（`WidgetContext` + `PeriodFilter`）と並行して
動作し、ユーザーはウィジェット設定パネルから DuckDB 版と従来版を選択できる。

### アーキテクチャ

```
  IndexedDB           DuckDB-WASM             React hooks         UI
 ┌──────────┐       ┌──────────────┐        ┌──────────────┐    ┌──────────┐
 │ 保存済み  │       │ engine.ts    │        │ useDuckDB    │    │ DuckDB   │
 │ インポート│ load  │ schemas.ts   │ query  │ useDuckDB-   │    │ ウィジェ │
 │ データ   │──→   │ dataLoader.ts│──→    │ Query.ts     │──→│ ット群   │
 └──────────┘       │ queries/*.ts │        │ (18 hooks)   │    │ (15個)   │
                    └──────────────┘        └──────────────┘    └──────────┘
```

**データフロー:**
1. ユーザーがファイルインポート → IndexedDB に保存（既存フロー）
2. `useDuckDB` フックが IndexedDB → DuckDB テーブルにデータ投入（`dataLoader.ts`）
3. DuckDB に SQL クエリを発行し、集約済み結果を取得（`queries/*.ts`）
4. `useDuckDBQuery.ts` の各フックが SQL 結果を React ステートとして返す
5. DuckDB ウィジェットはフックの戻り値のみを参照して描画

### レイヤー配置

| レイヤー | ファイル | 責務 |
|---|---|---|
| **Infrastructure** | `duckdb/engine.ts` | DB 初期化、接続プール管理 |
| | `duckdb/schemas.ts` | テーブル DDL（`store_day_summary`, `time_slots`, `category_time_sales`） |
| | `duckdb/dataLoader.ts` | IndexedDB → DuckDB バルクロード |
| | `duckdb/queryRunner.ts` | 汎用 `runQuery<T>()` ユーティリティ |
| | `duckdb/queries/*.ts` | SQL クエリ関数（6 モジュール） |
| **Application** | `hooks/useDuckDB.ts` | DB 初期化 + データロード管理フック |
| | `hooks/useDuckDBQuery.ts` | 18 個のクエリフック（`useAsyncQuery` ベース） |
| **Presentation** | `charts/DuckDB*.tsx` | 15 個の DuckDB ウィジェット |
| | `charts/DuckDBDateRangePicker.tsx` | 自由日付範囲セレクタ |

### クエリモジュール一覧

| モジュール | 主要クエリ関数 | 用途 |
|---|---|---|
| `categoryTimeSales.ts` | `queryHourlyAggregation`, `queryLevelAggregation`, `queryStoreAggregation`, `queryHourDowMatrix`, `queryCategoryDailyTrend`, `queryCategoryHourly` | 時間帯集約、カテゴリ分析 |
| `departmentKpi.ts` | `queryDeptKpiRanked`, `queryDeptKpiSummary`, `queryDeptKpiMonthlyTrend` | 部門 KPI |
| `storeDaySummary.ts` | `queryDailyCumulative`, `queryAggregatedRates` | 累積売上、指標推移 |
| `yoyComparison.ts` | `queryYoyDailyComparison`, `queryYoyCategoryComparison` | 前年比較 |
| `features.ts` | `queryDailyFeatures`, `queryHourlyProfile`, `queryDowPattern` | 特徴量、時間帯プロファイル、曜日パターン |
| `advancedAnalytics.ts` | `queryCategoryMixWeekly`, `queryStoreBenchmark` | 構成比推移、店舗ベンチマーク |

### DuckDB ウィジェット一覧（15個）

| ウィジェット | 分析内容 | サイズ |
|---|---|---|
| `DuckDBFeatureChart` | 日次特徴量分析 | full |
| `DuckDBCumulativeChart` | 累積売上推移 | full |
| `DuckDBYoYChart` | 前年同期比較 | full |
| `DuckDBDeptTrendChart` | 部門 KPI トレンド | full |
| `DuckDBTimeSlotChart` | 時間帯別売上（前年比較付き） | full |
| `DuckDBHeatmapChart` | 時間帯×曜日ヒートマップ | full |
| `DuckDBDeptHourlyChart` | 部門別時間帯パターン | full |
| `DuckDBStoreHourlyChart` | 店舗×時間帯比較 | full |
| `DuckDBDowPatternChart` | 曜日パターン分析 | half |
| `DuckDBHourlyProfileChart` | 時間帯プロファイル | half |
| `DuckDBCategoryTrendChart` | カテゴリ別日次売上推移 | full |
| `DuckDBCategoryHourlyChart` | カテゴリ×時間帯ヒートマップ | full |
| `DuckDBCategoryMixChart` | カテゴリ構成比の週次推移 | full |
| `DuckDBStoreBenchmarkChart` | 店舗ベンチマーク（ランキング推移） | full |
| `DuckDBDateRangePicker` | 自由日付範囲セレクタ（ウィジェットではなくコントロール） | — |

### 設計原則

1. **既存パスとの並行運用**: DuckDB ウィジェットは新規追加であり、既存ウィジェットは
   そのまま残す。ユーザーがウィジェット設定で選択する。
2. **SQL 集約の徹底**: DuckDB ウィジェットは SQL で集約済みデータを取得し、
   UI での生レコード走査を排除する（禁止事項6の DuckDB 版での解消）。
3. **月跨ぎ対応**: `duckDateRange`（自由日付範囲）を使い、月単位制約を超えた分析が可能。
   `useDuckDB` フックが複数月のデータを DuckDB にロードする。
4. **非同期安全**: `useAsyncQuery` フックがシーケンス番号によるキャンセル制御を内蔵し、
   古いクエリ結果が新しい結果を上書きしない。
5. **可視性制御**: 各ウィジェットの `isVisible` で DuckDB 未準備時（`duckDataVersion === 0`）
   やデータ不足時に非表示。店舗比較系は `stores.size > 1` をガード。

## 要因分解ロジックのルール

### 数学的不変条件（絶対に守ること）

全ての分解関数は **シャープリー恒等式** を満たさなければならない:

- `decompose2`: `custEffect + ticketEffect = curSales - prevSales`
- `decompose3`: `custEffect + qtyEffect + pricePerItemEffect = curSales - prevSales`
- `decompose5`: `custEffect + qtyEffect + priceEffect + mixEffect = curSales - prevSales`

**合計値は実際の売上差（`curSales - prevSales`）に完全一致しなければならない。**
カテゴリデータから独自に合計を再計算してはならない。

### 2↔3↔5要素間の一貫性

- `decompose5` の `custEffect` と `qtyEffect` は `decompose3` と同じ値になること
- `decompose5` の `priceEffect + mixEffect` は `decompose3` の `pricePerItemEffect` と一致すること
- UIで分解レベルを切り替えた際に客数・点数効果の値が変わらないこと

## テストの方針

### 必須テスト

計算ロジック（`domain/calculations/`）を変更した場合:

1. 既存テストが全て通ること
2. 新しいエッジケースのテストを追加すること
3. ゼロ除算・null・NaN のガードを検証すること

### 不変条件テスト（invariant tests）

`factorDecomposition.test.ts` に数学的不変条件テストがある。
分解ロジックを変更した場合は:

1. 既存の不変条件テストが全て通ること
2. データソース不一致シナリオでも合計が一致することを検証すること
3. 2↔3↔5要素間の一貫性テストを通すこと

## 説明責任（Explanation / Evidence）アーキテクチャ

本システムの計算結果は経営判断に使われる。**数値の信頼性は「なぜこの値か」が
追跡可能であることで初めて保証される。** 以下の設計思想に基づき、全ての主要指標に
説明データ（Explanation）を付与する。

### 3つの要件

| # | 要件 | 問いかけ | 実装 |
|---|---|---|---|
| 1 | **式の透明化** | 「この値はどの式で算出？」 | `Explanation.formula` に人間可読な計算式 |
| 2 | **入力の追跡** | 「どのデータが寄与？」 | `Explanation.inputs[]` で入力パラメータを列挙、`metric` で指標間リンク |
| 3 | **ドリルダウン** | 「月→日→元データまで辿れるか？」 | `Explanation.breakdown[]` で日別内訳、`evidenceRefs[]` で元データ参照 |

### レイヤー配置

```
Domain層    → Explanation / MetricId / EvidenceRef 型定義のみ（ロジックなし）
Application層 → ExplanationService（usecases/explanation/）が StoreResult から Explanation を生成
               useExplanation フックで遅延生成（useMemo）
Presentation層 → MetricBreakdownPanel（モーダル）で表示
               KpiCard.onClick → onExplain(metricId) で起動
```

### 設計原則

1. **計算を再実行しない**: ExplanationService は StoreResult の値をそのまま使う。
   計算パイプライン（CalculationOrchestrator）は変更しない。
2. **Domain層は純粋に保つ**: `domain/models/Explanation.ts` は型定義のみ。
   生成ロジックは `application/usecases/explanation/ExplanationService.ts` に置く。
3. **遅延生成**: Explanation は useMemo で計算結果に連動して生成。
   全指標を事前計算せず、表示時に必要な分だけキャッシュする。
4. **指標間ナビゲーション**: ExplanationInput.metric でリンク先を持ち、
   MetricBreakdownPanel 内でクリックして別指標の根拠に遷移できる。

### 対象指標（MetricId）

| グループ | MetricId | 指標名 |
|---|---|---|
| 売上系 | `salesTotal`, `coreSales`, `grossSales` | 総売上, コア売上, 粗売上 |
| 原価系 | `purchaseCost`, `inventoryCost`, `deliverySalesCost` | 総仕入, 在庫仕入, 売上納品 |
| 売変系 | `discountTotal`, `discountRate`, `discountLossCost` | 売変額, 売変率, 売変ロス原価 |
| 値入率 | `averageMarkupRate`, `coreMarkupRate` | 平均値入率, コア値入率 |
| 在庫法 | `invMethodCogs`, `invMethodGrossProfit`, `invMethodGrossProfitRate` | 原価, 粗利, 粗利率 |
| 推定法 | `estMethodCogs`, `estMethodMargin`, `estMethodMarginRate`, `estMethodClosingInventory` | 原価, マージン, マージン率, 期末在庫 |
| 客数 | `totalCustomers` | 来店客数 |
| 消耗品 | `totalConsumable` | 消耗品費 |
| 予算系 | `budget`, `budgetAchievementRate`, `budgetProgressRate`, `projectedSales`, `remainingBudget` | 予算, 達成率, 消化率, 予測, 残余 |

### 受け入れ基準

以下を満たすとき「説明責任が実装できた」と判定する:

1. 粗利 / 粗利率 / 売上 / 仕入 / 売変 の各指標で:
   - 計算式が表示される
   - 入力値が表示される
   - 月→日へのドリルダウンができる（店舗別）
2. 指標→日→元データ種別（出所）が辿れる
3. 入力パラメータのクリックで関連指標へ遷移できる

### 今後の拡張（第2段階以降）

- **差異の要因分解**: 前年比 / 予算比 / 先月比 での影響度（impact）表示
- **元ファイル行参照**: EvidenceRef にファイル名・行番号を持たせ、インポートエラー時に「どの行が原因」まで出せるようにする
- **Worker拡張**: 計算と同時にExplanationを生成し、非同期でUIに反映

## 禁止事項

以下はすべて**本プロジェクトで実際に発生したバグ**に基づく。
「こう書け」ではなく「これをやると壊れる」という制約として読むこと。
解決方法は状況に応じて柔軟に選んでよいが、制約自体は破ってはならない。

**制約の変更について:**
これらの制約は不変ではない。技術的前提やプロジェクト要件が変われば制約も変わりうる。
ただし制約を変更・緩和する場合は、**なぜその制約が不要になったか、
または維持するコストが利益を上回るようになったか**を明示すること。
「やりたいことの邪魔になるから」は理由にならない。
「この制約が防いでいたバグが、別の仕組みで防がれるようになった」は理由になる。

---

### 1. コンパイラ警告を黙らせてはならない

`noUnusedParameters` エラーに対して `_` リネームで対処してはならない。
`eslint-disable` コメントで lint エラーを握り潰してはならない。

**これをやると何が壊れるか:**
`decompose5` は `prevSales`/`curSales` を引数に受け取りながら内部で使っていなかった。
`_prevSales`/`_curSales` にリネームしてコンパイルを通した結果、
「売上データを無視している」という**重大なバグがコンパイラの警告ごと隠蔽された**。
要因分解の合計が実際の売上差と一致しない状態が、検出手段を失ったまま残った。

**壊れるパターン:**
- コンパイラやlinterが「おかしい」と指摘しているのに、指摘自体を消す
- 特に数学的関数で入力パラメータが無視されている場合、ほぼ確実にバグ
- 同系列の関数（decompose2, decompose3）では使われているパラメータが、
  ある関数だけ未使用なら、その関数の実装が間違っている

---

### 2. 引数を無視して別ソースから再計算してはならない

関数が `prevSales`/`curSales` 等を引数として受け取っているのに、
その値を使わず別のデータ（カテゴリデータ等）から合計を再計算してはならない。

**これをやると何が壊れるか:**
本システムの売上データは複数ファイルに由来する（詳細は「データソースの分離」を参照）。
`decompose5` がカテゴリデータから売上合計を独自再計算した結果、
シャープリー恒等式（`Σ効果 = curSales - prevSales`）が崩れた。
ウォーターフォールチャートの合計が売上差と一致しなくなった。

**壊れるパターン:**
- 引数で渡されている値と同じものを、別経路で再計算する
- 「どうせ同じ値だから」という前提を置く（データソースが異なれば一致しない）
- 合計値の算出元と比率の算出元を混同する

---

### 3. useMemo/useCallback の依存配列から参照値を省いてはならない

`useMemo`/`useCallback` 内で参照している値を依存配列に入れ忘れてはならない。
ESLint `react-hooks/exhaustive-deps` は **error** 設定であり、これを回避してはならない。

**これをやると何が壊れるか:**
`YoYWaterfallChart.tsx` と `DrilldownWaterfall.tsx` で `categoryTimeSales` 関連の
値が依存配列から漏れていた。ユーザーが新しいファイルをインポートしても
チャートが古いデータのまま更新されない「ステールデータ」バグが発生した。

**壊れるパターン:**
- 依存配列を手動で書いて、参照値を入れ忘れる
- 「再計算コストが高いから」と意図的に依存を省く（表示が壊れる）
- `// eslint-disable-next-line` で依存配列の警告を消す

---

### 4. 要因分解の合計を売上差と不一致にしてはならない

分解関数を変更した結果、効果の合計値が `curSales - prevSales` と
一致しなくなる状態にしてはならない。

**これをやると何が壊れるか:**
シャープリー値の効率性公理により、配分合計は全体の売上差と一致する必要がある。
これが崩れると:
- ウォーターフォールチャートの棒が「合計」に到達しない
- ユーザーが数値の信頼性を疑い、分析ツールとして使われなくなる
- 上流の意思決定に誤ったデータが渡る

**壊れるパターン:**
- カテゴリデータから合計を再計算する（禁止事項2と同根）
- 分解レベル間（2↔3↔5要素）で客数・点数効果の値が食い違う
- `factorDecomposition.test.ts` の不変条件テストを通さずにリリースする

---

### 5. domain/ 層に外部依存・副作用を持ち込んではならない

`domain/` 配下のコードが React、ブラウザAPI、外部ライブラリ、
ファイルI/O等に依存してはならない。

**これをやると何が壊れるか:**
`domain/calculations/` は純粋な数学関数であり、入力→出力の決定論的変換のみを行う。
副作用や外部依存が混入すると:
- 単体テストにモックが必要になり、テストの信頼性が落ちる
- 不変条件テスト（シャープリー恒等式の検証）が実行困難になる
- 計算バグの再現・修正に環境構築が必要になる

**壊れるパターン:**
- `domain/` 内で `import React` や `import { useXxx }` をする
- `domain/` 内で `localStorage`、`fetch`、`console.log` を使う
- `domain/` から `infrastructure/` や `presentation/` を参照する

---

### 6. UIコンポーネントが生データソースを直接参照してはならない

Presentation層のコンポーネントが `ImportedData` の生レコード
（`categoryTimeSales.records` 等）を直接受け取り、
フィルタ・集約・計算を行ってはならない。

**これをやると何が壊れるか:**
本システムのデータは複数ファイルに由来し、同じ「売上」でもソースによって値が異なる。
UIが生データを直接触ると:
- **データソースの混同**: 生レコードを集計した合計と、計算パイプラインが出した
  `StoreResult.totalSales` が一致しない。ユーザーは画面上の矛盾した数値を見ることになる。
- **計算ロジックの分散**: フィルタ・除数計算・集約ロジックがUIコンポーネント内に散在し、
  同じ計算を複数箇所で独自実装するリスクが生まれる。
- **テスト困難**: UIコンポーネント内の計算はReact環境でしかテストできず、
  純粋関数のユニットテストに比べて脆弱になる。

**壊れるパターン:**
- チャートコンポーネントが `categoryTimeSales.records` を props で受け取り、
  内部で `records.filter(...)` → `records.reduce(...)` する
- `WidgetContext` に `CategoryTimeSalesData`（生データ）を入れてUIに渡す
- 複数コンポーネントで同じフィルタ・集約ロジックをインラインで重複実装する
