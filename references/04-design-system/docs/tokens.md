# Tokens — v2.1 Reference

Test4 本体 (`app/src/presentation/theme/tokens.ts`) の全値を CSS 変数として
列挙します。`AppTheme` 経由でアクセスする文脈（styled-components）の話は
`theme-object.md` に分離しています。

命名規則の対応：

| TS 側 (tokens.ts) | CSS 側 | 備考 |
| --- | --- | --- |
| `palette.primary` | `--c-primary` | flat 命名を維持 |
| `palette.primaryDark` | `--c-primary-dark` | CSS 慣習で camelCase → kebab-case |
| `palette.successDark` | `--c-success-dark` | 同上 |
| `typography.fontSize.body` | `--fs-body` | 省略形 |
| `spacing['4']` | `--sp-4` | 数値 key をそのまま |
| `radii.md` | `--r-md` | 省略形 |
| `shadows.md` | `--sh-md` | 省略形 |
| `transitions.fast` | `--t-fast` | 省略形 |

---

## Palette — raw hues

### Primary

| Token | Value | TS |
| --- | --- | --- |
| `--c-primary` | `#6366f1` | `palette.primary` |
| `--c-primary-dark` | `#4f46e5` | `palette.primaryDark` |

### Status (raw)

> これらは**意味層ではなく hue 層**です。「成功」「警告」を表現したい文脈では
> `theme.interactive.*` や status chip の組み合わせを使います。

| Token | Value | TS |
| --- | --- | --- |
| `--c-success` / `--c-success-dark` / `--c-success-deep` | `#34d399` / `#22c55e` / `#16a34a` | `palette.success*` |
| `--c-warning` / `--c-warning-dark` / `--c-warning-deep` | `#fbbf24` / `#f59e0b` / `#d97706` | `palette.warning*` |
| `--c-danger` / `--c-danger-dark` / `--c-danger-deep` | `#f87171` / `#ef4444` / `#dc2626` | `palette.danger*` |
| `--c-info` / `--c-info-dark` | `#38bdf8` / `#0ea5e9` | `palette.info*` |

### Extended hues

| Token | Value |
| --- | --- |
| `--c-purple` / `-dark` / `-deep` | `#a78bfa` / `#8b5cf6` / `#7c3aed` |
| `--c-cyan` / `-dark` / `-deep` | `#22d3ee` / `#06b6d4` / `#0891b2` |
| `--c-pink` / `-dark` | `#f472b6` / `#ec4899` |
| `--c-lime` / `-dark` | `#a3e635` / `#84cc16` |
| `--c-orange` / `-dark` | `#f97316` / `#ea580c` |
| `--c-blue` / `-dark` | `#60a5fa` / `#3b82f6` |
| `--c-slate` / `-dark` | `#94a3b8` / `#64748b` |

### Color Universal Design (Wong 2011)

> `semanticColors.ts` (`sc.*`) と `theme.chart.semantic.positive/negative`
> はここから来ています。Trend UI (↑↓) で status の緑/赤を使わずこれを使うのが
> Test4 のルール。

| Token | Value | 意味 |
| --- | --- | --- |
| `--c-positive` / `--c-positive-dark` | `#0ea5e9` / `#0284c7` | プラス・改善 |
| `--c-negative` / `--c-negative-dark` | `#f97316` / `#ea580c` | マイナス・悪化 |
| `--c-caution` / `--c-caution-dark` | `#eab308` / `#ca8a04` | 注意・中間 |

### Neutral

| Token | Value |
| --- | --- |
| `--c-white` / `--c-black` | `#ffffff` / `#000000` |

---

## Theme (mode-aware) — role-based

`theme.colors.*` / `theme.interactive.*` / `theme.elevation.*` の CSS 変数
展開。ダーク既定。ライトは `[data-theme='light']` で切替（DS preview 専用。
本体は JS 切替）。

### colors — page chrome

| Token | Dark | Light | TS |
| --- | --- | --- | --- |
| `--theme-bg` | `#09090b` | `#f8fafc` | `colors.bg` |
| `--theme-bg2` | `#0f1117` | `#ffffff` | `colors.bg2` (nav) |
| `--theme-bg3` | `#16181f` | `#f1f5f9` | `colors.bg3` (card) |
| `--theme-bg4` | `#1c1f28` | `#e2e8f0` | `colors.bg4` (overlay) |
| `--theme-text` | `#f4f4f5` | `#0f172a` | `colors.text` |
| `--theme-text2` | `#a1a1aa` | `#475569` | `colors.text2` |
| `--theme-text3` | `#71717a` | `#64748b` | `colors.text3` |
| `--theme-text4` | `#52525b` | `#94a3b8` | `colors.text4` |
| `--theme-border` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.08)` | `colors.border` |

### interactive — hover/active/subtle

| Token | Dark | Light | TS |
| --- | --- | --- | --- |
| `--theme-hover-bg` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.06)` | `interactive.hoverBg` |
| `--theme-active-bg` | `rgba(99,102,241,0.2)` | `rgba(99,102,241,0.08)` | `interactive.activeBg` |
| `--theme-subtle-bg` | `rgba(255,255,255,0.04)` | `rgba(0,0,0,0.02)` | `interactive.subtleBg` |
| `--theme-muted-bg` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.04)` | `interactive.mutedBg` |
| `--theme-backdrop` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.5)` | `interactive.backdrop` |

### elevation — shadow tokens

> `shadows.*` とは別枠。こちらは popup/tooltip 用に α=15% で、カード用
> (`--sh-*`) より存在感あり。

| Token | Value | TS |
| --- | --- | --- |
| `--theme-elev-popup` | `0 4px 12px rgba(0,0,0,0.15)` | `elevation.popup` |
| `--theme-elev-tooltip` | `0 4px 16px rgba(0,0,0,0.15)` | `elevation.tooltip` |
| `--theme-elev-overlay` | `0 1px 2px rgba(0,0,0,0.3)` | `elevation.overlay` |

---

## Chart — series palettes and semantic map

`theme.chart.*` の展開。mode 非依存（dark/light で同値）。詳細は
`chart-semantic-colors.md`。

### Series palettes

| Token | 値 | TS |
| --- | --- | --- |
| `--chart-series-1..10` | primary, success-dark, warning-dark, danger-dark, cyan-dark, pink-dark, purple-dark, orange-dark, blue-dark, lime-dark | `chart.series[0..9]` |
| `--chart-store-1..6` | 上記の先頭 6 色 | `chart.stores[0..5]` |

### 基本対比

| Token | Value | TS |
| --- | --- | --- |
| `--chart-current-year` | `--c-primary` | `chart.currentYear` |
| `--chart-previous-year` | `--c-slate` | `chart.previousYear` |
| `--chart-budget` | `--c-info-dark` | `chart.budget` |
| `--chart-bar-positive` | `--c-success-dark` | `chart.barPositive` |
| `--chart-bar-negative` | `--c-danger-dark` | `chart.barNegative` |

---

## Category gradients

`tokens.categoryGradients` の展開。詳細は `category-gradients.md`。

| Token | 意味 | 色味 |
| --- | --- | --- |
| `--gradient-ti` | TI 店入 | 緑 |
| `--gradient-to` | TO 店出 | 赤ピンク |
| `--gradient-bi` | BI 部入 | 青 |
| `--gradient-bo` | BO 部出 | 紫 |
| `--gradient-daily` / `--gradient-market` | デイリー / 市場 | 琥珀 |
| `--gradient-lfc` | LFC | 青 |
| `--gradient-salad` | サラダ | 緑 |
| `--gradient-kakou` | 加工 | 紫 |
| `--gradient-chokuden` | 直伝 | シアン |
| `--gradient-hana` | 花 | ピンク |
| `--gradient-sanchoku` | 産直 | ライム |
| `--gradient-cost-inclusion` | 原価算入費 | オレンジ |
| `--gradient-tenkan` | 店間 | 赤ピンク |
| `--gradient-bumonkan` | 部門間 | 紫 |
| `--gradient-other` | その他 | スレート |

---

## Typography

| Token | Value | 用途 |
| --- | --- | --- |
| `--font-sans` | Noto Sans JP fallback chain | 本文 |
| `--font-mono` | JetBrains Mono fallback chain | 数値 (必須) |
| `--fs-micro` | `0.55rem` / 8.8px | バッジカウント、タイムスタンプ |
| `--fs-caption` | `0.6rem` / 9.6px | 軸ラベル、サブタイトル (最多) |
| `--fs-label` | `0.68rem` / 10.9px | テーブルセル、タブ |
| `--fs-body` | `0.78rem` / 12.5px | 本文、入力 |
| `--fs-title` | `0.9rem` / 14.4px | カード見出し |
| `--fs-heading` | `1.1rem` / 17.6px | ページタイトル |
| `--fs-display` | `1.4rem` / 22.4px | KPI 大表示 |
| `--fw-normal..extrabold` | 400..800 | |

> ECharts は CSS `rem` を扱えないので、`tokens.chartFontSize.*` に px 整数
> (`axis: 10`, `tooltip: 11`, `title: 13`, `annotation: 10`) が定義されて
> います。CSS 側には露出していません。

---

## Spacing / Radius / Shadow / Motion / Layout

| Group | Tokens |
| --- | --- |
| Spacing | `--sp-0/1/2/3/4/5/6/7/8/9/10/12` (= 0/3/4/6/8/10/12/14/16/18/20/24 px) |
| Radius | `--r-sm/md/lg/xl/pill` (= 6/10/12/16/999 px) |
| Shadow | `--sh-sm/md/lg` (card 用。popup/tooltip は `--theme-elev-*`) |
| Motion | `--t-fast/normal/slow` (0.15/0.25/0.35s) + `--ease` + `--spring` |
| Layout | `--nav-width 56px` / `--sidebar-width 260px` / `--nav-icon-size 40px` / `--logo-size 36px` / `--section-icon-size 32px` |
| Z-index | `--z-dropdown 100` / `--z-sticky 200` / `--z-modal 1000` / `--z-toast 1100` / `--z-tooltip 1200` |
| Modal | `--modal-width-sm/md/lg` (400/480/640px) / `--modal-max-height 80vh` / `--modal-backdrop-blur 12px` / `--modal-container-blur 20px` |
| Breakpoint | `--bp-sm/md/lg/xl` (700/900/1100/1200px) |

---

## Prev-year alpha pattern

Test4 では前年値を「当年色の 60% 不透明」で表現します。JS/TS 側では
8-digit hex で付加する慣習:

```ts
salesPrev: `${palette.primary}60`,  // #6366f1 + 60 = 60% alpha
```

CSS 変数では hex8 をそのまま使っています:

```css
--chart-sales-prev: #6366f160;
```

代替として rgba でも構いませんが、本体コードとの一致を優先しています。

---

## Interaction

| Token | Value | TS |
| --- | --- | --- |
| `--hover-lift` | `translateY(-1px)` | `interaction.hoverLift` |
| `--press-scale` | `scale(0.98)` | `interaction.pressScale` |
| `--focus-ring` | `0 0 0 2px rgba(99,102,241,0.4)` | `interaction.focusRing` |
