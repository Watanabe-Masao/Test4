# checklist — integrity-framework-evolution

> 役割: completion 判定の入力（required checkbox の集合）。
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。

## Phase 0: 計画 doc landing

- [x] `projects/integrity-framework-evolution/` を `_template` から bootstrap した
- [x] `config/project.json` に projectization (Level 4 / architecture-refactor / status draft) を記録した
- [x] `plan.md` に North Star + Phase Q + R + H + I + 不可侵原則 10 件 + 4 layer model を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order を記録した
- [x] `HANDOFF.md` に現在地（draft 起草段階）と次にやることを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 4) と nonGoals を記録した
- [x] `breaking-changes.md` に Phase R + Phase Q (Meta-AAG layer) の schema 変更を記録した
- [x] `legacy-retirement.md` に旧 schema + Meta-AAG 不在 pattern の撤退記録を整備した
- [x] `sub-project-map.md` に親 / 並行 / 後続 project 関係を記録した
- [x] `derived/quality-review.md` に 13 dimension review + Meta-AAG insight の ground truth を保存した

## Phase Q: AAG Maturation (operational + meta-governance, 2 axes)

> **AAG を「強い品質ゲート」から「低認知負荷で、リスクに応じて、修正まで導く品質運用システム」へ進化。Phase R/H/I の prerequisite。**
>
> 2 axes (operational Q.O-1〜Q.O-6 + meta-governance Q.M-1〜Q.M-8 = 計 14 要素) は AAG 5.2 collector-governance symmetry を先行例として institutionalize する。

### Phase Q operational axis (Q.O-1〜Q.O-6)

- [ ] Q.O-1: AAG_OVERVIEW.md / AAG_CRITICAL_RULES.md / aag-onboarding-path.md (3 入口 doc) を整備した
- [ ] Q.O-2: 全 rule に Tier 0/1/2/3 を必須化、`base-rules.ts BaseRule` schema 拡張 + architectureRuleGuard で機械検証した
- [ ] Q.O-3: Change classification (Micro/Local/System/Constitutional) を PR template + projectizationPolicyGuard 拡張で機械検証した
- [ ] Q.O-4: Repair-style guard messages 標準を整備した (各 guard に violationCode/why/commonCause/fixPath/command/escalation 必須化、guard-failure-playbook.md と連動)
- [ ] Q.O-5: projects 直下 README を projectChecklistCollector で auto-generate (project navigation 一覧、手書き禁止)
- [ ] Q.O-6: AAG operational KPIs (efficacy 系 4 + degradation 系 10 = 14 KPIs) を `aag.*` 名前空間で `architecture-health.json` に出力した

### Phase Q meta-governance axis (Q.M-1〜Q.M-8)

- [ ] Q.M-1: AAG_CHANGE_IMPACT PR template を整備し、AAG 変更 PR で必須化する guard を実装した
- [ ] Q.M-2: AAG invariant list (9 hard invariants、anti-bloat 含む) を `references/01-principles/aag-invariants.md` (新設) に記録した
- [ ] Q.M-3: AAG meta-guards 8 件 (meta-governance / source-of-truth / collector symmetry generic / health schema / lifecycle simulation / generated drift / rule metadata / guard noise) を実装した
- [ ] Q.M-4: AAG operational KPIs collector (Q.O-6 と同 collector、efficacy + degradation の 2 vue) を実装した
- [ ] Q.M-5: AAG promotion gate (L0-L7) を rule definition schema に組み込み、各 rule に成熟度 level を必須化した
- [ ] Q.M-6: Canary rollout policy (Phase 0-4) を `references/03-guides/aag-canary-rollout.md` (新設) に文書化した
- [ ] Q.M-7: AAG rollback policy を同 doc に記録し、failure 時の降格経路 (warn / health-only / collector rollback 等) を明示した
- [ ] Q.M-8: Governance review checklist (technical + governance 二段階) を PR template + reviewer assignment に組み込んだ

### Phase Q self-protection

- [ ] Q.M-3 meta-guards が Q.O-1〜Q.O-6 + Q.M-1〜Q.M-8 の整合性を機械検証している (再帰性確保)

## Phase R: Framework Reset

- [ ] R-①: Bidirectional Canonical Contract schema を `app-domain/integrity/types.ts` に追加した
- [ ] R-①: 13 pair を contract schema で再分類した (COVERAGE_MAP + integrity-collector の duplicate logic 解消)
- [ ] R-②: Time-axis Decision Record schema を全 archive (accepted/rejected/deferred/retired/scope-changes) に共通適用した
- [ ] R-②: taxonomy origin journal を同 schema で reframe した (cross-domain 適用)
- [ ] R-③: mechanism/judgement/hybrid 3-zone 分類を全 invariant に必須化した
- [ ] R-③: §P8/§P9 / selection rule / 撤退規律を 3-zone 分類で書き直した
- [ ] R-④: Cross-domain Framework Layer の `APP_DOMAIN_INDEX.md` 統一 template を整備した
- [ ] R-⑤: Decision Artifact Standard PR template + archive 義務 + guard を整備した
- [ ] R-⑥: Dogfooding Mandate により AAG framework を #14 pair として inventory 化した
- [ ] R-⑥: integrity domain の coverage guard を integrity primitive で書き直した

## Phase H: Horizontal Expansion

- [ ] Phase Q + Phase R 完了確認 (本 phase の prerequisite、Q が R を protect、R が H を支える)
- [ ] H-α: hooks (H-1) re-evaluation を 3-zone selection rule で実施した
- [ ] H-β: charts (H-2) を Phase R framework 上で 1 PR で正本化した
- [ ] H-γ: wasm (H-7) を Phase R framework 上で 1 PR で正本化した (新 primitive 必要時は単独追加 PR を先行)
- [ ] H-δ: COVERAGE_MAP を 13 → N pair に拡張、Phase F audit 昇格した

## Phase I: Institutionalization

- [ ] §P8/§P9 を R-①/R-②/R-③ schema で再構造化した
- [ ] canonicalization-checklist.md を 3-zone 分類で書き直した
- [ ] 前駆 project (canonicalization-domain-consolidation) を archive 経路に移行した (project-checklist-governance §6.2)
- [ ] 本 project の status を completed に更新した
- [ ] 第 5 の柱 (Project Lifecycle Governance) に handoff doc を整備した

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase (R / H / I) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
