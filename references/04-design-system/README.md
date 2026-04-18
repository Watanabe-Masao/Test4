# Shiire-Arari Design System — v2.1

**仕入粗利管理ツール (shiire-arari)** の設計システム。
Test4 本体 (`app/src/presentation/theme/`) の実装を正本として、その語彙を
外部に説明する documentation layer です。

---

## v2.1 とは何か、v2.0 とどう違うか

v2.0 は「本体 `tokens.ts` に新しい意味層を提案する」立場で書かれていました。
その前提は**正しくありませんでした**。Test4 は既に意味層（`theme.ts` の
`ThemeColors` / `InteractiveColors` / `ChartColors` / `ChartSemanticColors` /
`ElevationTokens`）を持ち、localStorage 永続化付きのライト/ダーク切替も
実装済みです。v2.0 は「まだない前提」で書かれた誤りが複数ありました。

v2.1 は立場を逆転させました。**Test4 本体の実装が正本**で、DS はその外部
説明です。命名・構造・階層はすべて Test4 に合わせます。

詳細な差分は `docs/v2-to-v2.1-changes.md` にあります。

---

## Test4 本体との対応

| 本体ファイル | DS でのカバレッジ |
| --- | --- |
| `tokens.ts` (palette + 数値) | `colors_and_type.css` の Layer 1 (`--c-*`) + `docs/tokens.md` |
| `theme.ts` (意味層 + createTheme) | `colors_and_type.css` の Layer 2 (`--theme-*`, `--chart-*`, `--gradient-*`) + `docs/theme-object.md` |
| `theme.ts` の `ChartSemanticColors` | `docs/chart-semantic-colors.md` (本 DS の目玉章) |
| `tokens.ts` の `categoryGradients` | `docs/category-gradients.md` (業務用語付き) |
| `semanticColors.ts` (`sc.*` ヘルパー) | `docs/trend-helpers.md` |
| `colorSystem.ts` (`statusAlpha`) | `docs/echarts-integration.md` |
| `GlobalStyle.ts` | `ui_kits/app/app.css` で再現 |

---

## Sources

- **Codebase**: `github.com/Watanabe-Masao/Test4`
  - `app/src/presentation/theme/` — 正本トークン群
  - `app/src/BootstrapProviders.tsx` — ThemeProvider の注入点
- **DS 側の正本**: `colors_and_type.css` と `components.css`（本 ZIP 内）。
  いずれも本体 TS ファイルの値を一対一で CSS 変数化しています。ずれが見つかった
  場合は本体が正、DS が誤。修正対象は DS です。

---

## Index

| ファイル | 内容 |
| --- | --- |
| `README.md` | 本ファイル |
| `SKILL.md` | Agent Skill descriptor (v2.1 更新版) |
| `colors_and_type.css` | 全トークンを CSS 変数として export |
| `components.css` | プレビュー用コンポーネント CSS |
| `docs/tokens.md` | パレット・数値トークン一覧 |
| `docs/theme-object.md` | `AppTheme` の構造と `createTheme` の挙動 |
| `docs/chart-semantic-colors.md` | 業務概念→色のマッピング（Test4 の発明） |
| `docs/category-gradients.md` | 取引区分・業務分類のグラデーション（ti/to/bi/bo 他） |
| `docs/trend-helpers.md` | `sc.*` 条件関数の使い方 |
| `docs/echarts-integration.md` | ECharts 文脈での色指定（`colorSystem.ts`） |
| `docs/content-and-voice.md` | 日本語コピーのトーン |
| `docs/visual-foundations.md` | 視覚基礎（影・動き・余白） |
| `docs/iconography.md` | アイコン運用ルール |
| `docs/v2-to-v2.1-changes.md` | v2.0 からの変更点と v2.0 の誤り一覧 |
| `docs/route-b-guide.md` | `references/04-design-system/` への配置手順 |
| `assets/logo.svg` | 荒ロゴマーク |
| `preview/index.html` | デザインシステムタブ的な閲覧入口 |
| `preview/foundations/` | 色・タイポ・余白・角丸・影 |
| `preview/components/` | 13 コンポーネント個別 |
| `preview/chart-semantic/` | 業務概念カラー一覧（新設） |
| `preview/patterns/` | 実画面相当の組み合わせ例 |
| `ui_kits/app/` | クリックスルー試作機（v1 JSX + v2.1 CSS） |

---

## 方針の一言まとめ

- **Layer 1 (palette)** — Test4 flat 命名を尊重。`palette.primary` → `--c-primary`、`palette.primaryDark` → `--c-primary-dark`（CSS 慣習のみハイフン化）
- **Layer 2 (theme)** — `colors.*` → `--theme-*`、`interactive.*` → `--theme-*-bg`、`chart.*` → `--chart-*`、`chart.semantic.*` → `--chart-<concept>`、`categoryGradients.*` → `--gradient-*`
- **本体への提案はしない** — Test4 実装が既に十分なため
- **経路 A は廃止** — `docs/sync-proposal.md` (v2.0) と `02-routeA-sync-5-PRs.md` は不要
- **経路 B のみ残る** — `references/04-design-system/` への資産配置。手順は `docs/route-b-guide.md`

---

## Non-goals

- Test4 本体コードの変更を提案しない
- 本体コードを「整理する」「命名を変える」ような提案をしない
- 本体が現在使っていない概念（例: v2.0 の `--color-status-*` trio）を
  DS に残さない

DS は本体に遅れて追いつく documentation です。本体がリファクタしたら DS が
それを追随します。逆はありません。
