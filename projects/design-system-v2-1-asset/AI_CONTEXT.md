# AI_CONTEXT — design-system-v2-1-asset

> 役割: project 意味空間の入口 (why / scope / read order)。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

Design System v2.1 外部 documentation layer 配置 (design-system-v2-1-asset)

## Purpose

Shiire-Arari Design System v2.1 を Test4 リポジトリに正本として保管する。
v2.1 は本体 `app/src/presentation/theme/` (tokens.ts + theme.ts +
semanticColors.ts + colorSystem.ts) の **外部 documentation layer** として
位置づけられる。本体コードには一切影響しない。

v2.1 は v2.0 を全面書き直したもの。v2.0 は本体実装を確認せずに書かれた
提案書で、前提の一部が現実と違っていた。v2.1 で立場を逆転させ、本体実装を
正として外部から説明する形に書き直した。

## Scope

### 対象

- `references/04-design-system/` に 49 ファイルを配置
- `references/README.md` に索引を追加
- `docs/contracts/doc-registry.json` に `design-system` カテゴリを追加

### 対象外

- `app/src/presentation/theme/` の変更
- styled-components consumer の書き換え
- 新規 guard test 追加
- 本体 UI の見た目変更

v2.0 時代の経路 A (tokens.ts への 5 段階 PR) は **不要** になった。本体は
既に v2 相当の構造を備えているため、v2.1 は本体反映ではなく外部
documentation として位置づけ直す。

## Read Order

1. 本ファイル (AI_CONTEXT.md) — project の意味空間
2. `HANDOFF.md` — 現在地と次の作業
3. `plan.md` — 不可侵原則と phase 構造
4. `checklist.md` — 完了判定の checkbox 集合
5. 必要に応じて `references/04-design-system/docs/route-b-guide.md` — 詳細な手順ガイド

## Required References

| 文書 | 役割 |
|---|---|
| `references/04-design-system/README.md` | DS v2.1 正本 |
| `references/04-design-system/docs/v2-to-v2.1-changes.md` | v2.0 → v2.1 変更点 |
| `references/04-design-system/docs/route-b-guide.md` | 配置手順 + PR 本文テンプレート |
| `references/03-guides/project-checklist-governance.md` | projects/ 運用ルール正本 |

## Constraints

- 本体 `app/` 配下は変更しない (資産追加のみ)
- v2.0 を削除しない (過去の発送物として存続)
- v2.0 命名 (`--color-*` / `--cat-*`) を CSS 実変数としては使わない。
  ドキュメント内の説明的言及は正当な用途として許容する
- プロジェクト ID には dot を含めない。
  `projects/*` 配下は `[a-z0-9-]+` のみ許容 (projectCompletionConsistencyGuard
  の regex 制約)。リポジトリ branch 名 `feat/design-system-v2.1-asset` とは別物
