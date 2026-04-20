# AI_CONTEXT — chart-color-alignment

> 役割: project 意味空間の入口 (why / scope / read order)。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

Chart Color Alignment — 前年バー slate 統一 + 売変 71-74 tokenize (chart-color-alignment)

## Purpose

スクリーンショットで示された chart 実装の現状に、theme + v2.1 DS doc を
揃える。3 つの gap を埋める:

1. **前年バー色の不統一**: `chart.previousYear = palette.slate` (並列配置) と
   `chart.semantic.*Prev = ${color}60` (pair 配置) が chart により使い分けられて
   いた。新方針では全 chart で `palette.slate` に統一する
2. **売変 71-74 の hard-code**: `DiscountTrendChart.tsx:25` で
   `['#ef4444','#f97316','#eab308','#a855f7']` が配列 literal として記述。
   `theme.chart.semantic.discountPolicy/Register/Waste/Sampling` に昇格する
3. **累計売変率の theme 未定義**: 当年 `palette.orange` / 前年
   `chart.previousYear` を chart 側で直接参照。
   `theme.chart.semantic.cumulativeDiscountRate` に昇格する

## Scope

### 対象

- `app/src/presentation/theme/tokens.ts`: palette に `purpleMid = '#a855f7'`
  を追加 (売変 74 の実色)
- `app/src/presentation/theme/theme.ts`: `ChartSemanticColors` 型拡張 +
  `*Prev` を `palette.slate` に変更 + 売変 subtype / 累計率追加
- `app/src/presentation/components/charts/DiscountTrendChart.tsx` 他:
  hard-coded 配列を theme 参照に移行
- `references/04-design-system/colors_and_type.css`: CSS 変数追随
- `references/04-design-system/docs/chart-semantic-colors.md` 他: doc 追随
- `references/04-design-system/preview/chart-semantic/index.html`: preview 追随

### 対象外

- Palette の semantic カラー (primary/success/danger 等) の色変更
- 気温色 (tempHigh/tempLow) — 既に一致
- 新規 chart type の追加
- カテゴリ gradients (ti/to/bi/bo 等) の変更

## Read Order

1. 本ファイル (AI_CONTEXT.md)
2. `HANDOFF.md` — 現在地と次の作業
3. `plan.md` — 不可侵原則と phase 構造
4. `checklist.md` — 完了判定 checkbox

## Required References

| 文書 | 役割 |
|---|---|
| `references/04-design-system/docs/chart-semantic-colors.md` | 業務概念 → 色 マップ (更新対象) |
| `references/04-design-system/docs/tokens.md` | 全トークン一覧 (更新対象) |
| `app/src/presentation/theme/theme.ts` | ChartColors / ChartSemanticColors 定義 |
| `app/src/presentation/theme/tokens.ts` | palette (拡張対象) |

## Constraints

- **視覚的回帰**: 前年バー色変更は全 chart に波及。Phase 2 以降で人間による
  ビジュアル確認を必須とする
- **破壊的型変更を避ける**: `ChartSemanticColors` の既存 field (salesPrev 等)
  の **型** は変えない。値の構築方法だけ変える
- **Hard-code 検出**: chart に `#[0-9a-f]{6}` を新規追加しない
  (theme + palette 経由のみ)
