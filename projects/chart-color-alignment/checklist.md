# checklist — chart-color-alignment

> 役割: completion 判定の入力。
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]`。

## Phase 0: scaffolding

* [x] branch `feat/chart-color-alignment` を main から作成
* [x] projects/chart-color-alignment/ に 5-doc + config/project.json 配置

## Phase 1: theme 拡張

* [ ] `tokens.ts` の palette に `purpleMid: '#a855f7'` を追加
* [ ] `theme.ts` の `ChartSemanticColors` interface に 6 field 追加 (discountPolicy / discountRegister / discountWaste / discountSampling / cumulativeDiscountRate / cumulativeDiscountRatePrev)
* [ ] `theme.ts` の `semantic.salesPrev / budgetPrev / grossProfitPrev / customersPrev / quantityPrev / discountPrev` を全て `palette.slate` に変更
* [ ] `theme.ts` の `semantic` に 6 field の値を追加 (discount subtype + 累計率)
* [ ] `cd app && npm run build` PASS (型エラー無し)
* [ ] `cd app && npm run test:guards` PASS

## Phase 2: chart 移行

* [ ] `DiscountTrendChart.tsx` の hard-coded `DISCOUNT_COLORS` 配列を除去し、theme 経由に置換
* [ ] `DiscountTrendChart.tsx` の累計売変率参照を `semantic.cumulativeDiscountRate` 経由に置換
* [ ] `grep -rn "#[0-9a-f]\{6\}" app/src/presentation/components/charts/DiscountTrend*` で新規 hex literal 0 件
* [ ] `cd app && npm run lint` PASS
* [ ] `cd app && npm run build` PASS
* [ ] `cd app && npm run test:guards` PASS

## Phase 3: v2.1 DS doc 追随

* [ ] `colors_and_type.css` の `--chart-sales-prev / --chart-budget-prev / --chart-gross-profit-prev / --chart-customers-prev / --chart-quantity-prev / --chart-discount-prev` を `var(--c-slate)` に変更
* [ ] `colors_and_type.css` に `--chart-discount-71 / -72 / -73 / -74` を追加
* [ ] `colors_and_type.css` に `--chart-cumulative-discount-rate / --chart-cumulative-discount-rate-prev` を追加
* [ ] `colors_and_type.css` の palette 層に `--c-purple-mid: #a855f7` を追加
* [ ] `docs/chart-semantic-colors.md` に「前年バーは常に slate」ルール + 売変 subtype 表 + 累計率 表 を明記
* [ ] `docs/tokens.md` に `purpleMid` を追加
* [ ] `preview/chart-semantic/index.html` に新 chip (discount subtype 4 + 累計率 2) を追加

## Phase 4: 検証

* [ ] `cd app && npm run lint` PASS
* [ ] `cd app && npm run build` PASS
* [ ] `cd app && npm run test:guards` PASS
* [ ] `cd app && npm run docs:check` PASS
* [ ] 人間: `references/04-design-system/preview/index.html` + 実アプリで前年バー gray を視覚確認
* [ ] 人間: 売変チャート (DiscountTrendChart) で 71-74 の色が実装前と同じであることを視覚確認

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
