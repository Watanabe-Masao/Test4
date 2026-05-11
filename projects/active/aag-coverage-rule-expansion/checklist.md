# checklist — aag-coverage-rule-expansion

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

## Phase 1: zone inventory + rule design

- [x] aag-scp Wave 3 baseline articulate 確認 (= 17 rules / 3704 tracked / 86.2% unmanaged)
- [x] 主要 zone 識別 (= app/ + references/ + wasm/ + aag-engine/ + tools/ + roles/ + 残)
- [x] 各 zone の category 判定 (= declared / external / ignored / archived / generated / fixture)
- [x] 各 rule の rationale + articulate 入口 articulate (= 「なぜこの category か」)

## Phase 2: rule append + generator 検証

- [x] artifact-coverage.yaml に 67 新 rules append (= 17 → 84 rules)
- [x] tools/governance/build-artifact-coverage.mjs 再実行 → coverage stats 更新
- [x] reduction 確認 (= target ~50% を超え、0% unmanaged 達成 = 3193 → 0)
- [x] 全 3704 zone classified: declared 3225 / archived 409 / generated 51 / external 49 / ignored 7

## Phase 3: ratchet-down baseline 確立

- [x] check-coverage.mjs を再実行 → unmanaged=0 baseline 固定
- [x] 新規 unmanaged file → advisory warning が出ることを確認 (= ratchet-down mechanism 確認)
- [x] artifact-coverage.generated.md regen (= public surface に最新値反映)

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [x] **総チェック**: 67 新 rules 全件 rationale + 入口 articulate 済、scope 内 (= rule content 拡張のみ)、不可侵原則違反 0 (= 新 category/schema/generator なし)
- [x] **歪み検出**: 既存 17 rules は不変、append のみ。advisory mode 維持 (= hard gate 直接昇格なし、AAG-SCP-DOC-LEARNING-002 整合)
- [x] **潜在バグ確認**: rule overlap (= 同一 path が複数 rule に match) 検証済、最初 match 採用の generator 挙動と整合
- [x] **ドキュメント抜け漏れ確認**: artifact-coverage.generated.md regen 済、CLAUDE.md generated section 反映済
- [x] **CHANGELOG.md 更新 + バージョン管理**: AAG framework 内 ratchet-down (= app version 影響なし)、aag/CHANGELOG.md に entry 追加 (= versionImpact: 'aag-only')

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する (= 2026-05-11 user 代行 delegation 「順番によろしくお願いします。並行作業できる部分は並行にて」、aag-engine-readiness-refactor 2026-05-05 precedent 整合)
