# checklist — chart-color-alignment

> 役割: completion 判定の入力。
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]`。

## Phase 0: scaffolding

* [x] branch `feat/chart-color-alignment` を main から作成
* [x] projects/chart-color-alignment/ に 5-doc + config/project.json 配置

## Phase 1: theme 拡張 ✅ 完了 (main 取り込み済み)

* [x] `tokens.ts` の palette に `purpleMid: '#a855f7'` を追加
* [x] `theme.ts` の `ChartSemanticColors` interface に 6 field 追加 (discountPolicy / discountRegister / discountWaste / discountSampling / cumulativeDiscountRate / cumulativeDiscountRatePrev)
* [x] `theme.ts` の `semantic.salesPrev / budgetPrev / grossProfitPrev / customersPrev / quantityPrev / discountPrev` を全て `palette.slate` に変更
* [x] `theme.ts` の `semantic` に 6 field の値を追加 (discount subtype + 累計率)
* [x] `cd app && npm run build` PASS (型エラー無し)
* [x] `cd app && npm run test:guards` PASS

## Phase 2: chart 移行 ✅ 完了 (main 取り込み済み)

* [x] `DiscountTrendChart.tsx` の hard-coded `DISCOUNT_COLORS` 配列を除去し、theme 経由に置換 (DISCOUNT_COLOR_KEYS として維持、値は `theme.chart.semantic[key]` 経由)
* [x] `DiscountTrendChart.tsx` の累計売変率参照を `semantic.cumulativeDiscountRate` 経由に置換
* [x] `grep -rn "#[0-9a-f]\{6\}" app/src/presentation/components/charts/DiscountTrend*` で新規 hex literal 0 件
* [x] `cd app && npm run lint` PASS
* [x] `cd app && npm run build` PASS
* [x] `cd app && npm run test:guards` PASS

## Phase 3: v2.1 DS doc 追随 ✅ 完了 (main 取り込み済み)

* [x] `colors_and_type.css` の `--chart-sales-prev / --chart-budget-prev / --chart-gross-profit-prev / --chart-customers-prev / --chart-quantity-prev / --chart-discount-prev` を `var(--c-slate)` に変更
* [x] `colors_and_type.css` に `--chart-discount-71 / -72 / -73 / -74` を追加
* [x] `colors_and_type.css` に `--chart-cumulative-discount-rate / --chart-cumulative-discount-rate-prev` を追加
* [x] `colors_and_type.css` の palette 層に `--c-purple-mid: #a855f7` を追加
* [x] `docs/chart-semantic-colors.md` に「前年バーは常に slate」ルール + 売変 subtype 表 + 累計率 表 を明記
* [x] `docs/tokens.md` に `purpleMid` を追加 (`--c-purple-mid: #a855f7` を `--c-purple / -mid / -dark / -deep` 行に含めて記載)
* [x] `preview/chart-semantic/index.html` に新 chip (discount subtype 4 + 累計率 2) を追加

## Phase 4: 検証 ✅ 自動検証完了 / 視覚確認は人間タスク

* [x] `cd app && npm run lint` PASS (2026-04-20)
* [x] `cd app && npm run build` PASS (2026-04-20)
* [x] `cd app && npm run test:guards` PASS (705 tests / 2026-04-20)
* [x] `cd app && npm run docs:check` PASS (2026-04-20)
* [x] 人間: `references/04-design-system/preview/index.html` + 実アプリで前年バー gray を視覚確認 (2026-04-20: DiscountTrendChart 全 tab + ダッシュボード全体で前年バー slate を確認)
* [x] 人間: 売変チャート (DiscountTrendChart) で 71-74 の色が実装前と同じであることを視覚確認 (2026-04-20: 71 red / 72 orange / 73 yellow / 74 purpleMid を確認)

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [x] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する (2026-04-20)
