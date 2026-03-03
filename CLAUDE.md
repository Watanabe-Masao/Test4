# CLAUDE.md - 開発ルール

## プロジェクト概要

仕入荒利管理システム（shiire-arari）。小売業の仕入・売上・在庫データから粗利計算・
予算分析・売上要因分解・需要予測を行うSPA。

## ロール・スキルシステム

本プロジェクトでは開発タスクの品質を構造的に保証するために
ロールベースの作業システムを導入している。
アプリの4層（Presentation → Application → Domain ← Infrastructure）と同様、
開発体制も4層で構成する。

### 4層モデル

| 層 | 担い手 | 責務 |
|---|---|---|
| Authority | 人間 | 何をやるか・やらないか（最終意思決定） |
| Orchestration | CLAUDE.md（本セクション） | タスク→ロール→連携の自動ルーティング |
| Identity | roles/*/ROLE.md | 各ロールの境界と責務 |
| Execution | roles/*/SKILL.md | 具体的な手順 |

### 組織構造: スタッフ部門 + 実務部門

スタッフ部門（横断的支援）と実務部門（直接的生産）の2階層で構成する。

**スタッフ部門（staff/）** — マネージャー・品質ゲート・記録

| ロール | 位置づけ | 渡し先 |
|---|---|---|
| pm-business | **マネージャー** 兼 要件の入口。タスク分解→連携指示→完了判定 | → architecture/implementation（タスク分解書） |
| review-gate | 品質の出口。pm-business の受入基準と照合 | → implementation（差し戻し） or → documentation-steward（完了記録） |
| documentation-steward | 全過程の記録 | → CLAUDE.md / references/ |

**実務部門（line/）** — 設計→実装→専門検証

| ロール | 位置づけ | 渡し先 |
|---|---|---|
| architecture | 設計判断 | → implementation（設計判断書） |
| implementation | コーディング | → review-gate（成果物） |
| specialist/invariant-guardian | 数学検証 | ← → implementation（双方向） |
| specialist/duckdb-specialist | DuckDB専門 | ← → implementation（双方向） |
| specialist/explanation-steward | 説明責任 | ← → implementation（双方向） |

### タスク完遂フロー

```
人間 → pm-business（★マネージャー: タスク分解・連携指示）
          │
          ├→ architecture（設計判断）
          │      │
          │      ▼
          └→ implementation ← → specialist/*
                    │
                    ▼
              review-gate（pm-business の受入基準と照合）
                 PASS → documentation-steward → 完了
                 FAIL → implementation（差し戻し）
```

### ルーティング表

| 作業内容 | 主ロール | 連携先 |
|---|---|---|
| 新機能の要件整理 | pm-business | → architecture |
| 層跨ぎのリファクタリング | architecture | → implementation |
| 計算ロジックの変更 | implementation | ← → invariant-guardian |
| DuckDB クエリの追加・変更 | implementation | ← → duckdb-specialist, architecture |
| Explanation 拡張 | implementation | ← → explanation-steward |
| PR レビュー・品質確認 | review-gate | ← implementation |
| ガードテスト追加・修正 | invariant-guardian | → implementation（テスト組込） |
| ドキュメント更新 | documentation-steward | ← 全ロール |

### 知識の3層分類

| 層 | 配置先 | 読むタイミング |
|---|---|---|
| **全員必読** | CLAUDE.md（本ファイル） | 常に（セッション開始時） |
| **ロール固有** | roles/*/ROLE.md + SKILL.md | タスク開始時（1-2ロール分） |
| **必要時参照** | references/ | 実装中に必要な箇所だけ |

### 越境検出

作業完了時、以下を自己チェックする:
- 自分の ROLE.md の You do に含まれる作業だけを行ったか？
- You do NOT に該当する作業をしていないか？
- Output の形式に従い、正しい渡し先に渡したか？
- スコープ外のファイルを変更していないか？

## プロジェクト構成

```
app/                          # アプリケーション本体
├── src/
│   ├── domain/               # ドメイン層（フレームワーク非依存）
│   │   ├── models/           # 型定義・データモデル
│   │   ├── calculations/     # 計算ロジック（粗利・予測・分解・感度分析等）
│   │   ├── repositories/     # リポジトリインターフェース
│   │   └── constants/        # 定数
│   ├── application/          # アプリケーション層
│   │   ├── context/          # React Context（状態管理）
│   │   ├── hooks/            # カスタムフック
│   │   │   └── duckdb/       # DuckDB クエリフック群（責務別に分割、~28フック）
│   │   ├── ports/            # ポートインターフェース（ExportPort 等）
│   │   ├── services/         # 計算キャッシュ・ハッシュ
│   │   ├── stores/           # Zustand ストア（dataStore, settingsStore, uiStore, analysisContextStore）
│   │   ├── usecases/         # ユースケース
│   │   │   ├── calculation/       # 計算パイプライン（dailyBuilder, storeAssembler）
│   │   │   ├── categoryTimeSales/ # 時間帯売上インデックス構築
│   │   │   ├── departmentKpi/     # 部門KPIインデックス構築
│   │   │   ├── explanation/       # 説明責任（ExplanationService）
│   │   │   ├── export/            # エクスポートサービス
│   │   │   └── import/            # ファイルインポート（FileImportService）
│   │   └── workers/          # Web Worker（計算の非同期実行）
│   ├── infrastructure/       # インフラ層
│   │   ├── dataProcessing/   # ファイルパーサー・プロセッサ
│   │   ├── duckdb/           # DuckDB-WASM（インブラウザ分析エンジン）
│   │   │   ├── engine.ts     # DB初期化・接続管理
│   │   │   ├── schemas.ts    # CREATE TABLE DDL（12テーブル + VIEW）
│   │   │   ├── dataLoader.ts # IndexedDB → DuckDB テーブルへのデータ投入
│   │   │   ├── queryRunner.ts # 汎用クエリ実行ユーティリティ
│   │   │   ├── queryParams.ts # パラメータバリデーション
│   │   │   ├── queryProfiler.ts # クエリパフォーマンス計測
│   │   │   ├── arrowIO.ts    # Arrow フォーマット I/O
│   │   │   ├── recovery.ts   # エラーリカバリ
│   │   │   ├── migrations/   # スキーママイグレーション
│   │   │   ├── worker/       # DuckDB Web Worker
│   │   │   └── queries/      # SQL クエリモジュール群（10モジュール）
│   │   ├── fileImport/       # ファイル種別判定・スキーマ定義
│   │   ├── storage/          # IndexedDB・localStorage
│   │   │   └── internal/     # 内部ストレージ操作（シリアライズ、キャッシュ等）
│   │   ├── export/           # CSV/Excel出力
│   │   ├── pwa/              # PWA / Service Worker
│   │   ├── utilities/        # ユーティリティ（murmurhash 等）
│   │   └── i18n/             # 国際化
│   ├── presentation/         # プレゼンテーション層
│   │   ├── components/       # コンポーネント
│   │   │   ├── charts/       # チャートライブラリ（DuckDB ウィジェット含む、80ファイル）
│   │   │   ├── common/       # 共通UIコンポーネント（Button, Card, Modal 等）
│   │   │   ├── Layout/       # レイアウト（AppShell, NavBar, BottomNav, Drawer, Sidebar 等）
│   │   │   └── DevTools/     # 開発ツール（QueryProfilePanel）
│   │   ├── hooks/            # プレゼンテーション層フック
│   │   ├── pages/            # ページコンポーネント
│   │   │   ├── Admin/        # 管理画面
│   │   │   ├── Analysis/     # 分析
│   │   │   ├── Category/     # カテゴリ分析
│   │   │   ├── CostDetail/   # 原価詳細
│   │   │   ├── Daily/        # 日次分析
│   │   │   ├── Dashboard/    # ダッシュボード（widgets/ 含む）
│   │   │   ├── Forecast/     # 需要予測
│   │   │   ├── Insight/      # インサイト
│   │   │   ├── Mobile/       # モバイル対応
│   │   │   └── Reports/      # レポート
│   │   └── theme/            # テーマ定義
│   ├── stories/              # Storybook ストーリー（co-located 設定、現在未作成）
│   └── test/                 # テストユーティリティ・セットアップ
.github/workflows/
├── ci.yml                    # CI パイプライン
└── deploy.yml                # デプロイワークフロー
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
cd app && npm run test:coverage # vitest + カバレッジレポート
cd app && npm run test:watch    # vitest ウォッチモード
cd app && npm run test:visual   # Playwright ビジュアルリグレッション
cd app && npm run storybook     # Storybook 開発サーバー（port 6006）
cd app && npm run dev             # Vite 開発サーバー
cd app && npm run preview         # Vite プレビューサーバー（E2Eテストで使用）
cd app && npm run format          # Prettier フォーマット修正
cd app && npm run test:e2e:ui     # Playwright インタラクティブUI
cd app && npm run build-storybook # Storybook プロダクションビルド
```

### CI パイプライン（PR・push to main で自動実行）

1. `npm run lint` — ESLint（**エラー0必須**、warningは許容）
2. `npm run format:check` — Prettier（**フォーマット準拠必須**）
3. `npm run build` — tsc -b + vite build（**TypeScript strict mode**）
4. `npx vitest run --coverage` — vitest + カバレッジ（**全テスト合格必須**）
5. `npm run test:e2e` — Playwright E2E テスト（**全シナリオ合格必須**）

**CI 環境:**
- Node.js 20（`actions/setup-node@v4`）
- concurrency 制御: 同一ブランチの重複実行を自動キャンセル
- E2E テスト前に `npx playwright install --with-deps` が必要（ローカル実行時）
- カバレッジ閾値: **lines 55%**（`domain/`, `infrastructure/`, `application/` が対象、`presentation/` は除外）

**デプロイ（deploy.yml）:**
- デプロイ先: **GitHub Pages**（OIDC トークン認証）
- トリガー: push to `main` または手動 `workflow_dispatch`
- CI と同一の品質ゲート（lint, format, build, test, E2E）を実行後にデプロイ

## コーディング規約

### 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| 型・インターフェース | PascalCase | `StoreResult`, `DailyRecord` |
| 変数・関数 | camelCase | `totalSales`, `calculateGrossProfit` |
| 定数 | UPPER_SNAKE_CASE | `COST_RATE_MIN`, `ALL_STORES_ID` |
| コンポーネント | PascalCase | `DashboardPage`, `KpiCard` |
| テストファイル | `*.test.ts(x)` | `factorDecomposition.test.ts` |
| Boolean | is/has/should/needs 接頭辞 | `isCalculated`, `hasPrevYear` |

### TypeScript

- **strict mode 有効**（tsconfig.app.json）
- `noUnusedLocals: true` / `noUnusedParameters: true` — ビルドで強制
- パスエイリアス: `@/` → `src/`（import は `@/domain/...` の形式）
- `readonly` を積極的に使用（イミュータブル設計）
- `@typescript-eslint/no-explicit-any: 'error'` — `any` 型の使用は lint エラー

### スタイリング

- styled-components 6 を使用
- テーマトークン経由でカラー・スペーシングを参照
- ダーク/ライトテーマ対応
- テーマ定義: `presentation/theme/` 配下の5ファイル
  - `tokens.ts` — デザイントークン（palette, spacing, radii, shadows, typography）
  - `semanticColors.ts` — 色覚安全セマンティックカラー（`sc.positive`, `sc.negative` 等、Wong 2011 パレット準拠）
  - `theme.ts` — ダーク/ライトテーマ定義
- Prettier: `semi: false` / `singleQuote: true` / `printWidth: 100` / `endOfLine: "lf"`

## 設計思想 — 構造で守り、機械で検証する

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

**原則:** ルールを文書に書くだけでは守られない。テストに書けば壊れた瞬間に検出される。

### 2. データは境界を越えるたびに検証する

外部入力（ファイル、ユーザー操作、URL パラメータ）がシステム内部に入る地点で
バリデーションを行い、不正データが後段に到達することを構造的に不可能にする。

**適用例:**
- SQL クエリパラメータに Branded Type（`ValidatedDateKey`）を導入し、
  検証していない文字列がクエリに渡るとコンパイルエラー
- `storeIdFilter` で SQL インジェクション文字を排除してからクエリ組み立て
- `FileImportService` でインポート時にデータソース間の乖離を検出・警告

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
- `murmurhash.ts`, `diffCalculator.ts` の移動時に元パスに re-export を残置

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

## UI/UX 設計原則

既存の設計思想（純粋関数・4層構造・Explanation）を拡張する4つの原則。

### 原則1: 実績と推定は「別世界」

在庫法（実績P/L）と推定法（在庫差異検知）はUIで明確に視覚的分離する。

**用語統一:**

| 計算法 | 用語 | 使ってはいけない用語 |
|---|---|---|
| 在庫法 | 実績粗利益、実績粗利率、売上原価 | ー |
| 推定法 | 推定マージン、推定マージン率、推定原価 | 「粗利」（推定法の文脈で） |
| 推定法 | 推定期末在庫（理論値） | 「期末在庫」（バッジなし） |

**UI表現:**
- KpiCard に `badge` prop（`actual` / `estimated`）で視覚的分離
- 在庫法カード: 緑系アクセント（`sc.positive`）
- 推定法カード: オレンジ系アクセント（`palette.warningDark`）、青系は廃止
- カードタイトル直下に `CalcPurpose`（目的の一行説明）を必ず表示
- 混在表示禁止（原則）。並べる場合は「乖離」セクションを中央に置く

**計算不可時:**
- `invMethodCogs == null` の場合、`CalcNullGuide` で「期首在庫と期末在庫の設定が必要」と案内
- 値を `-` で表示するだけでは不十分。ユーザーに次のアクションを示す

### 原則2: 分析は「コンテキスト駆動」

ページではなく「分析コンテキスト（Analysis Context）」が主役。

**Analysis Context の構成要素:**

| 要素 | 内容 |
|---|---|
| 期間 | 対象期間（主）+ 比較期間（YoY/前週/前月） |
| 粒度 | 日/週/月（チャート側で勝手に違うものを禁止） |
| 対象 | 店舗（単店/全店/比較）・部門・カテゴリ階層 |
| データ系 | 実績/推定トグル（混同防止と連動） |

**原則:** フィルタは「どのページでも同じ場所にある」「同じ意味で効く」。
DuckDB チャートと非 DuckDB チャートで挙動が異なってはならない。

### 原則3: ドリルは3種類に固定

チャート・テーブルのクリック時の挙動を3タイプに標準化する。

| タイプ | 操作 | 効果 | 例 |
|---|---|---|---|
| **A: 絞り込み** | クリック | フィルタ追加・同一ページで再描画 | カテゴリ円グラフのスライス |
| **B: 明細遷移** | クリック | 詳細ページへパラメータ付き遷移 | 日次折れ線の点 → Daily ページ |
| **C: 比較遷移** | クリック | 比較セクションへ遷移（差異・要因分解） | 異常値の日 → Insight 要因分解 |

**原則:** 全チャートで同じ操作 → 同じタイプの結果。操作の一貫性が学習コストを下げる。

### 原則4: 全指標は監査可能

Explanation（説明責任）を3段階の UX で提供する。

| Level | 表示タイミング | 内容 | 実装 |
|---|---|---|---|
| **L1: 一言** | 常時表示 | 計算式の要約（例: 売上−原価） | KpiCard の `formulaSummary` prop |
| **L2: 式と入力** | クリック/ポップオーバー | 式 + 入力値 + データ出所 | MetricBreakdownPanel 「算出根拠」タブ |
| **L3: ドリルダウン** | 明細遷移 | 日別内訳 + 元データ参照 | MetricBreakdownPanel 「日別内訳」「根拠を見る」タブ |

**原則:** Explanation はモーダルで全部見せるのではなく、
カード（L1）→ ポップオーバー/モーダル（L2）→ 明細テーブル（L3）に分けて
思考の流れを壊さない。

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

| ID | 関数名 | 役割 | 定義場所 |
|---|---|---|---|
| TR-DIV-001 | `computeDivisor` | mode + day数 → 除数（>= 1 保証） | `periodFilterUtils.ts` / `usecases/categoryTimeSales/divisor.ts` |
| TR-DIV-002 | `countDistinctDays` | records → distinct day 数 | 同上 |
| TR-DIV-003 | `computeDowDivisorMap` | records → 曜日別除数 Map | 同上 |
| TR-FIL-001 | `filterByStore` | records + storeIds → 店舗絞込 | `periodFilterUtils.ts` |

**注意:** TR-DIV-001〜003 は現在 presentation 層（`periodFilterUtils.ts`）と
application 層（`usecases/categoryTimeSales/divisor.ts`）の2箇所に重複定義されている。
domain 層の `computeAverageDivisor`（`domain/calculations/utils.ts`）がより汎用的な
上位実装であり、将来的に統一予定。

### 既知の課題と移行方針

時間帯・カテゴリ系ウィジェットの CTS インデックス依存は DuckDB への統一が目標。

**完了済み:**
1. DuckDB クエリに `queryLevelAggregation`, `queryCategoryHourly`,
   `queryDistinctDayCount`, `queryDowDivisorMap` 等の集約関数を実装済み
2. 5つの Unified ウィジェットで DuckDB 優先パスを確立済み
3. `WidgetContext` から `categoryTimeSales: CategoryTimeSalesData`（生データ）を除去済み

**未完了（CTS → DuckDB 統一）:**
- `CategoryHierarchyExplorer` と `CategoryPerformanceChart` を DuckDB 版に移行
- Unified 5ウィジェットから CTS フォールバックパスを削除
- `WidgetContext` から `ctsIndex` / `prevCtsIndex` を除去
- `useAnalyticsResolver` から `'cts'` ソースを削除
- 不要になった CTS 集約関数（`aggregation.ts`, `filters.ts`）と
  レガシーチャート（`TimeSlotSalesChart` 等5つ）を削除

**移行時の注意:**
- `divisorRules.test.ts` のアーキテクチャガードテストを維持する
- 段階的に1コンポーネントずつ移行し、各段階でテスト・ビルドを通す

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
分析を可能にした。時間帯・カテゴリ等の多次元集約は DuckDB が担い、
KPI・粗利等の権威的指標計算は JS 計算パイプライン（`StoreResult`）が担う。

### アーキテクチャ

```
  IndexedDB           DuckDB-WASM             React hooks         UI
 ┌──────────┐       ┌──────────────┐        ┌──────────────┐    ┌──────────┐
 │ 保存済み  │       │ engine.ts    │        │ useDuckDB    │    │ DuckDB   │
 │ インポート│ load  │ schemas.ts   │ query  │ hooks/duckdb/│    │ ウィジェ │
 │ データ   │──→   │ dataLoader.ts│──→    │ (~28 hooks)  │──→│ ット群   │
 └──────────┘       │ queries/*.ts │        │ (11ファイル) │    │ (15個)   │
                    └──────────────┘        └──────────────┘    └──────────┘
```

**データフロー:**
1. ユーザーがファイルインポート → IndexedDB に保存（既存フロー）
2. `useDuckDB` フックが IndexedDB → DuckDB テーブルにデータ投入（`dataLoader.ts`）
3. DuckDB に SQL クエリを発行し、集約済み結果を取得（`queries/*.ts`）
4. `hooks/duckdb/` 配下の各フックが SQL 結果を React ステートとして返す
5. DuckDB ウィジェットはフックの戻り値のみを参照して描画

### レイヤー配置

| レイヤー | ファイル | 責務 |
|---|---|---|
| **Infrastructure** | `duckdb/engine.ts` | DB 初期化、接続ライフサイクル管理 |
| | `duckdb/schemas.ts` | テーブル DDL（12テーブル + `store_day_summary` VIEW）、`SCHEMA_VERSION` 管理 |
| | `duckdb/dataLoader.ts` | IndexedDB → DuckDB バルクロード |
| | `duckdb/queryRunner.ts` | 汎用 `runQuery<T>()` ユーティリティ |
| | `duckdb/queryParams.ts` | SQL パラメータのバリデーション（Branded Type 連携） |
| | `duckdb/queryProfiler.ts` | クエリパフォーマンス計測 |
| | `duckdb/arrowIO.ts` | Arrow フォーマット I/O |
| | `duckdb/recovery.ts` | DuckDB エラーリカバリ・自動回復 |
| | `duckdb/migrations/` | スキーママイグレーション（DDL バージョン管理） |
| | `duckdb/queries/*.ts` | SQL クエリ関数（10 モジュール） |
| **Application** | `hooks/useDuckDB.ts` | DB 初期化 + データロード管理フック |
| | `hooks/duckdb/*.ts` | クエリフック群（11ファイル、~28フック、`useAsyncQuery` ベース） |
| | `hooks/useDuckDBQuery.ts` | バレル re-export（後方互換） |
| **Presentation** | `charts/DuckDB*.tsx` | 15 個の DuckDB ウィジェット |
| | `charts/DuckDBDateRangePicker.tsx` | 自由日付範囲セレクタ |

#### DuckDB テーブル一覧

DuckDB スキーマは以下の基本テーブルと VIEW で構成される:

| テーブル | DDL 定数 | 用途 |
|---|---|---|
| `classified_sales` | `CLASSIFIED_SALES_DDL` | 分類別売上 |
| `category_time_sales` | `CATEGORY_TIME_SALES_DDL` | 分類別時間帯売上 |
| `time_slots` | `TIME_SLOTS_DDL` | 時間帯マスタ |
| `purchase` | `PURCHASE_DDL` | 仕入データ |
| `special_sales` | `SPECIAL_SALES_DDL` | 花・産直等の特殊売上 |
| `transfers` | `TRANSFERS_DDL` | 移動データ |
| `consumables` | `CONSUMABLES_DDL` | 消耗品データ |
| `department_kpi` | `DEPARTMENT_KPI_DDL` | 部門別KPI |
| `budget` | `BUDGET_DDL` | 予算データ |
| `inventory_config` | `INVENTORY_CONFIG_DDL` | 在庫設定 |
| `app_settings` | `APP_SETTINGS_DDL` | アプリケーション設定 |
| `store_day_summary` | — (VIEW) | 上記テーブルの LEFT JOIN による日次サマリ **VIEW** |

`SCHEMA_VERSION` によりテーブル定義のバージョンが管理され、
`migrations/` 配下のマイグレーションスクリプトでスキーマ変更を適用する。
`schema_meta` テーブルはマイグレーション追跡用のメタテーブルとして別途存在する。

#### DuckDB フック構成

フックは `application/hooks/duckdb/` 配下に責務別に分割されている
（設計思想4「変更頻度が異なるものは分離する」に従い、旧 `useDuckDBQuery.ts` から分割）:

```
hooks/duckdb/
├── index.ts                  # バレル re-export
├── useAsyncQuery.ts          # 基盤フック（シーケンス番号によるキャンセル制御）
├── useCtsQueries.ts          # 時間帯売上クエリ（8フック）
├── useDeptKpiQueries.ts      # 部門KPIクエリ（2フック）
├── useSummaryQueries.ts      # サマリクエリ（2フック）
├── useYoyQueries.ts          # 前年比較クエリ（2フック）
├── useFeatureQueries.ts      # 特徴量クエリ（3フック）
├── useAdvancedQueries.ts     # 高度分析クエリ（2フック）
├── useMetricsQueries.ts      # 指標クエリ（3フック）
├── useDailyRecordQueries.ts  # 日次レコードクエリ（3フック）
└── useConditionMatrix.ts     # 条件マトリクスクエリ
```

`hooks/useDuckDBQuery.ts` は後方互換のためバレル re-export として残存している。

### クエリモジュール一覧

| モジュール | 主要クエリ関数 | 用途 |
|---|---|---|
| `categoryTimeSales.ts` | `queryHourlyAggregation`, `queryLevelAggregation`, `queryStoreAggregation`, `queryHourDowMatrix`, `queryDistinctDayCount`, `queryCategoryDailyTrend`, `queryCategoryHourly`, `queryDowDivisorMap` | 時間帯集約、カテゴリ分析 |
| `departmentKpi.ts` | `queryDeptKpiRanked`, `queryDeptKpiSummary`, `queryDeptKpiMonthlyTrend` | 部門 KPI |
| `storeDaySummary.ts` | `queryStoreDaySummary`, `queryAggregatedRates`, `queryDailyCumulative`, `materializeSummary` | 累積売上、指標推移、VIEW 構築 |
| `yoyComparison.ts` | `queryYoyDailyComparison`, `queryYoyCategoryComparison` | 前年比較 |
| `features.ts` | `queryDailyFeatures`, `queryHourlyProfile`, `queryDowPattern`, `queryDeptDailyTrend` | 特徴量、時間帯プロファイル、曜日パターン |
| `advancedAnalytics.ts` | `queryCategoryMixWeekly`, `queryStoreBenchmark` | 構成比推移、店舗ベンチマーク |
| `budgetAnalysis.ts` | `queryDailyCumulativeBudget`, `queryBudgetAnalysisSummary` | 予算分析、累積予算対実績 |
| `dailyRecords.ts` | `queryDailyRecords`, `queryPrevYearDailyRecords`, `queryAggregatedDailyRecords` | 日次レコード詳細、前年日次データ |
| `storePeriodMetrics.ts` | `queryStorePeriodMetrics`, `queryStorePeriodMetricsSingle` | 店舗期間メトリクス |
| `conditionMatrix.ts` | `queryConditionMatrix` | 条件マトリクス集約 |

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

### 2つの計算エンジンの責務分離

本システムには2つの計算エンジンがあり、それぞれ**異なる責務**を持つ。
両方で同じことをやる「二重実装」は一貫性を欠き、保守コストを倍増させるため禁止する。

```
┌────────────────────────────────┐  ┌────────────────────────────────┐
│  JS 計算エンジン               │  │  DuckDB 探索エンジン            │
│  (domain/calculations)         │  │  (infrastructure/duckdb)       │
│                                │  │                                │
│  役割: 権威的な指標計算         │  │  役割: 自由範囲の探索・集約      │
│                                │  │                                │
│  ・シャープリー分解             │  │  ・月跨ぎ時系列分析             │
│  ・在庫法/推定法 粗利計算       │  │  ・時間帯×曜日×カテゴリ集約     │
│  ・予算達成率/消化率            │  │  ・異常検出 (Zスコア)           │
│  ・感度分析/回帰               │  │  ・店舗ベンチマーク             │
│  ・因果チェーン                │  │  ・カテゴリドリルダウン          │
│                                │  │                                │
│  出力: StoreResult             │  │  出力: SQL 集約結果             │
│  スコープ: 単月確定値           │  │  スコープ: 任意日付範囲          │
└────────────────────────────────┘  └────────────────────────────────┘
```

**JS 計算エンジンでなければならないもの:**
- `StoreResult` を生成する計算パイプライン（dailyBuilder, storeAssembler）
- シャープリー恒等式を満たす要因分解（不変条件テストが JS で検証）
- 在庫法・推定法の粗利計算（数学的正確性の保証が JS テストに依存）
- KPI カード、ウォーターフォール、感度分析等の `StoreResult` 消費ウィジェット

**DuckDB でなければならないもの:**
- 月跨ぎクエリ（JS の CTS インデックスは単月分のみ保持）
- 時間帯×曜日×カテゴリの多次元集約（SQL の GROUP BY が適切）
- 大量レコードの集約（10万件超の走査は SQL が JS より効率的）

**やってはならないこと:**
- 同じ集約ロジックを JS と SQL の両方に実装する（二重実装）
- 一部のウィジェットだけ DuckDB 対応し、同種の他のウィジェットは CTS のまま放置する
  （現状の Unified 5個 + CTS 専用 2個 は一貫性を欠いている）
- CTS インデックスによる JS 集約を「DuckDB のフォールバック」として維持する
  （フォールバックが必要なら全ウィジェットに適用すべきであり、
  一部だけに適用するのは中途半端で保守コストだけが増える）

### 現状の課題: CTS フォールバックの不完全な適用

CTS（CategoryTimeSalesIndex）による JS 集約パスは、DuckDB 導入前の
時間帯・カテゴリ分析の実装である。DuckDB 導入後、5つのウィジェットで
「DuckDB 優先、CTS フォールバック」の Unified パターンが適用されたが、
**同種の残り2つ（CategoryHierarchyExplorer, CategoryPerformanceChart）は
CTS 専用のまま** であり、一貫性がない。

「両方対応する」なら全てに同じことをやらなければならないが、
現状は中途半端であり、コード全体の一貫性に欠ける。

**目標状態:**
- CTS インデックスによる集約パスを廃止し、DuckDB に統一する
- `WidgetContext` から `ctsIndex` / `prevCtsIndex` を除去する
- `useAnalyticsResolver` から `'cts'` ソースを削除する
- CategoryHierarchyExplorer と CategoryPerformanceChart を DuckDB 版に移行する
- 対応する DuckDB クエリ（`queryLevelAggregation`, `queryCategoryHourly` 等）は既に存在する

### 設計原則

1. **エンジンの責務は排他的**: 1つのデータ集約に対して、JS と DuckDB の両方で
   実装してはならない。どちらが担うかを明確にし、一方だけに実装する。
2. **SQL 集約の徹底**: 時系列・カテゴリ分析は DuckDB の SQL で集約済みデータを取得し、
   UI での生レコード走査を排除する。
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

### ページ別の根拠表示対応状況

全6ページで MetricBreakdownPanel による根拠表示が利用可能。
「数字の根拠を示せること」がアプリケーションの最大の品質要件であり、
ユーザーがどのページからでも「なぜこの数字なのか？」を追跡できる状態を実現している。

| ページ | 対応状況 | 主な根拠表示対象 |
|---|---|---|
| **Dashboard** | `WidgetContext.onExplain` 経由で全ウィジェットから利用可能 | ExecSummaryBar, AlertPanel, ConditionSummary（値入率の相乗積ドリルダウン含む） |
| **Daily** | KpiCard 6枚（売上, 仕入, 売変, 粗利率, 値入率, 消耗品）全てに接続 | 前年比 trend 表示付き |
| **Insight** | Tab 1: KpiCard 6枚に接続 / Tab 2: 在庫法・推定法カード内の全計算値（13指標）をクリック可能 | CalcRow $clickable で損益構造の各値から直接根拠表示 |
| **Reports** | 概況 KpiCard 4枚 + 目標対実績 KpiCard 4枚 + 仕入・売変 KpiCard 4枚 + 損益構造カード内の全計算値をクリック可能 | 在庫法・推定法カードの CalcRow $clickable |
| **Category** | KpiCard 4枚（全体値入率, 粗利額, 原価合計, 売価合計）に接続 | カテゴリ→店舗→日別の3段ドリルダウンは既存テーブルで対応 |
| **CostDetail** | KpiCard（消耗品費合計, 消耗品率）に接続 | 品目別→日別ドリルダウンは既存テーブルで対応 |

#### 共通 CalcRow コンポーネント

計算結果を「ラベル: 値」形式で表示する行コンポーネント群は
`presentation/components/common/CalcRow.ts` に一元化されている:

- `CalcRow` — `$clickable` prop で MetricBreakdownPanel 連携用ホバーエフェクト付与
- `CalcLabel` — ラベル部分
- `CalcValue` — 値部分（等幅フォント）
- `CalcHighlight` — 強調値（カラー指定可能）

Insight と Reports の .styles.ts からは re-export で参照している（設計思想7「後方互換はバレル re-export で保つ」に従う）。

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

---

### 7. UIコンポーネントにデータ変換・副作用・状態管理を混在させてはならない

Presentation層のコンポーネントが `useMemo`/`useCallback` でデータ変換を行い、
`navigator.clipboard` 等の副作用を含み、複数の `useState` で状態管理し、
かつ JSX の描画も行う「God Component」にしてはならない。

**これをやると何が壊れるか:**
MetricBreakdownPanel.tsx が 717 行の God Component に成長し:
- 25 個の styled-component 定義、4 個の `useState`、5 個の `useMemo`/`useCallback`、
  2 個の副作用（クリップボード書き込み、CSV エクスポート）、200 行以上の JSX が
  1 ファイルに混在していた
- Storybook ストーリーの作成が不可能（ドメイン型のモック構築が必要）
- `allExplanations: ReadonlyMap<MetricId, Explanation>`（22 指標の全マップ）を
  props で丸ごと受け取る God Object Prop パターンにより、
  テストでのモック構築が困難かつ関心の境界が曖昧になっていた
- ファイルが 300 行（設計思想4の閾値）を大幅に超過していたにもかかわらず放置されていた

**壊れるパターン:**
- 1 コンポーネントに styled-component 定義 + フック + JSX を全部入れる
- `allXxx: ReadonlyMap<Id, DomainModel>` のような巨大マップを props で丸ごと渡す
- 副作用（API 呼び出し、クリップボード、ファイル出力）を描画コンポーネント内に書く

**正しい分割パターン:**
```
ComponentName.styles.ts   — styled-component 定義のみ
useComponentName.ts       — データ変換・状態管理・副作用（ViewModel フック）
ComponentName.tsx         — ViewModel を受け取り JSX を返す（描画のみ）
```

## 残課題・今後の対応

本セクションは CLAUDE.md と実際のコードベースの照合（2026-03 時点）で判明した
未解決の課題・未文書化の領域をまとめたものである。

### 解決済みの課題

1. ~~**WidgetContext からの生データ除去が未完了**~~
   - **解決済み**（2026-03）。`categoryTimeSales` / `prevYearCategoryTimeSales` を
     WidgetContext から完全削除し、`ctsIndex: CategoryTimeSalesIndex` に置換完了。

### コードベースとドキュメントの乖離から判明した課題

1. **Storybook / ビジュアルテストの方針未文書化**
   - Storybook 設定（`.storybook/`）と P1 ストーリー（Button, Card, Chip, DataGrid,
     KpiCard, Modal, Skeleton, Theme, TabBar, EmptyState, CalcRow, ErrorBoundary）は整備済み
   - 開発プロセスにおける位置づけ（CI 必須か任意か、カバー範囲等）が未定義
   - P2 コンポーネント（DataTable, DayRangeSlider, StatusBadge, Tooltip, ContextBar）は未カバー

2. **PWA 対応の方針未文書化**
   - `infrastructure/pwa/` に Service Worker 登録コードが存在するが、
     オフライン戦略・キャッシュ方針・更新通知の設計が未記載
   - インブラウザ分析（IndexedDB + DuckDB）との組み合わせにおける
     データ整合性の考慮が必要

3. **DevTools の運用方針**
   - `presentation/components/DevTools/QueryProfilePanel.tsx` 等の開発ツールが存在するが、
     本番ビルドでの除外方針（tree-shaking、条件付きレンダリング等）が未記載

4. ~~**バレルエクスポート不整合**~~
   - **解決済み**（2026-03）。`factorDecomposition`, `causalChain`, `useConditionMatrix`,
     `analysisContextStore` をそれぞれのバレルからエクスポート追加

5. ~~**純粋関数の重複定義**~~
   - **解決済み**（2026-03）。`computeDivisor`, `countDistinctDays`, `computeDowDivisorMap`,
     `filterByStore` の正規定義を `application/usecases/categoryTimeSales/divisor.ts` に統一。
     `periodFilterUtils.ts` は re-export バレルに変換。`divisorRules.test.ts` でアーキテクチャガード追加
