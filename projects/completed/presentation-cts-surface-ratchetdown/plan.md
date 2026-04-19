# plan — presentation-cts-surface-ratchetdown

## 不可侵原則

1. **動作を変えない** — 型参照の向き先変更に閉じる。値の計算方法・表示・UI ロジック等
   には一切手を入れない
2. **ratchet-down 方式** — 1 PR あたり 3〜5 ファイルで段階的に置換し、各 PR で
   baseline を減らす。一気に 0 を目指さない
3. **`CategoryLeafDailyEntry` は alias のまま進化させない** — 独自構造への進化は
   本 project scope 外（本 project 完了後に別 project で検討）
4. **test ファイルは allowlist 除外を基本** — `timeSlotLaneSurfaceGuard` 同様に
   test は guard 対象外とし、production 23 件に絞る
5. **bundle 消費経路は変えない** — 既に `useDayDetailPlan` 経由で bundle 配信されて
   いる箇所の配線は維持。本 project は consumer 内部の型 import だけを切替える

## Phase 構造

### Phase 1: guard 新設

`categoryLeafDailyLaneSurfaceGuard.test.ts` を新設し、`CategoryTimeSalesRecord`
が presentation 層（test 除く）で import されている件数を初期 baseline として固定。
`timeSlotLaneSurfaceGuard` と同じパターンで書く。

完了条件: guard がテスト PASS、baseline = 現状値（23 前後）で固定。

### Phase 2: widget 系（DayDetailModal 直下）の置換

DrilldownWaterfall / CategoryDrilldown / HourlyChart 周辺（約 10 ファイル）を
まず置換。関連性が高く、一気に処理しても回帰リスクが低い。

完了条件: widget 系 10 ファイルの置換完了。baseline 約 13 に低下。

### Phase 3: YoYWaterfall 系 + 階層フィルタ系

残 YoYWaterfall / カテゴリ階層 / PeriodFilter の 5 ファイルを置換。

完了条件: 該当 5 ファイル置換完了。baseline 約 8 に低下。

### Phase 4: context / widget 基盤 + Admin

`useUnifiedWidgetContext` / `widgets/types` / Admin の 3 ファイルを置換。

完了条件: baseline 約 5 に低下。

### Phase 5: 残りとガード永続化

残り件数を置換し baseline 0 到達。guard を「追加禁止」固定モードに移行。

完了条件: baseline 0 で固定。CI で通過する。

## やってはいけないこと

- 型参照の置換と合わせてロジック変更やリファクタリングを同じ PR に混ぜる
  → ratchet-down の意図が混ざり、diff レビューが困難になる
- `CategoryLeafDailyEntry` の構造を変更する → 本 project scope 外
- test ファイルを無理に置換対象に入れる → fixture の書き直しが膨大になる
- 1 PR で一気に 10 ファイル以上を置換する → レビュー粒度が大きすぎる

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts` | `CategoryLeafDailyEntry` 定義元（置換先） |
| `app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts` | 参考実装 |
| `app/src/test/allowlists/` | allowlist 配置場所 |
| `projects/completed/category-leaf-daily-series/HANDOFF.md` | 先行 project（§2 に対象ファイル一覧）|
