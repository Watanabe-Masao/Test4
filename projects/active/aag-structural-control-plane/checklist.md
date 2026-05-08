# checklist — aag-structural-control-plane

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> 規約: `references/05-aag-interface/operations/project-checklist-governance.md` §3。
> 形式: `- [ ]` または `- [x]` の半角スペース。ネスト不可。
>
> **Phase 0 完了 + Wave 1 readiness ticked-out**（ADR-SCP-016）。Wave 1 / 2 / 3 各 Phase の checkbox は当該 Wave 着手時 + user 承認後に追記する（不可侵原則 9 = 順序逆行禁止）。Separate Program candidate（Phase 8a/8b/8c + Phase 10）は本 program scope 外、checklist 化しない。

## Phase 0: ADR + Existing Asset Mapping（COMPLETE）

> **完遂判定**: ADR-SCP-016 landing commit で Phase 0 acceptance criteria 全 36 項目満足。本 commit 後の `docs:generate` で project-health の progress に反映される。

- [x] `projects/active/aag-structural-control-plane/` 配下 8 ファイル一式 landing（AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / config/project.json）
- [x] `inquiry/` 6 ファイル landing（01-existing-contract-assets / 02-existing-yaml-inventory / 03-doc-registry-extension-strategy / 04-self-check-substrate-sync / 05-obligation-migration-strategy / 06-temporal-scope-shadow-policy）
- [x] `references/04-tracking/open-issues.md` の active projects 索引に本 project 追加
- [x] `cd app && npm run docs:generate` で project-health に新 project が `derivedStatus = in_progress` として登録される
- [x] `cd app && npm run test:guards` PASS（projectizationPolicyGuard / checklistFormatGuard / projectCompletionConsistencyGuard / projectDocStructureGuard 等 全件）
- [x] DA-α-000（進行モデル decision）を decision-audit.md に articulate
- [x] ADR-SCP-001（YAML authoring / JSON machine truth）を decision-audit.md に articulate
- [x] ADR-SCP-002（Document Contract は doc-registry.json の拡張層）を decision-audit.md に articulate
- [x] ADR-SCP-003（製本 = 現在 / archive = 過去 / project = 未来 / generated report = 計算済み現在）を decision-audit.md に articulate
- [x] ADR-SCP-004（Tree Contract MVP scope は top-level + structural roots のみ）を decision-audit.md に articulate
- [x] ADR-SCP-005（OBLIGATION_MAP は 3 段階 shadow migration）を decision-audit.md に articulate
- [x] ADR-SCP-006（AI Instruction Pack は post-write validation 限定）を decision-audit.md に articulate
- [x] ADR-SCP-007（Reading Pass 成果物の保存規約）を decision-audit.md に articulate
- [x] ADR-SCP-008（Machine inferred で accepted 扱いとする kind の例外条項）を decision-audit.md に articulate
- [x] ADR-SCP-009（Reading entry の stale 検出と再レビュー基準）を decision-audit.md に articulate
- [x] ADR-SCP-010（Reading Pass 記録フォーマット最小 schema）を decision-audit.md に articulate
- [x] ADR-SCP-011（disposition taxonomy を 6 分類に拡張: + generated-register / + needs-triage）を decision-audit.md に articulate
- [x] ADR-SCP-012（Phase 5 PR 分割基準 = zone × disposition）を decision-audit.md に articulate
- [x] ADR-SCP-013（Finding schema 最小 field set: id / severity / phase / subject / rule / problem / expected / suggestedDisposition / confidence / falsePositiveAllowed / detectedBy / detectedAt / status）を decision-audit.md に articulate
- [x] ADR-SCP-014（Guidance over restriction: AAG SCP 思想 + AAG-SCP-GUIDANCE-001〜007 + 定量/定性分離 + 合言葉更新 `Plan → Context → Contract → Guidance → Gate` + やってはいけないこと §A1/§A2/§B 3 分類 + §A1 永続 checker + §A2 boundary protection guardrail + §B 再チェック機会 + ガードレール metaphor）を decision-audit.md に articulate
- [x] ADR-SCP-015（Phase 1 implementation prep: D1 §A2 declarative YAML + common runner / D2 git diff baseRef 4 段階解決 / D3 hard-gate-count → hard-gate-surface + baseline 比較 / D4 no-new-references-doc 5 例外条件 + rename detection）を decision-audit.md に articulate
- [x] ADR-SCP-016（Wave restructuring 採用: D1 Phase 0〜10 → Wave 1/2/3 + Separate Program candidate / D2 §A1 checker Wave 配置 / D3 verified-zero finding 許容 / D4 hard-gate-surface baseline 構造明示 / D5 §A2 declarative checker + common runner 再強調 / D6 Phase 0 完了判定 / D7 inquiry/08 採用済み）を decision-audit.md に articulate
- [x] plan.md「やってはいけないこと」が §A1（AAG Core 永続、11 件、Wave 配置 articulate）/ §A2（project-scoped boundary protection、**4 件のみ**、archive で消失）/ §B（仕組み化不可、6+ 件）に 3 分類されている
- [x] §A1 各項目に検出装置 path（`tools/governance/check-*.ts` または既存 mechanism 拡張、parse-heavy 含む）+ Wave / landing phase が articulate されている（GUIDANCE-005 + ADR-SCP-016 D2）
- [x] §A2 が boundary protection（触ってはいけない / 変更してはいけない / 崩してはいけない）4 件に限定されている: `app-untouched` / `docs-contracts-aag-untouched` / `no-new-references-doc` / `hard-gate-surface`
- [x] §A2 各 checker が parse-free（`git diff --name-only` / `grep` のみ）+ phase 不変（全期間一貫禁止）であることが articulate されている（GUIDANCE-007）
- [x] §A2 checker が archive 時に Archive v2 §6.4 で物理削除されることが articulate されている
- [x] aag/scp-checkers/README.md が landing し、4 checker の boundary protection image / 検出ロジック / 設計原則が articulate されている
- [x] §B 各項目に再チェック trigger + 文脈提供 surface が articulate されている（GUIDANCE-006、`check-design-intent.yaml` / Instruction Pack `philosophy` block / `discriminationGuide` field 等）
- [x] §A2 metaphor「AI が安心してアクセルを踏むための事前ガードレール」が ADR-SCP-014 / AI_CONTEXT.md / scp-checkers/README.md に articulate されている
- [x] inquiry/01: 既存 `docs/contracts/aag/*.schema.json`（10 schemas）を棚卸し、本 program の新 schema との配置関係を articulate
- [x] inquiry/02: 既存 YAML 4 件（`.coderabbit.yaml` / `references/04-tracking/*-inventory.yaml` 3 件）を 5 分類（declaration / inventory / generated-input / legacy / unknown）で articulate
- [x] inquiry/03: 既存 `doc-registry.json`（138KB）の構造を確認し、kind / temporalScope / requiredSections の additive 拡張ポイントを articulate
- [x] inquiry/04: `aag-engine/internal/selfcheck/selfcheck.go`（V1〜V7）と `command_selfcheck.go`（V1〜V5 のみ）の drift を確認し、最初の Finding として記録
- [x] inquiry/05: 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS`（`tools/architecture-health/src/collectors/obligation-collector.ts` L43 / L201）の構造を確認し、Phase 8a 正規化比較器の必要要件を articulate
- [x] inquiry/06: 既存 `references/99-archive/` の archive-manifest 有無を確認し、ADR-SCP-008 例外条項の trigger 条件（archive-manifest exists）を articulate
- [x] inquiry/07: Phase 0 acceptance criteria 10 項目（高 #1〜#5 + 次点 #6〜#10）が articulate されている — Phase 1 schema 設計の入力として確定
- [x] inquiry/08: Wave restructuring 棚卸し（Phase 0〜10 → Wave 1/2/3 + Separate Program candidate 4 分類 + Wave 1 exit criteria 数値化 + 中止条件 + 価値検証ポイント）が articulate されている — ADR-SCP-016 で正式採用

## Wave 1 readiness（Wave 1 着手前の確認、ADR-SCP-016 D6 整合）

> **役割**: Wave 1（Phase 1 → Phase 2 → Phase 3）着手の前提条件 articulate。本 section の checkbox はすべて `[x]` 状態で Wave 1 着手判断する。Wave 1 内 Phase の作業 checkbox は Wave 1 着手時に追記する。

- [x] plan.md が Wave 1 / Wave 2 / Wave 3 / Separate Program candidate 構造に refactor されている（ADR-SCP-016 D1）
- [x] plan.md §A1 checker table に Wave 配置 column が articulate されている（ADR-SCP-016 D2）
- [x] plan.md §A2 hard-gate-surface entry に baseline 構造（baselineCommit / baselineAt / surfaces / knownHardGateSurfaces）が articulate されている（ADR-SCP-016 D4）
- [x] Wave 1 exit criteria が数値化されている（managed zone == 4 / 追加 schema ≤ 3 / 新 §A1 checker ≤ 3 / §A2 = 4 / 誤検知未解決 == 0 / new-only gate 未導入 / valid finding または verified-zero finding を出せる / 運用コスト articulate 済）
- [x] Wave 1 中止条件が articulate されている（誤検知率 > 30% / Reading Pass 人手負荷過大 / 既存 program 責務衝突 / valid + verified-zero finding ともに不能 / 他 program 進行影響）
- [x] inquiry/08 冒頭に「ADR-SCP-016 で採用済み」note + §5 verified-zero finding articulate
- [x] AI_CONTEXT.md の Read Order が Wave 構造を反映している
- [ ] Wave 1 着手 user 承認（次の PR で Phase 1 着手判断、本 commit の review window で確認）

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [ ] **総チェック**: 全 Wave 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合 + aag/CHANGELOG.md aagVersion 整合（本 program は app +0.0.0 / aag +0.1）

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase + AI 自己レビューがすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Wave の成果物 (commit / PR / 関連正本 / generated artifact) を user がレビューし、archive プロセスへの移行を承認する
