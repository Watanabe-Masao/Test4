# plan — design-system-v2-1-asset

## 不可侵原則

1. **本体 `app/` 配下を変更しない** — 本 project は資産追加のみ。tokens.ts /
   theme.ts / semanticColors.ts / colorSystem.ts を触らない
2. **v2.0 を削除しない** — 過去の発送物として存続させる
3. **v2.0 命名を CSS 実変数として使わない** — `--color-*` / `--cat-*` の
   実変数使用禁止。ドキュメント内の説明的言及は可
4. **プロジェクト ID に dot を含めない** — AAG guard 制約

## Phase 構造

### Phase 1: 資産配置

49 ファイルを `references/04-design-system/` に配置し、
`references/README.md` + `docs/contracts/doc-registry.json` に登録する。
完了条件は全登録の反映と JSON 妥当性。

### Phase 2: 動作確認

preview/index.html + ui_kits/app/index.html を目視確認し、
`colors_and_type.css` が本体 tokens.ts + theme.ts と整合することを確認する。

### Phase 3: Documentation integrity

`docs:check` / `docs:generate` を PASS させ、`app/` 配下に意図しない変更が
無いことを確認する。

### 最終レビュー (人間承認)

全 Phase の成果物を人間がレビューし archive 移行を承認する。

## やってはいけないこと

- `app/src/presentation/theme/` の変更 → 本 project のスコープ外。別 project で扱う
- 新規 guard test の追加 → v2.1 配置自体は既存 guard で十分
- v2.0 resource の削除 → 過去の発送物を消すと履歴が失われる
- project ID / path での dot 使用 → projectCompletionConsistencyGuard の
  regex `[\w-]+` が dot を認識せず dead-link 判定される

## 関連実装

| パス | 役割 |
|---|---|
| `references/04-design-system/` | v2.1 資産配置先 (49 ファイル) |
| `references/04-design-system/docs/route-b-guide.md` | 詳細手順ガイド |
| `references/README.md` | 索引追加対象 |
| `docs/contracts/doc-registry.json` | design-system カテゴリ追加対象 |
