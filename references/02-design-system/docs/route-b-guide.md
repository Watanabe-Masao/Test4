# Route B — `references/02-design-system/` への配置手順

v2.1 を Test4 リポジトリに保管する唯一の手順。v2.0 の経路 A
（tokens.ts への 5 段階 PR）は不要になったため、本書が唯一の適用経路です。

対象リポジトリ: `github.com/Watanabe-Masao/Test4`
想定ブランチ名: `feat/design-system-v2.1-asset`

> **注記 (2026-04-20)**: 本 doc は DS v2.1 配置当時の手順記録。実行済み
> project は `projects/completed/design-system-v2-1-asset/` に archive 済み。
> 以降の path 参照は歴史的記録であり、live な active project ではない。

---

## 配置先

AAG 運用（正本は `references/` に集約）に従い、以下に配置します:

```
Test4/references/
├── 01-principles/
├── 02-status/
├── 03-guides/
└── 04-design-system/       ← 追加 (v2.1)
    ├── README.md
    ├── SKILL.md
    ├── colors_and_type.css
    ├── components.css
    ├── assets/logo.svg
    ├── docs/                (9 files)
    ├── preview/             (23 files)
    └── ui_kits/app/         (11 files)
```

---

## AAG プロジェクト登録

### `projects/completed/design-system-v2-1-asset/` を新設

```
projects/completed/design-system-v2-1-asset/
├── HANDOFF.md
└── checklist.md
```

### HANDOFF.md

```markdown
# Design System v2.1 — HANDOFF

## 目的

Design System v2.1 (Test4 本体実装の外部 documentation) を
`references/02-design-system/` 以下に正本として保管する。

v2.1 は v2.0 を全面書き直したもの。v2.0 は本体実装を確認せずに書かれた
提案書で、前提の一部が現実と違っていた。詳細は `docs/v2-to-v2.1-changes.md`。

## スコープ

本件は **資産追加のみ**。以下は対象外:

- `app/src/presentation/theme/` の変更
- styled-components consumer の書き換え
- 新規 guard test 追加
- 本体 UI の見た目変更

## 成果物

- `references/02-design-system/` 新設 (44 ファイル)
- `references/README.md` 末尾に索引追記
- `docs/contracts/doc-registry.json` に design-system カテゴリ追加

## 非目的

- WASM crate 変更
- 本体 theme ファイルのリファクタ
- v2.0 の削除 (v2.0 は過去の発送物として存続してよい。別場所に保管するなら
  `projects/completed/design-system-v2.0/` 等)

## 関連

- 廃止 project: 経路 A 用に用意していた `design-system-v2-sync` は作らない
  (DS v2.1 では本体への反映提案を行わないため)
```

### checklist.md

```markdown
# checklist — design-system-v2-1-asset

## Phase 1 — 資産配置

- [ ] references/02-design-system/ ディレクトリ作成
- [ ] 44 ファイルを配置 (ZIP 展開内容をそのまま)
- [ ] references/README.md の目次に "04-design-system" を追記
- [ ] docs/contracts/doc-registry.json に design-system カテゴリ追加
- [ ] doc-registry.json の "$comment" に履歴追記

## Phase 2 — 動作確認

- [ ] preview/index.html をローカルサーバ (python3 -m http.server) で開き、
      左ナビから全プレビューページが正しく表示されることを確認
- [ ] ダーク/ライト切替が全プレビューに波及することを確認
- [ ] ui_kits/app/index.html のクリックスルーが本体見た目と一致することを
      確認
- [ ] colors_and_type.css の値が tokens.ts と theme.ts に一対一で整合して
      いることを目視チェック (docs/tokens.md の対応表を参照)

## Phase 3 — Documentation integrity

- [ ] docs:check (既存 fast-gate 相当) が PASS
- [ ] docs:generate を実行して derived section が壊れないことを確認
- [ ] 既存 references 配下のファイルを grep で触っていないことを確認

## 最終レビュー (user 承認)

- [ ] AAG Core boundary policy に沿った配置か確認
- [ ] v2.0 の記述が残っている他 PR/project と衝突していないか確認
- [ ] commit メッセージが Conventional Commits に従うか確認
- [ ] user 承認を得て merge
```

---

## 配置コマンド

ZIP 展開先を `$DS_SRC` に、Test4 リポジトリのルートで実行:

```bash
# 1. ZIP 展開先のパスを設定
DS_SRC=~/Downloads/Shiire-Arari_Design_System_v2_1

# 2. ブランチ作成
git checkout -b feat/design-system-v2.1-asset

# 3. 配置先作成
mkdir -p references/04-design-system

# 4. 資産コピー
cp -r "$DS_SRC"/* references/02-design-system/

# 5. AAG プロジェクト登録
mkdir -p projects/completed/design-system-v2-1-asset
# HANDOFF.md / checklist.md は上記の通り作成

# 6. 確認
ls references/02-design-system/
# → README.md SKILL.md assets/ colors_and_type.css components.css
#    docs/ preview/ ui_kits/
find references/04-design-system -type f | wc -l
# → 44 (期待値)
```

---

## `references/README.md` への追記

以下を適切な位置 (Categories セクション内、既存 03 の後) に追加:

```markdown
### 04. Design System

- [04-design-system/README.md](04-design-system/README.md) — v2.1 DS 正本
- [04-design-system/docs/tokens.md](04-design-system/docs/tokens.md) — 全トークン
- [04-design-system/docs/theme-object.md](04-design-system/docs/theme-object.md) — AppTheme 構造解説
- [04-design-system/docs/chart-semantic-colors.md](04-design-system/docs/chart-semantic-colors.md) — 業務概念→色マップ
- [04-design-system/docs/category-gradients.md](04-design-system/docs/category-gradients.md) — 取引区分グラデーション (ti/to/bi/bo 他)
- [04-design-system/docs/trend-helpers.md](04-design-system/docs/trend-helpers.md) — sc.* 判定関数
- [04-design-system/docs/echarts-integration.md](04-design-system/docs/echarts-integration.md) — ECharts 色指定パターン
- [04-design-system/docs/v2-to-v2.1-changes.md](04-design-system/docs/v2-to-v2.1-changes.md) — v2.0 からの変更点
- [04-design-system/preview/index.html](04-design-system/preview/index.html) — インタラクティブプレビュー
```

---

## `docs/contracts/doc-registry.json` への追加

既存 `categories` 配列末尾に追加:

```json
{
  "id": "design-system",
  "title": "Design System v2.1",
  "docs": [
    { "path": "references/02-design-system/README.md", "label": "Design System v2.1 正本" },
    { "path": "references/02-design-system/docs/tokens.md", "label": "トークン一覧" },
    { "path": "references/02-design-system/docs/theme-object.md", "label": "AppTheme オブジェクト" },
    { "path": "references/02-design-system/docs/chart-semantic-colors.md", "label": "業務概念 → 色 マップ" },
    { "path": "references/02-design-system/docs/category-gradients.md", "label": "カテゴリグラデーション" },
    { "path": "references/02-design-system/docs/trend-helpers.md", "label": "sc.* トレンド判定" },
    { "path": "references/02-design-system/docs/echarts-integration.md", "label": "ECharts 統合" },
    { "path": "references/02-design-system/docs/content-and-voice.md", "label": "コンテンツ・トーン" },
    { "path": "references/02-design-system/docs/visual-foundations.md", "label": "視覚基礎" },
    { "path": "references/02-design-system/docs/iconography.md", "label": "アイコン運用" },
    { "path": "references/02-design-system/docs/v2-to-v2.1-changes.md", "label": "v2.0 → v2.1 変更点" },
    { "path": "references/02-design-system/docs/route-b-guide.md", "label": "配置手順 (本 guide)" }
  ]
}
```

ファイル先頭 `"$comment"` に一行追記:

```
... design-system-v2-1-asset (YYYY-MM-DD): DS v2.1 を references/02-design-system/
に配置。v2.0 は本体実装を見ずに書かれた推測提案だったため、v2.1 で本体
(tokens.ts + theme.ts + semanticColors.ts + colorSystem.ts) の外部 documentation
として全面書き直し。本体コードは変更しない。
```

---

## commit / PR

### commit message

```
docs: Shiire-Arari Design System v2.1 を references/02-design-system/ に追加

- v2.0 は本体実装を見ずに書いた推測提案だった。v2.1 で全面書き直し
- Test4 本体 (tokens.ts + theme.ts + semanticColors.ts + colorSystem.ts)
  の外部 documentation layer として位置づけ直し
- ChartSemanticColors (業務概念 → 色) と categoryGradients (ti/to/bi/bo
  他) を正面から解説
- sc.* トレンド判定関数と colorSystem.statusAlpha (ECharts 用) の使い方
  を専用ドキュメントに
- 経路 A (tokens.ts への 5 段階 PR) は廃止。本体は既に v2 相当の構造を
  備えているため反映不要
- 本体コードへの影響ゼロ (references/ 配下の追加のみ)
```

### PR 本文テンプレート

```markdown
## Summary

Shiire-Arari Design System v2.1 を `references/02-design-system/` に
追加します。コード影響ゼロ、資産追加のみ。

## Context

v2.0 (別 ZIP として発送済み、本 PR には含まれない) は
`app/src/presentation/theme/` の実装を確認せずに書かれた推測提案でした。
実装確認の結果、以下が判明:

- Test4 は既に意味層 (theme.ts の ThemeColors / InteractiveColors /
  ChartColors / ElevationTokens) を実装済み
- ライト/ダーク切替も localStorage 永続化付きで実装済み
- 部門色の軸は「青果/精肉/...」ではなく「ti/to/bi/bo + 業務分類」
- trend 色は palette.positive/negative (CUD) で導入済み、sc.* ヘルパーもある

v2.1 は立場を逆転し、「本体実装の外部説明」として書き直したものです。

## Scope

- 追加: references/02-design-system/ (44 files)
- 追加: projects/completed/design-system-v2-1-asset/ (HANDOFF + checklist)
- 更新: references/README.md (目次追記)
- 更新: docs/contracts/doc-registry.json (カテゴリ追加 + 履歴記載)

## Non-scope

- app/src/presentation/theme/ の変更なし
- 本体 UI の見た目変更なし
- 新規 guard test 追加なし (将来課題として v2.1/docs/v2-to-v2.1-changes.md
  に記録のみ)

## Linked

- projects/completed/design-system-v2-1-asset/
- 参考: references/02-design-system/docs/v2-to-v2.1-changes.md (v2.0 との
  差分詳細)

## Verification

- [x] preview/index.html で全ページ表示
- [x] ui_kits/app/index.html のクリックスルー動作
- [x] colors_and_type.css が tokens.ts + theme.ts と一対一整合
- [x] docs:check PASS
- [x] 既存 references 配下未変更
```

---

## 検品チェックリスト (merge 前)

- [ ] `references/02-design-system/colors_and_type.css` の `--c-primary` 等
      palette が `tokens.ts` と完全一致
- [ ] `--theme-bg` 系の dark 値が `theme.ts` の `darkColors` と一致
- [ ] `[data-theme='light']` の light 値が `theme.ts` の `lightColors` と一致
- [ ] `--chart-sales` 系が `chart.semantic.*` の代入と一致
- [ ] `--gradient-*` の色が `categoryGradients` と一致 (15 キー全部)
- [ ] preview/index.html の左ナビリンクが全て生きている
- [ ] docs/ の 11 本が全て存在 (tokens / theme-object / chart-semantic-colors
      / category-gradients / trend-helpers / echarts-integration / content-and-voice
      / visual-foundations / iconography / v2-to-v2.1-changes / route-b-guide)
- [ ] SKILL.md の description が Claude Skill として読める形になっている
- [ ] user 承認セクションの項目が埋まっている

---

## 補足: SKILL.md の扱い

SKILL.md は Claude Skill descriptor で、Test4 リポジトリ内に置いても機能
しません。referential documentation として残すのが推奨です（AI 作業を
将来組み込むときに流用できるため）。削除したい場合は `references/02-design-system/`
配下でのみ削除し、README.md の index からも削除します。

本計画は SKILL.md を**残す**前提で書いています。
