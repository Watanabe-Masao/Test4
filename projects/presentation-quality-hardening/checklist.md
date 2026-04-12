# checklist — presentation-quality-hardening

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> このチェックリストには **2026-04-12 時点で verification 済みの未着手項目のみ** を載せている。
> 下記以外の旧 active-debt 項目（5 件）は実コード上で削減完了済みのため掲載しない。

## Phase 1: WeatherPage の active-debt 解消

* [ ] `useWeatherDaySelection.ts` を抽出する（selectedDays / selectedDows + 関連 6 callback）
* [ ] `WeatherPage.tsx` の combined hook 数を default 以下に下げる
* [ ] `app/src/test/allowlists/complexity.ts` から WeatherPage の allowlist エントリを削除する
* [ ] `npm run test:guards` で WeatherPage の violation が出ないことを確認する

## Phase 2: 500 行超コンポーネントの `.vm.ts` 抽出

> verification (2026-04-12) で 500 行超を維持しているのは下記 3 件のみ。
> IntegratedSalesChart (現在 403 行) / StorageManagementTab (現在 126 行) は対象外。

* [ ] `HourlyChart.tsx` (現 501 行) を `.vm.ts` 抽出で 500 行未満にする
* [ ] `InsightTabBudget.tsx` (現 581 行) を `.vm.ts` 抽出で 500 行未満にする
* [ ] `InsightTabForecast.tsx` (現 514 行) を `.vm.ts` 抽出で 500 行未満にする
* [ ] sizeGuard が 3 件全てに対して PASS することを確認する

## Phase 3: Presentation テストカバレッジ + E2E 拡充

* [ ] `vitest.config.ts` の coverage include に `presentation/` を追加する
* [ ] Presentation 層の高優先 component（IntegratedSalesChart / DashboardPage / WeatherPage）に component test を追加する
* [ ] coverage 閾値を `lines: 55` → `lines: 70` に引き上げる
* [ ] CI で coverage 70% を満たすことを確認する
* [ ] `app/e2e/` の業務フロー spec を現在の 4 件から 8 件以上に拡充する
* [ ] 拡充 spec が `npm run test:e2e` で全て pass することを確認する
