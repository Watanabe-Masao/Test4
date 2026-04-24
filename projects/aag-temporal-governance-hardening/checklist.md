# checklist — aag-temporal-governance-hardening（SP-D）

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。

## Phase 1: ADR-D-006 projectDocConsistencyGuard

* [x] PR1: guard 実装: HANDOFF 現在地と checklist 最大完了 Phase の整合検証
* [ ] PR2: config/project.json.status vs derivedStatus の説明可能性検証
* [ ] PR3: Phase 着手前の前 Phase review checkbox 残存検出
* [ ] PR4: required inquiry file 一覧との突合 check

## Phase 2: ADR-D-005 generated remediation

* [x] PR1: collector 実装 + initial generation（`references/02-status/generated/architecture-debt-recovery-remediation.{md,json}`）
* [ ] PR2: project-health.json 参照追加
* [ ] PR3: docs:check drift 検出組み込み

## Phase 3: ADR-D-001 reviewPolicy required 昇格（BC-6）

* [x] PR1: `reviewPolicyRequiredGuard` baseline=92 で追加（実 baseline=139。Wave 0 で 9 SAFETY rule 付記 + 以降追加された rule を含む現状把握値）
* [x] PR2: 92 rule に reviewPolicy (owner / lastReviewedAt / reviewCadenceDays) bulk 追記（実際は 139 rule: architecture 89 / implementation 45 / specialist 5。baseline 139→0 到達）
* [ ] PR3: `RuleOperationalState.reviewPolicy` required 昇格（BC-6）+ baseline=0
* [ ] PR4: expired rule を docs:check で fail させる lifecycle 監視追加

## Phase 4: ADR-D-002 allowlist metadata required（BC-7）

* [x] PR1: `allowlistMetadataGuard` baseline=existing で追加（M1: ruleId 未設定 baseline=3 / M2: createdAt 未設定 baseline=4 / M3: active-debt expiresAt 未設定 baseline=11。reviewPolicy field は PR2 で型追加 + bulk 整備）
* [ ] PR2: 既存 allowlist に ruleId / createdAt / reviewPolicy / expiresAt metadata bulk 追記
* [ ] PR3: allowlist entry type required 化（BC-7）+ baseline=0
* [ ] PR4: expiresAt 超過 entry を fail

## Phase 5: ADR-D-004 @deprecated metadata（Wave 2、SP-C completed 後）

* [ ] SP-C (duplicate-orphan-retirement) の completed 昇格を確認した
* [ ] PR1: `deprecatedMetadataGuard` baseline=current @deprecated count で追加
* [ ] PR2: 既存 @deprecated に @expiresAt + @sunsetCondition bulk 追記
* [ ] PR3: baseline=0 fixed mode
* [ ] PR4: @expiresAt 超過を docs:check で fail

## Phase 6: ADR-D-003 G8 P20 / P21 追加（Wave 3、SP-B completed 後）

* [ ] SP-B (widget-registry-simplification) の completed 昇格を確認した
* [ ] PR1: P20 baseline=69 + P21 baseline=current max で追加
* [ ] PR2-3: SP-B の B-001〜004 完了に応じて baseline 段階削減
* [ ] PR4: 各上限値（P20=20 / P21=5）到達、fail hard

## Phase 7: sub-project completion

* [ ] 6 ADR 全ての 4 step（3 step のものは 3 step）を完遂した
* [ ] 全 guard baseline が目標値に到達した
* [ ] sub-project completion PR（umbrella inquiry/20 §sub-project completion テンプレート 7 step）を実施した
* [ ] 本 project の期間中、umbrella plan.md に載らない破壊的変更を一切行わなかったことを `git log` で確認した

## 最終レビュー (人間承認)

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
