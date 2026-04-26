# AI_CONTEXT — phased-content-specs-rollout

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

Content Spec System 段階展開計画（phased-content-specs-rollout）— **active**

## Status

**active（2026-04-26 改訂、ACTIVE 昇格）** — canonical 計画 doc は本 project の `plan.md`。

## Purpose

`references/05-contents/` 配下に立ち上がった Content Spec System (CSS / WSS) を、
**状態管理レイヤーから運用制御システムへ昇華**させる独立 active project。

archived umbrella `architecture-debt-recovery` の inquiry/01a Phase 1 addendum で WSS
が bootstrap され、Phase 6 で 45 WID spec 本文が landed した。しかし、source ↔ spec の
**機械接続**（JSDoc 注入 / frontmatter generator / `AR-CONTENT-SPEC-*` rule active 化 /
co-change guard）は未着手。本 project はその機械接続を Phase A〜J で段階展開し、
さらに Operational Control System §1〜§11（Lifecycle / Promotion Gate / Drift Budget /
Evidence Level / PR Impact Report 等）を導入する。

## Why this project exists

**umbrella + 4 sub-project (SP-A/B/C/D) 全 archive 完遂 + 45 WID spec 本文 landed した
時点で、archived umbrella に新規 inquiry を追加できないため**、独立 active project
として spawn された。

旧版（2026-04-26 初版）は umbrella inquiry/22 として「SP-B Anchor Slice 起点 + SP-B/D
absorption 戦略」で起草されていた。しかし同日中に SP-B（2026-04-26）と SP-D（2026-04-26）
が archive され、umbrella も Phase 7 archive に進んだため、archived 配下の inquiry に
依存する設計が成立しなくなった。

本 project は inquiry/22 の content（Phase A〜J + Operational Control System §1〜§11）
を **post-archive 文脈に適合させて移管**し、archived sub-project SUMMARY との連携
（§5.7）として absorption 戦略を再定義した。

CLAUDE.md 不変原則「**「良くすること」は目的ではない。その先の到達点を実現するために、
要件を正しく理解した上で改善する（局所対応しない）**」を WSS rollout に適用する装置。

## Scope

含む:

- Phase A〜J + Operational Control System §1〜§11 の canonical 化（`plan.md`）
- Phase A（Anchor Slice 5 件: WID-002 / 006 / 018 / 033 / 040）の機械接続作業:
  - `tools/widget-specs/generate.mjs` の frontmatter generator 実装
  - source への `@widget-id WID-NNN` JSDoc 注入
  - 5 件 `AR-CONTENT-SPEC-*` rule の `architectureRules.ts` 登録 + active 化
  - `obligation-collector.ts` の `OBLIGATION_MAP` 拡張
  - co-change / freshness / owner guard の実装
  - `npm run content-specs:check` script + CI 接続
- Phase 別 checklist の登録（`checklist.md`）
- Phase B〜J の段階着手（依存 Phase 完遂後）

含まない:

- WID-NNN 本文の上書き（spec 本文は landed 済み、本 project は frontmatter 同期のみ）
- archived umbrella / archived sub-project の touch（immutable）
- 本体アプリ（粗利管理ツール）の機能変更
- WSS 以外の category（01-principles / 03-guides 等）への原則変更
- Phase A の対象拡大（Anchor Slice 5 件以外）
- Phase F 以降の全網羅（selection rule 必須）

## Read Order

1. 本ファイル（status / why this project exists）
2. `HANDOFF.md`（現在地 / 次にやること / ハマりポイント）
3. **`plan.md`**（canonical 計画 doc — Phase A〜J + Operational Control System §1〜§11）
4. `checklist.md`（completion 判定の入力 — Phase 別 required checkbox 集合）
5. `projectization.md`（AAG-COA 判定 Level 3 / governance-hardening）
6. `references/05-contents/README.md`（CSS カテゴリ正本）
7. `references/05-contents/widgets/README.md`（widget catalog 正本 + 45 件 型番割当）
8. `projects/completed/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md`（WSS bootstrap 決定 D1〜D8、archived）
9. archived sub-project SUMMARY（必要時参照）:
   - `projects/completed/widget-context-boundary/SUMMARY.md`（SP-A）
   - `projects/completed/widget-registry-simplification/SUMMARY.md`（SP-B）
   - `projects/completed/aag-temporal-governance-hardening/SUMMARY.md`（SP-D）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `projects/completed/architecture-debt-recovery/HANDOFF.md` | archived umbrella 完遂サマリ |
| `projects/completed/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `projects/completed/widget-registry-simplification/SUMMARY.md` | SP-B archive サマリ（registry 改修の主要設計決定） |
| `projects/completed/aag-temporal-governance-hardening/SUMMARY.md` | SP-D archive サマリ（AAG governance 強化） |
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当 + 全 45 spec 本文 |
| `app/src/test/architectureRules.ts` | Phase A で `AR-CONTENT-SPEC-*` 5 件を active 化 |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | Phase A で `OBLIGATION_MAP` に entry 追加 |
