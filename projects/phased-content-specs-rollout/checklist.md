# checklist — phased-content-specs-rollout

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。

## Phase 0: 計画 doc landing

- [x] `projects/phased-content-specs-rollout/` を `_template` から bootstrap した
- [x] `config/project.json` に projectization (Level 3 / governance-hardening / status active) を記録した
- [x] `plan.md` に Phase A〜J + Operational Control System §1〜§11 + 不可侵原則を記録した
- [x] `AI_CONTEXT.md` に scope (含む / 含まない) と read order を記録した
- [x] `HANDOFF.md` に現在地（spawn → SHELL → ACTIVE の経緯）と次にやることを記録した
- [x] `projectization.md` に AAG-COA 判定 (Level 3) と nonGoals を記録した
- [x] umbrella + 4 sub-project archive 完遂を反映（main merge）

## Phase A: Anchor Slice — 保証経路完成

- [x] `tools/widget-specs/generate.mjs` の frontmatter generator を実装した
- [x] Anchor Slice 5 widget (WID-002 / 006 / 018 / 033 / 040) の source に `@widget-id` JSDoc を注入した
- [x] `AR-CONTENT-SPEC-EXISTS` rule を `architectureRules.ts` に登録 + active 化した
- [x] `AR-CONTENT-SPEC-FRONTMATTER-SYNC` rule を登録 + active 化した
- [x] `AR-CONTENT-SPEC-CO-CHANGE` rule を登録 + active 化した
- [x] `AR-CONTENT-SPEC-FRESHNESS` rule を登録 + active 化した
- [x] `AR-CONTENT-SPEC-OWNER` rule を登録 + active 化した
- [x] `obligation-collector.ts` の `OBLIGATION_MAP` に registry 変更 → spec 更新義務を追加した
- [ ] behavior section guard（spec が usage ではなく behavior を記述している検証）を実装した
- [ ] content graph の初版 collector を実装した
- [x] `npm run content-specs:check` script を package.json に追加した
- [x] CI workflow に content-specs:check を組み込んだ（`test:guards` 経由で fast-gate に組み込み — `contentSpecFrontmatterSyncGuard` が generator --check を spawn する）
- [x] Anchor Slice 5 件で `missingSpec / frontmatterDrift / coChangeViolation = 0` を達成した
- [ ] Anchor Slice 5 件で Promotion Gate L4 到達を確認した
- [x] source 変更 → spec 未更新で `npm run docs:check` が hard fail することを CI で確認した（synthetic drift 注入で contentSpecCoChangeGuard / FrontmatterSync が hard fail することを確認）

## Phase B: WID 全体への拡張

- [x] 全 45 WID の source に `@widget-id` JSDoc を注入した
- [x] frontmatter generator を全 45 件に適用し drift = 0 を達成した
- [x] co-change guard を 45 件全体で active 化した
- [x] freshness / owner guard が 45 件全体で動作することを確認した
- [ ] 全 45 WID の content graph が生成された
- [ ] 全 45 WID で Promotion Gate L4 到達を確認した

## Phase C: ReadModels / Pipelines の網羅

- [x] `RM-NNN` の ID 体系を確定した（PIPE / QH / PROJ は Phase C-2 batch で確定予定）
- [x] `references/05-contents/read-models/` 新サブカテゴリを追加した（pipelines / query-handlers / projections は次 batch）
- [x] 主要 readModel の spec body authoring + source tag を実施した（RM-001 〜 RM-010、10 件 = canonicalizationSystemGuard 監視 readModel 全件）
- [x] frontmatter generator を新サブカテゴリに拡張した（kind=read-model dispatch、`@rm-id` JSDoc 自動注入）
- [x] 主要 readModel `missingSpec = 0` を達成した（10 件、AR-CONTENT-SPEC-EXISTS guard で検証）
- [ ] 主要 pipeline `missingSpec = 0` を達成した
- [ ] queryHandler / projection の `sourceRef drift = 0` を達成した
- [ ] pipeline lineage が graph で追跡可能になった
- [ ] Promotion Gate L5 到達を確認した

## Phase D: Domain Calculations の網羅

- [ ] selection rule に従い対象 CALC を確定した（public export / 複数 consumer / invariant あり / 業務意味あり）
- [ ] `CALC-NNN` ID を割当した
- [ ] 対象 CALC に source tag を導入した
- [ ] 対象 CALC の invariant section を `invariant-catalog.md` 参照で記録した
- [ ] tests / guards との evidence 紐付けを完了した
- [ ] Lifecycle State Machine の `sunsetCondition` を deprecated calc に必須化した
- [ ] 対象 CALC `missingSpec = 0` を達成した
- [ ] 対象 CALC tests 参照 = 100% を達成した
- [ ] invariant 付き CALC の test 参照 = 100% を達成した
- [ ] deprecated CALC の `sunsetCondition` = 100% を達成した

## Phase E: Charts へ拡張

- [ ] `CHART-NNN` ID を対象 chart に割当した
- [ ] input builder / render model / option builder を spec に記録した
- [ ] visual test / story / fixture と紐付けした
- [ ] empty / loading / ready / error state を frontmatter に記録した
- [ ] 主要 chart `missingSpec = 0` を達成した
- [ ] chart input builder 参照 = 100% を達成した
- [ ] visual / e2e evidence required の chart で evidence 設定済み

## Phase F: Selected UI Components

- [ ] selection rule に基づく対象 UIC 一覧を確定した
- [ ] `UIC-NNN` ID を割当した
- [ ] props contract / children / hooks / side effects を記録した
- [ ] 対象 UIC `missingSpec = 0` を達成した
- [ ] props `sourceRef drift = 0` を達成した
- [ ] story or visual evidence required 対象の設定完了

## Phase G: Storybook / Visual Evidence 連携

- [ ] spec frontmatter に `stories` / `visualTests` / `states` フィールドを追加した
- [ ] UI spec の story / visual evidence guard を active 化した
- [ ] Chart spec の visual evidence guard を active 化した
- [ ] 対象 UI / Chart の evidence coverage が基準値以上に到達した
- [ ] empty / error state の story coverage が基準値以上に到達した

## Phase H: Architecture Health 詳細 KPI 連携

- [ ] `references/02-status/generated/content-spec-health.json` collector を実装した
- [ ] `contentSpec.{total, byKind, missingSpec, frontmatterDrift, coChangeViolation, stale, missingOwner, lifecycleViolation, evidenceCoverage, exceptions.total, exceptions.expired, promotionLevel.distribution}` を出力した
- [ ] `architecture-health.json` summary に Content Spec カテゴリを反映した
- [ ] Drift Budget の threshold を設定した
- [ ] Promotion Gate L6 到達を確認した

## Phase I: PR Impact Report / Bot 連携

- [ ] `npm run content-specs:impact -- --base main --head HEAD` CLI を実装した
- [ ] CLI 出力に Changed sources / Affected specs / Required spec updates / Risk level を含めた
- [ ] CI artifact として保存される設定を完了した
- [ ] 必要に応じ PR comment bot 化した

## Phase J: Claim Evidence Enforcement

- [ ] J1: `evidenceLevel` を任意項目として導入した
- [ ] J2: `tested / guarded / reviewed / asserted` の 4 分類を定義した
- [ ] J3: high-risk claim の `evidenceLevel = asserted` が 0 になった
- [ ] J4: `tested` claim の test 参照欠落 = 0 になった
- [ ] J5: `guarded` claim の guard 参照欠落 = 0 になった

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase (A〜J) の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
