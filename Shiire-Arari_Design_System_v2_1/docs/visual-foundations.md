# Visual Foundations

視覚基礎ルール。トークン値は `tokens.md` に、テーマ構造は `theme-object.md`
に分離しています。

---

## Color philosophy

3 つの色軸で考えます:

1. **Surface** — `theme.colors.bg` 系。L0/L1/L2/L3 の elevation ランプ
2. **Content** — `theme.colors.text` 系。strong/default/muted/disabled
3. **State** — `theme.interactive.*` 系。hover/active/subtle/muted

**唯一のブランドグラデーション**は 135° の `primary → primary-dark`。これは
ロゴとプライマリボタンにだけ使います。それ以外の「色のグラデーション」は
`categoryGradients.*` を使い、hex を書きません。

**Dark 既定**。4 段階のサーフェス (bg → bg2 → bg3 → bg4) が elevation を
表現します。影でなくサーフェス値の変化で「上下関係」を出すのがダーク UI の定石。

---

## Typography

Body は `Noto Sans JP`、数値は `JetBrains Mono` + `tabular-nums`。

サイズスケールは意図的に小さい:

```
micro     0.55rem   8.8 px
caption   0.6 rem   9.6 px
label     0.68rem  10.9 px
body      0.78rem  12.5 px
title     0.9 rem  14.4 px
heading   1.1 rem  17.6 px
display   1.4 rem  22.4 px
```

`body` 12.5px は Web として小さい方ですが、Test4 は業務データ密度が高く
「見える情報量」を優先する選択です。読めないわけではありません。

ロール名 (micro/caption/label/body/title/heading/display) で呼ぶのが原則。
`fontSize.sm` のような汎用名は避けます。

---

## Spacing

`0 · 3 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24` (px) の 12 段階。

- `spacing['4']` (8px) が「快適な標準間隔」
- `spacing['2']` / `spacing['3']` (4/6px) はチップ・行内など密な所
- `spacing['6']` (12px) はカード内部、KPI ラベルとバリューの間
- `spacing['8']` / `['10']` (16/20px) はセクション間、ページ余白
- `spacing['12']` (24px) は大きな区切り、空状態の広い余白

`gap: 32px` 以上のレンジは**使いません**。それが欲しいときは、そのセクションは
分けるべき兆候です。

---

## Background

**ソリッドフラットのみ**。イラスト・手書き要素・パターン・テクスチャは使わない。

Dark mode は 4 段階のサーフェスランプ (base / raised / card / overlay) で
elevation を表現。Light mode は slate 系のランプで同じ構造を持ちます。

---

## Animation

最小限:

- `t-fast` 0.15s — ホバー、チップ切替
- `t-normal` 0.25s — ほとんどの遷移
- `t-slow` 0.35s — モーダル・トーストの入場
- `ease` = `cubic-bezier(0.4, 0, 0.2, 1)` (標準 ease-out)
- `spring` = `cubic-bezier(0.34, 1.56, 0.64, 1)` (モーダル入場で弾ませる)

既存のキーフレーム:

- **Pulse** — "計算中…" ステータスドット (1.2s ループ)
- **Drill-through highlight** — 他チャートから対象ウィジェットにドリル
  したとき、対象をパルスで強調
- **Modal entrance** — fade + translate + scale を spring 合成
- **Toast entrance** — 右から slide in を spring 合成

跳ねる動き・パララックス・スクロールジャックはしない。

---

## Hover / Press

- Card: `translateY(-1px)` + `--sh-md` 影強化
- Button: `opacity: 0.9` + `translateY(-1px)`
- Nav icon: text 色を text3 → text、bg 色を overlay
- Chip: overlay 系の fill を少し濃く

Press:

- `scale(0.98)` + 影消し
- Button は `opacity: 0.95` で微かに脱色
- **Press で色相は変えない**（色相は state の変化専用、interaction
  フィードバックには使わない）

---

## Borders

常に 1px。

- Dark: `rgba(255, 255, 255, 0.06)` (`theme.colors.border`)
- Light: `rgba(0, 0, 0, 0.08)`

**唯一の色付きボーダー**はアクセントカードの 2px top-border。左縁や outline
ボタンでブランド色を使うのはしない。

入力フォーム系は `border:` ではなく `inset box-shadow` でボーダーを描画。
フォーカス時に ring を重ねても padding が動きません。

---

## Shadow

| Token | 用途 | α |
| --- | --- | --- |
| `shadows.sm` | カード静止 | 0.04 / 0.03 |
| `shadows.md` | カードホバー | 0.06 / 0.04 |
| `shadows.lg` | モーダル | 0.10 / 0.05 |
| `elevation.popup` | ドロップダウン | 0.15 |
| `elevation.tooltip` | ツールチップ | 0.15 |
| `elevation.overlay` | 画像上文字 | 0.30 |

`shadows.*` はカード用で α 弱め、`elevation.*` は popup/tooltip 用で α=15%
強め。ダーク背景でも存在感が出るよう差を付けています。

---

## Focus

`0 0 0 2px rgba(99,102,241,0.4)` = indigo 40%、2px offset。
`:focus-visible` のみに適用、マウスホバーでは出しません。

すべての interactive 要素 (`c-btn`, `c-chip`, `c-input`, `c-checkbox`,
ナビボタン) で同じ ring を使います。コンポーネント別にカスタマイズしません。

---

## Layout

| Token | 値 |
| --- | --- |
| `layout.navWidth` | 56px (常時表示) |
| `layout.sidebarWidth` | 260px (データ管理・ファイル投入) |
| `layout.navIconSize` | 40px |
| `layout.logoSize` | 36px |
| `layout.sectionIconSize` | 32px |

レスポンシブブレークポイント: `700 / 900 / 1100 / 1200 px`。
モバイルでは左ナビレールを下部ナビに置き換え。

---

## Transparency & blur

モーダルのみ使用:

- `modal.containerBlur`: 20px (コンテナ自身のフロスト効果)
- `modal.backdropBlur`: 12px (オーバーレイ背景ぼかし)

ステータスチップは α=14% の solid tint (dark 時) / α=10% (light 時)、
ボーダーは α=28% / α=22%。純 rgba を使い、blur は使いません。

---

## Imagery

**なし**。写真、ストックイラスト、生成画像を使用しません。

「絵」として存在するのは ECharts のみ。`ui_kits/app/` の折れ線・棒グラフは
それを SVG で軽量再現したもの。

---

## Corner radii

| Token | 用途 |
| --- | --- |
| `radii.sm` 6px | チップ、コンテキストメニュー、極小コントロール |
| `radii.md` 10px | ナビボタン、通常ボタン、入力フィールド |
| `radii.lg` 12px | カード、KPI カード (最多使用) |
| `radii.xl` 16px | モーダル、大型パネル |
| `radii.pill` 999px | チップグループチップ、ピルバッジ |

4px は**使いません**。それより小さな角丸が欲しいときは 0 (square) を選択。

---

## Card anatomy

標準カード:

- 背景 `theme.colors.bg3`
- 1px ボーダー `theme.colors.border`
- `radii.lg` (12px)
- `spacing['6']` (12px) の padding
- `shadows.sm` の影

Hover で `shadows.md` + `translateY(-1px)` リフト。

オプション: 2px top-border でアクセント色を付与。クリック可能カードは
focus ring と、右上に `根拠` (rationale) ヒントアイコンを持つことがあります。
