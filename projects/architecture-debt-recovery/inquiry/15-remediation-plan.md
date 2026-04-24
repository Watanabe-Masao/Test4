# inquiry/15 — 改修計画（4 レーン × Evidence chain 構造）

> 役割: Phase 4 inquiry 成果物 #1。Phase 3 で提示した原則候補 J1-J8 + 不変条件候補 INV-J1-A〜INV-J8-A + 廃止候補 R-1〜R-7 を、**4 レーン × Evidence chain 構造**の改修 item に変換する。
>
> 各 item は Phase 4 規律に従い、以下を必須で持つ:
> - evidence（Phase 1 事実台帳 + WSS spec 参照）
> - hypothesis（Phase 2 仮説）
> - principle / invariant（Phase 3 候補）
> - target（旧 path / 新 path）
> - guard（再発防止）
> - breakingChange / rollback
> - prPlan（4 ステップ pattern）
> - status
>
> plan.md §2 不可侵原則 #8 / #9 に従い、**計画のみ**。`references/01-principles/` / `docs/contracts/principles.json` / コード本体を一切 touch しない。
>
> 本ファイルは immutable。Phase 5 以降で追加情報が判明しても書き換えず、`15a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `64bcb96`（HANDOFF 同期直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | inquiry/01-11 + 10a（事実 + 仮説 + WSS concern link）、inquiry/12-14（Phase 3 候補）、WSS 45 widget spec |

## Lane 構成

改修を 4 レーンに分ける。各レーンが 1 つの sub-project にほぼ対応（sub-project の詳細は `inquiry/18-sub-project-map.md`）。

| Lane | 対象 | 主対応 J/INV/R | 対応 concern category |
|---|---|---|---|
| **A** widget-context-boundary | UnifiedWidgetContext / page-specific ctx / WidgetDef 2 型 | J4 / J5 / J6 / INV-J4-A / INV-J4-B / INV-J6-A | C-02 / C-05 / C-10 / C-11 |
| **B** widget-registry-simplification | registry 行の inline logic / null check / IIFE / full ctx passthrough | J2 / J1 / INV-J2-A / INV-J2-B / INV-J2-C | C-01 / C-06 / C-07 / C-12 |
| **C** duplicate-orphan-retirement | byte-identical widgets / orphan UI / barrel 残存 / useCostDetailData 複製 | J7 / J3 / INV-J7-A / INV-J7-B / INV-J3-A | C-09 + inquiry/03 §D / inquiry/06 §F-3 |
| **D** aag-temporal-governance-hardening | reviewPolicy 必須化 / sunsetCondition 強制 / allowlist metadata / 既存 rule reformulate | J8 / INV-J8-A / R-2 / R-3 / R-6 / R-7 | D-2 構造源 / inquiry/11 §E / 92 未設定 rule |

## Evidence chain 構造

各改修 item は以下の構造で記述:

```yaml
id: ADR-<Lane>-<NNN>
title: <短い説明>
lane: A | B | C | D
evidence:                    # Phase 1-3 の参照
  inquiry: [01, 10a, ...]
  wid: [WID-NNN, ...]
hypothesis: [S*-H*]          # Phase 2 仮説
principle: [J*]              # Phase 3 原則候補
invariant: [INV-J*-*]        # Phase 3 不変条件候補
retirement: [R-*]            # 関連する廃止候補（あれば）
target:
  oldPath: [旧 path のリスト]
  newPath: [新 path のリスト]
guard: [<guard 名>]
breakingChange: true | false
rollback: [rollback 手順]
prPlan:
  - PR1 <add guard baseline>
  - PR2 <new implementation>
  - PR3 <consumer migration>
  - PR4 <legacy delete + guard tighten>
status: planned
```

---

## Lane A: widget-context-boundary

**scope**: `UnifiedWidgetContext` の page-local optional 剥離、page-specific ctx 型分離、`WidgetDef` 2 型並存の解消。

### ADR-A-001. UnifiedWidgetContext から page-local optional 5 field を剥離

```yaml
id: ADR-A-001
title: UnifiedWidgetContext から page-local optional 5 field を剥離
lane: A
evidence:
  inquiry: [01 §B-2, 02 §B-4, 04 §B, 10a C-11]
  wid: [WID-032, WID-034, WID-035, WID-036, WID-038, WID-039, WID-040, WID-041, WID-042, WID-043]
hypothesis: [S3-H1, S3-H2, S3-H4]
principle: [J4, J5]
invariant: [INV-J4-A]
retirement: []
target:
  oldPath:
    - app/src/presentation/components/widgets/types.ts (UnifiedWidgetContext)
  newPath:
    - app/src/presentation/components/widgets/contexts/UnifiedWidgetContext.ts (universal のみ)
    - app/src/presentation/pages/Insight/InsightWidgetContext.ts
    - app/src/presentation/pages/CostDetail/CostDetailWidgetContext.ts
    - app/src/presentation/pages/Category/CategoryWidgetContext.ts
guard: unifiedWidgetContextNoPageLocalOptionalGuard
breakingChange: true
rollback:
  - git revert PR4 (legacy field 復元)
  - UnifiedWidgetContext に insightData? / costDetailData? / selectedResults? / storeNames? / onCustomCategoryChange? を復元
prPlan:
  - PR1 unifiedWidgetContextNoPageLocalOptionalGuard を baseline=5 で追加（増加禁止）
  - PR2 page-specific ctx 型 3 本（Insight/CostDetail/Category）を新設、各 page registry で使用
  - PR3 INSIGHT_WIDGETS / COST_DETAIL_WIDGETS / CATEGORY_WIDGETS を page-specific ctx に移行
  - PR4 UnifiedWidgetContext から 5 field 削除、guard baseline を 0 に
status: planned
```

### ADR-A-002. Dashboard 固有 optional 20 field を DashboardWidgetContext に required 集約

```yaml
id: ADR-A-002
title: Dashboard 固有 optional 20 field を DashboardWidgetContext に required 集約
lane: A
evidence:
  inquiry: [01 §B-3, 02 §B-2, 04 §C, 10a C-11]
  wid: [WID-001〜WID-029 (Dashboard-local 全 29 widget)]
hypothesis: [S1-H2, S3-H3, S6-H3]
principle: [J4]
invariant: [INV-J4-A]
target:
  oldPath:
    - app/src/presentation/components/widgets/types.ts (UnifiedWidgetContext の Dashboard 固有 20 field)
    - app/src/presentation/pages/Dashboard/widgets/types.ts (WidgetContext)
  newPath:
    - app/src/presentation/pages/Dashboard/widgets/DashboardWidgetContext.ts (extends UnifiedWidgetContext, 20 field required)
guard: unifiedWidgetContextNoDashboardSpecificGuard
breakingChange: true
rollback: ADR-A-001 と同形式
prPlan:
  - PR1 DashboardWidgetContext を新設、既存 WidgetContext を alias として残置
  - PR2 Dashboard registry（KPI/CHART/EXEC/ANALYSIS/DUCKDB 5 本）を DashboardWidgetContext に接続
  - PR3 UnifiedWidgetContext から Dashboard 固有 20 field 削除、guard 有効化
  - PR4 legacy WidgetContext alias を削除
status: planned
```

### ADR-A-003. WidgetDef 2 型並存を解消（DashboardWidgetDef / UnifiedWidgetDef に rename or 統合）

```yaml
id: ADR-A-003
title: WidgetDef 同名 2 型を DashboardWidgetDef と UnifiedWidgetDef に分離
lane: A
evidence:
  inquiry: [01 §A, 04 §A, 10a C-05]
  wid: [全 45 widget に影響]
hypothesis: [S1-H1, S1-H2, S1-H3]
principle: [J6]
invariant: [INV-J6-A]
target:
  oldPath:
    - app/src/presentation/components/widgets/types.ts (WidgetDef 型 B)
    - app/src/presentation/pages/Dashboard/widgets/types.ts (WidgetDef 型 A)
  newPath:
    - app/src/presentation/components/widgets/types.ts (UnifiedWidgetDef)
    - app/src/presentation/pages/Dashboard/widgets/types.ts (DashboardWidgetDef)
    - app/src/presentation/pages/*/widgets.tsx (各 page で該当 WidgetDef 型を import)
guard: sameInterfaceNameGuard
breakingChange: true
rollback:
  - 同名 WidgetDef alias を両 file に追加して後方互換
prPlan:
  - PR1 sameInterfaceNameGuard を baseline=1（WidgetDef のみ allowlist）で追加
  - PR2 DashboardWidgetDef / UnifiedWidgetDef を新設、既存 WidgetDef を両 file で alias
  - PR3 全 45 registry entry を新名に切替
  - PR4 旧 WidgetDef alias 削除、guard baseline=0 に
status: planned
```

### ADR-A-004. core required field `result` / `prevYear` の runtime/型 乖離解消

```yaml
id: ADR-A-004
title: core required field の discriminated union 化
lane: A
evidence:
  inquiry: [04 §D, 10a C-10]
  wid: [WID-031, WID-033]
hypothesis: [S3-H3]
principle: [J5]
invariant: [INV-J4-B]
target:
  oldPath:
    - app/src/presentation/components/widgets/types.ts (result: StoreResult, prevYear: PrevYearData)
  newPath:
    - app/src/domain/models/StoreResult.ts (discriminated union: { status: 'ready'; data } | { status: 'empty' })
    - app/src/domain/models/PrevYearData.ts (discriminated union: { kind: 'absent' } | { kind: 'present'; daily })
guard: coreRequiredFieldNullCheckGuard
breakingChange: true
rollback: discriminated union の old shape alias を一時残置
prPlan:
  - PR1 coreRequiredFieldNullCheckGuard を baseline=2 (WID-031, WID-033) で追加
  - PR2 StoreResult / PrevYearData の discriminated union 型を並行導入
  - PR3 全 consumer を新型に移行
  - PR4 旧 shape 削除、guard baseline=0
status: planned
```

---

## Lane B: widget-registry-simplification

**scope**: registry 行の inline logic / IIFE / null check / full ctx passthrough / default hardcode を application 層 adapter / readModel helper に移設。

### ADR-B-001. 二重 null check pattern（10 widget）の解消

```yaml
id: ADR-B-001
title: isVisible + render 内の二重 null check を ctx 型整備で解消
lane: B
evidence:
  inquiry: [04 §D, 10a C-01]
  wid: [WID-031, WID-032, WID-033, WID-034, WID-035, WID-036, WID-037, WID-040, WID-041, WID-042, WID-043]
hypothesis: [S3-H4]
principle: [J2]
invariant: [INV-J2-A]
retirement: []
target:
  oldPath:
    - 各 widget registry 行（10 widget）
  newPath:
    - ADR-A-001 / A-002 完了後、type narrowing で gate 不要に
guard: shortcutPatternGuard (null check カウント、baseline=10)
breakingChange: false (registry 行の内部改修、消費者 API 不変)
rollback: guard baseline を増加方向に戻す
prPlan:
  - PR1 shortcutPatternGuard を baseline=10 で追加
  - PR2 ADR-A-001 / A-002 の page-specific ctx 導入後、type narrowing で gate 削除可能な widget から順次（5 widget 目標）
  - PR3 残 5 widget を discriminated union 化後（ADR-A-004 依存）に gate 削除
  - PR4 guard baseline=0 固定、fail hard
status: planned
depends: [ADR-A-001, ADR-A-002, ADR-A-004]
```

### ADR-B-002. full ctx passthrough を絞り込み props に変換

```yaml
id: ADR-B-002
title: full ctx passthrough を明示的 props に変換
lane: B
evidence:
  inquiry: [02 §D-1, 10a C-02]
  wid: [WID-001, WID-002, WID-004, WID-005, WID-007, WID-008, WID-009-013, WID-014, WID-015, WID-016]
hypothesis: [S6-H2, D-2]
principle: [J2]
invariant: [INV-J2-C]
target:
  oldPath:
    - 各 widget render の <X ctx={ctx} /> / widgetCtx={ctx}
  newPath:
    - 各子 component が必要な props のみを明示的に受け取る shape
guard: fullCtxPassthroughGuard (baseline=12)
breakingChange: false
rollback: widgetCtx prop 復元
prPlan:
  - PR1 fullCtxPassthroughGuard を baseline=12 で追加
  - PR2 pure delegation 5 widget（WID-009-013）の helper signature を絞り込み props に変換
  - PR3 重量級 widget（WID-001 / WID-002 / WID-018）の props 整理、widgetCtx 重複注入解消
  - PR4 passthrough 0 到達、guard 固定
status: planned
```

### ADR-B-003. IIFE pattern 3 件を readModel selector に抽出

```yaml
id: ADR-B-003
title: readModels.customerFact ready 判定 IIFE を共通 selector に抽出
lane: B
evidence:
  inquiry: [10a C-06]
  wid: [WID-018, WID-021]
hypothesis: [S2-H2, S3-H4]
principle: [J2, J1]
invariant: [INV-J2-B]
target:
  oldPath:
    - WID-018 の 2 IIFE（totalCustomers / storeCustomerMap 導出）
    - WID-021 の 1 IIFE（customerCount 導出）
  newPath:
    - app/src/application/readModels/customerFact/selectors.ts (selectTotalCustomers / selectStoreCustomerMap / selectCustomerCountOrUndefined)
guard: registryInlineLogicGuard (IIFE count、baseline=3)
breakingChange: false
rollback: selector inline 化
prPlan:
  - PR1 registryInlineLogicGuard baseline=3 で追加
  - PR2 selector 3 本を readModel 配下に新設（pure fn）
  - PR3 3 IIFE を selector call に置換
  - PR4 guard baseline=0
status: planned
```

### ADR-B-004. registry 行の inline JSX 構築 / default hardcode を解消

```yaml
id: ADR-B-004
title: registry 行 inline logic 5 箇所の解消
lane: B
evidence:
  inquiry: [10a C-07, C-12]
  wid: [WID-003, WID-006, WID-020, WID-038, WID-040]
hypothesis: [S6-H2, D-2]
principle: [J2, J1]
invariant: [INV-J2-B, INV-J2-C]
target:
  oldPath:
    - WID-003 registry file 内 buildPrevYearCostMap helper
    - WID-006 の Array.from + length<2 + lane null coalescing
    - WID-020 の inline object literal 7 field + 3 null hardcode
    - WID-038 の default 2 件（?? [] / ?? (() => {}))
    - WID-040 の palette 4 色 + template literal + metric ID 文字列
  newPath:
    - WID-003: domain/calculations/prevYearCostApprox.ts (pure)
    - WID-006: application/hooks/useStoreComparisonFrame.ts (lane 統合)
    - WID-020: application/readModels/causal/buildCausalChainInput.ts
    - WID-038 default: application/hooks/useCategorySelectionDefaults.ts
    - WID-040: domain/models/MetricId.ts (type-safe literal), DS chart-semantic-colors token
guard: registryInlineLogicGuard (拡張、上記 pattern 検出、baseline=5)
breakingChange: false
rollback: inline 化復元
prPlan:
  - PR1 registryInlineLogicGuard 拡張、baseline=5
  - PR2 5 箇所の抽出先 helper / selector 実装（pure、unit test 付）
  - PR3 registry 行を抽出先 call に置換
  - PR4 guard baseline=0
status: planned
depends: [ADR-B-003]
```

---

## Lane C: duplicate-orphan-retirement

**scope**: byte-identical widgets.tsx 3 件、orphan UI 3 件、`useCostDetailData` 2 箇所並存、barrel 残存を解消。

### ADR-C-001. `features/*/ui/widgets.tsx` 3 件の byte-identical 複製を解消

```yaml
id: ADR-C-001
title: features/{category,cost-detail,reports}/ui/widgets.tsx を barrel re-export 化
lane: C
evidence:
  inquiry: [01 §特殊, 03 §特殊 1, 10a C-09]
  wid: [WID-038, WID-039, WID-040, WID-041, WID-042, WID-043, WID-044, WID-045]
hypothesis: [S5-H1, S5-H3, D-3]
principle: [J3, J7]
invariant: [INV-J7-A]
retirement: []
target:
  oldPath:
    - app/src/features/category/ui/widgets.tsx (byte-identical with pages 版)
    - app/src/features/cost-detail/ui/widgets.tsx
    - app/src/features/reports/ui/widgets.tsx
  newPath:
    - 同 path 内で barrel re-export のみ（`export * from '@/presentation/pages/Category/widgets'` 等）
guard: duplicateFileHashGuard
breakingChange: false
rollback: byte-identical 複製を復元
prPlan:
  - PR1 duplicateFileHashGuard を baseline=3 で追加
  - PR2 3 file を barrel re-export 化（@canonical comment 付記で正本 path 明示）
  - PR3 features/ 経由で import している consumer が存在するか grep 確認、存在しなければ file 削除
  - PR4 guard baseline=0
status: planned
```

### ADR-C-002. `useCostDetailData` の 2 箇所並存を解消

```yaml
id: ADR-C-002
title: useCostDetailData を features/cost-detail/application/ 単一正本に統合
lane: C
evidence:
  inquiry: [06 §F-3, 10a C-09]
  wid: [WID-040, WID-041, WID-042, WID-043]
hypothesis: [S2-H3, S5-H1]
principle: [J1, J3]
invariant: [INV-J6-A (hook 重複)]
target:
  oldPath:
    - app/src/features/cost-detail/application/useCostDetailData.ts (features 版、正本候補)
    - app/src/presentation/pages/CostDetail/useCostDetailData.ts (pages 版、削除候補)
  newPath:
    - app/src/features/cost-detail/application/useCostDetailData.ts (唯一正本)
    - app/src/presentation/pages/CostDetail/useCostDetailData.ts は削除
guard: hookCanonicalPathGuard (@canonical JSDoc 必須化の派生)
breakingChange: false (features 版が既に export されている前提)
rollback: pages 版を復元
prPlan:
  - PR1 features 版に @canonical JSDoc 付記、consumer を全て features 版 import に切替
  - PR2 pages 版を re-export stub 化
  - PR3 consumer 0 確認後、pages 版 file 削除
  - PR4 hookCanonicalPathGuard 有効化
status: planned
```

### ADR-C-003. Tier D orphan 3 件（DowGapKpiCard / PlanActualForecast / RangeComparison）の削除

```yaml
id: ADR-C-003
title: orphan UI 3 件の削除 + guard 化
lane: C
evidence:
  inquiry: [03 §D-1, D-2, D-3]
  wid: []
hypothesis: [S5-H1, S5-H2]
principle: [J7]
invariant: [INV-J7-B]
target:
  oldPath:
    - app/src/presentation/pages/Dashboard/widgets/DowGapKpiCard.tsx
    - app/src/presentation/pages/Dashboard/widgets/PlanActualForecast.tsx (+ __tests__/PlanActualForecast.test.tsx)
    - app/src/presentation/pages/Dashboard/widgets/RangeComparison.tsx
    - app/src/presentation/pages/Dashboard/widgets/RangeComparison.styles.ts (barrel re-export 先 DashboardPage.styles.ts:16)
  newPath: (削除のみ)
guard: orphanUiComponentGuard
breakingChange: false
rollback: file 復元
prPlan:
  - PR1 orphanUiComponentGuard を baseline=3 で追加
  - PR2 3 file（.tsx 本体 + 関連 test / styles）を削除。DashboardPage.styles.ts:16 の export * from './RangeComparison.styles' も除去
  - PR3 orphanUiComponentGuard baseline=0 固定
  - (PR4 不要、3 step で完結)
status: planned
```

### ADR-C-004. barrel re-export に `@sunsetCondition` / `@expiresAt` metadata 強制

```yaml
id: ADR-C-004
title: barrel re-export の metadata 必須化（F1 reformulate）
lane: C
evidence:
  inquiry: [03 §特殊 3, 11 §B-6, 14 §R-7]
  wid: []
hypothesis: [S5-H2]
principle: [J3]
invariant: [INV-J3-A]
retirement: [R-7]
target:
  oldPath:
    - barrel re-export 各所（SalesAnalysisWidgets 等）
  newPath:
    - JSDoc `@sunsetCondition` + `@expiresAt` + `@reason` 付記
guard: barrelReexportMetadataGuard
breakingChange: false
rollback: metadata 要求を緩和
prPlan:
  - PR1 barrelReexportMetadataGuard を baseline=existing barrel count で追加（増加禁止）
  - PR2 既存 barrel 全てに metadata 追記（bulk）
  - PR3 baseline=0 fixed mode（新規追加時は必ず metadata 必須）
status: planned
```

---

## Lane D: aag-temporal-governance-hardening

**scope**: reviewPolicy 92 未設定 rule の削減 / allowlist metadata 必須化 / G8 補強 / G5/G6 allowlist metadata / Temporal Governance reformulate / generated docs 追加。

### ADR-D-001. Architecture Rule に reviewPolicy 必須化（type レベル）

```yaml
id: ADR-D-001
title: RuleOperationalState に reviewPolicy を required 昇格 + 92 件の bulk 整備
lane: D
evidence:
  inquiry: [11 §E, 14 §R-6]
  wid: []
hypothesis: [D-2]
principle: [J8]
invariant: [INV-J8-A]
retirement: [R-6]
target:
  oldPath:
    - app/src/test/aag-core-types.ts (RuleOperationalState.reviewPolicy?: optional)
    - app/src/test/architectureRules/ 配下 + app-domain/gross-profit/rule-catalog/base-rules.ts (92 件未設定)
  newPath:
    - RuleOperationalState.reviewPolicy: required
    - 既存 92 rule に reviewPolicy(owner/lastReviewedAt/reviewCadenceDays) 付記
guard: reviewPolicyRequiredGuard
breakingChange: true (rule 定義 type 変更のため全 rule 記述が compile fail)
rollback: reviewPolicy optional 復元
prPlan:
  - PR1 reviewPolicyRequiredGuard baseline=92 で追加、現状不整合は allowlist
  - PR2 92 件の reviewPolicy を bulk 追記（owner 案は rule カテゴリに応じて architecture / implementation / specialist）
  - PR3 RuleOperationalState.reviewPolicy を required に昇格、allowlist baseline=0
  - PR4 reviewPolicy expired rule を docs:check で fail させる lifecycle 監視追加
status: planned
```

### ADR-D-002. allowlist entry に `ruleId` / `createdAt` / `reviewPolicy` / `expiresAt` 必須化

```yaml
id: ADR-D-002
title: allowlist entry metadata 必須化
lane: D
evidence:
  inquiry: [11 §E, 14 §R-3 派生]
  wid: []
hypothesis: [D-2]
principle: [J8, J3]
invariant: [INV-J3-A 類型]
retirement: [R-3]
target:
  oldPath:
    - app/src/test/allowlists/ 配下（architecture.ts / complexity.ts 等 7 categories）
  newPath:
    - 各 allowlist entry に JSDoc `@ruleId` / `@createdAt` / `@reviewPolicy` / `@expiresAt` 付記、型レベルでも必須化
guard: allowlistMetadataGuard
breakingChange: true
rollback: optional 復元
prPlan:
  - PR1 allowlistMetadataGuard baseline=existing allowlist count で追加
  - PR2 既存 allowlist entry に metadata bulk 追記
  - PR3 Entry 型を required 化、baseline=0
  - PR4 expiresAt 超過 entry を fail させる
status: planned
```

### ADR-D-003. G8 responsibility-separation guard に P20（useMemo 内行数）/ P21（widget 直接子数）を追加

```yaml
id: ADR-D-003
title: G8 への P20 / P21 追加
lane: D
evidence:
  inquiry: [05 (95 pure 候補), 07 §A, 10a C-02 / C-07, 14 §R-2]
  wid: [WID-001, WID-002, WID-018 ほか多数]
hypothesis: [S6-H2, D-2]
principle: [J2]
invariant: [INV-J2-B, INV-J2-C]
retirement: [R-2]
target:
  oldPath:
    - app/src/test/guards/responsibilitySeparationGuard.test.ts (P2-P18)
  newPath:
    - 同 file に P20 (useMemo 内行数 ≤ 20) + P21 (widget 直接子数 ≤ 5) 追加
guard: responsibilitySeparationGuard (P20 / P21 として統合)
breakingChange: false
rollback: P20 / P21 削除
prPlan:
  - PR1 P20 baseline=大きな数値（inquiry/05 最大 69）で追加、P21 baseline=current max
  - PR2 sub-project Lane B の ADR-B-001〜004 完了に応じて baseline 段階削減
  - PR3 baseline=各上限値 (20 / 5) 到達
  - PR4 上限超過 fail hard
status: planned
depends: [ADR-B-001, ADR-B-002, ADR-B-003, ADR-B-004]
```

### ADR-D-004. `@deprecated` / barrel に `@expiresAt` + `@sunsetCondition` 必須化

```yaml
id: ADR-D-004
title: @deprecated コメントに @expiresAt + @sunsetCondition 併記必須化
lane: D
evidence:
  inquiry: [11 §C, 14 §R-7]
  wid: []
hypothesis: [S5-H2, D-3]
principle: [J3]
invariant: [INV-J3-A]
retirement: [R-7]
target:
  oldPath:
    - app/src/**/*.{ts,tsx} の @deprecated コメント全般
  newPath:
    - 同 JSDoc block に @expiresAt ISO date + @sunsetCondition text 付記
guard: deprecatedMetadataGuard (INV-J3-A 実装)
breakingChange: false
rollback: metadata 要求を緩和
prPlan:
  - PR1 deprecatedMetadataGuard baseline=current @deprecated count で追加
  - PR2 既存 @deprecated に metadata bulk 追記
  - PR3 baseline=0 fixed mode
  - PR4 @expiresAt 超過を docs:check で fail
status: planned
depends: [ADR-C-004]
```

### ADR-D-005. generated architecture-debt-recovery-remediation.{md,json} の追加

```yaml
id: ADR-D-005
title: remediation 進捗を generated health に出す
lane: D
evidence:
  inquiry: [07 §B (architecture-health.json パターン)]
  wid: []
hypothesis: [D-2]
principle: [J8]
invariant: []
target:
  oldPath:
    - tools/architecture-health/src/collectors/ (新規 collector)
  newPath:
    - references/02-status/generated/architecture-debt-recovery-remediation.md
    - references/02-status/generated/architecture-debt-recovery-remediation.json
    - 上記 2 file に item count / breaking change count / legacy count / sub-project count / guard implemented count / baseline remaining / review pending を出力
guard: なし（collector が出力、docs:check が整合検証）
breakingChange: false
rollback: collector 削除
prPlan:
  - PR1 collector 実装 + initial generation
  - PR2 project-health.json 参照を追加
  - PR3 docs:check で drift 検出
status: planned
depends: [ADR-D-001, ADR-D-002]
```

### ADR-D-006. projectDocConsistencyGuard（HANDOFF / checklist / status 整合）

```yaml
id: ADR-D-006
title: project phase gate guard（HANDOFF / checklist / status の整合検証）
lane: D
evidence:
  inquiry: [HANDOFF 不整合を本 project で実地観察、14 §R 系列]
  wid: []
hypothesis: [D-3]
principle: [J3, J8]
invariant: []
target:
  newPath:
    - app/src/test/guards/projectDocConsistencyGuard.test.ts
guard: projectDocConsistencyGuard
breakingChange: false
rollback: guard 削除
prPlan:
  - PR1 guard 実装: HANDOFF の「現在地」記述と checklist の最大完了 Phase が矛盾しないか検証
  - PR2 config/project.json の status と derivedStatus の説明可能性を検証（例: status=draft + derived=in_progress は許容、逆は不可）
  - PR3 Phase 4 以降の Phase 着手前に前 Phase review checkbox が残っていないか検証
  - PR4 required inquiry file 一覧との突合（Phase N 着手時に N-1 までの必須 file が揃っているか）
status: planned
```

---

## 改修 item 依存グラフ（概要）

Phase 4 の必須条件「sub-project 依存グラフが閉路を含まない」を満たすため、本 plan の 18 item の依存関係:

```text
Lane A (ctx 型)
  ADR-A-001 ──┬─► ADR-B-001 (null check 解消、type narrowing 依存)
              ├─► ADR-A-002 ──► ADR-A-003 (WidgetDef 分離、ctx 型先行)
              └─► ADR-A-004 (discriminated union、ctx 剥離完了後)

Lane B (registry 簡素化)
  ADR-B-003 ──► ADR-B-004 (selector 抽出先行 → inline logic 解消)
  ADR-B-001 / B-002 は Lane A 完了後

Lane C (重複・orphan 撤退)
  ADR-C-001 / C-002 / C-003 は独立（Lane A/B と並行可）
  ADR-C-004 ──► ADR-D-004 (barrel metadata → @deprecated metadata の統合強制)

Lane D (governance 強化)
  ADR-D-001 / D-002 は独立先行
  ADR-D-003 ──► Lane B 全件（P20/P21 baseline 削減が Lane B 実装に依存）
  ADR-D-004 ──► ADR-C-004
  ADR-D-005 ──► ADR-D-001 / D-002 (metadata 整備後)
  ADR-D-006 は独立（最先行可能、Phase 4 内で完結）
```

閉路なし。Lane 間依存は以下の主経路のみ:
- Lane A → Lane B（ADR-A-001 → ADR-B-001）
- Lane C ⇄ Lane D（ADR-C-004 ↔ ADR-D-004）
- Lane B → Lane D（ADR-D-003 が Lane B 完了に依存）

詳細な実行順序と sub-project 化は `inquiry/18-sub-project-map.md` で確定。

## 未カバー concern の扱い（inquiry/10a §D）

| id | D-N | item | 対応策 |
|---|---|---|---|
| D-1 | storeKey React key pattern | — | 本 plan では独立 item 化せず。Lane A / B 完了後に自然解消するか再評価（後 Phase） |
| D-2 | 1 文字 prop / rename | — | 既存 F カテゴリ（coding-conventions）の issue として別途扱い |
| D-3 | metric ID 文字列 hardcode | ADR-B-004 に含む | `'totalCostInclusion'` 等を MetricId literal union 型に変換 |
| D-4 | registry file 内 pure helper | ADR-B-004 に含む | `buildPrevYearCostMap` 抽出 |
| D-5 | palette 色 token registry 行記述 | ADR-B-004 に含む | DS chart-semantic-colors 参照化 |
| D-6 | default 値 registry 層決定 | ADR-B-004 に含む | `?? []` / `?? (() => {})` の selector 化 |

すなわち D-3 / D-4 / D-5 / D-6 は全て ADR-B-004 に統合。D-1 / D-2 は本 plan の scope 外（別 project or 既存カテゴリで対応）。


## 付記

- 本ファイルは計画のみ。実装は Phase 6
- 本ファイルは immutable。追加情報は `15a-*.md` として addend
- 関連: `inquiry/16`（破壊的変更 list）、`inquiry/17`（legacy retirement）、`inquiry/18`（sub-project map）
