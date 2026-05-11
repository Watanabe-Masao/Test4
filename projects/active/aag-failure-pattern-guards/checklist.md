# checklist — aag-failure-pattern-guards

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> **必須構造**: 最後の 2 section は **必ずこの順** で配置:
>
> 1. `## AI 自己レビュー (= user 承認の手前)` — AI が実装後の総 review を実施する mandatory checkpoint (= DA-β-002)
> 2. `## 最終レビュー (user 承認)` — user 承認 gate
>
> 機能的な作業がすべて [x] になった後でも、AI 自己レビュー section に 1 つ以上 [ ] が残れば user 承認に進めない。
> AI 自己レビューが [x] になっても 最終レビュー section が [ ] なら project は `in_progress` のまま留まる。
> archive プロセスへの移行を **2 段 gate** で構造的に articulate (= 機械検証 PZ-13)。

## Phase 1: 1st guard (DOC-FAIL-DUPLICATE-RESPONSIBILITY)

- [x] docDuplicateResponsibilityGuard.test.ts 新設 (= app/src/test/guards/)
- [x] detection algorithm 実装 (= sha256 byte-identical 比較、projects/active/<id>/ vs projects/_template/)
- [x] baseline=0 articulate (= aag-scp Wave 3 sub-PR 5 cleanup 完了済)
- [x] shadow mode (= warning emit のみ、exit 0 維持) で landed (commit f0bfc39)
- [x] self-test 含む (= template walk が機能することを verify)
- [x] guard-test-map.md に登録 (= guardTestMapConsistencyGuard PASS、commit e5a6432)

## Phase 2: 残 5 patterns batch articulate

- [x] docFailurePatternBaselineGuard.test.ts 新設 (= 統合 guard、1 file で 5 patterns articulate)
- [x] DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE baseline articulate (= 16 observation)
- [x] DOC-FAIL-LOCATION-MISMATCH baseline articulate (= 13 observation)
- [x] DOC-FAIL-TEMPORAL-MIXING baseline articulate (= 6 observation)
- [x] DOC-FAIL-GENERATED-AS-MANUAL baseline articulate (= 5 observation)
- [x] DOC-FAIL-STALE-DESCRIPTION baseline articulate (= 5 observation)
- [x] shadow mode (= warning emit のみ、exit 0 維持) で landed (commit 2955b85)
- [x] follow-up fixes: js-yaml type interop (c1ebc00) + health regen (0c27afd) + drift refresh (92df686)

## Phase 3: guard-test-map + guardTestMapConsistencyGuard 整合

- [x] guard-test-map.md に docFailurePatternBaselineGuard 登録
- [x] guardTestMapConsistencyGuard PASS
- [x] generated artifacts (= taxonomy-health.json / architecture-health 系) regen 反映

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [x] **総チェック**: 6/6 guard candidates 全件 shadow stage 着地、scope 内 (= 既 articulate 済 6 patterns のみ)、不可侵原則違反 0 (= 新 pattern 追加 / hard fail 直接昇格なし)
- [x] **歪み検出**: docFailurePatternBaselineGuard は 1 file で 5 patterns articulate (= C7 同義 API 併存禁止 + G8 責務分離 整合)、separate guards への分散は回避
- [x] **潜在バグ確認**: baseline 増加方向 hard fail (= ratchet-down)、減少方向 update 不要 (= 既存違反 cleanup は別 Sub scope)、js-yaml require() interop は c1ebc00 で hardening 済
- [x] **ドキュメント抜け漏れ確認**: guard-test-map.md + document-failure-taxonomy.generated.md + architecture-health 系 generated regen 済、CLAUDE.md generated section 反映済
- [x] **CHANGELOG.md 更新 + バージョン管理**: AAG framework 内 ratchet-down (= app version 影響なし)、aag/CHANGELOG.md に AAG 6.x entry articulate (= versionImpact: 'aag-only')

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する
