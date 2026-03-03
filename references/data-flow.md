# データフローアーキテクチャ

> 本ドキュメントは CLAUDE.md から詳細を分離したものである。

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
