# HANDOFF — aag-temporal-governance-hardening（SP-D）

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 6 ADR-D-003 PR1-3 完了 + PR4 step1 (useUnifiedWidgetContext 抽出、baseline 75→67) 完了。PR4 残り baseline 67→20 (47 行削減)。Phase 1-5 完遂。status: `active` / parent: `architecture-debt-recovery`。**

本 project は umbrella `architecture-debt-recovery` の **Lane D** sub-project として、governance の時間 / 構造 / 存在 3 軸の強化を一括で行う。Wave 1 (D-001/002/005/006) + Wave 2 (D-004) + Wave 3 (D-003 PR1-3) 完了、残 D-003 PR4 (PR4 step1 完了済、step2 以降で baseline 67→20) のみ。

### spawn 時 landed

- `config/project.json` / `AI_CONTEXT.md` / `HANDOFF.md`（本 file）/ `plan.md` / `checklist.md` / `aag/execution-overlay.ts`

### Wave 1 landed (Phase 1-4 全 [x]、checklist.md 参照)

- **Phase 1 ADR-D-006**: `projectDocConsistencyGuard` 4 step 完遂（HANDOFF/checklist 整合 / status vs derivedStatus / Phase 着手前 review checkbox / required inquiry 突合）
- **Phase 2 ADR-D-005**: remediation collector + project-health 連携 + docs:check drift 検出 (3 step)
- **Phase 3 ADR-D-001**: `reviewPolicyRequiredGuard` baseline 139→0 + BC-6 (RuleOperationalState.reviewPolicy required 昇格) + expired rule hard fail (4 step)
- **Phase 4 ADR-D-002**: `allowlistMetadataGuard` baseline=existing → BC-7 (ruleId/createdAt/reviewPolicy required 昇格) + expiresAt 超過 fail (4 step)

### Wave 2 landed (Phase 5 全 [x])

- **Phase 5 ADR-D-004**: `deprecatedMetadataGuard` baseline=7 → fixed mode + DM2 (@expiresAt 超過 fail) + LEG-008 sunset (4 step)

### Wave 3 進行中 (Phase 6 PR1-3 完了 / PR4 残り)

- **Phase 6 ADR-D-003 PR1**: `responsibilitySeparationGuard` G8-P20 (useMemo body 行数) 追加、baseline=208 (実測 max) で凍結
- **Phase 6 ADR-D-003 PR2**: `CategoryPerformanceChart.tsx:127` の option useMemo body (209 行) を `CategoryPerformanceChart.builders.ts` の `buildPerformanceChartOption()` に抽出 → baseline 208 → 120 (新 max は ConditionSummaryEnhanced.tsx:176)
- **Phase 6 ADR-D-003 PR3**: `ConditionSummaryEnhanced.tsx:176` の allCards useMemo body (120 行) を `conditionSummaryCardBuilders.ts` の `buildAllConditionCards()` に抽出 → baseline 120 → 75 (新 max は useUnifiedWidgetContext.ts:228)
- **Phase 6 ADR-D-003 PR4 step1**: `useUnifiedWidgetContext.ts:228` の `ctx` useMemo body (75 行) を `unifiedWidgetContextBuilder.ts` の `buildUnifiedWidgetContext()` に抽出 → baseline 75 → 67 (新 max は IntegratedTimeline.tsx:49)
- **P21 (widget 直接子数)**: AST 解析が必要なため別 PR に分離（未着手）

### 残タスク

- **Phase 6 ADR-D-003 PR4 step2-N**: P20=20 fixed mode 到達。残り baseline 67 → 20 まで 47 行削減が必要。次の抽出候補:
  - `presentation/components/charts/IntegratedTimeline.tsx:49` (67 行)
  - `presentation/components/charts/CustomerScatterChart.tsx:58` (58 行)
  - `application/hooks/duckdb/useComparisonContextQuery.ts:116` (56 行)
  - `presentation/pages/Dashboard/widgets/WaterfallChart.tsx:34` (55 行)
  - `application/hooks/useWeatherCorrelation.ts:67` (54 行)
  - `presentation/components/charts/RegressionInsightChart.tsx:54` (53 行)
  - 上記消化後は 38 行帯 (useShapleyTimeSeries / CategoryDiscountChart / useCategoryHierarchyData) → 30 行帯と段階的に削減
- **Phase 7 sub-project completion**: PR4 完了後、umbrella inquiry/20 §completion テンプレ 7 step

## 2. 次にやること

### Wave 1 / 2 完遂済（参考）

1. ✅ **ADR-D-006 PR1-4**: projectDocConsistencyGuard 完成
2. ✅ **ADR-D-005 PR1-3**: remediation collector + drift 検出
3. ✅ **ADR-D-001 PR1-4**: reviewPolicyRequiredGuard + BC-6
4. ✅ **ADR-D-002 PR1-4**: allowlistMetadataGuard + BC-7
5. ✅ **ADR-D-004 PR1-4**: deprecatedMetadataGuard fixed mode + DM2 + LEG-008 sunset
6. ✅ **ADR-D-003 PR1**: G8-P20 baseline=208
7. ✅ **ADR-D-003 PR2**: option useMemo 抽出、baseline 208→120
8. ✅ **ADR-D-003 PR3**: allCards useMemo 抽出、baseline 120→75
9. ✅ **ADR-D-003 PR4 step1**: useUnifiedWidgetContext ctx useMemo 抽出、baseline 75→67

### Wave 3 残り（次セッション着手）

**ADR-D-003 PR4 step2-N — P20=20 fixed mode 到達**:

- baseline 67 → 20 まで残り 47 行削減
- 抽出単位は 1-2 file/commit 程度（PR2 = 1 file 209→0 行、PR3 = 1 file 120→0 行、PR4 step1 = 1 file 75→0 行）
- PR4 は累計で 4-7 step 程度の中間 commit を見込む。checklist 上は 1 step として扱い、最終 commit で baseline=20 + fixed mode 移行
- 抽出候補ファイルは `## 1. 現在地` 残タスク欄を参照
- P21 (widget 直接子数) は AST ベース実装で別 PR に分離（次回ではなく Phase 7 後でも可）

### Phase 7 sub-project completion

PR4 完了後、umbrella `inquiry/20 §sub-project completion` テンプレ 7 step を実行して archive。

## 3. ハマりポイント

### 3.1. reviewPolicy owner 割当の決定

92 rule の `reviewPolicy.owner` は `architecture` / `implementation` / `specialist` のいずれかに振る。rule のカテゴリに応じて人間承認時に決定済み（umbrella `inquiry/15 §ADR-D-001` + Phase 5 承認）。bulk 整備 PR で一括反映。

### 3.2. BC-6 / BC-7 の breaking change 境界

BC-6 (reviewPolicy required) と BC-7 (allowlist metadata required) は**別 PR**で実施（umbrella plan.md §2 #3）。ratchet-down baseline が 0 到達した後に type required 昇格。

### 3.3. D-005 generated file の置き場

`references/02-status/generated/architecture-debt-recovery-remediation.{md,json}` は本 project active 期間中のみ生成。archive 時の扱い（`references/99-archive/` への snapshot 保存か削除か）は Phase 7 時点で再判断。

### 3.4. D-006 projectDocConsistencyGuard の初期 scope

HANDOFF と checklist の最大完了 Phase 整合 / config/project.json.status と derivedStatus の説明可能性 / phase 着手前の review checkbox 残存検出 / required inquiry file 欠落検出 の 4 check から開始。段階的に強化。

### 3.5. ADR-D-003 useMemo 抽出パターン（PR2/PR3 で確立）

useMemo body の抽出は以下のパターンに従うと **副作用なしで 100+ 行削減** できる:

1. **抽出先の選択**:
   - 同じディレクトリの `*.builders.ts` / `*.vm.ts` (chart 系)
   - 同じディレクトリの `<feature>CardBuilders.ts` (vm 系)
   - 関数自体は pure data transformation のみ（hooks 不可、state 不可）

2. **依存値は input interface で受け取る**:
   - `BuildXxxInput` interface を builders 側で定義
   - 呼び出し側で `buildXxx({ ...全 input })` の 1 行呼び出しに置き換え
   - 例: PR3 の `BuildAllConditionCardsInput` は 11 field

3. **DOM/React 依存があれば呼び出し側で解決**:
   - PR3 の `resolveCurTotalCustomers` パターン: customerFact 解決を useCallback で wrap し、結果値だけ builder に渡す
   - これで builder は完全 pure を維持

4. **interface 重複を避ける**:
   - 既存の同名 interface (`CurrentCtsQuantity` 等) は新規定義せず import
   - sameInterfaceNameGuard が CI で重複を検出する

5. **細かい guard 違反の事後修正**:
   - 抽出時に新規追加した JSDoc に `.totalCustomers` 等の string match パターンが入ると `storeResultAnalysisInputGuard` が誤検知 → JSDoc 文言を変える
   - `sameInterfaceNameGuard` は interface 名重複を検出 → existing import に切替
   - これらは抽出と同 PR 内で修正

6. **戻り値型 annotate の落とし穴 (PR4 step1 で発見)**:
   - 元の useMemo body が宣言済 type に存在しない field を返す pattern がある (例: `useUnifiedWidgetContext` の `ctx` は `UnifiedWidgetContext` に存在しない `storeKey` / `dataEndDay` 等を返す)。useMemo 経由代入では excess property check が走らないため通っていた
   - builder 関数で `: UnifiedWidgetContext | null` と annotate すると object literal return の excess property check で型エラー
   - 解決: builder の戻り値型を annotate せず推論に委ねる (呼び出し側 useMemo の代入位置で widen される)。理由は doc comment に書く

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / parent / read order |
| `plan.md` | 6 ADR 実行計画 + Wave 別実施順 |
| `checklist.md` | Phase 別 completion 条件 |
| `config/project.json` | project manifest |
| `aag/execution-overlay.ts` | rule overlay（initial 空） |
| `projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §Lane D` | 6 ADR 元台帳 |
| `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-6 / §BC-7` | 破壊的変更 |
| `projects/architecture-debt-recovery/inquiry/14-rule-retirement-candidates.md §R-6` | Temporal Governance reformulate |
| `references/03-guides/architecture-rule-system.md` | Architecture Rule 運用 |
