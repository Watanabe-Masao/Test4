# HANDOFF — widget-context-boundary（SP-A）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Wave 2 着手 (2026-04-25)。status: `active` / parent: `architecture-debt-recovery`。**

ADR-A-001 / A-002 / A-003 は実装完了。ADR-A-004 は PR1 (guard) + PR2 (slice 並行型導入) 完了。
PR3 (consumer 移行) は本 HANDOFF §2.1 に設計案を記載。次セッションで着手。

### 完了 ADR

| ADR   | BC          | 状態                   | 主な成果                                                                                                                                |
| ----- | ----------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A-001 | BC-1        | ✅ PR1/2/3a/3b/3c/4 全 | UnifiedWidgetContext から 5 page-local field 削除、Insight/CostDetail/Category page-specific ctx 新設                                   |
| A-002 | BC-2 (部分) | ✅ PR1/2/3/4 全        | DashboardWidgetContext 新設、WidgetContext alias 削除、20 field を audit して 11 Dashboard 専用 field を削除（9 cross-page 共有は残置） |
| A-003 | BC-3        | ✅ PR1/2/3/4 全        | WidgetDef 同名 2 ファイル並存を UnifiedWidgetDef / DashboardWidgetDef に分離、19 consumer を bulk migrate、alias 削除                   |
| A-004 | BC-4        | 🟡 PR1 + PR2           | PR1: guard 導入。PR2: `StoreResultSlice` / `PrevYearDataSlice` 並行型導入（consumer 変更 0 件）。PR3-4 は次セッション                   |

### 新規 guard (本 project が landed)

- `unifiedWidgetContextNoPageLocalOptionalGuard` (baseline=0、ADR-A-001 完結)
- `unifiedWidgetContextNoDashboardSpecificGuard` (baseline=9、ADR-A-002 移行中)
- `sameInterfaceNameGuard` (baseline=27、ADR-A-003 完結)
- `coreRequiredFieldNullCheckGuard` (baseline=1、ADR-A-004 PR1 完了。PR3 で 0 到達予定)

### 新規型 (PR2 で landed)

- `StoreResultSlice` (`app/src/domain/models/StoreResultSlice.ts`)
- `PrevYearDataSlice` (`app/src/features/comparison/application/PrevYearDataSlice.ts`)
- ヘルパー: `storeResultData` / `prevYearDataValue` / `readyXxx` ファクトリ / `EMPTY_*_SLICE` シングルトン
- Barrel: `domain/models/storeTypes`, `features/comparison`, `application/hooks/analytics`

## 2. 次にやること

### 高優先（次セッション）

1. **ADR-A-004 PR3**: WidgetContext consumer 移行（BC-4）— 設計案（chokepoint narrowing）
   - **実 audit 結果**: 27 consumer ファイル / 137 references。当初推定 100+ より小さい
   - **設計方針**: 「dispatch 時 narrow」の chokepoint パターンで widget 本体の変更を最小化
   - **手順**:
     1. `UnifiedWidgetContext.result` 型を `StoreResult` → `StoreResultSlice` に変更
     2. 同様に `prevYear` を `PrevYearDataSlice` に変更
     3. Render 用の narrowed 型を新設: `RenderUnifiedWidgetContext = Omit<..., 'result' \| 'prevYear'> & { result: StoreResult; prevYear: PrevYearData }`
     4. `UnifiedWidgetDef.render` / `isVisible` の signature を Render 型に変更
     5. `DashboardWidgetDef` も同様に対応（`RenderDashboardWidgetContext`）
     6. `Insight/CostDetail/Category` の `*Widget` helper を slice 対応版に更新
     7. `useUnifiedWidgetContext` populator で `result`/`prevYear` を slice として wrap
     8. dispatch site (DashboardPage / DashboardChartGrid / PageWidgetContainer / useDashboardLayout / unifiedRegistry) で narrow helper 経由に切替
     9. dispatch 外の直接 access（DashboardPage.tsx の `useDashboardLayout` 入力 `ctx?.prevYear.hasPrevYear` 等）は slice helper (`prevYearDataValue` / `storeResultData`) で吸収
   - **影響ファイル**: 推定 ~20 ファイル（widget 本体は不変、type/dispatch/populator/直接 access のみ）
   - **PR4**: 旧 shape の alias 撤退、guard baseline=0、LEG-007 / LEG-008 sunset 達成
2. **45 widget の `lastVerifiedCommit` 更新**: WSS spec のメンテナンスは未着手（ADR-A-001〜A-003 で touched widget だけでも 30+ 件）

### sub-project completion 条件

- ADR-A-004 PR4 完了
- LEG-007 / LEG-008 sunsetCondition 達成
- 45 widget の `lastVerifiedCommit` が同期
- visual / E2E 回帰テスト
- sub-project completion PR (umbrella inquiry/20 §テンプレート 7 step)

## 3. ハマりポイント

### 3.1. ADR-A-002 PR4 で発見した audit 誤り

inquiry/15 §ADR-A-002 では「Dashboard 固有 20 field」と分類されていたが、
実装中に 9 field が cross-page 共有（Insight ページの PiCvBubbleChart / DashboardPage 内部参照など）
であることが判明。残 11 field のみ削除した。**事前 audit より実コード検証を優先する**ことの教訓。

### 3.2. discriminated union 化は chokepoint narrowing で吸収する

`StoreResult` / `PrevYearData` は domain / application core type で `result.daily` / `result.budget` 等の
access がコードベース全域に散在。**全 consumer に narrowing 文を入れる**素直なアプローチでは
27 consumer ファイル × 平均 5+ references = 過大な diff となる。

**採用方針**（PR3 で実装予定）: `WidgetContext.result/prevYear` を slice 型にしつつ、
`UnifiedWidgetDef.render` / `isVisible` の signature には narrowed 型（`RenderUnifiedWidgetContext`）
を渡し、dispatch 時に narrow helper で 1 回だけ status check する chokepoint パターンを採用。
これにより widget 本体の `ctx.result.X` / `ctx.prevYear.X` 参照は不変。直接 access の数箇所
（DashboardPage の useDashboardLayout 入力等）のみ slice helper で吸収する。

ADR-A-004 の精神（型と runtime 期待の乖離解消）は、**slice 型を WidgetContext field に乗せる**
ことで達成される。narrowing の重複は dispatch chokepoint に集約することで保守コストを最小化する。

### 3.3. 45 widget 影響の段階移行

一気に変えると回帰リスク大。ADR-A-001 / A-002 の PR3 は複数 batch に分けて完遂済み
（例: INSIGHT 6 widget を 1 batch、COST_DETAIL 4 widget を 1 batch）。

### 3.4. WSS spec の `lastVerifiedCommit` 更新は未自動化

各 PR で手動更新する規律は守れていない（バルク作業が多すぎた）。
SP-B 完了後に WSS generator project でこれを自動化することを検討。

## 4. 関連文書

| ファイル                                                                                | 役割                                |
| --------------------------------------------------------------------------------------- | ----------------------------------- |
| `AI_CONTEXT.md`                                                                         | why / scope / parent / read order   |
| `plan.md`                                                                               | 4 ADR 実行計画                      |
| `checklist.md`                                                                          | Phase 別 completion 条件            |
| `config/project.json`                                                                   | project manifest                    |
| `aag/execution-overlay.ts`                                                              | rule overlay                        |
| `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane A`            | 4 ADR 元台帳                        |
| `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-1〜BC-4`        | 4 破壊的変更                        |
| `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-001〜LEG-008` | 8 legacy item                       |
| `projects/architecture-debt-recovery/inquiry/10a-wss-concern-link.md`                   | WSS 45 widget concern 連結          |
| `references/05-contents/widgets/WID-NNN.md`                                             | 各 widget の現状把握（PR ごと更新） |
