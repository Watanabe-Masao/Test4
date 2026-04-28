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

- [ ] 既存 13 ペアの正式 inventory を `references/03-guides/integrity-pair-inventory.md` に記録した
- [ ] 各ペアの不変条件 / parser / 検出パターンを表で整理した
- [ ] 横展開候補（hooks / charts / stores / pages / formatting / constants / wasm / design-token / storage）の inventory を作成した
- [ ] selection rule（複数 caller / 業務意味 / 重複検出有効性 等）を `canonicalization-principles.md` に明文化した
- [ ] 採用候補リスト（tier1 / tier2 / 不採用）を `derived/` に出力した
- [ ] 共通パターン仮説を draft した（domain skeleton 設計）

## Phase B: Domain Skeleton

- [ ] `app-domain/integrity/types.ts` に Registry / DriftReport / SyncDirection / EnforcementSeverity を実装した
- [ ] `app-domain/integrity/parsing/` に jsonRegistry / tsRegistry / yamlFrontmatter を実装した
- [ ] `app-domain/integrity/detection/` に existence / shapeSync / ratchet / temporal を実装した
- [ ] `app-domain/integrity/reporting/formatViolation.ts` を実装した
- [ ] domain 自体の invariant test を pass させた（domain 純粋性 + 完全性）
- [ ] spec-state 系（contentSpec*Guard）を domain 経由に切替し動作同一性を確認した
- [ ] `references/03-guides/integrity-domain-architecture.md` に domain 設計を記録した

## Phase C: First Migration (doc-registry)

- [ ] doc-registry parsing を `app-domain/integrity/parsing/jsonRegistry.ts` 経由に切替えた
- [ ] existence check を `detection/existence.ts` 経由に切替えた
- [ ] 旧 / 新 guard 双方が同 PR で同 violation 集合を出すこと（dual-emit 動作同一性）を確認した
- [ ] 旧 docRegistryGuard を `@deprecated` JSDoc + sunsetCondition で marking した
- [ ] `legacy-retirement.md` に sunsetCondition 記録した

## Phase D: Bulk Migration (waves)

- [ ] Wave 1: calc canon / canonicalization-system / test-contract / scope.json (4 ペア) の dual-emit 化
- [ ] Wave 2: taxonomy v2 / principles / architecture-rules merge (3 ペア) の dual-emit 化
- [ ] Wave 3: allowlists / checklist / obligation-collector / invariant-catalog (4 ペア) の dual-emit 化
- [ ] 全 13 ペアが domain 経由で active
- [ ] 全 旧 guard が `@deprecated` 状態に到達した

## Phase E: Legacy Retirement

- [ ] Phase C/D で `@deprecated` 化された旧 guard / 旧 parser を物理削除した
- [ ] 重複していた drift detection logic を削除した
- [ ] ratchet-down baseline を旧経路から domain 側に統合移行した
- [ ] `legacy-retirement.md` に各 sunset の actual date を記録した
- [ ] 旧経路 caller = 0 を grep で確認した

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
