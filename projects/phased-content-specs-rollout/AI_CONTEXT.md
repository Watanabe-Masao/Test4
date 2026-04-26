# AI_CONTEXT — phased-content-specs-rollout

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

Content Spec System 段階展開計画（phased-content-specs-rollout）

## Purpose

`references/05-contents/` 配下に立ち上がった Content Spec System (CSS / WSS) を、
**「初回スコープ外」を「順番を後にすること」として明記**する形で段階展開する。
SP-B Anchor Slice（Phase A）を起点に、SP-B 全体（B）→ ReadModels/Pipelines（C）
→ Domain Calculations（D）→ Charts（E）→ UI Components（F）→ Storybook 連携（G）
→ Architecture Health KPI（H）→ PR Impact Report（I）→ Claim Evidence Enforcement（J）
の 10 Phase で対象を拡張する。

本 project は **計画と完了条件の正本**を持つ。各 Phase の実装責務は依存
sub-project（SP-B 等）が担い、本 project は順序・依存・完了条件・evidence 紐付けを
governance する。

## Why this project exists

`projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` で
WSS の bootstrap が完了した後、初期版の rollout 計画は「45 widget の完成」を
ゴールに置いていた。しかし実際には:

- **全 UI component 登録 / 全 readModel 網羅 / 全 pipeline 網羅** などを「初回スコープ外」と
  断ずると、最終構想から消えてしまう
- 一方で初回 vertical slice に詰め込むと、Anchor Slice の保証経路が完成する前に
  対象拡大で重量化する
- **「やらないこと」ではなく「順番を後にすること」**として明記する仕組みが必要

本 project は、その順序を canonical 化する。各 Phase の対象・実施内容・完了条件・
依存を `plan.md` で固定し、`checklist.md` で実装の進捗を計測可能にする。
同時に、CLAUDE.md 不変原則「**「良くすること」は目的ではない。その先の到達点を
実現するために、要件を正しく理解した上で改善する（局所対応しない）**」を
WSS rollout に適用する。

## Scope

含む:

- Phase A〜J の順序・依存・完了条件の正本化（`plan.md`）
- Phase A（SP-B Anchor Slice）vertical slice の bootstrap 着手
  - 対象: WID-033 / WID-040 / WID-018 / WID-006 / WID-002
  - source/spec/guard/CI の保証経路完成
- Phase 別 checklist の登録（`checklist.md`）
- 依存 sub-project（SP-B / SP-C / SP-D 等）との completion 連動の明示
- references/05-contents/ への本 project 参照追加

含まない:

- SP-B 内 ADR-B-001〜004 の実装（umbrella `architecture-debt-recovery` の SP-B 責務）
- 新 Architecture Rule の active 化（umbrella inquiry/01a の Phase 6 量産で実装）
- 本体アプリ（粗利管理ツール）の機能変更
- WSS 以外の category（01-principles / 03-guides 等）への原則変更
- Phase B 以降の実装着手（依存 sub-project completed 後に Wave 化）

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase A〜J 構造）
4. `checklist.md`（completion 判定の入力 — Phase 別 required checkbox 集合）
5. `projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md`（WSS bootstrap 決定）
6. `references/05-contents/README.md`（CSS カテゴリ正本）
7. `references/05-contents/widgets/README.md`（widget catalog 正本 + 45 件 型番割当）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md` | SP-A〜D 依存関係（Phase A は SP-B Anchor Slice） |
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当 |
| umbrella: `projects/architecture-debt-recovery/` | SP-B 等の親 |
