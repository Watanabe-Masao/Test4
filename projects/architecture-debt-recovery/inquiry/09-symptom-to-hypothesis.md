# inquiry/09 — 症状 → 真因仮説 map

> 役割: Phase 2 inquiry 成果物 #1。Phase 1 の事実台帳から抽出した**症状**について、各症状に **2 つ以上の真因仮説**を提示する。
>
> plan.md §2 不可侵原則 #11「単一原因への帰着禁止」に従う。各仮説に**検証可能な形**（「X を変えると Y が起きるはず」「X が真なら Y の事実と整合するはず」等）を付与する。
>
> 本ファイルは immutable。Phase 3 以降で追加情報が判明しても書き換えず、`09a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `9f147e8`（Phase 1 完了直後。PR #1137 merge 済み） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | Phase 1 inquiry/01-08 + 01a（全 9 ファイル） |

## 本台帳の扱い方

- **症状（Symptom）** = Phase 1 で事実として観察された構造的パターン
- **仮説（Hypothesis）** = その症状を生成した可能性のある因果関係
- 各症状に **最低 2 個** の仮説を対置する（単一原因帰着の禁止）
- 各仮説には **検証可能な predicate** を付す（「X を変えれば Y が消えるはず」「X が真なら Z の事実と整合するはず」）
- **改修案は書かない**（Phase 4 で扱う）

## 症状一覧

本台帳は以下 6 症状群に分けて記述する:

| 症状群 | 内容 | 主入力 inquiry |
|---|---|---|
| S1 | Widget 登録システムの型・経路分岐 | 01, 04 |
| S2 | Data pipeline の非統一 | 06 |
| S3 | UnifiedWidgetContext の page-coupled optional | 01, 02, 04 |
| S4 | Pure 計算の hook / component 埋没 | 05 |
| S5 | 責務分離の揺れと byte-identical 複製 | 03, 07 |
| S6 | 複雑性 hotspot の Dashboard 集中 | 07, 08 |

<!-- S1-S6 の症状詳細と仮説は Edit で追記 -->

---

## S1. Widget 登録システムの型・経路分岐

### S1.観察された事実

- `WidgetDef` 同名 interface が 2 ファイルに並存（inquiry/04 §A: Dashboard-local `types.ts:101` / Unified `components/widgets/types.ts:225`）
- 独立 registry 10 件 + 合成 registry 2 件（`WIDGET_REGISTRY` / `UNIFIED_WIDGET_REGISTRY`）
- Dashboard-local 29 widget（型 A）vs Unified 16 widget（型 B）の使い分け
- 合成点で型 A → 型 B の adapter 経由（`unifiedRegistry.ts:46`）
- 型 A の `id: WidgetId`（literal union）vs 型 B の `id: string` の型レベル表現差

### S1.仮説

#### S1-H1. 「段階的導入の結果、過渡期の二種が定着した」

- 最初に Dashboard-only の widget 登録（型 A）が作られ、のち multi-page 化で Unified 版（型 B）が導入された
- 過渡期を意図した adapter（`unifiedRegistry.ts:46`）が**撤去されないまま**定着
- 検証可能 predicate:
  - 型 A の commit 履歴が型 B より先行していれば支持
  - adapter に `sunsetCondition` / `lifecyclePolicy` が付いていなければ「撤去を意図した temporary」ではなかったことを示唆

#### S1-H2. 「2 ページ概念のミスアラインメント（ctx scope が異なる）」

- Dashboard ページは全店横断 + Dashboard 固有 field（`storeKey` / `allStoreResults` 等）を必要とし、page 固有ページは optional ctx で十分
- 同じ `WidgetDef` 名で**異なる ctx scope** を同時に扱えないため、別型が自然に必要になった
- 検証可能 predicate:
  - Dashboard-local widget 全 29 件が `storeKey` 等 Dashboard-only field を touch する経路を持っていれば支持
  - Unified widget 全 16 件がそれらを touch しないか touch するときは null-safe である場合に支持
  - inquiry/02 §B-2 の `storeKey` 参照 4 件は全て Dashboard-local（WID-008 / 014 / 015 / 016）で観察済 → 支持

#### S1-H3. 「型設計段階で `id: WidgetId` literal union の運用コストが問題化し、途中から `id: string` に緩めた」

- 型 A の `WidgetId` は全 widget id を literal union で列挙する必要があり、widget 追加ごとに型定義修正が必要
- 型 B は `id: string` で緩めており、この違いが意図的な運用緩和を示唆
- 検証可能 predicate:
  - 型 A の `WidgetId` 型定義に 29 件の literal が存在するか → 存在すれば支持
  - 型 B を使う 16 widget の commit で `WidgetId` 型定義の追加がなかったか → なかったら支持

### S1.単一原因帰着の拒否

「全部 `WidgetDef` 2 型並存のせい」「全部 Dashboard/Unified 二分のせい」は拒否する。S1-H1 / H2 / H3 の相互作用（H1 の過渡期が H2 の scope 相違により必然化し、H3 が運用緩和として固定化した）という**複合仮説**を次 Phase 以降で検討する。

---

## S2. Data pipeline の非統一

### S2.観察された事実

- Handler 配置が 2 系統に分岐（inquiry/06 §F-2）:
  - `purchaseCostHandler` / `customerFactHandler` / `salesFactHandler` は `application/readModels/<name>/` 配下
  - `discountFactHandler` のみ `application/queries/discountFactHandler.ts` 配下
- Hook が 5 位置に散在（inquiry/06 §F-1）: `application/hooks/` / `features/*/application/` / `presentation/pages/*/` / `presentation/hooks/` / 複製
- `useCostDetailData` が `features/cost-detail/application/` と `presentation/pages/CostDetail/` の 2 箇所に並存（inquiry/06 §F-3）
- `useUnifiedWidgetContext` が `presentation/hooks/` に配置（application 層ではない）（inquiry/06 §F-6）
- `useStoreSelection` が 5 関心（`currentResult` / `selectedResults` / `storeName` / `stores` / `selectedStoreIds`）を単一 hook で返す（inquiry/06 §F-5）

### S2.仮説

#### S2-H1. 「readModel 正本化が段階導入で、先行正本と後続正本で配置規約が異なった」

- `purchaseCostHandler` / `customerFactHandler` / `salesFactHandler` は「正本化体系」として `readModels/` 配下に統合された系列
- `discountFactHandler` は「正本化体系」策定以前に作られ、`queries/` 配下のまま残置された
- 検証可能 predicate:
  - `discountFactHandler.ts` の初期 commit 日付が purchaseCostHandler の readModel 統合 commit より先行するか → 先行していれば支持
  - `references/01-principles/discount-definition.md` の正本化 commit が他の readModel 正本化より後か

#### S2-H2. 「handler = query adapter、readModel = 値の意味、の責務境界が明示されていない」

- Handler は「データ取得の orchestration」を担い、readModel は「値の意味と契約」を担うが、両者の配置規約が成文化されていない
- 結果として、`discountFactHandler` のような「query-oriented」handler は `queries/` へ、`purchaseCostHandler` のような「readModel co-located」handler は `readModels/` へ、作った人の判断で分岐
- 検証可能 predicate:
  - `references/01-principles/` 内に「handler 配置ルール」を明示する文書が存在しない → 存在しなければ支持
  - `runtime-data-path.md` が handler の所在を規定しているか確認

#### S2-H3. 「feature slice 化と page 固有 hook の並存を解消するタイミングが未到来」

- `useCostDetailData` の features/pages 複製は、feature slice 化（`features/cost-detail/`）への移行中に page 側を残したままになっている
- 同 hook の 2 複製のいずれが「正本」かが明示されておらず、機械検出もない
- 検証可能 predicate:
  - `features/cost-detail/index.ts` が features 版を export している事実（inquiry/06 §A-2 で確認済）
  - pages 版を import する consumer の数 vs features 版を import する consumer の数 → 片方が 0 なら「移行未完」を支持

#### S2-H4. 「`useUnifiedWidgetContext` の presentation 配置は、ctx 構築に presentation 層 hook（theming 等）が不可欠な制約から来た結果」

- `useUnifiedWidgetContext` は application 層の hook（`useStoreSelection` / `useWidgetDataOrchestrator`）を呼び出すが、`fmtCurrency`（`useCurrencyFormat`）等 presentation 層の hook も利用する
- 結果として、application 層には置けず presentation 層になった
- 検証可能 predicate:
  - `useUnifiedWidgetContext.ts` が presentation 層限定の hook（`useCurrencyFormat` 等）を import している → import していれば支持
  - もし presentation 依存を切り離せば application 層に置けるかどうかは Phase 4 改修計画で検討

### S2.単一原因帰着の拒否

「全部 readModel 正本化のタイミング差のせい」は拒否する。S2-H1 は一部の事実（discountFactHandler の孤立）を説明するが、H2（責務境界の未成文）が無ければ H1 の再発は防げない。H3 / H4 は別層の並行仮説として同時に成立しうる。

---

## S3. UnifiedWidgetContext の page-coupled optional

### S3.観察された事実

- `UnifiedWidgetContext`（47 field）中、page-local optional 5 field が配置（inquiry/04 §B-2）: `insightData` / `costDetailData` / `selectedResults` / `storeNames` / `onCustomCategoryChange`
- Dashboard 固有 optional 20 field が同 ctx に同居（`storeKey` / `allStoreResults` 等、inquiry/04 §B-3）
- 47 field 中 **14 field（30%）が registry 行から 0 touch**（inquiry/02 §C-2）
- `isVisible` predicate で optional field を null check する widget が 17 件（inquiry/04 §D）
- WID-033 `insight-budget-simulator` が Unified core required の `result` を null check する事例
- 同名 `WidgetContext`（Dashboard 版）が 25 field を optional → required に昇格（inquiry/04 §C）

### S3.仮説

#### S3-H1. 「`UnifiedWidgetContext` は時系列的に page-local field を継ぎ足して成長し、剥離する機会が無かった」

- ページが追加されるたびに（Insight → CostDetail → Category 等）、page 固有 field が「既存を壊さない」原則で optional として追加された
- 剥離のタイミングが来ない（optional なら既存ページは無害、新ページは ctx を受け取るだけ）
- 検証可能 predicate:
  - `components/widgets/types.ts` の commit 履歴で page-local field の追加が時系列的に独立 commit で行われているか → されていれば支持
  - 各 page-local field を参照する widget が 1 page の registry 内に限局しているか（inquiry/04 §B-4 で確認済 → 支持）

#### S3-H2. 「`Unified` を名乗る統合契約が最初から spec されておらず、合成点（`useUnifiedWidgetContext`）が結果的に上位集合になった」

- `UnifiedWidgetContext` は「上位集合で包む」戦略を取り、型設計段階で「ctx が持つべき field」の意味論的境界を引かなかった
- 結果として、誰かが ctx に追加したい field があれば optional で追加できてしまう構造
- 検証可能 predicate:
  - `types.ts` 冒頭コメント（`:58-63`）が「ページによって提供できない field は optional」と受動的な表現である → 事実（inquiry/04 §B-1 で確認済）→ 支持
  - ctx が field 追加の**禁止事項**を持っていない（例: `AR-UNIFIED-CTX-PAGE-LOCAL-FORBIDDEN` のような rule が不在）→ Phase 3 で確認

#### S3-H3. 「Dashboard の required 昇格は runtime 保証の型レベル反映で、Dashboard の hook 構造が単純だった時期の設計」

- `Dashboard/widgets/types.ts:70-71` のコメント「`useUnifiedWidgetContext` が全フィールドを設定するため、ランタイムでは常に全フィールドが存在する」
- Dashboard page は確定的に全 field を供給できる runtime 契約を持っており、それを型 A で表明した
- 他ページは供給できない field があるので Unified で optional のまま使用
- 検証可能 predicate:
  - `useUnifiedWidgetContext` 実装で Dashboard が required 昇格した全 field を always-set しているか
  - 他ページの実装では一部 field が undefined のまま渡される

#### S3-H4. 「`isVisible` による gate が optional 参照の共通解決策として採用されたため、field 側を required にする圧力が発生しなかった」

- optional field を参照する widget は `isVisible: (ctx) => ctx.X != null` で gate することで null-safe を実現できる
- これが成立すると、field 側を required に昇格する必要がない
- 結果として、17 widget で gate パターンが繰り返され、page-local optional が固定化
- 検証可能 predicate:
  - 17 gate widget の isVisible が全て同一パターン（`ctx.X != null` 等の null check）か → inquiry/04 §D で確認、ほぼ同一 → 支持
  - 逆に gate predicate を ctx 側で保証する設計（例: ctx 型を分岐）があれば、gate は不要になる

### S3.単一原因帰着の拒否

「全部 page-local を `UnifiedWidgetContext` に入れたせい」は拒否する。S3-H1（時系列継ぎ足し）は症状発生の経緯を、S3-H2（設計的境界不在）は再発構造を、S3-H3（Dashboard の例外的位置）は非対称の理由を、S3-H4（gate 解決の定着）は剥離圧力の欠如を、それぞれ別軸で説明する。

---

## S4. Pure 計算の hook / component 埋没

### S4.観察された事実

- `useMemo` / `useCallback` 等に埋没している pure 計算候補 95 件（inquiry/05）
- パターン内訳: P-TRANS 44 / P-AGG 22 / P-FILTER 5 / P-MAP 5 / P-DERIV 4 / P-CLASSIFY 3 / P-REDUCE 2
- 最大 69 行の pure 計算（`CategoryComparisonCharts.tsx` の ECharts option builder）
- 抽出済み pure の配置先が分岐: `pages/Forecast/ForecastPage.helpers`（presentation）vs `features/*/application/pure/`（features application）vs `domain/calculations/`（domain）
- Dashboard/widgets 配下に 25 件、application/hooks 配下に 15 件の集中

### S4.仮説

#### S4-H1. 「useMemo は pure 計算を書く最短経路であり、抽出への動機付けが無い」

- React hook として useMemo は「計算の memoization」という文脈で提供されており、pure fn 抽出の promptが発生しにくい
- 一度 useMemo 内に書かれた計算は、リファクタ機会が無ければそのまま残る
- 検証可能 predicate:
  - useMemo 内の計算を抽出した PR 履歴があるか → あれば「抽出は意図的に行われた」、無ければ「動機付けが無い」を支持
  - inquiry/05 の 95 件中、抽出候補として「テストが書かれていない」率が高いか（useMemo 内はテスト困難、抽出すれば pure fn として unit test 可能）

#### S4-H2. 「抽出先の配置規約が成文化されていないため、抽出する人が迷う／後回しにする」

- `domain/calculations/` / `features/*/application/pure/` / `presentation/pages/*/*.helpers.ts` の 3 位置に pure fn が並存
- 「どこに抽出すべきか」を決める基準が無いと、抽出判断のコストが上がり、useMemo のまま残される
- 検証可能 predicate:
  - `references/01-principles/` 内に「pure fn の抽出先配置ルール」を明示する文書が存在しない → 存在しなければ支持
  - 既抽出済み pure fn のランダム抽出で、配置場所に統一性がない事実（`buildForecastInput` は ForecastPage.helpers、`buildBudgetSimulatorScenario` は features/budget/application/pure 等、inquiry/05 §B-4 で確認）→ 支持

#### S4-H3. 「ECharts option builder の扱いが domain 対象外で、巨大 P-TRANS として useMemo に残る」

- 60+ 行の P-TRANS は多くが ECharts option 構築で、`domain/calculations/` の対象外（domain は business logic 正本）
- chart-specific helper の抽出先が定まっていないため、component 内に残る
- 検証可能 predicate:
  - 60 行超の P-TRANS のうち ECharts option 関連が過半か → inquiry/05 §C-2 から既に示唆
  - `references/03-guides/chart-rendering-three-stage-pattern.md` に chart-specific pure 抽出ルールがあるか確認

#### S4-H4. 「component と hook の境界が曖昧で、「hook に書けば pure」の誤認がある」

- hook は「state + effect + return value の合成」だが、pure fn 抽出が先行していない場合、hook 内に pure が畳み込まれる
- 結果として、hook が「pure + side effect + state」の複合責務を持つ
- 検証可能 predicate:
  - inquiry/05 の `application/hooks/` 配下 15 件が hook 関数名と同一の抽象を表現しているか → 表現していなければ「hook 内に別責務の pure が混入」を支持
  - 例: `useDailyPageData.ts:80-92` が「pure な transformation」を含む（inquiry/05 §A-5）

### S4.単一原因帰着の拒否

「全部 pure 抽出規約不在のせい」は拒否する。S4-H1（useMemo の最短経路性）は個別判断の発生コスト、S4-H2（配置規約不在）は抽出判断の意思決定コスト、S4-H3（chart 特有の抽出先不明）は特殊ケース、S4-H4（hook / pure の境界曖昧）は構造的混在、それぞれ独立に成立する。

---

## S5. 責務分離の揺れと byte-identical 複製

### S5.観察された事実

- `features/{category, cost-detail, reports}/ui/widgets.tsx` の 3 ファイルが `pages/*/widgets.tsx` と byte-identical（inquiry/01 §特殊 / 03 §特殊 1）
- `useCostDetailData` が `features/cost-detail/application/` と `pages/CostDetail/` の 2 箇所に並存（inquiry/06 §F-3）
- Tier D（orphan）3 件（inquiry/03 §D-1〜D-3）: `DowGapKpiCard` / `PlanActualForecast` / `RangeComparison`
- `PlanActualForecast` は test ファイルはあるが本番 import 0
- `RangeComparison.tsx` は orphan だが `.styles.ts` のみ barrel re-export 残存

### S5.仮説

#### S5-H1. 「feature slice 化移行の中間状態が固定化した」

- 当初 `presentation/pages/*/widgets.tsx` に widget が配置されていた
- Feature slice 化（`features/<slice>/ui/`）の過程で複製作成 → 片方を正本にする決定の先送り
- 結果として 2 箇所に byte-identical が並存
- 検証可能 predicate:
  - `features/category/ui/widgets.tsx` と `pages/Category/widgets.tsx` の最初の commit 日付の関係。pages が先、features が後なら feature slice 移行中の複製である
  - 2 ファイルのうち import されているのは pages のみ（`unifiedRegistry.ts:17-19` で確認済 → 移行未完を支持）

#### S5-H2. 「削除の決定権が曖昧で、非参照ファイルが残存しやすい」

- `PlanActualForecast.tsx` は本番参照 0 だが `.test.tsx` が存在するため「テストが壊れる」不安で削除が後回し
- `RangeComparison.styles.ts` が barrel 経由で re-export 残存（`DashboardPage.styles.ts:16`）しているため、`.tsx` 本体削除時に barrel 整合性への配慮で後回し
- 検証可能 predicate:
  - これらの orphan が過去の commit で「widget が登録解除された」履歴を持つか → 持てば「登録解除後に削除の決定が先送り」を支持
  - 削除を阻害する機械的検出（「barrel re-export がある .tsx は削除禁止」等の guard）が**存在しない**こと

#### S5-H3. 「file に対する正本マークの仕組みが無く、重複削除の判断が人間依存になる」

- byte-identical な 2 ファイルのどちらが正本かを示す metadata（例: `@canonical` JSDoc や ownership 表）が無い
- 結果として、どちらかを残すかの判断が都度議論になり、延期される
- 検証可能 predicate:
  - `features/category/ui/widgets.tsx` / `pages/Category/widgets.tsx` のいずれにも「正本」「deprecated」等のマーカーが無い → 無ければ支持

### S5.単一原因帰着の拒否

「全部 feature slice 化中途のせい」は拒否する。S5-H1 は過程の説明、S5-H2 は削除阻害要因、S5-H3 は構造的不在、それぞれ独立。

---

## S6. 複雑性 hotspot の Dashboard 集中

### S6.観察された事実

- complexityHotspots 10 件中 Dashboard/widgets 配下 4 件 + `TimeSlotChart.tsx`（components/charts）1 件 = 半数が Dashboard 関連
- 最大 lineCount 532（`ConditionSummaryEnhanced.tsx`、WID-001 の子）
- 最大 memoCount 11（`useDayDetailPlan.ts`、P8 境界 ≤12 に対し余裕 1）
- Dashboard 固有 optional 20 field が `UnifiedWidgetContext` に同居（S3 と関連）
- Dashboard 固有の hook（`useMetricBreakdown` / `useDayDetailPlan` 等）が hotspot 上位

### S6.仮説

#### S6-H1. 「Dashboard が最初に作られ、全 ctx を required で扱う前提で設計が肥大化した」

- Dashboard は全店横断 + 多 widget + 複合 ctx を扱う最初のページ
- 設計段階で「全部持っている前提」で記述されたため、hook / component が複合責務を持ちやすかった
- 他ページは後発で Unified ctx ベース設計になったため、Dashboard が肥大化したまま残った
- 検証可能 predicate:
  - Dashboard 関連ファイルの initial commit 日付が他 page より早い
  - Dashboard 配下 hotspot の memoCount 平均と他 page hotspot の平均の差 → 差があれば支持

#### S6-H2. 「ConditionSummaryEnhanced は一つの widget（WID-001）の子だが実態は多 widget 相当の機能を内包」

- `ConditionSummaryEnhanced.tsx:532` が内部で budget drill / YoY drill / settings / card rows / daily chart / daily modal を合成
- WSS spec 上は WID-001 = 1 widget だが、実装は 「1 widget = 多 sub-widget」のパターン
- 検証可能 predicate:
  - `ConditionSummary*.tsx` ファミリの `.tsx` 件数が 10+ 存在（inquiry/03 §Tier B で確認、約 12 ファイル）→ 支持
  - 1 文説明テスト（C8）で AND が複数入る（inquiry/08 §D-1）→ 支持

#### S6-H3. 「Dashboard は `comparisonScope` / `dowGap` / `monthlyHistory` / `prevYearMonthlyKpi` 等 Dashboard 独自の分析概念が集中する page で、自然に複雑になる」

- Dashboard 固有 20 field は、それぞれが Dashboard の分析機能（前年比 / 曜日ギャップ / 月次履歴）を表現する
- これらが集中するページが Dashboard 1 つのため、複雑性が Dashboard に集中する
- 検証可能 predicate:
  - Dashboard 固有 20 field のうち各 field を使う widget が Dashboard registry 限定か（inquiry/02 §B-2 で確認：ほぼ全て Dashboard registry）→ 支持
  - 他 page が同等の分析機能を持つ場合にそれらも hotspot 化する → Weather page が hotspot に入っていることから部分的に支持

#### S6-H4. 「hook の「Plan」パターン（`useDayDetailPlan` 等）が複雑性を hook に集約する構造として標準化した」

- `useDayDetailPlan.ts:11 memo` は Plan パターン（`references/01-principles/` 参照）の hub
- Plan hook が comparison routing + query orchestration + projection 等を一箇所に集約するため、memoCount が高くなるのは構造的必然
- 検証可能 predicate:
  - 他の Plan hook（`useHeatmapPlan` / `usePerformanceIndexPlan` 等）も同程度の memoCount を持つか → 持てば Plan パターンの必然性を支持
  - Plan hook の責務分解が可能か（単一 Plan を複数 sub-plan に分ける）は Phase 4 改修計画で検討

### S6.単一原因帰着の拒否

「全部 Dashboard が古いせい」は拒否する。S6-H1（時系列先行）、S6-H2（1 widget 内の肥大化）、S6-H3（分析概念集中）、S6-H4（Plan パターンの集約性）が相互に絡み合って観察される症状を説明する。

## 付記

- 本台帳は immutable。Phase 3 以降の追加情報は `09a-*.md` として addend する
- 関連: `inquiry/01-08`、`inquiry/10-hypothesis-interaction.md`（仮説間の相互作用）、`inquiry/11-recurrence-pattern.md`（既存対策の回避経緯）
