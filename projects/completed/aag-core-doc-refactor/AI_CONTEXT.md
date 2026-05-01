# AI_CONTEXT — aag-core-doc-refactor

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Core doc content refactoring + legacy retirement (`aag-core-doc-refactor`)

## Status

**active (2026-04-30 spawn、Project A bootstrap 完了)**。

- **2026-04-30 spawn**: 親 project (`projects/aag-bidirectional-integrity/`) の Phase 3 hard gate B 確定 (Project A〜D 分割) を受けて、**Phase 4 (AAG Core doc content refactoring) + Phase 5 (legacy 撤退)** を Project A として独立 spawn
- **依存関係**: Project A (本 project) → Project B (rule schema + meta-guard) → Project C (DFR registry + display guards) / Project A → Project D (legacy retirement 拡張版)
- **次工程**: Phase 1 着手 (新 path `references/01-principles/aag/` 配下に AAG Core doc を新規書き起こし、edit-in-place 禁止)

canonical 計画 doc は本 project の `plan.md`。親 project: `projects/aag-bidirectional-integrity/`。

## Purpose

AAG (Adaptive Architecture Governance) Core 8 doc + CLAUDE.md AAG セクションを **新規書き起こし優先 + 旧 doc archive** の段階パスで再構築する。
親 project の Phase 3 audit (`references/02-status/aag-doc-audit-report.md`) で derive された **5 層位置付け / 責務 / write/non-write list / drill-down pointer / 必要 operation** を入力に、§3.5 操作順序原則 (Create 先行 → Split / Merge / Rewrite 中段 → Rename / Relocate / Archive 後段) を適用。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 親 project の `projects/aag-bidirectional-integrity/plan.md` (元 Phase 4 + Phase 5 articulation の正本、5 層 × 5 縦スライス matrix)
6. `references/02-status/aag-doc-audit-report.md` (Phase 3 audit findings、本 project の入力)
7. `references/01-principles/aag/meta.md` + `aag/README.md` (Phase 1 で landing 済の AAG Meta charter)
8. `references/03-guides/project-checklist-governance.md` (本 project の運用ルール)

## Why this project exists

親 project (`aag-bidirectional-integrity`) の Phase 3 hard gate (= 「Phase 4〜10 を単一 project で継続するか分割するか」) で、**B (sub-project / follow-up project 分割) が確定** (AI 推奨 + ユーザー確認、2026-04-30):

- Phase 4 doc operation 22 件 + commit 15-20 件 = 単一 project で扱うには重い (Level 4 寄り)
- Phase 5 legacy 撤退 (旧 path archive + inbound 0 検証) も独立した責務
- 親 project の MVP scope は Phase 1 + Phase 3 + cyclic refinement で完遂、Phase 4〜10 は別 project に follow-up

本 project は **Phase 4 + Phase 5 のみに scope を絞った Level 3 project**。Project B (rule schema + meta-guard) / Project C (DFR registry) / Project D (拡張 legacy retirement) とは scope orthogonal。

## Scope

**含む**:
- AAG Core 8 doc の新規書き起こし (`references/01-principles/aag/` 配下: strategy / architecture / evolution / layer-map / source-of-truth / operational-classification 等)
- CLAUDE.md AAG セクションの薄化 (鉄則 quote + link 形式、§8.13 判断 = B 適用)
- 旧 doc の段階的 archive (inbound 0 検証 + §1.5 archive 前 mapping 義務)
- doc-registry.json / principles.json / manifest.json への新 doc 登録 + 旧 doc deprecation marker
- 親 project Phase 3 audit findings (`aag-doc-audit-report.md`) の operation 順序原則に従った段階実行

**含まない** (= nonGoals):
- BaseRule schema 拡張 (`SemanticTraceBinding<T>` 型 family 追加) → **Project B 所掌**
- AR-rule binding 記入 (canonicalDocRef + metaRequirementRefs の status flip) → **Project B 所掌**
- meta-guard 実装 (canonicalDocRefIntegrityGuard 等) → **Project B 所掌**
- DFR (Display-Focused Rule) registry 構築 → **Project C 所掌**
- 業務ロジック / domain calculation / app/src 配下のコード変更
- 親 project (`aag-bidirectional-integrity`) の archive プロセス自体 (Project A〜D bootstrap 完了後に親側で実施)

## 関連文書

| 文書 | 役割 |
|---|---|
| `projects/aag-bidirectional-integrity/plan.md` | 親 project の正本 (5 層 × 5 縦スライス matrix、Phase 4 + Phase 5 articulation の出元) |
| `references/02-status/aag-doc-audit-report.md` | Phase 3 audit findings (本 project の入力)、各 doc の 5 層位置付け / 責務 / operation 判定 |
| `references/01-principles/aag/meta.md` | AAG Meta charter (Phase 1 で landing 済、本 project が refer する目的 + 要件 + 達成判定総括) |
| `references/01-principles/aag/README.md` | aag/ ディレクトリ index (Phase 1 で landing 済) |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール (AAG Layer 4A System Operations) |
| `references/03-guides/projectization-policy.md` | AAG-COA 判定の根拠 (Level 3 articulation) |
| `references/03-guides/deferred-decision-pattern.md` | 途中判断 checklist の制度 doc (本 project でも適用) |
