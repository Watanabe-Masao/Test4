# plan — aag-disposition-execution

> 親 umbrella: `projects/active/aag-governance-ratchet-down/` (= Sub-3)
> 親 program: `projects/completed/aag-structural-control-plane/` (= Wave 2 Reading Pass で 398
> docs articulate、19 件 disposition は本 Sub-3 で実 execution)

## 不可侵原則

1. **disposition は reading-decisions.yaml articulate 済 19 件のみ** — 新 disposition 追加禁止
   (= aag-scp Reading Pass scope 外)。新 entry が必要なら別 Reading Pass batch で再 articulate。
2. **inbound 全件 update してから commit** — 各 file movement は inbound reference 多数。
   grep ベースで全 inbound を network of update し、漏れがあれば doc-registry / reference-link-existence
   guard が hard fail で検出。
3. **archive は archive frontmatter 装着必須** — 99-archive/ への移動は単純な git mv ではなく
   `[ARCHIVED]` title prefix + Archived/Migrated From/Rationale metadata block を装着
   (= aag-scp Wave 2 で articulate 済 pattern、Sub-PR 1 で実装)。

## Phase 構造

### Phase 1: archive 3 件 group execution

最 atomic な disposition group (= references/99-archive/ への移動 + frontmatter 装着)。
- aag-doc-audit-report.md → references/99-archive/
- authoritative-term-sweep.md → references/99-archive/
- .claude/plans/next-session-plan.md → .claude/plans/archive/2026-04-09-session-report.md (= rename 込み)

各 file に [ARCHIVED] header + 3-line metadata block 装着、reading-decisions の path 更新。

### Phase 2: move 11 件 (promotion-readiness) batch execution

promotion-readiness-* docs (= 11 件) を references/04-tracking/ から projects/active/pure-calculation-reorg/phase-8/readiness/ へ batch move。

副次効果として pure-calc-reorg overlay の reviewPolicy.lastReviewedAt を bump (= 4 件 overdue
unblock、minimal scope crossover)。

### Phase 3: move 1 件 (ar-rule-audit) + 18 inbound updates

ar-rule-audit.md (= AR-rule binding 品質基準 protocol) を 04-tracking/ → 03-implementation/ar-rule-binding-protocol.md。
inbound 18 件 update:
- 5 guard tests の `@see` comments
- aag/_internal/display-rule-registry.md
- docs/contracts/doc-registry.json
- docs/contracts/principles.json (= 5 occurrences の historical references)
- docs/contracts/src/docs/{document-reading-decisions, document-failure-taxonomy}.yaml
- references/README.md
- generated artifacts (regen 経由で自動 update)

### Phase 4: split 3 件 execution

旧 3 docs は責務複合 (= definitions / state / TODO 混在)。各 doc を rewrite:
- engine-maturity-matrix.md → stable definitions のみ保持 (Aggregate Boundary + Bridge Infrastructure 含む)
- engine-promotion-matrix.md → current state summary + 更新ルール のみ保持
- features-migration-status.md → 完遂記録 + Widget Ownership は code 正本 pointer

### Phase 5: generated-register 1 件

architecture-state-snapshot.md (= producer は test code) を `.generated.md` suffix に rename:
- producer (architectureStateAudit.test.ts L414) の write target update
- orphan plain .md 削除
- inbound (doc-registry / reading-decisions) path 整合

## やってはいけないこと

- 新 disposition 追加 → aag-scp Reading Pass scope 外、別 batch で articulate が必要
- file movement なしの disposition update → reading-decisions の path が articulate と実 location 不整合
- inbound update を 1 commit に巻き込みすぎる → review 困難 + revert 困難 (= disposition group 単位で sub-PR 分割)
- archive frontmatter 省略 → immutability 不明確 + audit 困難
- generated 1 件で producer 不明な rename → archive 後の regen で巻き戻る

## 関連実装

| パス | 役割 |
|---|---|
| `docs/contracts/src/docs/document-reading-decisions.yaml` | 19 件 disposition の articulate 正本 |
| `docs/contracts/doc-registry.json` | canonical-doc registry (= path 整合 hard fail) |
| `references/README.md` | references/ 配下 index (= docRegistryGuard 検証対象) |
| `tools/governance/build-markdown-inventory.mjs` 他 | generated artifact 経路 |
| `references/04-tracking/generated/document-universe.generated.md` | generated report |
