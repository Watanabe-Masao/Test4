# AI_CONTEXT — &lt;PROJECT-ID&gt;

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

> **テンプレートの使い方:**
> 1. `projects/_template/` を `projects/<新 project id>/` にコピーする
> 2. 各ファイルの `<PROJECT-ID>` / `<TITLE>` / `<...>` プレースホルダを実値で置換する
> 3. `references/03-guides/project-checklist-governance.md` §10 (新規 project bootstrap) に従う
> 4. `cd app && npm run docs:generate` を実行し、project-health に新 project が現れることを確認する
> 5. 本コメントブロックを削除する

## Project

&lt;TITLE&gt;（&lt;PROJECT-ID&gt;）

## Purpose

&lt;この project が何を達成するかを 2-3 文で記述。スコープと非スコープを明確にする。&gt;

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 必要に応じて関連 references/ ドキュメント

## Why this project exists

&lt;なぜ独立した project として立ち上げるのか。既存 project と scope が
混ざらない理由。複数の動線・コンテキストを混ぜない原則
(`references/03-guides/project-checklist-governance.md` §0) の根拠。&gt;

## Scope

含む:
- &lt;含む scope の項目&gt;

含まない:
- &lt;含まない scope（別 project の所掌）&gt;

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| &lt;関連 reference 文書&gt; | &lt;役割&gt; |
