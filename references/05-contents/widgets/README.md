# widgets — widget 仕様書カタログ

> 役割: registry 登録された全 widget（現行 45 件）の**現状把握台帳**。
> 改修前の前提資料として、各 widget の source / 型 / 依存 ctx / データ経路 / co-change 影響面を 1 ファイルにまとめる。
>
> **本カテゴリの位置付けは親 README（`../README.md`）参照**。
> ユーザー向け機能説明ではない。学習用解説ではない。改修者のための事実台帳。

## 型番体系

- 形式: `WID-NNN`（3 桁ゼロ埋め）
- **一度割り当てたら再利用しない**。廃止時は欠番のまま保持
- source 側は `@widget-id WID-NNN` JSDoc で宣言（Phase 6 で強制）
- spec doc ファイル名 = 型番 `.md`（例: `WID-001.md`）

### 初期割当表（2026-04-23 時点、45 件）

`projects/completed/architecture-debt-recovery/inquiry/01-widget-registries.md` の registry 登録順に基づく。

| ID | registry | widget id | label | context 型 |
|---|---|---|---|---|
| WID-001 | WIDGETS_KPI | widget-budget-achievement | 店別予算達成状況 | Dashboard-local |
| WID-002 | WIDGETS_CHART | chart-daily-sales | 日別売上チャート | Dashboard-local |
| WID-003 | WIDGETS_CHART | chart-gross-profit-amount | 粗利推移チャート | Dashboard-local |
| WID-004 | WIDGETS_CHART | chart-timeslot-heatmap | 時間帯×曜日ヒートマップ | Dashboard-local |
| WID-005 | WIDGETS_CHART | chart-store-timeslot-comparison | 店舗別時間帯比較 | Dashboard-local |
| WID-006 | WIDGETS_CHART | chart-sales-purchase-comparison | 売上・仕入 店舗比較 | Dashboard-local |
| WID-007 | WIDGETS_CHART | chart-weather-correlation | 天気-売上 相関分析 | Dashboard-local |
| WID-008 | WIDGETS_EXEC | analysis-alert-panel | アラート | Dashboard-local |
| WID-009 | WIDGETS_EXEC | exec-dow-average | 曜日平均 | Dashboard-local |
| WID-010 | WIDGETS_EXEC | exec-weekly-summary | 週別サマリー | Dashboard-local |
| WID-011 | WIDGETS_EXEC | exec-daily-store-sales | 売上・売変・客数（日別×店舗） | Dashboard-local |
| WID-012 | WIDGETS_EXEC | exec-daily-inventory | 日別推定在庫 | Dashboard-local |
| WID-013 | WIDGETS_EXEC | exec-store-kpi | 店舗別KPI一覧 | Dashboard-local |
| WID-014 | WIDGETS_EXEC | exec-forecast-tools | 着地予測・ゴールシーク | Dashboard-local |
| WID-015 | WIDGETS_ANALYSIS | analysis-waterfall | 粗利ウォーターフォール | Dashboard-local |
| WID-016 | WIDGETS_ANALYSIS | analysis-gp-heatmap | 粗利率ヒートマップ | Dashboard-local |
| WID-017 | WIDGETS_ANALYSIS | analysis-customer-scatter | 客数×客単価 効率分析 | Dashboard-local |
| WID-018 | WIDGETS_ANALYSIS | analysis-performance-index | PI値・偏差値・Zスコア | Dashboard-local |
| WID-019 | WIDGETS_ANALYSIS | analysis-category-pi | カテゴリPI値・偏差値（常時非可視） | Dashboard-local |
| WID-020 | WIDGETS_ANALYSIS | analysis-causal-chain | 因果チェーン分析 | Dashboard-local |
| WID-021 | WIDGETS_ANALYSIS | analysis-sensitivity | 感度分析ダッシュボード | Dashboard-local |
| WID-022 | WIDGETS_ANALYSIS | analysis-regression-insight | 回帰分析インサイト | Dashboard-local |
| WID-023 | WIDGETS_ANALYSIS | analysis-seasonal-benchmark | 季節性ベンチマーク | Dashboard-local |
| WID-024 | WIDGETS_ANALYSIS | analysis-duckdb-features | 売上トレンド分析 | Dashboard-local |
| WID-025 | WIDGETS_DUCKDB | duckdb-dow-pattern | 曜日パターン分析 | Dashboard-local |
| WID-026 | WIDGETS_DUCKDB | duckdb-category-mix | カテゴリ構成比推移 | Dashboard-local |
| WID-027 | WIDGETS_DUCKDB | duckdb-category-benchmark | カテゴリベンチマーク | Dashboard-local |
| WID-028 | WIDGETS_DUCKDB | duckdb-category-boxplot | カテゴリ箱ひげ図 | Dashboard-local |
| WID-029 | WIDGETS_DUCKDB | duckdb-cv-timeseries | CV時系列分析 | Dashboard-local |
| WID-030 | DAILY_WIDGETS | daily-chart-gp-rate | 粗利率トレンド | Unified |
| WID-031 | DAILY_WIDGETS | daily-chart-shapley | シャープリー時系列 | Unified |
| WID-032 | INSIGHT_WIDGETS | insight-budget | 予算と実績 | Unified |
| WID-033 | INSIGHT_WIDGETS | insight-budget-simulator | 予算達成シミュレーター | Unified |
| WID-034 | INSIGHT_WIDGETS | insight-gross-profit | 損益構造 | Unified |
| WID-035 | INSIGHT_WIDGETS | insight-forecast | 予測・パターン | Unified |
| WID-036 | INSIGHT_WIDGETS | insight-decomposition | 売上要因分解 | Unified |
| WID-037 | INSIGHT_WIDGETS | insight-pi-cv-map | カテゴリベンチマーク | Unified |
| WID-038 | CATEGORY_WIDGETS | category-total-view | カテゴリ合計分析 | Unified |
| WID-039 | CATEGORY_WIDGETS | category-comparison-view | 店舗間比較 | Unified |
| WID-040 | COST_DETAIL_WIDGETS | costdetail-kpi-summary | サマリーKPI | Unified |
| WID-041 | COST_DETAIL_WIDGETS | costdetail-purchase | 仕入明細 | Unified |
| WID-042 | COST_DETAIL_WIDGETS | costdetail-transfer | 移動明細 | Unified |
| WID-043 | COST_DETAIL_WIDGETS | costdetail-cost-inclusion | 消耗品明細 | Unified |
| WID-044 | REPORTS_WIDGETS | reports-summary-grid | レポートサマリー | Unified |
| WID-045 | REPORTS_WIDGETS | reports-dept-table | 部門別KPI | Unified |

> 割当根拠: `inquiry/01-widget-registries.md` の「サマリ表」の registry 列挙順に従う。合成 registry（`WIDGET_REGISTRY` / `UNIFIED_WIDGET_REGISTRY`）の slice 順ではなく、独立 registry の source 出現順を採用。
>
> `features/*/ui/widgets.tsx` 3 ファイルの byte-identical 複製は `pages/*/widgets.tsx` 側と**同じ型番**を指す（重複した spec は作らない）。

## spec doc フォーマット

各 `WID-NNN.md` は以下の構造を持つ。frontmatter が機械検証対象、prose は「**source から読み取れない設計意図と制約**」のみ。

### YAML frontmatter（Phase 6 で generator が上書き管理）

```yaml
---
# 識別
id: WID-001
kind: widget
widgetDefId: widget-budget-achievement   # source 側の `id:` literal と一致必須
contextType: Dashboard-local             # Dashboard-local | Unified

# source 参照
registry: WIDGETS_KPI
registrySource: app/src/presentation/pages/Dashboard/widgets/registryKpiWidgets.tsx
registryLine: 19                         # widget 定義の開始行

# 分類（source から機械抽出可能なメタ）
group: 予算進捗
size: full                               # full | half
linkTo: null                             # { view, tab } | null

# 取得経路（設計意図。手書きだが候補セットは固定）
acquisitionPath: ctx-direct              # ctx-direct | readModel | queryHandler | screenPlan | mixed

# 依存（AST 解析で検証可能）
consumedCtxFields:
  - allStoreResults
  # ...
consumedReadModels: []
consumedQueryHandlers: []
children:                                # render 関数が JSX で使う子 component
  - ConditionSummaryEnhanced

# 構造 drift 防御
lastVerifiedCommit: 1075c69              # source と突合した直近 commit

# 時間 drift 防御（freshness）
owner: implementation
reviewCadenceDays: 90
lastReviewedAt: 2026-04-23

# spec schema
specVersion: 1
---
```

### prose セクション（手書き、短く）

**大原則: 使い方（usage）ではなく振る舞い（behavior）を書く。**

- ✗ NG（使い方 / 操作手順）: 「ストア選択 UI で店舗を選ぶと、この widget がその店舗の…」
- ✓ OK（振る舞い / 構造）: 「`allStoreResults.size > 0` で可視。`ConditionSummaryEnhanced` に full ctx を渡す。空 selection では predicate で非可視」
- ✗ NG（ユーザー体験）: 「管理者にとって便利な一覧画面」
- ✓ OK（ランタイム事実）: 「`result.daily` を line chart に、`result.budgetDaily` を bar chart に mapping」

振る舞い = 「**入力が何のときに何を出力し、どの副作用を起こすか**」。ユーザー操作・業務価値・画面上の印象は書かない。

| セクション | 書く内容（振る舞い側） | 書かない内容（使い方側） |
|---|---|---|
| 1. 概要（1 文） | この widget の**振る舞い**を構造的に 1 文で（C8 準拠） | 業務上の価値、ユーザー向けの意味、画面上の見え方 |
| 2. Data Acquisition Path | 取得経路の選定理由、どの lane / handler を使うか、**なぜ** | 経路そのもの（frontmatter に記載） |
| 3. Context Fields Consumed — 解説 | 非自明な touch 理由、optional vs required の設計判断 | field リスト（frontmatter）、field が「何のために便利か」的な価値説明 |
| 4. Composition — 子の契約 | 子 component に full ctx を渡している場合、**なぜ必要か**の理由 | 子 component の機能説明、子が画面に何を表示するか |
| 5. Visibility | `isVisible` predicate の**意図**（どの入力条件で可視・非可視が分岐するか） | predicate そのもの（frontmatter）、「ユーザーが〜したとき表示される」的な操作起点の記述 |
| 6. Invariants | 本 widget が守る / 依存する数学的・構造的不変条件 | なし |
| 7. Co-Change Impact | **どの field / 型 / 契約が変わったら本 widget が壊れるか** の surface 列挙 | なし |
| 8. Guard / Rule References | 本 widget に関連する既存 guard / AR rule の ID | 関連しない guard の解説 |
| 9. Pipeline Concerns / Upstream Requests | 本 widget が**観察している**パイプライン品質問題（取得経路の重複 / 脆弱な fallback / 欠落した契約 / 型の曖昧さ / タイミング問題 / raw 走査の埋没）。**事実として記述**する | widget 側での workaround 案 / 修正案 / 「〜すべき」（それは 4 層依存ルール上 presentation の責務外。改善は上位層に要求する） |

**prose は短く**。frontmatter が機械真実を担うため、prose は WHY のみ。数行で書ける節は数行で済ませる。改修者が「この widget を触るとき何が壊れうるか」「この widget を起点にパイプラインのどこが改善要求されているか」を把握できれば目的達成。

### セクション 9「Pipeline Concerns」の書き方補足

presentation 層は 4 層依存ルール上、パイプライン本体（application / domain / infrastructure）を**直接改修する責務を持たない**。widget が抱える不具合体験は、widget が自前で解決せず**上位層への改善要求として記録**する。

**OK（事実としての concern 記録）:**
- 「`ctx.insightData` は page-local field として UnifiedWidgetContext に optional 配置されている。本 widget は `insightData != null` を isVisible で判定しており、Unified ctx の非対称性が表出している」
- 「`result.daily` を直接 iterate しており、同じ集計を `storeDailyLane.bundle.currentSeries` 経由で行う chart と重複している」
- 「`queryExecutor?.isReady === true` の readiness 判定が本 widget 含め 7 widget で重複して書かれている」
- 「`ForecastToolsWidget` に full ctx を渡しており、子 component の実 ctx 依存が spec 側で静的に特定できない」

**NG（widget 側での workaround / 修正案の記述）:**
- 「本 widget は fallback を持つべき」「ここで〜を計算すべき」（→ presentation 層が pipeline 問題を吸収する発想。禁止）
- 「〜に移行すれば解決する」（→ それは Phase 4 改修計画の scope。本 section では改修案を書かない）

記録された concern は Phase 2 真因分析 → Phase 3 原則候補 → Phase 4 改修計画 → Phase 6 実装の経路で上位層の改善として処理される。各 concern に対し「誰が改修すべきか」の責務層（application / domain / infrastructure）を併記することが望ましい（ただし改修案自体は書かない）。

## 3 軸 drift 防御（親 README §「3 軸の drift 防御」の widgets サブカテゴリでの具体化）

### 存在軸: `AR-CONTENT-SPEC-EXISTS`（widgets 版）

- registry 登録された全 `WidgetDef` entry に対応する `WID-NNN.md` が存在すること
- 本 README の割当表に全 45 件が列挙されていること
- 表の全 widget id が registry source の実在 entry と 1:1 対応すること

### 構造軸: `AR-CONTENT-SPEC-FRONTMATTER-SYNC` + `AR-CONTENT-SPEC-CO-CHANGE`

- generator が source AST から frontmatter を再生成
- 再生成後 diff が発生 → `docs:check` fail（= sync されていない）
- registry source の当該 entry 行が変更された PR で、対応 `WID-NNN.md` の `lastVerifiedCommit` が更新されていない → fail

### 時間軸: `AR-CONTENT-SPEC-FRESHNESS` + `AR-CONTENT-SPEC-OWNER`

- 全 spec に `owner` / `reviewCadenceDays` / `lastReviewedAt` 必須
- `(today - lastReviewedAt) > reviewCadenceDays` で **fail**
- `(today - lastReviewedAt) > reviewCadenceDays × 0.8` で **warn**（事前通知）
- ratchet-down: 期限超過 spec 数の baseline は単調減少のみ

### enforcement phase

| AR rule | 状態 | 移行先 |
|---|---|---|
| `AR-CONTENT-SPEC-EXISTS` | Phase 3 候補 → Phase 6 active | 45 spec 揃ってから有効化 |
| `AR-CONTENT-SPEC-FRONTMATTER-SYNC` | Phase 3 候補 → Phase 6 active | generator 実装後 |
| `AR-CONTENT-SPEC-CO-CHANGE` | Phase 3 候補 → Phase 6 active | generator 実装後 |
| `AR-CONTENT-SPEC-FRESHNESS` | Phase 3 候補 → Phase 6 active | owner 割当確定後 |
| `AR-CONTENT-SPEC-OWNER` | Phase 3 候補 → Phase 6 active | 45 spec 揃ってから有効化 |

詳細設計は `projects/completed/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md`（Phase 1 addendum）参照。
