# plan — chart-color-alignment

## 不可侵原則

1. **palette の既存 semantic カラーを変えない** — primary/success/danger 等の
   色は据置。新規 key (`purpleMid`) の追加のみ
2. **型の破壊的変更を避ける** — `ChartSemanticColors` 既存 field は名前・型を
   維持、追加は純 additive にする
3. **hard-code を増やさない** — chart tsx に `#[0-9a-f]{6}` を新規追加しない
4. **視覚的回帰は human review** — 機械テストでは検出できない color 差は
   必ず人間のプレビュー確認で検証する
5. **Scope 固定** — 下表以外の chart の色は触らない

## Phase 構造

### Phase 0: scaffolding (完了)

branch 作成と project 5-doc 配置。

### Phase 1: theme 拡張

`tokens.ts` + `theme.ts` を以下の通り変更:
- `palette.purpleMid = '#a855f7'` を追加
- `ChartSemanticColors` に 6 field 追加 (discount subtype 4 + 累計率 2)
- `semantic.*Prev` 6 field の値を `palette.slate` に変更
- type check PASS 確認

### Phase 2: chart 移行

- `DiscountTrendChart.tsx`: `DISCOUNT_COLORS` 配列を theme 参照に置換、累計率の
  直接参照を semantic 経由に置換
- 他の関連 chart に hard-code discount color があれば同様に移行
- build + lint PASS

### Phase 3: v2.1 DS doc 追随

- `colors_and_type.css`: `--chart-*-prev` を slate var に変更、
  `--chart-discount-71..74` と `--chart-cumulative-discount-rate*` 追加
- `docs/chart-semantic-colors.md`: 前年 rule + 売変 subtype + 累計率 記載
- `docs/tokens.md`: `purpleMid` 追加
- `preview/chart-semantic/index.html`: chip 追加

### Phase 4: 検証

- `npm run lint` / `npm run build` / `npm run test:guards` / `npm run docs:check` 全 PASS
- 人間: preview/index.html + 実アプリ画面で visual review
- `references/04-design-system/` の 49 ファイル structure 維持

### 最終レビュー (人間承認)

## やってはいけないこと

- palette の既存 semantic カラーを色変更 → palette は安定保証領域
- `ChartSemanticColors` から field を削除 → 既存 chart の参照を壊す
- chart tsx に新しい `#hex` literal を追加 → hard-code 増殖
- `docs:generate` 実行忘れで generated section drift

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/presentation/theme/tokens.ts` | palette 定義 (purpleMid 追加) |
| `app/src/presentation/theme/theme.ts` | ChartSemanticColors 拡張 + *Prev → slate |
| `app/src/presentation/components/charts/DiscountTrendChart.tsx` | hard-code 除去対象 |
| `references/04-design-system/colors_and_type.css` | CSS 変数正本 (追随) |
| `references/04-design-system/docs/chart-semantic-colors.md` | 業務概念 → 色 (追随) |
