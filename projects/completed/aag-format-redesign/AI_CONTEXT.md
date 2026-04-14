# AI_CONTEXT — aag-format-redesign

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG フォーマット改修とサブプロジェクト機能（aag-format-redesign）

## Purpose

現状 AAG（Adaptive Architecture Governance）の良い点を維持しつつ、
新規 project 立ち上げ・project 文書フォーマット・BaseRule + Overlay の
構造を additive に再設計する。同時に「サブプロジェクト機能」を導入し、
本筋 project から派生した独立トピックを文脈リンク付きで管理可能にする。

**互換性制約**: 既存 project（`pure-calculation-reorg` /
`unify-period-analysis` 等）は一切触らない。新フォーマットは現行と並行で
出し、既存 project の移行は本 project 完了後の別タスクとする。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 関連 references/
   - `references/01-principles/aag-5-constitution.md`
   - `references/01-principles/aag-5-source-of-truth-policy.md`
   - `references/01-principles/adaptive-architecture-governance.md`
   - `references/03-guides/governance-final-placement-plan.md`
   - `references/03-guides/architecture-rule-system.md`
   - `references/03-guides/project-checklist-governance.md`

## Why this project exists

直近の `unify-period-analysis` の bootstrap 作業で、現行 project 文書
フォーマット（`_template/`）と AAG overlay 体系の運用上の痛点が露呈した:

1. **新 project 立ち上げ時の overlay 全 140 ルール要件**: `executionOverlayGuard`
   が「base rules の全 rule に overlay がある」ことを要求するため、新 project
   は既存 project の overlay をフルコピーするしかなく、案件運用状態が混入する
2. **`_template/` の不足**: AI_CONTEXT / plan / checklist / HANDOFF だけでは
   実行可能な粒度に達せず、`pr-breakdown.md` / `review-checklist.md` /
   `acceptance-suite.md` / `test-plan.md` / `inventory/` 等を全部後付けで
   足す必要がある。これらを「足すべき場合の判断基準」も明文化されていない
3. **project 切替時の暗黙副作用**: `CURRENT_PROJECT.md` を切替えると
   resolver / vite alias / overlay 解決が同時に動くが、これらが暗黙で
   開始前チェックリストがない
4. **派生トピックの行き場がない**: 本筋 project から派生した「気付き」レベルの
   独立タスクを、本 project の checklist に混ぜることもできず、別 project と
   して立てるには重い。文脈リンクだけ残せる軽量な構造が欠けている

これらを 1 project にまとめて解決する。`unify-period-analysis` や
`pure-calculation-reorg` の scope に混ぜると軸が崩れるため、独立 project
として立ち上げる根拠
(`references/03-guides/project-checklist-governance.md` §0)。

## Scope

含む:
- 現行 AAG / project 文書体系の良い点・痛点棚卸し
- BaseRule + Overlay の初期化負荷を下げる仕組み（empty overlay 許容 / 継承 /
  defaults 等の設計検討）
- `_template/` の拡張（`pr-breakdown` / `acceptance-suite` / `test-plan` /
  `inventory` を「必要に応じて足す派生フォーマット」として明文化）
- 新 project bootstrap チェックリスト（resolver / vite / docs:generate /
  test:guards の起動順序を明示）
- **サブプロジェクト機能（P1 — 親子リンクのみ）**:
  - `config/project.json` に `parent: "<parent-project-id>"` フィールド追加
  - サブ project は通常 project と同じ構造、`parent` フィールドだけが違い
  - `project-health.json` への parent 表示（最小限）
  - 既存 project / collector への破壊的変更なし
- 既存 project 用の移行ガイド（実行は別タスク、ガイドのみ作成）

含まない:
- **既存 project（`pure-calculation-reorg` / `unify-period-analysis` 等）の
  ファイルへの変更**（互換性制約）
- 既存 project の新フォーマットへの移行作業（後続タスク）
- BaseRule の中身（`fixNow` / `executionPlan` 等の値）の見直し
- サブプロジェクト機能の P2（親子の進捗統合・blocking 依存等）
- AAG Layer 1〜3 の構造変更（人間 / CLAUDE.md / ROLE.md は触らない）
- 既存 guard / allowlist の閾値変更

## サブプロジェクト機能の方針（P1: 親子リンクのみ）

「親 project から派生した独立トピックを、文脈リンク付きで管理する」軽量機能。

- サブ project は通常 project と同じ構造（`AI_CONTEXT.md` / `plan.md` /
  `checklist.md` / `HANDOFF.md` / `config/project.json` / `aag/`）
- `config/project.json` に `parent: "<parent-project-id>"` フィールドが付くだけ
- サブ project の `AI_CONTEXT.md` Read Order に「親 project の AI_CONTEXT.md」を含める
- `project-health.json` collector に「parent 表示」だけを最小限追加
- 親 project 完了判定にサブ project は影響しない（blocking ではない）
- 親 project 側は何も変更しない（completely additive）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/01-principles/aag-5-constitution.md` | AAG 5 層モデルの定義 |
| `references/01-principles/aag-5-source-of-truth-policy.md` | 正本配置ポリシー |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 全体像 |
| `references/03-guides/governance-final-placement-plan.md` | BaseRule / Overlay / merge / facade 配置 |
| `references/03-guides/architecture-rule-system.md` | Architecture Rule の運用ガイド |
