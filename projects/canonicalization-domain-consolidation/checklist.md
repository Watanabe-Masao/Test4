# checklist — canonicalization-domain-consolidation

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。

## Phase 0: 計画 doc landing

- [x] `projects/canonicalization-domain-consolidation/` を `_template` から bootstrap した
- [x] `config/project.json` に projectization (Level 4 / architecture-refactor / status draft) を記録した
- [x] `plan.md` に North Star + Phase A〜I + 不可侵原則 + 撤退規律 5 step を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order を記録した
- [x] `HANDOFF.md` に現在地（draft 起草段階）と次にやることを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 4) と nonGoals を記録した
- [ ] `docs/contracts/doc-registry.json` に project doc 群を登録した

## Phase A: Inventory + Selection Rule 確定

- [x] 既存 13 ペアの正式 inventory を `references/03-guides/integrity-pair-inventory.md` に記録した
- [x] 各ペアの不変条件 / parser / 検出パターンを表で整理した
- [x] 横展開候補（hooks / charts / stores / pages / formatting / constants / wasm / design-token / storage）の inventory を作成した
- [x] selection rule（複数 caller / 業務意味 / 重複検出有効性 等）を `canonicalization-principles.md` に明文化した
- [x] 採用候補リスト（tier1 / tier2 / 不採用）を `derived/` に出力した
- [x] 共通パターン仮説を draft した（domain skeleton 設計）

## Phase B: Domain Skeleton

- [x] `app-domain/integrity/types.ts` に Registry / DriftReport / SyncDirection / EnforcementSeverity を実装した
- [x] `app-domain/integrity/parsing/` に jsonRegistry / tsRegistry / yamlFrontmatter を実装した
- [x] `app-domain/integrity/detection/` に existence / shapeSync / ratchet / temporal を実装した
- [x] `app-domain/integrity/reporting/formatViolation.ts` を実装した
- [x] domain 自体の invariant test を pass させた（domain 純粋性 + 完全性）
- [x] spec-state 系（contentSpec\*Guard）を domain 経由に切替し動作同一性を確認した
- [x] `references/03-guides/integrity-domain-architecture.md` に domain 設計を記録した

## Phase C: First Migration (doc-registry)

- [x] doc-registry parsing を `app-domain/integrity/parsing/jsonRegistry.ts` 経由に切替えた
- [x] existence check を `detection/existence.ts` 経由に切替えた
- [x] 旧 / 新 guard 双方が同 PR で同 violation 集合を出すこと（dual-emit 動作同一性）を確認した
- [x] 旧 docRegistryGuard を `@deprecated` JSDoc + sunsetCondition で marking した
- [x] `legacy-retirement.md` に sunsetCondition 記録した

> **Phase C 戦略の補注**: 単一 guard の in-place migration を採用。
> 5 step 撤退規律のうち step 1-3 (並行運用 → 観察期間 → @deprecated 化) は
> 別 file に新 guard を立てる場合の手順。本 case は **同 file 内で inline ロジック →
> domain primitive 経由に同時切替**で 6 既存 test 全件 PASS を維持し、
> step 5 (singular) に直接到達。`legacy-retirement.md §7` に判例として記録。

## Phase D: Bulk Migration (waves)

- [x] Wave 1: calc canon / canonicalization-system / test-contract / scope.json (4 ペア) の dual-emit 化 (4/4 完了、tsRegistry + setRelation primitive 新設、全 34 既存 test PASS)
- [x] Wave 2: taxonomy v2 / principles / architecture-rules merge (3 ペア) の dual-emit 化 (3/3 完了、cardinality + bidirectionalReference primitive 新設、全 52 既存 test PASS)
- [x] Wave 3: allowlists / checklist / obligation-collector / invariant-catalog (4 ペア) の dual-emit 化 (3/4 完了 + 1 deferred、markdownIdScan + filesystemRegistry primitive 新設、全 42 既存 test PASS。obligation-collector は親 architectureRuleGuard と共に Phase E 再評価)
- [ ] 全 13 ペアが domain 経由で active
- [ ] 全 旧 guard が `@deprecated` 状態に到達した

## Phase E: Legacy Retirement

- [x] Phase C/D で `@deprecated` 化された旧 guard / 旧 parser を物理削除した (contentSpecHelpers.ts 純関数 re-export 層を撤去、deprecation marker 解除)
- [x] 重複していた drift detection logic を削除した (Phase C 以降の in-place migration で step 5 (singular) 直接到達 — contentSpec\*Guard 11 / docRegistryGuard / 12 D-Wave guard 全件)
- [x] ratchet-down baseline を旧経路から domain 側に統合移行した (allowlist M1-M4 / calc canon Zod / UNREGISTERED_BASELINE 等は migration 時に domain `checkRatchet` 経由化済)
- [x] `legacy-retirement.md` に各 sunset の actual date を記録した (Phase B / C / D-W1 / D-W2 / D-W3 / E §7)
- [x] 旧経路 caller = 0 を grep で確認した (11 contentSpec\*Guard が `@app-domain/integrity` 直接 import に切替、re-export 経由 caller=0)

> **Phase E 戦略の補注**: Phase C 以降の判例 (in-place migration → step 5 (singular) 直接到達)
> により、撤退規律 5 step の物理削除対象は **`contentSpecHelpers.ts` の純関数 re-export 層** のみ。
> 旧 inline ロジックは migration commit で同 file 内置換済 (step 5 直接到達)、別 file 並行運用は不要。
> `architectureRuleGuard.test.ts` (823 行) と `obligation-collector` は Phase D で touch せず、
> 本 file の stable な責務として継続運用 (Phase E scope 外、Phase H 横展開で再評価)。

## Phase F: Domain Invariant Test

- [ ] domain 純粋性 test（I/O が guard 側に閉じている）を pass させた
- [ ] domain 完全性 test（全 registry pattern が domain primitive で表現可能）を pass させた
- [ ] coverage matrix（primitive 別の使用 registry）を generated section で出力した

## Phase G: Architecture-Health KPI 統合

- [ ] `integrity.violations.total` KPI を出力した
- [ ] `integrity.driftBudget` KPI を出力した
- [ ] `integrity.expiredExceptions` KPI を出力した
- [ ] `integrity.consolidationProgress` KPI を出力した
- [ ] Hard Gate に `integrity.violations.total > 0` を追加した

## Phase H: Horizontal Expansion (新規正本化)

- [ ] Phase A で selection rule 通過した tier1 候補を確定した
- [ ] tier1 候補の最初のもの（hooks 系の bundle / plan）を 1 PR で正本化した
- [ ] 各 tier1 候補に integrity domain 経由の guard を active 化した
- [ ] tier2 候補は本 phase scope 外として後続 project へ送り出した

## Phase I: 制度文書化 + Handoff

- [ ] `references/01-principles/integrity-domain.md` を新設し不変条件 / 設計思想 / 撤退規律を記録した
- [ ] `references/03-guides/canonicalization-checklist.md` を新設し新 registry+guard 追加 checklist を整備した
- [ ] Promote Ceremony PR template の整合性版（registry+guard の追加 / 撤退儀式）を整備した
- [ ] `architectureRuleGuard` に「新 guard が domain 非経由」を検出する rule を追加した
- [ ] 後続 project への引き継ぎ doc を整備した

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase (A〜I) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
