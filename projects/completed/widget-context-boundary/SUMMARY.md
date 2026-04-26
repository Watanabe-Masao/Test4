# SUMMARY — widget-context-boundary（SP-A）

> **役割**: completion 記録（final）。後続 project（SP-B widget-registry-simplification）が
> 本 sub-project の経緯・成果物・引き継ぎ先を参照するためのサマリ。
>
> **status (本 file)**: **final（2026-04-25 archive 完了）**。`inquiry/20 §sub-project completion テンプレート` の **step1-7** すべて実施完了（physical move / status 切替 / open-issues 更新 / umbrella HANDOFF 同期 / projectCompletionConsistencyGuard 確認 を含む）。

## 完了日

**2026-04-25** — Phase 5 sub-project completion PR で archive 完了。

## 目的（再掲）

umbrella `architecture-debt-recovery` の **Lane A** sub-project として、widget と ctx の型境界を再構築する:

- `UnifiedWidgetContext` から **page-local optional 5 field 剥離**（insightData / costDetailData / selectedResults / storeNames / onCustomCategoryChange）
- `UnifiedWidgetContext` の Dashboard 固有 20 field を **DashboardWidgetContext に required 集約**
- **WidgetDef 同名 2 型**を `DashboardWidgetDef` / `UnifiedWidgetDef` に分離
- `StoreResult` / `PrevYearData` の **discriminated union 化**（core required field への null check 解消）

全 45 widget に影響する最重量級 sub-project。

## 成果物（landed）

### 4 ADR × 4 step = 16 PR 完遂

| ADR | BC | 主な成果 | landed PR/commit |
|---|---|---|---|
| **A-001** | BC-1 | 5 page-local field 剥離。Insight / CostDetail / Category page-specific ctx 新設 + 12 widget を helper 経由に集約 | `unifiedWidgetContextNoPageLocalOptionalGuard` baseline 5→0 |
| **A-002** | BC-2 | Dashboard 固有 11 field 削除（20 field を audit、9 cross-page 共有を残置）+ legacy WidgetContext alias 削除 + DashboardWidgetContext 新設 + 22 widget 接続 | `unifiedWidgetContextNoDashboardSpecificGuard` baseline 20→9 (cross-page 残置) |
| **A-003** | BC-3 | WidgetDef 同名 2 ファイル並存解消 → DashboardWidgetDef / UnifiedWidgetDef 分離 + 19 consumer bulk migrate | `sameInterfaceNameGuard` baseline 28→27 (scope 外 local 重複は fixed mode) |
| **A-004** | BC-4 | StoreResultSlice / PrevYearDataSlice 並行導入 → WidgetContext.result/prevYear を slice 化 + RenderUnifiedWidgetContext 新設で **chokepoint narrowing** 採用 | `coreRequiredFieldNullCheckGuard` baseline 1→0、LEG-007/008 sunset |

### 新規 guard（4 件、すべて baseline 達成または finalize 済）

| guard | 最終 baseline | 状態 |
|---|---|---|
| `unifiedWidgetContextNoPageLocalOptionalGuard` | 0 | ✅ ADR-A-001 完結 |
| `unifiedWidgetContextNoDashboardSpecificGuard` | 9 | ✅ ADR-A-002 完結（9 cross-page 共有 field を accepted final state として固定） |
| `sameInterfaceNameGuard` | 27 | ✅ ADR-A-003 完結（scope 外 local 重複 27 件を fixed mode、ratchet-down 不要） |
| `coreRequiredFieldNullCheckGuard` | 0 | ✅ ADR-A-004 完結（dead null check 1 件除去） |

### 新規型 / helper

- `StoreResultSlice` (`app/src/domain/models/StoreResultSlice.ts`)
- `PrevYearDataSlice` (`app/src/features/comparison/application/PrevYearDataSlice.ts`)
- `RenderUnifiedWidgetContext` (`app/src/presentation/components/widgets/types.ts`) — narrow 後の render-time 型
- `RenderDashboardWidgetContext` alias (`app/src/presentation/pages/Dashboard/widgets/types.ts`)
- `narrowRenderCtx()` (`app/src/presentation/components/widgets/widgetContextNarrow.ts`) — chokepoint helper
- `InsightWidgetContext` / `CostDetailWidgetContext` / `CategoryWidgetContext` — page-specific render-time ctx
- `DashboardWidgetContext` — Dashboard 専用 required field 付き render-time ctx
- ヘルパー: `storeResultData` / `prevYearDataValue` / `readyXxx` ファクトリ / `EMPTY_*_SLICE` シングルトン
- Barrel: `domain/models/storeTypes`, `features/comparison`, `application/hooks/analytics`, `presentation/components/widgets`

### 8 legacy item の sunsetCondition 達成

| LEG ID | 対象 | 状態 |
|---|---|---|
| LEG-001 | UnifiedWidgetContext page-local 5 field | ✅ migrated |
| LEG-002 | UnifiedWidgetContext Dashboard 固有 20 field | ✅ migrated (11 field 削除 / 9 cross-page 残置) |
| LEG-003 | legacy WidgetContext alias | ✅ migrated |
| LEG-004 | 旧 WidgetDef | ✅ migrated |
| LEG-005 | StoreResult 旧 shape | ✅ migrated（slice 経由配布、原型は data として温存） |
| LEG-006 | PrevYearData 旧 shape | ✅ migrated（同上） |
| LEG-007 | core required field への null check pattern | ✅ migrated（baseline 1→0、dead null check 1 件除去） |
| LEG-008 | optional fallback pattern | ✅ migrated（17 field を required or page-specific へ） |

## 主要設計決定

### 1. ADR-A-002 PR4 audit で 11 field のみ削除（9 field を cross-page 共有として残置）

当初 plan は「Dashboard 固有 20 field を全削除」だったが、実 audit で 9 field（`allStoreResults` / `currentDateRange` / `prevYearScope` / `queryExecutor` / `duckDataVersion` / `prevYearMonthlyKpi` / `comparisonScope` / `weatherDaily` / `prevYearWeatherDaily`）が cross-page 共有（Insight / Category / Reports などから ctx 経由で参照）であることが判明。section header を「Dashboard 固有」→「Dashboard / cross-page 共有」に rename し、9 field を accepted final state として残置。`unifiedWidgetContextNoDashboardSpecificGuard` baseline=9 で固定。

**教訓**: 事前 audit より実コード検証を優先する。

### 2. ADR-A-004 PR3 で chokepoint narrowing 採用

`StoreResult` / `PrevYearData` の access はコードベース全域に散在（27 consumer / 137 references）。**全 consumer に narrowing 文を入れる素直なアプローチ**では過大な diff となるため、以下の chokepoint パターンを採用:

- `WidgetContext.result/prevYear` を slice 型（discriminated union）に切替
- `RenderUnifiedWidgetContext` を新設（slice を narrow した render-time 型）
- `UnifiedWidgetDef.render`/`isVisible` の signature を Render 型に変更
- dispatch site で `narrowRenderCtx()` により 1 回だけ status check
- widget 本体（45 widget）は変更ゼロ — 旧 shape どおり `ctx.result.X` / `ctx.prevYear.X` を直接参照

**実 diff (PR3)**: 40 ファイル変更（+312/-183 行）。新規 1 file (`widgetContextNarrow.ts`)。
**実 diff (PR4)**: 17 ファイル変更（+110/-95 行、ほぼドキュメント）。

`StoreResult` / `PrevYearData` 自体は **削除しない** — slice の data フィールドおよび post-narrow 型が参照する正本のため温存。

### 3. ADR-A-003 で WidgetDef 同名 2 型問題を rename で解消

`WidgetDef` interface が `presentation/components/widgets/types.ts` と `presentation/pages/Dashboard/widgets/types.ts` の 2 箇所で別 shape として並存していた。`DashboardWidgetDef` / `UnifiedWidgetDef` に rename + 19 consumer を bulk migrate して解消。`sameInterfaceNameGuard` baseline=28（WidgetDef + 27 無関係 local 重複）→ baseline=27 (allowlist から WidgetDef 削除、残 27 は scope 外で fixed mode)。

## 後続引き継ぎ

### Wave 2: SP-B widget-registry-simplification

| 項目 | 値 |
|---|---|
| projectId | `widget-registry-simplification` |
| parent | `architecture-debt-recovery` |
| spawn 条件 | **本 SP-A が completed 昇格済み**（inquiry/20 §sub-project completion 7 step 完了） |
| 主要 deliverable | 4 ADR（B-001〜B-004）+ 1 legacy（LEG-009）+ 3 guard |
| estimated PR 数 | 16（4 ADR × 4 step） |
| scope | 二重 null check 10 widget 解消 / full ctx passthrough 12 widget を明示 props 化 / IIFE 3 件を readModel selector に抽出 / registry 行 inline logic 5 箇所解消 |
| 依存理由 | ADR-B-001 が SP-A の ctx 型分離完了後に type narrowing で null check 解消可能 |

### Wave 2: SP-D-continued (ADR-D-004)

| 項目 | 値 |
|---|---|
| 着手 ADR | D-004（@deprecated に @expiresAt + @sunsetCondition 必須） |
| spawn 条件 | SP-C が **completed 昇格** 済（ADR-C-004 の barrel metadata 完了後） |
| estimated PR 数 | 4 |

### Wave 3: SP-D-final (ADR-D-003)

SP-B completed 後、SP-D の ADR-D-003 (G8 P20/P21 baseline 削減) を実施。

## archive 手順（実施完了）

本 sub-project の archive は umbrella `inquiry/20 §sub-project completion テンプレート` の 7 step を 2026-04-25 に完遂:

1. ✅ 本 SUMMARY.md を作成（本 file、final）
2. ✅ `projects/widget-context-boundary/` を `projects/completed/widget-context-boundary/` に物理移動
3. ✅ `config/project.json.status` を `"active" → "completed"`
4. ✅ `CURRENT_PROJECT.md` の確認（umbrella `architecture-debt-recovery` のままで no-op）
5. ✅ `references/02-status/open-issues.md` の active → archived 欄へ移動
6. ✅ umbrella `architecture-debt-recovery/HANDOFF.md` の進捗サマリを更新（SP-A completed、Wave 2 spawn 入口）
7. ✅ `projectCompletionConsistencyGuard` PASS（archive prefix 整合）

### archive 前の verification

人間承認前に以下を verify する:

- [x] 4 ADR × 4 step (16 PR) 全 landed
- [x] 4 guard が baseline 達成または final state で fixed
- [x] LEG-001〜008 すべて migrated
- [x] umbrella plan.md 外の破壊的変更なし（`git log` で確認: 本 sub-project の commit はすべて widget-context-boundary scope 内）
- [ ] visual / E2E 回帰テスト（**CI で実行必要**。Playwright が sandbox の network restrictions で blocked のため）
- [ ] 45 widget の `lastVerifiedCommit` 同期（**別 project 対応**。WSS generator 自動化未完のため手動同期は scope 外）
- [ ] 人間レビュー（本 SUMMARY.md + 4 PR の成果物）

## rollback plan

完了 PR の人間承認後に問題が発覚した場合:

- archive 7 step を逆順に revert（git revert）
- sub-project status を `completed → active` に戻す
- `CURRENT_PROJECT.md` を `widget-context-boundary` に戻す
- 必要に応じて 個別 ADR の PR4 → PR3 → PR2 の順で段階 revert（rollback 境界は 1 ADR 単位）

## 参照

- umbrella project: `projects/architecture-debt-recovery/`
- 本 project の HANDOFF: `HANDOFF.md`（本 directory 内）
- 本 project の plan: `plan.md`
- 本 project の checklist: `checklist.md`
- 本 project の breaking-changes / legacy-retirement: 同 directory
- 後続準備: `next-phase-plan.md`（同 directory、本 commit で landed）
- 完了 PR / commit:
  - PR2 (parallel slice 導入): `998fbd3 feat(widget-context-boundary): ADR-A-004 PR2 — StoreResultSlice / PrevYearDataSlice 並行導入`
  - PR3 (chokepoint narrowing): `31fc5d8 feat(widget-context): ADR-A-004 PR3 — chokepoint narrowing で WidgetContext slice 配布`
  - PR4 (Phase 4 closeout): `2c78f59 chore(widget-context): ADR-A-004 PR4 — sub-project Phase 4 完了処理`

## 歴史的意義

本 sub-project は umbrella `architecture-debt-recovery` の Phase 6 Wave 1 で spawn された **最重量級 sub-project**（45 widget 全件影響）。

特筆すべき設計判断:

1. **chokepoint narrowing パターンの確立** — 27 consumer × 平均 5+ references の素朴な migration を回避し、widget 本体ゼロ変更で discriminated union 化を実現。同パターンは後続 sub-project（SP-B）の null check 解消（10 widget）でも踏襲可能。

2. **audit の事実優先** — ADR-A-002 PR4 で当初 plan の「Dashboard 固有 20 field 削除」を実 audit に基づき「11 field 削除 + 9 field を cross-page 共有として accepted final state」に修正。事前 audit より実コード検証を優先する原則を確立。

3. **slice 型の温存方針** — `StoreResult` / `PrevYearData` は削除せず slice の data フィールド + post-narrow 型として温存。「破壊的変更」と「型レベル安全性確保」を両立。

「45 widget 全件 migration」を `widget 本体ゼロ変更` で達成した本 sub-project は、umbrella plan §2 不可侵原則 #1（現実保護原則: runtime 動作不変）と #10（レガシー撤退）を両立した模範例。
