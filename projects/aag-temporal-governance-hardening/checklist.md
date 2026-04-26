# checklist — aag-temporal-governance-hardening（SP-D）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。

## Phase 1: ADR-D-006 projectDocConsistencyGuard

* [x] PR1: guard 実装: HANDOFF 現在地と checklist 最大完了 Phase の整合検証
* [x] PR2: config/project.json.status vs derivedStatus の説明可能性検証（D3 test 追加）
* [x] PR3: Phase 着手前の前 Phase review checkbox 残存検出（PR1 で実装済 D2 test がカバー）
* [x] PR4: required inquiry file 一覧との突合 check（D4 test 追加、plan.md 内 inquiry 参照の実在確認）

## Phase 2: ADR-D-005 generated remediation

* [x] PR1: collector 実装 + initial generation（`references/02-status/generated/architecture-debt-recovery-remediation.{md,json}`）
* [x] PR2: project-health.json 参照追加（architecture-debt-recovery entry に generatedArtifacts.remediationJson / .remediationMd へのリンクを追加）
* [x] PR3: docs:check drift 検出組み込み（remediation.json の itemCount/BC/LEG/SP count と inquiry 実態の乖離を hard fail に）

## Phase 3: ADR-D-001 reviewPolicy required 昇格（BC-6）

* [x] PR1: `reviewPolicyRequiredGuard` baseline=92 で追加（実 baseline=139。Wave 0 で 9 SAFETY rule 付記 + 以降追加された rule を含む現状把握値）
* [x] PR2: 92 rule に reviewPolicy (owner / lastReviewedAt / reviewCadenceDays) bulk 追記（実際は 139 rule: architecture 89 / implementation 45 / specialist 5。baseline 139→0 到達）
* [x] PR3: `RuleOperationalState.reviewPolicy` required 昇格（BC-6）+ baseline=0（merged.ts で未設定時の構造エラー throw を追加、型システムで強制）
* [x] PR4: expired rule を docs:check で fail させる lifecycle 監視追加（architectureRuleGuard の review overdue test を log-only から hard fail に昇格。reviewPolicy.lastReviewedAt + reviewCadenceDays 超過で CI が止まる）

## Phase 4: ADR-D-002 allowlist metadata required（BC-7）

* [x] PR1: `allowlistMetadataGuard` baseline=existing で追加（M1: ruleId 未設定 baseline=3 / M2: createdAt 未設定 baseline=4 / M3: active-debt expiresAt 未設定 baseline=11。reviewPolicy field は PR2 で型追加 + bulk 整備）
* [x] PR2: 既存 allowlist に ruleId / createdAt / reviewPolicy / expiresAt metadata bulk 追記（35 entry × 最大 4 field = 100 field 追記。types.ts に AllowlistReviewPolicy interface 追加）
* [x] PR3: allowlist entry type required 化（BC-7）+ baseline=0（ruleId / createdAt / reviewPolicy を required 昇格）
* [x] PR4: expiresAt 超過 entry を fail（allowlistMetadataGuard M5 test を追加。現状 expired 0 件）

## Phase 5: ADR-D-004 @deprecated metadata（Wave 2、SP-C completed 後）

* [ ] SP-C (duplicate-orphan-retirement) の completed 昇格を確認した
* [ ] PR1: `deprecatedMetadataGuard` baseline=current @deprecated count で追加
* [ ] PR2: 既存 @deprecated に @expiresAt + @sunsetCondition bulk 追記
* [ ] PR3: baseline=0 fixed mode
* [ ] PR4: @expiresAt 超過を docs:check で fail

## Phase 6: ADR-D-003 G8 P20 / P21 追加（Wave 3、SP-B completed 後）

* [x] SP-B (widget-registry-simplification) の completed 昇格を確認した（2026-04-26 archive）
* [x] PR1: P20 baseline=208 (実測 max、plan 値 69 から増加。CategoryPerformanceChart.tsx:127 が最大箇所) で追加。P21 (widget 直接子数) は AST 解析が必要なため別 PR に分離
* [x] PR2: CategoryPerformanceChart.tsx の `option` useMemo (209 行) を `CategoryPerformanceChart.builders.ts` の `buildPerformanceChartOption()` に抽出。baseline 208 → 120 (新 max は ConditionSummaryEnhanced.tsx:176)
* [x] PR3: ConditionSummaryEnhanced.tsx の `allCards` useMemo (120 行) を `conditionSummaryCardBuilders.ts` の `buildAllConditionCards()` に抽出。baseline 120 → 75 (新 max は useUnifiedWidgetContext.ts:228)
* [ ] PR4: P20=20 到達、fail hard（fixed mode 移行）— 残り baseline 67 を段階削減して fixed mode に
  - PR4 step1 (済): useUnifiedWidgetContext の `ctx` useMemo (75 行) を `unifiedWidgetContextBuilder.ts` の `buildUnifiedWidgetContext()` に抽出。baseline 75 → 67 (新 max は IntegratedTimeline.tsx:49)

## Phase 7: sub-project completion

* [ ] 6 ADR 全ての 4 step（3 step のものは 3 step）を完遂した
* [ ] 全 guard baseline が目標値に到達した
* [ ] sub-project completion PR（umbrella inquiry/20 §sub-project completion テンプレート 7 step）を実施した
* [ ] 本 project の期間中、umbrella plan.md に載らない破壊的変更を一切行わなかったことを `git log` で確認した

## 最終レビュー (人間承認)

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
