# inquiry/08 — UI 層責務分離監査

> 役割: Phase 1 inquiry 成果物 #8。`presentation/` + `features/*/ui/` の UI 層について、C8「1 文説明テスト」および `responsibilitySeparationGuard` の P2-P18 分布を事実として記録する。
> **事実のみ。recommendations / 意見 / 改修案を書かない**（plan.md §2 不可侵原則 #12）。
>
> 本ファイルは immutable。Phase 2 以降で追加情報が判明しても書き換えず、`08a-*.md` として addend する。
>
> 前提: HANDOFF.md §3.8「UI 層は既存で十分にテコ入れされていない前提」。Budget Simulator reboot 時に表面化した UI 層乱雑性を**重点監査**する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `4506852`（inquiry/07 push 直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 対象 | `app/src/presentation/` + `app/src/features/*/ui/` 配下の `.tsx` / `.ts`（test / stories 除く） |
| 入力 | `responsibilitySeparationGuard.test.ts`、`responsibilityTagRegistry`、`responsibilityTagGuard.test.ts`、inquiry/01-07 の集計、`references/03-guides/responsibility-separation-catalog.md`（参照） |

## A. C8「1 文説明テスト」の適用結果

### A-1. C8 の定義（CLAUDE.md 設計原則 C8 より再掲）

> このインスタンスの責務を「〜を担う」の 1 文で説明できるか？
> - 説明に **AND** が入ったら分離候補
> - 行数ではなく**変更理由の数**で判定する
> - 分割すればいいという問題ではない。適切なインスタンスで構成されているかが重要

### A-2. 本台帳での適用範囲

全 UI 層ファイルへの C8 適用は本 Phase 1 では未実施。代わりに、既存 complexity hotspot（inquiry/07 §A）および WSS pilot 3 件（WID-001 / WID-002 / WID-040）で surface した事実を集約する。

## B. responsibilitySeparationGuard（P2-P18）の baseline

`responsibilitySeparationGuard.test.ts` の 7 種機械検出（CLAUDE.md 設計原則 G8 より再掲）:

| guard | 検出対象 | 上限 |
|---|---|---|
| P2 | presentation/ の `getState()` 呼び出し | 0（allowlist 管理） |
| P7 | module-scope `let` | 0（allowlist 管理） |
| P8 | useMemo + useCallback 合計 | ≤12 |
| P10 | features/ の useMemo / useState | ≤7 / ≤6 |
| P12 | domain/models/ の export 数 | ≤8 |
| P17 | storeIds 正規化の散在ファイル数 | ≤27（集約） |
| P18 | fallback 定数密度 | ≤7/file |

本 baseline の現状違反数（KPI 値）は `architecture-health.json` では個別化されておらず、本台帳では guard 名と上限のみを記録する。

## C. 責務タグ（`responsibilityTagGuard`）の baseline

inquiry/07 §D より再掲:

| 指標 | baseline |
|---|---|
| 未分類（UNCLASSIFIED_BASELINE） | 400 |
| タグ不一致 | 51 |

事実: 両方とも ratchet-down 管理（減少のみ許可）。

本 project の Phase 1 時点で本台帳は、**未分類 400 件の個別 path 列挙は未実施**（Phase 2 以降で optional に扱う）。

## D. UI 層で surface した責務複合の事実

WSS pilot 3 件 + inquiry/01-06 の集計で観察された UI 層責務複合:

### D-1. WID-001 `widget-budget-achievement` / `ConditionSummaryEnhanced.tsx`（532 行、inquiry/07 hotspot #3）

- `ConditionSummaryEnhanced.tsx:24` が `useSettingsStore` を直接 import（presentation 層から store 読取）
- render 関数が内部で 複数の vm builder（`buildCardSummaries` / `buildBudgetHeader` / `buildYoYCards` / `buildUnifiedCards` / `computeTrend` / `computeRateTrend`）を組み合わせる
- 子 component（`ScrollableCardRow` / `ConditionSummaryBudgetDrill` / `ConditionSettingsPanelWidget` / `YoYDrillOverlay`）への full ctx passthrough
- 1 文説明に「**store 読取 AND** 複数 vm 呼び出し **AND** 子 component の合成 **AND** 予算達成メトリクス表示」等の複合が入る事実（C8 の AND 判定に該当）

### D-2. WID-002 `chart-daily-sales` / registry 行

- registry 行が `result` / `prevYear` / 天気 / 取得経路 4 field 等を解体して 17 props を forward
- 同時に `widgetCtx={ctx}` で full ctx も注入（props 経由 + ctx 経由の二重注入）
- registry 行レベルでの 17 field 展開は、「登録・取得・解体・forward」の 4 責務が 1 entry に集約された状態

### D-3. WID-040 `costdetail-kpi-summary` / registry 行

- registry 行が inline JSX で `KpiGrid` + 4 `KpiCard` を展開
- `palette.blueDark` / `palette.dangerDark` / `palette.orange` / `palette.orangeDark` の 4 色 token を直接記述
- `onExplain('totalCostInclusion')` metric ID をリテラル文字列でハードコード
- `typeLabel` の template literal 結合を widget 層で実施
- 1 文説明に「**登録 AND** inline 描画 **AND** 色決定 **AND** metric ID 参照 **AND** label 組み立て」が入る事実

### D-4. Dashboard/widgets hotspot 5 件の共通パターン

inquiry/07 §A の Dashboard widgets 配下 hotspot 5 件（`HourlyChart` / `ConditionSummaryEnhanced` / `YoYWaterfallChart` / `DayDetailModal` / `TimeSlotChart`）は、共通して memo 7-9 件 + state 4-7 件 + 200-532 行の規模。responsibilitySeparationGuard P8（memo + callback 合計 ≤12）に対し、単独 P8 違反は未観測だが、memo + state 合算では境界近辺。

## E. features/\*/ui vs presentation/pages/\*/widgets の責務配置差

### E-1. 配置の現状

- Dashboard widget は `presentation/pages/Dashboard/widgets/` に 55 component（inquiry/03 より）
- page-level widget は `presentation/pages/{Category,CostDetail,Daily,Insight,Reports}/widgets.tsx` + `features/{category,cost-detail,budget,forecast,purchase,sales,reports,weather,storage-admin}/ui/` の 59 component

### E-2. byte-identical 複製（inquiry/01 §特殊 / inquiry/03 §特殊 1 再掲）

`features/{category,cost-detail,reports}/ui/widgets.tsx` が `pages/*/widgets.tsx` と byte-identical（diff 0）。同じ `export const` 名で 2 ファイルに存在するが `unifiedRegistry.ts` は pages/ のみを import。features 版は実質 dead code。

### E-3. `useCostDetailData` の 2 箇所複製（inquiry/06 §A-2 再掲）

`features/cost-detail/application/useCostDetailData.ts` と `presentation/pages/CostDetail/useCostDetailData.ts` が並存。両方とも同じ export 名。

## F. 責務タグと実態の乖離の事例（抜粋）

WSS pilot の Section 8「Guard / Rule References」で surface した事実を集約:

- `ConditionSummaryEnhanced.tsx` は `R:component` 期待だが、`useSettingsStore` を直接 import（store 読取が入り込む）
- 多数の `registry*Widgets.tsx` は registry 登録を担うが、内部で 17 field 展開（WID-002）や inline JSX 構築（WID-040）を含み、単純な「登録者」ではない

責務タグ不一致 baseline 51 件の個別 path 列挙は本 Phase 1 では未実施。

## G. 責務分離パターンカタログ（参照先）

詳細カタログは `references/03-guides/responsibility-separation-catalog.md`（24 パターン）。本台帳は監査の**観察結果**のみを記録し、パターン解説は carried out しない。

## H. ambiguity / 未追跡項目

### H-1. C8 の全 UI 層適用未実施

本台帳は WSS pilot 3 件 + hotspot 10 件の範囲で C8 観察を surface した。**全 UI 層**（presentation 全域 + features/\*/ui 全域）への網羅的 C8 適用は未実施。

### H-2. P2-P18 の現状違反数未計測

guard 7 種の上限値は記録したが、現在の違反件数（allowlist 登録数）の個別列挙は本台帳では未実施。`architecture-health.json` の KPI `allowlist.total: 13` / `allowlist.active.count: 6` はあるが、P2 / P7 / P8 / P10 等の guard 別内訳は未走査。

### H-3. 「乱雑」の定量指標

HANDOFF §3.8 で「UI 層は乱雑な箇所が多い前提」と記述されるが、「乱雑」の定量閾値は本 project では未定義。本台帳は hotspot / baseline / 事実列挙を代理指標として扱う。

### H-4. 未分類 400 件の個別列挙

責務タグ未分類 400 件の path 列挙は本台帳で未実施。`responsibilityTagRegistry` の実体走査は Phase 2 以降に委ねる。

### H-5. features 側の pure helper 配置の一貫性

inquiry/05 §B-4 で surface した「`pages/Forecast/ForecastPage.helpers` に pure 抽出、`features/*/application/pure/` にも pure 抽出」の並存は、責務分離の観点からも pure と UI の境界線の揺れを示唆する事実として本台帳でも記録する。

## 付記

- 本台帳は immutable。Phase 2 以降の追加情報は `08a-*.md` として addend する
- 関連: `inquiry/01-07`、`references/03-guides/responsibility-separation-catalog.md`、`app/src/test/guards/responsibilitySeparationGuard.test.ts`、`app/src/test/guards/responsibilityTagGuard.test.ts`
