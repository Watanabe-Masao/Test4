# checklist — presentation-quality-hardening

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。
>
> このチェックリストには **2026-04-12 時点で verification 済みの未着手項目のみ** を載せている。
> 下記以外の旧 active-debt 項目（5 件）は実コード上で削減完了済みのため掲載しない。

## Phase 1: WeatherPage の active-debt 解消

- [x] `useWeatherDaySelection.ts` を抽出する（selectedDays / selectedDows + 関連 6 callback）
- [x] `WeatherPage.tsx` の combined hook 数を default 以下に下げる
- [x] `app/src/test/allowlists/complexity.ts` から WeatherPage の allowlist エントリを削除する
- [x] `npm run test:guards` で WeatherPage の violation が出ないことを確認する

## Phase 2: 500 行超コンポーネントの `.vm.ts` 抽出

> verification (2026-04-12) で 500 行超を維持しているのは下記 3 件のみ。
> IntegratedSalesChart (現在 403 行) / StorageManagementTab (現在 126 行) は対象外。

- [x] `HourlyChart.tsx` (現 501 行) を `.vm.ts` 抽出で 500 行未満にする
- [x] `InsightTabBudget.tsx` (現 581 行) を `.vm.ts` 抽出で 500 行未満にする
- [x] `InsightTabForecast.tsx` (現 514 行) を `.vm.ts` 抽出で 500 行未満にする
- [x] sizeGuard が 3 件全てに対して PASS することを確認する

## Phase 3: Presentation テストカバレッジ + E2E 拡充

> **前提条件:** 本 Phase の coverage 70 引き上げに着手する前に、AAG Core 側の
> `projects/completed/test-signal-integrity` Phase 3（Hard Gate 1st Batch）が完了している
> ことを確認する。これにより coverage 数値達成のために品質シグナルを歪める
> 行為（無価値テスト / suppression）が機械的に止まる前提が整う。

- [x] `projects/completed/test-signal-integrity` の Phase 3 完了を確認する（前提条件 — 機能的 Phase 1〜5 完了済、最終人間レビューのみ）
- [x] `vitest.config.ts` の coverage include に `presentation/` を追加する
- [x] Presentation 層の高優先 component（IntegratedSalesChart / DashboardPage / WeatherPage）に component test を追加する
- [ ] coverage 閾値を `lines: 55` → `lines: 70` に引き上げる
  - Step 3-40 (2026-04-20): 45 → 47 に進捗。残 23 pt を継続 ratchet up
- [ ] CI で coverage 70% を満たすことを確認する
  - Step 3-40 時点の予想現実値 ~48.3%（要 +22 pt）
- [x] `app/e2e/` の業務フロー spec を現在の 4 件から 8 件以上に拡充する
- [x] 拡充 spec が `npm run test:e2e` で全て pass することを確認する
  - Step 3-40 (2026-04-20): main 最新 5 CI run が全 success (runs #2039〜#2047)

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2 +
> `references/03-guides/projectization-policy.md` §8

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を人間がレビューし、archive プロセスへの移行を承認する
