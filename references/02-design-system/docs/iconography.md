# Iconography

**There is no icon system.** The codebase does not ship an icon font, SVG
sprite, or icon component library. Navigation buttons render with emoji or
unicode characters stored in `pageRegistry.ts` (`page.icon`).

This is deliberate. Introducing Lucide / Heroicons / Material Icons would
look foreign in a Japanese retail tool and would bloat the bundle for zero
gain. Emoji already provide the symbolic vocabulary the product needs.

---

## Observed inventory

| Glyph | Use |
| --- | --- |
| 📊 | ダッシュボード |
| 📅 | 日別売上 |
| 🏪 | 店舗分析 |
| 📈 | インサイト · 要因分解 |
| 📦 | カテゴリ分析 |
| 💰 | 原価詳細 · 予算管理 |
| 🛒 | 仕入分析 |
| 📋 | レポート |
| ⚙️ | 管理 |
| 🌤 | 天気相関 |
| 🔮 | 需要予測 |
| 🌙 / ☀️ | テーマ切替 |
| ⠿ | ドラッグハンドル *(U+2839 BRAILLE PATTERN)* |
| ↑ / ↓ / → | トレンド表示・遷移示唆 |
| + × ✓ | アクショングリフ |

---

## Rules for new icons

When adding a new page or surface that needs an icon:

1. **Prefer emoji or unicode.** Pick a glyph that reads at a glance in both
   half-size (nav rail, 18px) and full-size (empty state, 36px). Test on
   both macOS Apple Color Emoji and Windows Segoe UI Emoji to make sure the
   glyph isn't visually out of place in one of them.
2. **If no emoji fits,** a hand-rolled `1.5px` stroke SVG using
   `currentColor` is acceptable. Keep it to 16–20px viewBox, no fills, no
   multi-color. The codebase does this inline where needed (e.g. some
   toolbar actions).
3. **Do not introduce an icon library.** Not Lucide, not Heroicons, not
   Material, not Phosphor. One-off inline SVGs are fine.
4. **Categorical dots, not categorical icons.** Departments (青果, 精肉, …)
   are represented by colored dots/bars, not by icons. Don't introduce a 🥬
   for 青果 — the color carries the meaning.

---

## Glyph selection heuristic

- Action → concrete verb glyph (✓ complete, × close, + add, → drill-through)
- Page → concrete object glyph (📊 dashboard, 🛒 purchase, 📋 report)
- Data type → abstract symbol (⚠ warning, ℹ info — though the product
  currently uses emoji ⚠️ ℹ️ so keep consistent)
- Status → status dot (c-dot), not an icon

---

## Logo

There is no formal logo file in the codebase. The header logo is a `36×36`
rounded square with the single kanji **「荒」** (ara — from 荒利/arari,
"gross profit") in white, over the `--c-primary → --c-purple-dark`
gradient. This is reproduced in `assets/logo.svg`.

Smaller sizes (32px, 24px, 16px favicon) use the same gradient and
letterform. The kanji remains legible down to 16px on most displays but
loses detail at 12px — below that, switch to just the gradient square.

**Do not:**

- Add a tagline under the logo.
- Put the logo on a light gradient or a photograph.
- Rotate, skew, or otherwise transform the logo.
- Use the gradient as a general brand surface (it's for the logo and for
  primary/success buttons only).

---

## Unicode as icons

The product uses Unicode glyphs as icons extensively:

- Full-width arrows (↑ ↓ →) appear in trend badges. These align better with
  Japanese body text than emoji arrows.
- ⠿ (Braille Pattern Dots-1245) is used for drag handles because it's
  visually quiet compared to ≡ or ⋮, and hints at "grip".
- ⋯ (Midline Horizontal Ellipsis) appears in overflow menus.

Keep using Unicode for these. Don't replace them with SVG or emoji without a
reason — the product's visual consistency depends on them.
