# アーキテクチャ進化計画 — CQRS + 契約ハイブリッド

> 本ドキュメントは CLAUDE.md の設計思想セクション、`module-structure-evolution.md`、
> `design-principles.md` を補完するものである。
> 横スライスから縦スライスへの移行（module-structure-evolution.md）を実現するための
> 具体的な設計・移行計画を定義する。

## 背景と目的

現在のアーキテクチャは MVP 時に正しかった設計だが、機能の成長速度に対して
構造の進化が追いつかなくなっている。本計画は以下を実現する:

1. **Command/Query 分離** — JS確定計算と DuckDB探索の責務を明示的に分離
2. **型契約の導入** — エンジン間のデータフローを型で保証
3. **一貫した構造パターン** — AI開発で判断不要な統一構造
4. **段階的移行** — 既存機能を壊さずに進化

---

## Part 1: 現状の棚卸し

### 全体統計

| 層 | 本体ファイル数 | テストファイル数 | 主要サブディレクトリ |
|---|---|---|---|
| domain/ | ~70 | ~29 | calculations, models, constants, repositories, utilities, scopeResolution |
| application/ | ~106 | ~50 | hooks(51), hooks/duckdb(12), usecases(8sub), stores(6), services(5), workers(5), context(7), ports(2), comparison(3), navigation(1) |
| infrastructure/ | ~50 | ~85 | duckdb(含queries/worker/migrations), storage(含internal), dataProcessing(12), export, fileImport, i18n, pwa |
| presentation/ | ~220 | ~11 | components/charts(86), components/common(27), components/widgets(5), pages(10ディレクトリ), hooks(4), theme(4), Layout(5) |
| その他 | ~7 | 3 | App.tsx, AppProviders.tsx, main.tsx, stories/(21) |
| **合計** | **~453** | **~178** | |

### ホットスポット（500行超ファイル）

| カテゴリ | 該当数 | 最大ファイル |
|---|---|---|
| 1,000行超 | 0 | ConditionDetailPanels.tsx → 18行バレル+4分割ファイル（2026-03-12 完了）、PurchaseAnalysisPage.tsx → 260行+4分割ファイル（2026-03-12 完了） |
| 500〜999行 | ~25 | StructuralOverviewChart.tsx (957行) |
| チャート500行超 | 17 | DuckDB系16 + 通常系12 |
| フック200行超 | 13 | useImport.ts (510行) |

### チャート依存クラスタ

| クラスタ | ファイル数 | 移行先スライス |
|---|---|---|
| sales | ~10 | features/sales/ |
| profitability | ~3 | features/sales/（統合） |
| category | ~12 | features/category/ |
| customer | ~2 | features/customer/ |
| inventory | ~1 | features/inventory/ |
| forecast | ~4 | features/forecast/ |
| チャートインフラ | ~12 | shared/ |

### shared/ の推定規模

| 領域 | ファイル数 |
|---|---|
| domain/models + constants + repositories + utilities + 共通calculations | ~60 |
| application/stores + services + context + comparison + ports + workers + 共通usecases + 共通hooks | ~70 |
| infrastructure（全体） | ~50 |
| presentation/common + Layout + theme + hooks + チャートインフラ | ~50 |
| **shared/ 合計** | **~230ファイル（全体の約36%）** |

---

## Part 2: 根本原因分析（11件）

### A. 設計上の構造欠陥（3件）

| # | 問題 | 影響 | 根本原因 |
|---|---|---|---|
| A-1 | StoreResult が約80フィールドの巨大集約体 | 変更頻度の異なるフィールドが結合。スライス独立性を阻害 | 計算効率を型の独立性より優先したMVP設計 |
| A-2 | Comparison が40+ファイルに散在 | 新比較モード追加に40+ファイル変更。一貫性保証なし | Cross-cutting Concern を Domain Pattern として設計しなかった |
| A-3 | JS/DuckDB 二重実装 | 片方の修正が他方に波及しない。禁止事項違反 | DuckDB移行が未完了 |

### B. 進化的負債（3件）

| # | 問題 | 影響 | 根本原因 |
|---|---|---|---|
| B-1 | チャート17ファイルが500行超 | テスト困難、再利用不能、レビュー困難 | 分割トリガーの不在 |
| B-2 | フック5件が200行超 | 純粋関数テスト不能、Worker非互換 | Hook=ロジックのカプセル化 vs UseCase=ビジネスロジック単位 の衝突 |
| B-3 | バレル81エクスポート | Fast Refresh不能、Tree Shaking阻害 | 分割基準の不在 |

### C. 責務境界の曖昧さ（3件）

| # | 問題 | 影響 | 根本原因 |
|---|---|---|---|
| C-1 | Presentation→Domain直接参照（14ファイル） | レイヤー責務の混乱 | 表示整形関数の帰属先が未定義 |
| C-2 | ウィジェット内ビジネスロジック | 禁止事項#6,#7抵触。テスト不能 | 「1ウィジェット専用の導出計算」の居場所が未定義 |
| C-3 | DuckDB 層配置曖昧（許可リスト14件） | テスト時モック困難。移行時の障害 | ブラウザ内SQLエンジンの4層モデル配置ルールが後追い |

### D. 未完了の移行（2件）

| # | 問題 |
|---|---|
| D-1 | CTS → DuckDB 統一が未完了 |
| D-2 | Phase 1（縦スライス構造への移行）が未着手 |

### 因果関係

```
MVP時の正しい設計判断
  │ 機能追加の積み重ね
  ▼
成長に伴う限界の顕在化
  ├── 責務境界の曖昧化 (C-1〜C-3)
  └── 移行計画の実行遅延 (D-1〜D-2)
        │
        ▼
現在の症状 (A-1〜A-3, B-1〜B-3)
```

**要約:** 設計が悪かったのではなく、MVP時に正しかった設計が機能の成長速度に対して
進化が追いつかなかった。

---

## Part 3: 設計方針 — 4層モデル × CQRS + 契約ハイブリッド

### 核心的な考え方

既存4層モデルは **WHERE（どの層に置くか）** を定義するが、
**HOW（データがどう処理されるか）** の契約が曖昧。
エンジンの考え方を既存4層モデルの内側に取り入れる。

- **層（Layer）= 構造の軸** — Presentation → Application → Domain ← Infrastructure
- **エンジン（Engine）= 処理契約の軸** — 明確な Input/Output 型 + 不変条件

### CQRS の適用

このプロジェクトは既に暗黙的に CQRS 構造を持つ:
- **Command側（書き込み）:** JS計算エンジン → ImportedData + Settings → StoreResult
- **Query側（読み取り）:** DuckDB探索エンジン → SQLテーブル → 集約結果

この暗黙的構造を **明示化** し、Input/Output型契約 + 不変条件テストを導入する。

```
┌──── Command Side ────────┐  ┌──── Query Side ─────┐
│ ImportedData + Settings  │  │ SQL Tables           │
│         ↓                │  │       ↓              │
│ [Calculation Pipeline]   │  │ [Query Handlers]     │
│         ↓                │  │       ↓              │
│ WriteModel               │  │ ReadModel            │
│ (StoreCalculation)       │  │ (QueryResult)        │
└─────────┬────────────────┘  └───────┬──────────────┘
          └──────────┬────────────────┘
                     ▼
            [ViewModel Layer]
            WriteModel + ReadModel → ViewModel
                     ↓
            [Visualization]
```

### エンジンカタログ（9エンジン）

| エンジン | 責務 | 4層配置 |
|---|---|---|
| Ingestion | ファイル取込→パース→検証→正規化 | infrastructure + application |
| Storage | 永続化・復元・キャッシュ | infrastructure + application |
| Semantic | ドメインモデル・型・定数・整形ルール | domain/ |
| Calculation | 確定指標の権威的計算 | domain + application/usecases |
| Query | 任意範囲のデータ探索・集約 | infrastructure/duckdb + application/queries |
| Rule | 条件判定・アラート・閾値 | domain/calculations/rules |
| Algorithm | 統計処理・前処理（ドメイン非依存） | domain/calculations/algorithms |
| Visualization | チャート・ウィジェット・ページ | presentation + application/hooks |
| UI | UIプリミティブ・テーマ・レイアウト | presentation/common + theme |

### エンジン間契約型

| 契約型 | 生産者 | 消費者 |
|---|---|---|
| `ImportedData` | Ingestion | Storage, Calculation |
| `StoreCalculation` (WriteModel) | Calculation | Query, Rule, Visualization |
| `QueryResult<T>` (ReadModel) | Query | Visualization |
| `RuleResult` | Rule | Visualization |
| `ViewModel` | Visualization内部 | Visualization（描画部分） |

### AI開発前提の設計判断

| 項目 | 人間開発の最適解 | AI開発の最適解 | 採用 |
|---|---|---|---|
| Handler パターン | 過剰 | 一貫性のため全面適用 | **全面適用** |
| ReadModel 型 | 既存で十分 | WriteModel/ReadModel 分離で誤用を型で防ぐ | **導入** |
| ViewModel | 300行超のみ | 規模判断をAIに委ねない。例外なし | **全チャート** |
| CQRS 適用範囲 | 3件に限定 | 一貫性 > 最小主義 | **全面適用** |

**最終判断基準:** 過剰設計のリスク < 曖昧さのリスク（AI開発では常にこれが成立）

---

## Part 4: 具体設計

### 4-1. Query Side の確立

#### application/queries/ の構造

```
application/queries/
├── QueryPort.ts                    // Port インターフェース
├── QueryContract.ts                // 全 Handler が満たす型契約
├── sales/                          // 売上系
│   ├── DailyRecordsQueryHandler.ts
│   ├── SummaryQueryHandler.ts
│   └── index.ts
├── category/                       // カテゴリ系
│   ├── CtsQueryHandler.ts
│   ├── AdvancedQueryHandler.ts
│   ├── DeptKpiQueryHandler.ts
│   └── index.ts
├── comparison/                     // 比較系
│   ├── ComparisonQueryHandler.ts
│   ├── YoyQueryHandler.ts
│   └── index.ts
├── analytics/                      // 分析系
│   ├── FeatureQueryHandler.ts
│   ├── ConditionQueryHandler.ts
│   ├── MetricsQueryHandler.ts
│   └── index.ts
└── index.ts
```

#### QueryHandler の統一パターン

```typescript
// application/queries/QueryContract.ts
export interface QueryHandler<TInput, TOutput> {
  readonly name: string
  execute(conn: AsyncDuckDBConnection, input: TInput): Promise<TOutput>
}

// 実装例
export interface DailyRecordsInput {
  readonly dateRange: DateRange
  readonly storeIds: ReadonlySet<string>
}

export interface DailyRecordReadModel {
  readonly records: readonly DailyRecordRow[]
  readonly period: DateRange
  readonly storeCount: number
}

export const dailyRecordsQueryHandler: QueryHandler<DailyRecordsInput, DailyRecordReadModel> = {
  name: 'dailyRecords',
  async execute(conn, input) {
    const records = await queryDailyRecords(conn, toParams(input))
    return { records, period: input.dateRange, storeCount: input.storeIds.size }
  },
}
```

#### フックは Handler の薄い React アダプタ

```typescript
// ビジネスロジック0行。Handler呼び出し + React状態管理のみ
export function useDailyRecordQuery(
  conn: AsyncDuckDBConnection | null,
  dataVersion: number,
  dateRange: DateRange | undefined,
  storeIds: ReadonlySet<string>,
): AsyncQueryResult<DailyRecordReadModel> {
  const input = useMemo(() => dateRange ? { dateRange, storeIds } : null, [dateRange, storeIds])
  const queryFn = useMemo(
    () => input ? (c: AsyncDuckDBConnection) => dailyRecordsQueryHandler.execute(c, input) : null,
    [input],
  )
  return useAsyncQuery(conn, dataVersion, queryFn)
}
```

#### Architecture Guard の変更

```
移行前: hooks/duckdb/ → infrastructure/duckdb/ （許可リスト14件）
移行後: hooks/duckdb/ → application/queries/ → infrastructure/duckdb/ （許可リスト0件）
```

### 4-2. Comparison Contract

#### 現状

`resolveComparisonFrame()` が全比較計算の唯一の決定点（良い設計）。
ただし Presentation 10ファイルが sameDow/sameDate を直接参照。

#### Contract 設計

```typescript
// domain/patterns/comparison/ComparisonContract.ts

export type AlignmentPolicy = 'sameDayOfWeek' | 'sameDate'  // 将来: | 'sameWeek' | ...

export interface ComparisonAware<T> {
  withComparison(
    frame: ComparisonFrame,
    current: T,
    previous: T,
  ): ComparisonResult<T>
}

export interface ComparisonResult<T> {
  readonly current: T
  readonly sameDow: T | null
  readonly sameDate: T | null
  readonly dowGap: DowGapAnalysis | null
  readonly frame: ComparisonFrame
}
```

#### 新モード追加時の変更箇所

```
現状: 40+ ファイル変更
Contract導入後: 4ファイル変更
  1. AlignmentPolicy に新モード追加
  2. resolveComparisonFrame() に新ロジック追加
  3. ComparisonContext に新 PeriodSnapshot 追加
  4. useComparisonContextQuery に新クエリ追加
```

### 4-3. StoreResult 分解

#### 6つのサブインターフェース

| サブ型 | フィールド数 | 内容 |
|---|---|---|
| StoreSalesData | ~15 | 売上集計・日別・顧客 |
| StoreInventoryData | ~13 | 在庫設定・在庫法・推定法 |
| StoreBudgetData | ~11 | 予算・進捗・日割り |
| StoreForecastData | ~3 | 予測・着地見込 |
| StoreMarginData | ~8 | 原価・値入率・割引率 |
| StoreCategoryData | ~3 | カテゴリ・仕入先・振替 |

#### 後方互換の維持

```typescript
// StoreResult は全サブ型の intersection
export interface StoreResult
  extends StoreSalesData,
    StoreInventoryData,
    StoreBudgetData,
    StoreForecastData,
    StoreMarginData,
    StoreCategoryData {}

// 既存の全52箇所の import StoreResult はそのまま動作
```

#### 段階的移行

1. サブインターフェース定義ファイルを作成（新規6ファイル）
2. StoreResult を intersection 型に変更 → 全テスト通過確認
3. 各消費者を段階的にサブ型に移行
4. Architecture Guard に「新規コードはサブ型を使用」ルール追加

### 4-4. Chart Registry

#### 拡張メタデータ付きレジストリ

```typescript
export interface ChartRegistryEntry {
  // 既存 WidgetDef 互換
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize

  // AI開発向け拡張メタデータ
  readonly domain: 'sales' | 'inventory' | 'category' | 'customer' | 'forecast' | 'shared'
  readonly dataRequirements: {
    readonly writeModel?: readonly (keyof StoreCalculation)[]
    readonly queryHandler?: readonly string[]
    readonly comparison?: boolean
    readonly duckdb?: boolean
  }
  readonly metricIds?: readonly MetricId[]
  readonly tags?: readonly string[]
  readonly path: string

  // レンダラー
  readonly render: (ctx: UnifiedWidgetContext) => ReactNode
  readonly isVisible?: (ctx: UnifiedWidgetContext) => boolean
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}
```

#### AI開発でのメリット

新チャート追加時:
1. `ChartName/` ディレクトリ作成（統一構造: .tsx + .styles.ts + .vm.ts）
2. CHART_REGISTRY に1エントリ追加
3. dataRequirements を宣言 → Architecture Guard が自動検証
4. metricIds を宣言 → Explanation との連携が自動
5. domain を宣言 → 縦スライス移行時に自動分類

**判断不要。テンプレートに従うだけ。**

---

## Part 5: 移行計画

### フェーズ構成

```
Phase 0: 衛生整備 ✅ 完了
   open-issues C-1〜C-5 解消

Phase 1: 低リスク・高効果の構造改善 ✅ 完了
   1A: domain/formatting/ 新設（C-1 解消）
   1B: UseCase 抽出（useImport → ImportOrchestrator）（B-2 解消）
   1C: バレル分割（B-3 解消）

Phase 2: Command/Query 分離の明示化 ✅ 完了
   application/queries/ 新設 + QueryPort
   設計原則 #11 を CLAUDE.md に追加
   Architecture Guard に Command/Query 分離ルール追加
   DuckDB許可リスト 14→0

Phase 3: Query 側統一 ✅ 完了
   CTS フォールバック削除
   computeDivisor 1箇所化
   Comparison Contract 導入（設計原則 #12）

Phase 4: WriteModel 型分解 ✅ 完了
   StoreResult → サブインターフェース抽出（設計原則 #13）
   後方互換 intersection 型維持

Phase 5: ルール/アルゴリズムの整理 + Port拡張 ✅ 完了
   domain/calculations/rules/ + domain/calculations/algorithms/ サブディレクトリ化
   StoragePort + ImportPort 新設
   ウィジェット内ビジネスロジック抽出

Phase 6: チャート標準化 ✅ 完了（.styles.ts全件抽出済み、.vm.ts継続中）
   全チャート → ディレクトリ化 + .styles.ts + .vm.ts
   Chart Registry 新設

Phase 7: 縦スライス導入 ✅ 完了
   features/ 作成。Category → Sales の順
   各スライス内で Command/Query 分離を維持
```

### 各フェーズの完了基準

| Phase | 完了基準 | 計測方法 |
|---|---|---|
| 0 | open-issues セクション1 が0件 ✅ | ドキュメント確認 |
| 1A | presentation/ → domain/calculations/utils の value import が0 ✅ | Architecture Guard |
| 1B | 150行超のフック（型定義除く）が0 ✅ | 行数カウント |
| 1C | 20件超のバレルが0 ✅ | エクスポート数カウント |
| 2 | 全DuckDBクエリが QueryHandler 経由。許可リスト0件 ✅ | Architecture Guard |
| 3 | CTS参照0件。computeDivisor定義1箇所。パリティテスト追加 ✅ | grep + テスト |
| 4 | StoreResult消費者の50%以上がサブ型を使用 ✅ | import分析 |
| 5 | 比較モード追加が2ファイル変更で完了。presentation内ビジネスロジック0 ✅ | テスト + Guard |
| 6 | 300行超のチャート .tsx が0。全チャートに .vm.ts ✅ | 行数 + ファイル確認 |
| 7 | features/ 間の直接importが0。2スライス以上作成 ✅ | Architecture Guard |

### 新機能の受入ルール

| フェーズ完了後 | 新機能に求めるルール |
|---|---|
| Phase 2 | 新クエリは QueryHandler + ReadModel 型を持つこと |
| Phase 3 | CTS パス新規作成禁止 |
| Phase 4 | 新消費者はサブ型（StoreSalesData等）を使用 |
| Phase 5 | 新ルールは domain/rules/、新比較は ComparisonContract 経由 |
| Phase 6 | 新チャートはディレクトリ構造 + ViewModel パターン必須 |
| Phase 7 | 新機能は features/ に縦スライスとして作成 |

### Architecture Guard 進化

```typescript
// Phase 2 完了時に追加
describe('CQRS Contract Guards', () => {
  it('Command handlers have no DuckDB imports', () => {
    assertNoImports('application/usecases/', 'infrastructure/duckdb/')
  })
  it('Query handlers do not import from domain/calculations/', () => {
    assertNoImports('application/queries/', 'domain/calculations/')
  })
  it('ViewModels do not import from infrastructure/', () => {
    assertNoImports('**/*.vm.ts', 'infrastructure/')
  })
  it('Hooks do not import from infrastructure/duckdb/', () => {
    assertNoImports('application/hooks/', 'infrastructure/duckdb/')
  })
})
```

---

## Part 6: 統一構造パターン（AI開発向け）

### チャート構造（例外なし）

```
ChartName/
├── ChartName.tsx          // 描画のみ（≤200行）
├── ChartName.styles.ts    // styled-components
├── ChartName.vm.ts        // ViewModel（WriteModel + ReadModel → 描画データ）
└── index.ts
```

### クエリ構造（例外なし）

```
application/queries/feature/
├── FeatureQueryHandler.ts // Input型 + Output型 + execute()
└── index.ts
```

### フック構造

- ビジネスロジック0行
- Handler/UseCase の呼び出し + React状態管理のみ
- 150行超は UseCase 抽出を検討

### パスベース配置ルール

| 作業内容 | 配置先 |
|---|---|
| ビジネスルール/閾値判定 | `domain/calculations/rules/` |
| 数学的アルゴリズム | `domain/calculations/algorithms/` |
| 表示整形（ドメイン知識） | `domain/formatting/` |
| 確定計算（月次） | `domain/calculations/` + `application/usecases/calculation/` |
| 探索クエリ（任意範囲） | `application/queries/` + `infrastructure/duckdb/queries/` |
| React状態管理 | `application/hooks/` |
| チャート描画 | `presentation/components/charts/ChartName/` |
| UIプリミティブ | `presentation/components/common/` |
| ページレイアウト | `presentation/pages/` |
