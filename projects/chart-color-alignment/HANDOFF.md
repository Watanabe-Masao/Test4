# HANDOFF — chart-color-alignment

> 役割: 起点文書。後任者が最初に読む。
> Chart 側 theme 拡張 + 関連 chart 移行 + v2.1 DS doc 追随 を束ねる project。

## 1. 現在地

Phase 0 完了: branch `feat/chart-color-alignment` 作成、project scaffolding
(AI_CONTEXT + HANDOFF + plan + checklist + config) 配置。

Phase 1 着手前。

## 2. 次にやること

### 高優先 (Phase 1 — theme 拡張)

- `tokens.ts` の palette に `purpleMid = '#a855f7'` 追加 (売変 74 実色)
- `theme.ts` の `ChartSemanticColors` に 6 field 追加:
  `discountPolicy / discountRegister / discountWaste / discountSampling /
  cumulativeDiscountRate / cumulativeDiscountRatePrev`
- `theme.ts` の `semantic.*Prev` 6 field を `${color}60` から
  `palette.slate` に変更

### 中優先 (Phase 2 — chart 移行)

- `DiscountTrendChart.tsx:25` の hard-coded `DISCOUNT_COLORS` を
  `theme.chart.semantic.discount*` 参照に置換
- `DiscountTrendChart.tsx:144, 153` の累計率を semantic 参照に置換
- pair 配置 chart (日別売上推移 等) の `semantic.*Prev` 参照を確認 (値が
  slate に変わったため見た目が変わるが、参照コードは無変更で OK)

### 低優先 (Phase 3 — DS doc 追随)

- `colors_and_type.css` の `--chart-*-prev` を slate に変更、`--chart-discount-71..74` 等追加
- `docs/chart-semantic-colors.md` に新 rule 明記
- `docs/tokens.md` に新 palette key 追記
- `preview/chart-semantic/index.html` に新色の chip 追加

## 3. ハマりポイント

### 3.1. 前年バー色の視覚的回帰

`semantic.*Prev` を slate 化すると、現在 lavender (薄紫) で描画している
日別売上推移等の chart が gray に変わる。これは **意図通り** の変更だが、
スクショやテストで回帰が検出される可能性がある。必ず human visual review
を Phase 2 完了後に挟むこと。

### 3.2. DiscountTrendChart の 74 色

スクショの 74 試食売変は `#a855f7` (既存 palette に無い中間紫)。
`palette.purpleMid` として新設する方針。既存 `purple #a78bfa` /
`purpleDark #8b5cf6` とは別キーにする (丸めない)。

### 3.3. `ChartSemanticColors` 型の後方互換

field を **追加** のみで既存の field (`salesPrev` 等) は name / type を
維持する。値のソース (palette) だけ変更する。これにより参照側 (chart tsx)
の書き換えを最小化する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `references/04-design-system/docs/chart-semantic-colors.md` | 業務概念 → 色 (追随対象) |
| `references/04-design-system/colors_and_type.css` | CSS 変数正本 (追随対象) |
| `app/src/presentation/theme/theme.ts` | ChartColors 定義 (Phase 1 変更) |
| `app/src/presentation/components/charts/DiscountTrendChart.tsx` | hard-code 除去対象 |
| `checklist.md` | 完了判定 checkbox |
