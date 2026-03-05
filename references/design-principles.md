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
