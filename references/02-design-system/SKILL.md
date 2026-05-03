---
name: shiire-arari-design
version: 2.1.0
description: Use this skill to generate well-branded interfaces and assets for Shiire-Arari (仕入粗利管理ツール), a Japanese retail gross-profit management SPA — for production code, throwaway prototypes, or slide mockups. v2.1 aligns the design system with the actual implementation in Test4 (`app/src/presentation/theme/tokens.ts` + `theme.ts` + `semanticColors.ts` + `colorSystem.ts`). Covers palette, theme object, ChartSemanticColors (business concept → color), categoryGradients (transaction-direction + operational gradients with ti/to/bi/bo terminology), sc.* trend helpers, and statusAlpha ECharts utilities.
user-invocable: true
---

Read `README.md` first. The design system is a documentation layer for the
live Test4 implementation, not a proposal for changes. If the two disagree,
Test4 is correct and this skill should be updated.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy
`colors_and_type.css` and `components.css` out of the skill and reference
them from static HTML. If working on production code in
`github.com/Watanabe-Masao/Test4`, reach for the live theme object
(`theme.colors.bg`, `theme.chart.semantic.sales` etc.) rather than CSS
variables — the CSS variables exist only for DS preview purposes.

If the user invokes this skill without other guidance, ask what they want to
build, then act as an expert designer who outputs HTML artifacts *or*
production code depending on the need.

---

## Key facts

- **Product.** Data-dense, desktop-first Japanese retail analytics SPA with
  a compact mobile layout.
- **Language.** UI is in Japanese. Keep it that way unless told otherwise.
- **Brand.** Primary indigo `#6366f1`, paired with purple `#8b5cf6` in the
  logo gradient and on primary/success buttons. That gradient is the only
  gradient used as a flat brand mark. Every categorical area uses a
  `categoryGradient` instead of a flat color.
- **Theme.** Dark default, light toggle via `ThemeToggleContext`.
  Implementation: styled-components `ThemeProvider`, switched by JS state in
  `BootstrapProviders.tsx`, persisted in `localStorage` under
  `STORAGE_KEYS.THEME`. No `[data-theme]` attribute is used in the live
  product (that attribute exists only in the DS preview CSS).
- **Type.** Body font Noto Sans JP (400/500/600/700/800). All numbers
  JetBrains Mono with tabular-nums. Size scale is tiny
  (0.55rem → 1.4rem); every pixel is information.
- **Density.** Spacing step is `8px` default, `4–6px` inside chips/rows.
- **Radii.** 6 / 10 / 12 / 16 / 999 (px). Never `4px`.
- **Imagery.** None. Emoji and unicode glyphs are the only "icons". No
  Lucide / Heroicons / Material.
- **Categorical.** Not `produce/meat/fish`. Test4 uses **ti/to/bi/bo** (店入／
  店出／部入／部出 = transaction direction) plus operational classifiers
  (`daily`, `market`, `lfc`, `salad`, `kakou`, `chokuden`, `hana`,
  `sanchoku`), aggregation classifiers (`costInclusion`, `tenkan`,
  `bumonkan`, `other`). All are *gradients*, not flat colors.
- **Trend colors.** Not status green/red. Use `sc.positive` / `sc.negative`
  / `sc.caution` from `semanticColors.ts` — CUD-safe (Wong 2011 palette).
  For ECharts where `sc.*` can't reach, use
  `colorSystem.statusAlpha('positive', 0.3)`.
- **Chart colors.** Every business concept has a name in
  `theme.chart.semantic.*`. 売上 = primary indigo, 粗利 = purple dark,
  客数 = cyan dark, 販売点数 = info dark (sky), 売変 = danger dark (red),
  仕入原価 = orange dark. See `docs/chart-semantic-colors.md` for the full
  list.

---

## Layer architecture

```
Layer 1 Palette (raw hues)             tokens.ts  →  --c-*
Layer 2 Theme (role-based, themed)     theme.ts   →  --theme-*
Layer 2 Chart (business → color)       theme.ts   →  --chart-*
Layer 2 Gradients (transaction/ops)    tokens.ts  →  --gradient-*
Layer 2 Trend helpers (condition fn)   semanticColors.ts (sc.*)
Utility Dynamic alpha                  colorSystem.ts (statusAlpha)
```

When writing production code:

- `theme.colors.bg` / `theme.colors.text` — page chrome
- `theme.interactive.hoverBg` — hover/active states
- `theme.chart.semantic.<concept>` — chart series color
- `theme.categoryGradients.<kind>` — category chip backgrounds
- `sc.cond(isPositive)` — single-line trend color resolution
- `statusAlpha('positive', 0.3)` — ECharts tooltip / highlight rgba

Never hard-code hex. If the color doesn't have a token yet, that's a signal
to add one to the theme, not to inline it.

---

## Components

The DS ships `components.css` with 13 CSS classes (`c-btn`, `c-badge`,
`c-chipgroup`, `c-card`, `c-kpi`, `c-table`, `c-field` + inputs, `c-modal`,
`c-toast`, `c-tooltip`, `c-empty`, `c-dot`, `c-divider`). These are for
preview only. In production, use Test4's actual styled-components
(search `app/src/presentation/` for the real implementations).

---

## Things deliberately NOT in v2.1 that were in v2.0

- No `--color-*` semantic layer (Test4 calls it `--theme-*` and that's
  authoritative)
- No `--cat-produce` / `--cat-meat` / `--cat-fish` department tokens
  (Test4's categorization is transaction-based, not department-based)
- No `sync-proposal.md` (Test4 doesn't need syncing — it's ahead)
- No 5-PR plan for `tokens.ts` changes
- No "2-layer add-only proposal" language

These were v2.0 artifacts that turned out to be based on incorrect
assumptions about Test4's state.

---

## Working rules

1. **Preserve Japanese copy tone.** Imperative / noun-form, no です/ます
   unless pre-existing. No pronouns.
2. **Numbers are sacred.** Always half-width, tabular-nums, JetBrains Mono.
3. **One brand gradient only** (primary → primary-dark, 135°). Everything
   else categorical uses `categoryGradients`.
4. **Borders are 1px.** Only colored border is a 2px top-border on accented
   cards.
5. **When adding a visual decision, ask whether it's already a token in
   `theme.ts`.** If yes, use it. If no, consider whether `theme.ts` should
   grow a new token rather than inlining.
