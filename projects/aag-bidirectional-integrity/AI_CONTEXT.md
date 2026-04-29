# AI_CONTEXT — aag-bidirectional-integrity

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG 双方向 integrity meta-rule + 表示 rule 製本化（aag-bidirectional-integrity） — **active**

## Status

**active（2026-04-29 spawn、plan のみ landing）** — 実 execution は次セッション以降。
canonical 計画 doc は本 project の `plan.md`。parent: なし（`phased-content-specs-rollout`
末セッションの dialog で発見された問題への根本対策として独立 spawn）。

## Purpose

AAG (Adaptive Architecture Governance) は「機械的品質管理を担う OS / フレームワーク」と
位置付けられているが、現状 AAG rule (AR-NNN) と canonical doc (製本) の binding が
**慣習レベルで運用されている** ため、次の構造的弱点を持つ:

- **forward 方向の弱点**: canonical doc (製本) で定義された rule が AAG で機械検証されず、製本が「装飾」になる
- **reverse 方向の弱点**: AAG rule が製本されていない proxy / 派生 metric を回し、guard が「performative」になる

`phased-content-specs-rollout` の末セッションで撤回した次のケースは、いずれも reverse 方向の
弱点が表面化した事例:

- visual evidence selection rule (consumer 数 / 365d commits / severity color / optionBuilder) — 製本されていない proxy metric を guard 化していた
- Phase L spawn (PIPE / QH / PROJ) — spec 化されるべき drift / risk が validate されていない状態で spec authoring を guard 化しようとしていた

本 project は AAG core 自体に **forward + reverse 双方向 integrity** の meta-rule を確立する。
display-rule registry (DFR-NNN) は本 meta-rule の最初の concrete application として
本 project に吸収する（dialog で発見された CHART-004 semantic.customers 不使用 / CHART-005
semantic.grossProfit 不使用 / FactorDecomp 等の axis formatter bypass / formatPercent
bypass の実 drift を、製本ベースで構造的に検出する）。

## Why this project exists

`phased-content-specs-rollout` の末セッション dialog で発見された **AAG の構造的弱点**
は、phased-content-specs-rollout の scope（content spec rollout）には収まらない AAG core
の進化テーマであるため独立 active project として spawn。

CLAUDE.md の AAG セクション「**AAG が PASS した後に立ち上がる問い**」が想定する critical
thinking は人間の能動的姿勢に依存しており、構造的に保証されていない。本 project はこの
不足を mechanism として解消する。

## Scope

含む:

- 双方向 integrity meta-rule の AAG core 文書化（`adaptive-architecture-governance.md` 拡張）
- AAG rule metadata に `canonicalDocRef: string[]` field 追加（`architectureRules/defaults.ts` schema 拡張）
- 既存 AR-NNN rule 全数の audit（製本されているか / されていないか）+ binding 整備
- Layer 2 既存 canonical doc 群への back link section 追加（重複管理防止）
- forward / reverse 双方向 meta-guard の実装
- display-rule registry (`display-rule-registry.md`) の製本化と DFR-001〜DFR-005 の登録
- 各 DFR rule の guard 実装と baseline 確定（観測済 drift を ratchet-down 起点に）

含まない:

- 既存 AR-NNN rule の振る舞い変更（audit + binding のみ、enforcement logic 変更は別 project）
- 全 100+ AR-NNN rule の即座 100% 製本化（漸次対応、新 rule のみ即時必須）
- 本体アプリ（粗利管理ツール）の機能変更
- `phased-content-specs-rollout` の archive 判定への干渉（parent は独立に archive process を進める）
- AAG framework そのものの構造変更（4 層 → N 層 等は別 project）

## Read Order

1. 本ファイル（why / scope / read order）
2. `HANDOFF.md`（現在地 / 次にやること / ハマりポイント）
3. **`plan.md`**（canonical 計画 doc — Phase 1〜7）
4. `checklist.md`（completion 判定の入力 — Phase 別 required checkbox 集合）
5. `projectization.md`（AAG-COA 判定 Level 3 / governance-hardening）
6. **`references/01-principles/adaptive-architecture-governance.md`**（AAG core 正本、本 project が拡張）
7. **`references/01-principles/adaptive-governance-evolution.md`**（AAG 進化方針、本 project の動線確認）
8. `projects/phased-content-specs-rollout/HANDOFF.md`（parent dialog の経緯、本 project spawn の trigger）
9. `references/04-design-system/docs/`（DFR rule の Layer 2 製本群）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/01-principles/adaptive-architecture-governance.md` | AAG core 正本（本 project が双方向 integrity 章を追加） |
| `references/01-principles/adaptive-governance-evolution.md` | AAG 進化方針 |
| `projects/phased-content-specs-rollout/HANDOFF.md` | parent dialog の経緯、本 project spawn の trigger |
| `references/04-design-system/docs/chart-semantic-colors.md` | DFR-001 (色) の Layer 2 製本 |
| `references/04-design-system/docs/echarts-integration.md` | DFR-002 (axis) の Layer 2 製本 |
| `references/03-guides/coding-conventions.md` §数値表示ルール | DFR-003/004 (% / 通貨) の Layer 2 製本 |
| `references/04-design-system/docs/iconography.md` | DFR-005 (icon) の Layer 2 製本 |
| `app/src/test/architectureRules/defaults.ts` | AAG rule metadata（本 project で `canonicalDocRef` field 追加） |
| `app/src/test/guardCategoryMap.ts` | AAG rule category / layer / note |
