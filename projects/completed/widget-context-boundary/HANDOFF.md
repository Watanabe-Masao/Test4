# HANDOFF — widget-context-boundary（SP-A）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Wave 2 完遂 (2026-04-25)。status: `active` / parent: `architecture-debt-recovery`。**

4 ADR (A-001 / A-002 / A-003 / A-004) の 4 step（PR1〜PR4）すべて landed。
4 guard が baseline 達成済。残課題は Phase 5 sub-project completion（visual / E2E 回帰、
45 widget `lastVerifiedCommit` 同期、completion PR）のみで、本 ADR 内のコード作業は完了。

### 完了 ADR

| ADR   | BC          | 状態                   | 主な成果                                                                                                                                                                                |
| ----- | ----------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-001 | BC-1        | ✅ PR1/2/3a/3b/3c/4 全 | UnifiedWidgetContext から 5 page-local field 削除、Insight/CostDetail/Category page-specific ctx 新設                                                                                   |
| A-002 | BC-2 (部分) | ✅ PR1/2/3/4 全        | DashboardWidgetContext 新設、WidgetContext alias 削除、20 field を audit して 11 Dashboard 専用 field を削除（9 cross-page 共有は残置）                                                 |
| A-003 | BC-3        | ✅ PR1/2/3/4 全        | WidgetDef 同名 2 ファイル並存を UnifiedWidgetDef / DashboardWidgetDef に分離、19 consumer を bulk migrate、alias 削除                                                                   |
| A-004 | BC-4        | ✅ PR1/2/3/4 全        | StoreResultSlice / PrevYearDataSlice 並行導入 → WidgetContext.result/prevYear を slice に切替 + RenderUnifiedWidgetContext 新設で chokepoint narrowing 採用、guard baseline 1→0、LEG-007/008 sunset |

### 新規 guard (本 project が landed)

- `unifiedWidgetContextNoPageLocalOptionalGuard` (baseline=0、ADR-A-001 完結)
- `unifiedWidgetContextNoDashboardSpecificGuard` (baseline=9、ADR-A-002 移行中)
- `sameInterfaceNameGuard` (baseline=27、ADR-A-003 完結)
- `coreRequiredFieldNullCheckGuard` (baseline=0、ADR-A-004 完結 — PR3 で dead null check 除去)

### 新規型 (PR2 で landed、PR3 で WidgetContext に組み込み)

- `StoreResultSlice` (`app/src/domain/models/StoreResultSlice.ts`)
- `PrevYearDataSlice` (`app/src/features/comparison/application/PrevYearDataSlice.ts`)
- `RenderUnifiedWidgetContext` (`app/src/presentation/components/widgets/types.ts`) — narrow 後の render-time 型
- `RenderDashboardWidgetContext` (alias、`Dashboard/widgets/types.ts`) — DashboardWidgetContext は base を Render 型に切替済
- `narrowRenderCtx` (`app/src/presentation/components/widgets/widgetContextNarrow.ts`) — chokepoint helper
- ヘルパー: `storeResultData` / `prevYearDataValue` / `readyXxx` ファクトリ / `EMPTY_*_SLICE` シングルトン
- Barrel: `domain/models/storeTypes`, `features/comparison`, `application/hooks/analytics`, `presentation/components/widgets`

## 2. 次にやること

### sub-project completion 残タスク（Phase 5）

本 ADR 内のコード作業は完了。残るは sub-project closeout（コードゼロ・運用作業）。

1. **45 widget の `lastVerifiedCommit` 更新**: WSS spec のメンテナンスは未着手（ADR-A-001〜A-004 で touched widget だけでも 30+ 件）。本 ADR scope 外、別 project（WSS generator）で自動化予定。
2. **visual / E2E 回帰テスト**: 45 widget の runtime 動作確認。chokepoint narrowing 導入により widget 本体は変更ゼロのため低リスク。
3. **sub-project completion PR**: umbrella `inquiry/20 §sub-project completion テンプレート` の 7 step に従って完了処理。

### sub-project completion 条件（達成状況）

- [x] ADR-A-004 PR4 完了（2026-04-25）
- [x] LEG-007 / LEG-008 sunsetCondition 達成（slice 経由配布 + guard baseline=0 + post-narrow 型で原型を露出）
- [ ] 45 widget の `lastVerifiedCommit` が同期（別 project 対応）
- [ ] visual / E2E 回帰テスト
- [ ] sub-project completion PR (umbrella inquiry/20 §テンプレート 7 step)

## 3. ハマりポイント

### 3.1. ADR-A-002 PR4 で発見した audit 誤り

inquiry/15 §ADR-A-002 では「Dashboard 固有 20 field」と分類されていたが、
実装中に 9 field が cross-page 共有（Insight ページの PiCvBubbleChart / DashboardPage 内部参照など）
であることが判明。残 11 field のみ削除した。**事前 audit より実コード検証を優先する**ことの教訓。

### 3.2. discriminated union 化は chokepoint narrowing で吸収した（PR3 採用方針）

`StoreResult` / `PrevYearData` は domain / application core type で `result.daily` / `result.budget` 等の
access がコードベース全域に散在。**全 consumer に narrowing 文を入れる**素直なアプローチでは
27 consumer ファイル × 平均 5+ references = 過大な diff となる。

**採用方針**（PR3 で実装、PR4 で finalize）: `WidgetContext.result/prevYear` を slice 型にしつつ、
`UnifiedWidgetDef.render` / `isVisible` の signature には narrowed 型（`RenderUnifiedWidgetContext`）
を渡し、dispatch 時に `narrowRenderCtx()` helper で 1 回だけ status check する chokepoint パターンを採用。
これにより widget 本体の `ctx.result.X` / `ctx.prevYear.X` 参照は不変。直接 access の数箇所
（DashboardPage の useDashboardLayout 入力 / DailyPage / ReportsPage / budget feature の chain）のみ
slice helper（`storeResultData` / `prevYearDataValue`）で吸収した。

**実 diff (PR3)**: 40 ファイル変更（+312/-183 行）。新規 1 file (`widgetContextNarrow.ts`)。
widget 本体（45 widget）の変更ゼロ。dispatch site 5 箇所と直接 access 3 ページ + budget chain 4 file のみ。

ADR-A-004 の精神（型と runtime 期待の乖離解消）は、**slice 型を WidgetContext field に乗せる**
ことで達成された。narrowing の重複は dispatch chokepoint に集約することで保守コストを最小化した。
**`StoreResult` / `PrevYearData` 自体は削除しない** — slice の data フィールド、および
post-narrow 型（`RenderUnifiedWidgetContext`）が参照する正本のため温存する。

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
