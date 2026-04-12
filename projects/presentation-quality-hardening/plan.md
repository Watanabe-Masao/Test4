# plan — presentation-quality-hardening

## 不可侵原則

1. **coverage 閾値の引き上げは実装と並行する** — 機械的に変えると CI 即赤
2. **`.vm.ts` 抽出は描画ロジックと VM の責務分離が明示できる場合のみ** — ファイル分割それ自体が目的ではない
3. **active-debt 削減のための hook 抽出は callback 依存を切れる単位だけ抽出する** — 循環依存を作らない
4. **テスト追加は「動くことの検証」ではなく「壊れたら気づく検証」になっていること**

## Phase 構造

### Phase 1: WeatherPage の hook 抽出（active-debt 残）

`useWeatherDaySelection` を抽出し WeatherPage の combined hook 数を default
以下に下げる。詳細: `references/03-guides/active-debt-refactoring-plan.md` Phase H。

### Phase 2: 500 行超コンポーネントの `.vm.ts` 抽出

verification (2026-04-12) で 500 行超を維持しているのは:
- `HourlyChart.tsx` (501)
- `InsightTabBudget.tsx` (581)
- `InsightTabForecast.tsx` (514)

の 3 件のみ（IntegratedSalesChart / StorageManagementTab は既に削減済）。
これらの描画ロジックを `.vm.ts` に抽出する。

### Phase 3: Presentation テストカバレッジ + E2E

Presentation 層の component test 追加と coverage 閾値 55→70% 引き上げ。
E2E spec を業務フロー単位に拡充（現在 4 spec のみ）。

## やってはいけないこと

- coverage 閾値だけ上げて test 追加を後回しにする → CI が壊れる
- `.vm.ts` 抽出のために描画と State の境界をまたぐ
- 既に default 以下の component (`IntegratedSalesChart` / `StorageManagementTab`) を再リファクタリングする → 不要な churn
- ロールシステム軽量化（R-9）をここに混ぜる → architecture-decision-backlog の所掌

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/presentation/pages/Weather/WeatherPage.tsx` | Phase 1 対象 |
| `app/src/presentation/charts/HourlyChart.tsx` | Phase 2 対象 |
| `app/src/features/category/ui/widgets/InsightTabBudget.tsx` | Phase 2 対象（要パス確認） |
| `app/src/features/category/ui/widgets/InsightTabForecast.tsx` | Phase 2 対象（要パス確認） |
| `app/e2e/` | Phase 3 対象 |
| `app/vitest.config.ts` | Phase 3 coverage 設定 |
