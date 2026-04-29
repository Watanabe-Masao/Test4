# checklist — integrity-framework-evolution

> 役割: completion 判定の入力（required checkbox の集合）。
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。

## Phase 0: 計画 doc landing

- [x] `projects/integrity-framework-evolution/` を `_template` から bootstrap した
- [x] `config/project.json` に projectization (Level 4 / architecture-refactor / status draft) を記録した
- [x] `plan.md` に North Star + Phase R + H + I + 不可侵原則 7 件 + 設計判断基準を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order を記録した
- [x] `HANDOFF.md` に現在地（draft 起草段階）と次にやることを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 4) と nonGoals を記録した
- [x] `derived/quality-review.md` に 13 dimension review の ground truth を保存した
- [x] `docs/contracts/doc-registry.json` に project doc 群を登録した

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

- [ ] Phase R 完了確認 (本 phase の prerequisite)
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
