# AI_CONTEXT — aag-display-rule-registry

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

Display-Focused Rule registry + display rule guards (`aag-display-rule-registry`)

## Status

**active (2026-04-30 spawn、Project C bootstrap 完了)**。

- **2026-04-30 spawn**: 親 project (`projects/aag-bidirectional-integrity/`) の Phase 3 hard gate B 確定 (Project A〜D 分割) を受けて、**Phase 9 (DFR registry) + Phase 10 (DFR guards)** を Project C として独立 spawn
- **依存関係**: Project A (AAG Core doc refactor) → Project B (rule schema + meta-guard) → 本 project (DFR registry が SemanticTraceBinding を utilize、Phase 8 forward meta-guard で integrity 成立)
- **次工程**: Phase 1 着手は Project B Phase 8 meta-guard MVP 完了後 (循環 fail 防止、親 plan §5.2 Phase 順序関連)

canonical 計画 doc は本 project の `plan.md`。親 project: `projects/aag-bidirectional-integrity/`。

## Purpose

AAG (Adaptive Architecture Governance) **bidirectional integrity** の **最初の concrete instance** として、
display 領域 (chart semantic color / axis formatter / percent / currency / icon) に **DFR-NNN** rule registry を
構築し、Project B で実装される `SemanticTraceBinding<T>` schema + meta-guard 4 件を utilize する形で
forward / reverse 機械検証を成立させる。

主要 deliverable:
1. `references/01-principles/aag/display-rule-registry.md` 新設 (Layer 2 新規製本、DFR-001〜005 + 必要 rule)
2. DFR-001〜005 を `app-domain/gross-profit/rule-catalog/base-rules.ts` に登録 (`canonicalDocRef` + `metaRequirementRefs` を `SemanticTraceBinding<T>` 形式で記入)
3. `app/src/test/guards/displayRuleGuard.test.ts` 新設 (rule registry framework)
4. observed drift を baseline 化 (Phase 10 で ratchet-down 起点に)

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力）
5. 親 project の `projects/aag-bidirectional-integrity/plan.md` §Phase 9 / §Phase 10 (DFR registry 設計の正本)
6. 親 project の `projects/aag-bidirectional-integrity/plan.md` §3.10 (DFR を本 project に吸収する理由)
7. Project B (`projects/completed/aag-rule-schema-meta-guard/plan.md`) — 本 project の前提となる schema / meta-guard
8. Project A (`projects/completed/aag-core-doc-refactor/plan.md`) — `aag/` ディレクトリ整備の前提

## Why this project exists

親 project の Phase 3 hard gate (= 「Phase 4〜10 を単一 project で継続するか分割するか」) で、**B (sub-project / follow-up project 分割) が確定** (AI 推奨 + ユーザー確認、2026-04-30):

- Phase 9 + Phase 10 = **bidirectional integrity の最初の concrete instance** (DFR registry 構築 + 機械検証) で、scope orthogonal
- DFR は新規 rule であり、Phase 8 meta-guard の **forward 方向** を初日から強制適用できる
- Project B (rule schema + meta-guard) 完了後に本 project が発火することで、**循環 fail 防止** (親 plan §5.2 Phase 順序関連、Phase 9 を Phase 8 より先にやらない原則)

本 project は **DFR registry + display rule guards** に scope を絞った Level 2 project。Project A / B / D とは scope orthogonal。

## Scope

**含む**:
- `references/01-principles/aag/display-rule-registry.md` 新設 (Layer 2 新規製本)
  - DFR-001 chart semantic color
  - DFR-002 axis formatter via useAxisFormatter
  - DFR-003 percent via formatPercent
  - DFR-004 currency via formatCurrency (thousands separator 明文化)
  - DFR-005 icon via pageRegistry / emoji canonical
- DFR-001〜005 を `base-rules.ts` (BaseRule 物理正本) に rule entry として登録
- `app/src/test/guards/displayRuleGuard.test.ts` 新設 (rule registry framework)
- 各 DFR rule の baseline 確定 (観測済 drift = CHART-004 / 005、FactorDecomp / BudgetVsActual.builders、BudgetTrend / Seasonal の formatPercent drift を ratchet-down 起点に)
- `references/03-guides/content-and-voice.md` の "thousands-separator convention is not enforced" 記述更新
- doc-registry.json への registry 登録

**含まない** (= nonGoals):
- AAG Core doc content refactor (`aag/` 配下他 doc Create / Split / Rewrite) → **Project A 所掌**
- AR-rule schema 拡張 / `SemanticTraceBinding` 型 family 実装 / meta-guard 4 件実装 → **Project B 所掌**
- 複雑 legacy archive 案件 → **Project D 所掌**
- 業務ロジック / domain calculation / app/src 配下のコード変更 (display 関連は guards で機械検証のみ、code を直接編集しない)
- Phase 9 で識別された他 gap 候補のうち anti-bloat 違反のもの (新規 doc 制作の bloat 抑制、必要なものに限定)

## 関連文書

| 文書 | 役割 |
|---|---|
| `projects/aag-bidirectional-integrity/plan.md` | 親 project の正本 (§Phase 9 / §Phase 10 / §3.10 articulation の出元) |
| `projects/completed/aag-rule-schema-meta-guard/plan.md` | Project B 正本 (本 project の前提となる schema / meta-guard) |
| `projects/completed/aag-core-doc-refactor/plan.md` | Project A 正本 (`aag/` ディレクトリ整備の前提) |
| `references/01-principles/aag/meta.md` | AAG Meta charter (`metaRequirementRefs.refs[].requirementId` の供給元) |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | BaseRule 物理正本 (DFR rule 登録先) |
| `app/src/test/guards/displayRuleGuard.test.ts` | 本 project で新規実装 (rule registry framework) |
| `references/03-guides/content-and-voice.md` | content + voice convention (thousands-separator 記述更新対象) |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
