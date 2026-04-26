# AI_CONTEXT — phased-content-specs-rollout

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

Content Spec System 段階展開計画（phased-content-specs-rollout）— **SHELL MODE**

## Status

**SHELL（promotion 待ち）** — 2026-04-26 降格。canonical な Phase A〜J 計画 +
SP-B absorption 戦略 + 最終方針 5 つは umbrella
`projects/architecture-debt-recovery/inquiry/22-content-state-layer-promotion-plan.md`
を参照する。本 project は Phase C 以降が単一 PR で済まないと判明した段階で
ACTIVE 昇格する placeholder。

## Purpose

`references/05-contents/` 配下に立ち上がった Content Spec System (CSS / WSS) を、
SP-B Anchor Slice（Phase A）を起点に Phase A〜J で段階展開する計画を保持する
**SHELL project**。

**初版方針（2026-04-26 spawn）**: 独立 sub-project として Phase A〜J を governance
する Level 2 docs-only project。

**course correction（同日）**: umbrella `plan.md` §3 不可侵原則 #16「Phase 4/5 計画を
経由せずに sub-project を立ち上げない」遵守 + 軽量起動の原則に従い、SHELL モードに
降格。canonical な計画 doc は umbrella inquiry/22 に移管。

## Why this project exists in SHELL mode

**Phase B 以降を放棄しないこと**を構造的に保証するため。

`inquiry/01a-widget-specs-bootstrap.md` で WSS bootstrap が完了した後、
初期版の rollout 計画は「45 widget の完成」をゴールに置いていた。しかし:

- **全 UI component 登録 / 全 readModel 網羅 / 全 pipeline 網羅** などを「初回スコープ外」と
  断ずると、最終構想から消えてしまう
- 一方で初回 vertical slice に詰め込むと、Anchor Slice の保証経路が完成する前に
  対象拡大で重量化する
- **「やらないこと」ではなく「順番を後にすること」**として明記する仕組みが必要

inquiry/22 がこの順序を canonical 化し、SP-B が absorb する。本 project は
inquiry/22 が `inquiry/18a-content-state-layer-promotion.md` にエスカレートされた
ときの **promotion target shell**。

CLAUDE.md 不変原則「**「良くすること」は目的ではない。その先の到達点を実現するために、
要件を正しく理解した上で改善する（局所対応しない）**」を WSS rollout に適用する装置。

## Scope（SHELL mode）

含む:

- 本 project の SHELL 状態維持（HANDOFF / AI_CONTEXT / projectization の整合）
- promotion trigger 発火時の ACTIVE 昇格手続き準備

含まない:

- **Phase A〜J の canonical 計画**（→ umbrella inquiry/22）
- **Phase A/B の実装**（→ SP-B widget-registry-simplification の plan/checklist で absorb）
- **Phase C 以降の実装判断**（→ inquiry/22 §「段階 2」の軽量パス / 重量パス判定）
- 本体アプリ（粗利管理ツール）の機能変更
- WSS 以外の category（01-principles / 03-guides 等）への原則変更

## Read Order

1. 本ファイル（status / SHELL の根拠）
2. `HANDOFF.md`（現在地 / promotion trigger）
3. **`projects/architecture-debt-recovery/inquiry/22-content-state-layer-promotion-plan.md`**（canonical 計画 doc）
4. `plan.md` / `checklist.md`（promotion 時の参考骨格、canonical ではない）
5. `projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md`（WSS bootstrap 決定）
6. `references/05-contents/README.md`（CSS カテゴリ正本）
7. `references/05-contents/widgets/README.md`（widget catalog 正本 + 45 件 型番割当）

## 関連文書

| 文書 | 役割 |
|---|---|
| **`projects/architecture-debt-recovery/inquiry/22-content-state-layer-promotion-plan.md`** | **canonical 計画 doc（Phase A〜J + SP-B absorption + 最終方針）** |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md` | SP-A〜D 依存関係（Phase A は SP-B Anchor Slice） |
| umbrella `HANDOFF.md` | Wave 2 spawn 高優先（SP-B 起動条件解除済み）|
| `projects/completed/widget-context-boundary/SUMMARY.md` | SP-A archive 完了（2026-04-25） |
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当 |
| umbrella: `projects/architecture-debt-recovery/` | SP-B 等の親 |
