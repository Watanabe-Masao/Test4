# HANDOFF — design-system-v2-1-asset

> 役割: 起点文書。後任者が最初に読む。
> 本 project は **資産追加のみ** のスコープで、本体コードには一切変更を入れない。

## 1. 現在地

Shiire-Arari Design System v2.1 (本体 `app/src/presentation/theme/` の
外部 documentation layer) を `references/04-design-system/` に正本として配置する
project。 v2.1 は v2.0 を全面書き直したもの。 v2.0 は本体実装を確認せずに書かれた
提案書で、前提の一部が現実と違っていた (詳細は
`references/04-design-system/docs/v2-to-v2.1-changes.md`)。

本 PR 時点で 49 ファイル (README / SKILL / docs / preview / ui_kits / assets /
colors_and_type.css / components.css) を `references/04-design-system/` に配置し、
`references/README.md` の目次と `docs/contracts/doc-registry.json` にも登録する。

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先

- 配置後のプレビュー (`references/04-design-system/preview/index.html`) を
  ブラウザで開き全ページ描画・ダーク/ライト切替を目視確認する
- `colors_and_type.css` の値が本体 `tokens.ts` + `theme.ts` と整合することを確認する

### 中優先

- `docs:check` を実行し generated section に差分が出ないことを確認する
- `references/` 配下の既存ファイルに意図しない変更が入っていないことを確認する

### 低優先

- 後続 project (ある場合) で本体 `presentation/theme/` への反映・
  styled-components consumer 書き換えを扱う

## 3. ハマりポイント

### 3.1. 本体 theme ファイルを触らない

本 project のスコープは **資産追加のみ** である。以下は **対象外**:

- `app/src/presentation/theme/` (tokens.ts / theme.ts / semanticColors.ts /
  colorSystem.ts) の変更
- styled-components consumer の書き換え
- 新規 guard test 追加
- 本体 UI の見た目変更

v2.0 時代の経路 A (tokens.ts への 5 段階 PR) は **不要** になった。v2.1 時点で
本体は既に同等の構造 (semanticColors + categoryGradients + colorSystem) を備えて
いるため、v2.1 は本体に反映するのではなく外部 documentation として位置づけ直す。

### 3.2. v2.0 命名 (`--color-*` / `--cat-*`) を残さない

v2.0 の CSS 変数命名 (`--color-brand-primary` / `--cat-a` 等) は v2.1 で
廃止済み。 `colors_and_type.css` / `components.css` は v2.1 命名のみを使うこと。
ドキュメント (`v2-to-v2.1-changes.md` 等) 内での **言及** は正当な用途として残る。

### 3.3. v2.0 の資産は削除しない

v2.0 は過去の発送物として存続してよい。本 PR では削除しない。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `references/04-design-system/README.md` | DS v2.1 正本 |
| `references/04-design-system/docs/v2-to-v2.1-changes.md` | v2.0 → v2.1 変更点 |
| `references/04-design-system/docs/route-b-guide.md` | 配置手順 + PR 本文テンプレート |
| `checklist.md` | 完了判定の入力 |
