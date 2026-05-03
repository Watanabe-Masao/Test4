# Content & Voice

**Language.** 100% Japanese UI. The product is domain-specialized to Japanese
retail grocery/supermarket operations (部門 / カテゴリ / 粗利率 / 値入率 /
客単価 / PI値).

---

## Tone

Dense, operational, technical. Addresses the reader in the imperative or
neutral form (「データを読み込んでください」, 「並べ替え」, 「編集完了」).
Never first-person; never overly polite. No marketing cheer.

Reads like spreadsheet headers, because it is one.

---

## Casing & spacing

Japanese full-width characters are mixed with half-width digits and Latin
abbreviations (KPI, CSV, WASM, PI 値). **Numbers are always half-width.**
There's no thousands-separator convention enforced, but monospace digits are
used everywhere a number appears (`font-family: 'JetBrains Mono'`, with
`font-variant-numeric: tabular-nums`).

---

## Voice — examples from source

| Surface | Copy |
| --- | --- |
| Empty state | 「データを読み込んでください」 |
| Empty state subtext | 「左のサイドバーからファイルをドラッグ＆ドロップすると自動で計算されます。」 |
| Toolbar chips | 「並べ替え」 · 「編集完了」 · 「ウィジェット設定」 |
| Status line | 「計算中…」 · 「計算済み」 · 「未計算」 |
| Drill-through button | 「詳しく →」 *(note the trailing arrow)* |
| Nav labels | ダッシュボード / 日別売上 / カテゴリ分析 / 仕入分析 / レポート / 管理 |

**I / you.** Neither. Japanese business UI convention omits pronouns; we
follow suit.

---

## Emoji

Used sparingly and **only as functional icons** where a glyph is missing:

- Theme toggle: 🌙 / ☀️
- Empty-state hero icon: 📊 (dashboard), 🌤 (weather)
- Drag handle: ⠿ (U+2839 BRAILLE PATTERN — not emoji, but kept alongside)

Never decorative. Never celebratory. No emoji in body copy, labels, or
buttons.

---

## Vibe

Professional, data-dense, utilitarian. Think Bloomberg Terminal × Japanese
POS software. Lots of tabular numbers, tiny labels, small-but-confident UI.

No whimsy, no illustration, no hand-drawn elements, no gradients beyond the
single brand gradient.

---

## Writing new copy

When adding Japanese strings to the product:

1. Start by searching the existing codebase for similar surfaces. Consistency
   across the product beats individual optimization.
2. Prefer noun-form or imperative. Avoid です/ます when a noun or a bare verb
   reads cleanly: 「計算中」 not 「計算しています」.
3. Numbers in prose: still monospace. Inline `<span class="ds-mono">` when
   a number sits inside a sentence.
4. Trailing arrow ` →` signals drill-through ("click here to see detail").
   Not used for plain navigation.
5. Status words settle on a small vocabulary: 済 / 完了 / 実行中 / 中止 /
   未計算 / エラー. Don't invent a seventh status on impulse.
