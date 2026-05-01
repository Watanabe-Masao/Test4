# HANDOFF — aag-display-rule-registry

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Bootstrap 完了 (2026-04-30、Project C spawn)**。

親 project (`projects/aag-bidirectional-integrity/`) の Phase 3 hard gate B 確定 (= Project A〜D 分割) を
受けて、**Phase 9 (DFR registry) + Phase 10 (DFR guards)** を本 project に独立 spawn。

| 項目 | 状態 |
|---|---|
| project bootstrap (skeleton 5 doc) | ✅ 完了 (本 commit) |
| 親 project MVP scope | ✅ 完遂 |
| 親 project Phase 3 hard gate | ✅ B 確定 |
| Project A bootstrap | ✅ 完了 |
| Project B bootstrap | ✅ 完了 |
| 本 project Phase 1 (DFR registry doc) | ⏳ 未着手 (Project B Phase 4 完了後に着手、循環 fail 防止) |
| 本 project Phase 3 (displayRuleGuard) | ⏳ 未着手 |

### 親 project からの継承事項

本 project は親 plan §Phase 9 + §Phase 10 + §3.10 (DFR を本 project に吸収する理由) を継承。
詳細概念定義は親 plan を正本。

入力 doc:
- `projects/aag-bidirectional-integrity/plan.md` §Phase 9 / §Phase 10 / §3.10 (DFR registry 設計の正本)
- `projects/completed/aag-rule-schema-meta-guard/plan.md` (Project B 正本、本 project の前提となる schema / meta-guard)
- `projects/completed/aag-core-doc-refactor/plan.md` (Project A 正本、`aag/` 階層整備の前提)

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先 (Phase 1 = DFR registry doc 制作、Project B Phase 4 完了後)

- `references/01-principles/aag/display-rule-registry.md` 新設 (Layer 2 新規製本)
- DFR-001〜005 の rule entry を articulate (Layer 1 source link + Layer 2 doc link + bypass pattern + 適用 path + migrationRecipe + metaRequirementRefs)
- `content-and-voice.md` の thousands-separator 記述更新
- doc-registry.json への registry 登録

### 中優先 (Phase 2 = DFR-NNN を base-rules.ts に登録)

- DFR-001〜005 を `app-domain/gross-profit/rule-catalog/base-rules.ts` の `ARCHITECTURE_RULES` に rule entry 追加
- 各 rule に `canonicalDocRef` + `metaRequirementRefs` を `'bound'` status で記入 (Project B Phase 1 で実装される型を utilize)
- 各 rule の baseline 設定 (observed drift を baseline 化、ratchet-down 起点)

### 低優先 (Phase 3-4 = displayRuleGuard + meta.md update)

- `displayRuleGuard.test.ts` 新規実装 (rule registry framework)
- aag/meta.md §2 / §4 の達成判定 status flip (Project B Phase 4 完了 + 本 project Phase 3 完了 = bidirectional integrity の最初の concrete instance 成立)

## 3. ハマりポイント

### 3.1. Phase 順序遵守 — 循環 fail 防止 (絶対原則)

本 project Phase 1 (DFR registry doc 制作) は **Project B Phase 4 (meta-guard MVP) 完了後** にのみ着手。
Phase 8 meta-guard が registry を hard fail させる循環を防ぐため (親 plan §5.2 / 本 project plan 不可侵原則 1)。

### 3.2. observed drift = baseline、即時 0 化禁止

CHART-004 / 005 / FactorDecomp / BudgetVsActual.builders / BudgetTrend / Seasonal の現在 drift は
**baseline** に articulate。即時 0 化を試みず、ratchet-down で漸次対応 (親 plan #10、本 project plan
不可侵原則 2)。即時 0 化を試みると Phase 3 で displayRuleGuard が hard fail し、本 project が完遂不能。

### 3.3. anti-bloat = 必要なものに限定

Phase 9 で識別された gap 候補のうち、新規 doc 制作の bloat が発生する候補は本 project に含めない。
DFR-001〜005 + 親 plan §Phase 9 articulation の必要 rule に限定 (本 project plan 不可侵原則 3)。

### 3.4. 二重正本回避 — defaults.ts / guardCategoryMap.ts に touch しない

DFR rule の登録先は `base-rules.ts` のみ。`defaults.ts` (execution overlay) と `guardCategoryMap.ts` には
semantic binding を持たせない (本 project plan 不可侵原則 4、Project B 不可侵原則 1 と同一)。category
補助のみ必要なら `guardCategoryMap.ts` に entry 追加可。

### 3.5. forward direction の即時適用

DFR は新規 rule であり、Phase 8 meta-guard (`canonicalDocRefIntegrityGuard`) の forward 方向を初日から
強制適用できる。Phase 9 で landing する各 rule は `canonicalDocRef.refs[].docPath` が
`aag/display-rule-registry.md` を指す状態で landing (本 project plan 不可侵原則 5)。

### 3.6. Project B 未完了で着手しない

本 project は Project B (Phase 1〜4 完了 = SemanticTraceBinding 型 family + 166 rule initial value +
meta-guard 4 件) を utilize する設計。Project B 未完了の段階で本 project を進めると schema 不整合 +
meta-guard 未 PASS で hard fail (本 project plan 不可侵原則 7)。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `projects/aag-bidirectional-integrity/plan.md` | 親 project の正本 (§Phase 9 / §Phase 10 / §3.10) |
| `projects/completed/aag-rule-schema-meta-guard/plan.md` | Project B 正本 (本 project の前提) |
| `projects/completed/aag-core-doc-refactor/plan.md` | Project A 正本 (`aag/` 階層整備の前提) |
| `references/01-principles/aag/meta.md` | AAG Meta charter (Phase 4 で §2 / §4 status flip) |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | BaseRule 物理正本 (Phase 2 で DFR-001〜005 登録) |
| `app/src/test/guards/displayRuleGuard.test.ts` | Phase 3 で新規実装 |
| `references/03-guides/content-and-voice.md` | content + voice convention (Phase 1 で thousands-separator 更新) |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
