# HANDOFF — aag-structural-control-plane

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

Phase 0（ADR + Existing Asset Mapping）の bootstrap 直後。本 PR で 8 ファイル一式（AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / config/project.json）と inquiry/ 6 ファイル skeleton が landing。

decision-audit.md には DA-α-000（進行モデル）+ ADR-SCP-001〜009 が articulate 済（Lineage は仮 sha 段階、wrap-up commit で実 sha update 予定）。

`references/04-tracking/open-issues.md` の active projects 索引追加 + `cd app && npm run docs:generate` での project-health 反映 + `cd app && npm run test:guards` PASS 確認は本 commit / 後続 commit で実行。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を 1-2 段で要約する。

### 高優先（本 PR 内で完了）

- `references/04-tracking/open-issues.md` の active projects 索引に本 project 追加（atomic dependent update commit pattern §13.2）
- `cd app && npm run docs:generate` 実行 → project-health に `aag-structural-control-plane` が `derivedStatus = in_progress` で登録されることを確認（post-flip regen pattern §13.3）
- `cd app && npm run test:guards` PASS 確認（projectizationPolicyGuard / checklistFormatGuard / projectCompletionConsistencyGuard / projectDocStructureGuard 等）
- inquiry/01〜06 の skeleton 作成（中身は次セッション以降で articulate）

### 中優先（次セッション以降）

- inquiry/01: 既存 `docs/contracts/aag/*.schema.json`（10 schemas）の棚卸 + 本 program 新 schema との配置関係 articulate
- inquiry/02: 既存 YAML 4 件の 5 分類 articulate
- inquiry/03: doc-registry.json（138KB）構造確認 + additive 拡張ポイント articulate
- inquiry/04: self-check substrate drift（V6/V7 が internal 実装済だが command_selfcheck.go は V1〜V5 のみ articulate）の Finding 化
- inquiry/05: OBLIGATION_MAP / PATH_TO_REQUIRED_READS 構造確認 + Phase 8a 正規化比較器の必要要件 articulate
- inquiry/06: `references/99-archive/` の archive-manifest 有無確認 + ADR-SCP-008 例外条項の trigger 条件 articulate

### 低優先（Phase 0 完遂後 = user 承認後）

- Phase 1 Schema MVP 着手（5 schema 新設、Finding ID prefix `FND-` で grep 可能）
- 各 Phase の checkbox を checklist.md に追記（不可侵原則 9 = 順序逆行禁止 に従い、前 Phase 完了 + user 承認後にのみ articulate）

## 3. ハマりポイント

この project に着手するとき踏みやすい罠を列挙する。

### 3.1. reposteward-ai-ops-platform 不可侵原則 1（YAML 採用禁止）との scope 衝突

本 program は YAML を authoring source として使う。これは reposteward 不可侵原則 1（`projects/active/reposteward-ai-ops-platform/plan.md` L5）と表面上衝突する。

**回避**: ADR-SCP-001 で「reposteward 原則 1 = AAG Parameters / Capsule / SourceFacts / DetectorResult / generated artifact の narrow scope に限定」「本 program YAML = authoring source 層」と再定義済。reposteward 側で本 ADR を参照する narrow scope 再定義が articulate されるまでは、本 program の YAML 追加は **必ず ADR-SCP-001 を参照** すること。

### 3.2. self-check substrate drift（V6 / V7）

`aag-engine/internal/selfcheck/selfcheck.go` には V1〜V7 が実装されている（L7-15 doc / L61-67 Summary struct / L94-100 dispatch）が、`command_selfcheck.go` のコメント / Axis フィールドコメント（selfcheck.go L72）は V1〜V5 で止まっている。

これは Phase 0 inquiry/04 で **最初の Finding として記録** すべき drift。本 program で命名する Finding ID は `FND-SELFCHECK-AXIS-DRIFT-001` のような形式を想定（Phase 1 schema MVP で確定）。

ハマりポイント: drift を「直すべき」と判断して inquiry 段階で fix しない。Phase 0 では **記録のみ**、修正は別 program 候補（reposteward 内で対応するのが自然、本 program は AAG framework 内部実装に touch しない）。

### 3.3. doc-registry.json の additive 拡張で既存 generator が壊れるリスク

`docs/contracts/doc-registry.json` は 138KB の既存正本。kind / temporalScope / requiredSections を additive 追加すると、`references/04-tracking/recent-changes.generated.md` 系の既存 generator が未知 field を解釈できないと壊れる可能性がある。

**回避**: Phase 0 inquiry/03 で既存 generator の後方互換性（未知 field 無視）を確認してから Phase 5 で additive 拡張を実施する。

### 3.4. Phase 順序逆行（不可侵原則 9）

Schema-first / Inventory / Reading Pass / Shadow / Triage / Declaration / Ratchet / Gate の順序を守らないと、後段 Phase の入力が揃わず破綻する。

特に注意:

- Phase 1 Schema MVP 前に Phase 5 Document Contract Declaration を始めない
- Phase 2 Inventory 前に Phase 2.5 Reading Pass を始めない
- Phase 2.5 Reading Pass 前に Phase 3〜4 Shadow Check を始めない（Reading Pass 結果が shadow check の disposition 判定に必要）
- Phase 8a 完了前に Phase 8b（collector 切替）を始めない（正規化比較器で意味的差分 == 0 を確認してから切替）

### 3.5. 1 PR で複数 Phase / 複数 Finding group を混ぜない

§13.1 Phase landing + wrap-up 二段 commit pattern を全 Phase で適用。1 PR が肥大化すると rollback granularity が破綻する。

特に Phase 5（Document Contract Declaration + Rewrite/Move/Archive PRs）と Phase 8a/8b/8c（Obligation Migration）は **1 Finding group = 1 PR** を厳守（AAG-SCP-MIGRATION-005）。

### 3.6. Reading Pass 中に対象 doc を編集しない（AAG-SCP-MIGRATION-006）

Phase 2.5 で対象 zone 内の文書本体を編集すると、Reading Pass の判定対象が動的に変化し、reviewedAtSha が陳腐化する。

**例外**: frontmatter の docId 付与は reading entry 作成時に同時付与可。それ以外の本文編集は Phase 5 Finding group PR でのみ実施。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間の入口（why / scope / read order） |
| `plan.md` | 不可侵原則 + Phase 0〜10 構造 + やってはいけないこと |
| `checklist.md` | completion 判定の入力（Phase 0 のみ ticked-out） |
| `decision-audit.md` | DA-α-000 + ADR-SCP-001〜009 |
| `discovery-log.md` | scope 外発見の蓄積 inventory |
| `projectization.md` | AAG-COA 判定（Level 3 / governance-hardening / requiresHumanApproval=true） |
| `inquiry/01-existing-contract-assets.md` | 既存 `docs/contracts/aag/*.schema.json`（10 schemas）棚卸 |
| `inquiry/02-existing-yaml-inventory.md` | 既存 YAML 4 件の 5 分類 articulate |
| `inquiry/03-doc-registry-extension-strategy.md` | doc-registry.json additive 拡張ポイント articulate |
| `inquiry/04-self-check-substrate-sync.md` | self-check V6/V7 drift Finding 化 |
| `inquiry/05-obligation-migration-strategy.md` | OBLIGATION_MAP / PATH_TO_REQUIRED_READS 移行戦略 |
| `inquiry/06-temporal-scope-shadow-policy.md` | references/99-archive/ archive-manifest 有無確認 + 例外条項 trigger |
| `projects/active/reposteward-ai-ops-platform/AI_CONTEXT.md` | substrate 提供 program（消費関係） |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | Phase 8a/8b/8c で 3 段階 shadow migration 対象 |
| `docs/contracts/doc-registry.json` | Phase 5 で additive 拡張対象 |
