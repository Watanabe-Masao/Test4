# plan — calendar-modal-bundle-migration

## 不可侵原則

1. **契約拡張 → 移行の順序を守る** — `timeSlotLane.bundle` の契約を拡張せずに
   HourlyChart の移行に着手しない。「金額は bundle、点数は raw」の混在状態を
   短期間でも作らない
2. **既存 consumer の互換性を壊さない** — `timeSlotLane.bundle` を使う
   StoreHourlyChart 等の既存 consumer の挙動を Phase 1 で変えない。
   契約変更が breaking なら、当該 consumer も同 commit で更新する
3. **`data-flow-unification` の write path 保証を退行させない** — フォールバック層
   `selectCtsWithFallback` を撤廃する際、DuckDB 前年データロード網羅性が
   退行していないか E2E / 手動で確認してから削除する
4. **leaf-grain には触らない** — DrilldownWaterfall / CategoryDrilldown の
   bundle 経由化は本 project の scope 外。leaf-grain 対応の別 project を起こす
5. **DayDetailModal 自体には手を入れない** — モーダルの構造リフレッシュは
   `calendar-modal-refresh`（仮）の領域。本 project は HourlyChart の入力経路
   切替に閉じる

## Phase 構造

### Phase 1: timeSlotLane 契約拡張

`TimeSlotStoreEntry.byHour` を金額のみから「金額 + 点数のペア」または
別フィールド追加で拡張する。`comparisonScope.alignmentMode` の wow 拡張または
`timeSlotLane` 内部での wow 解決を実装する。既存 consumer の互換性を保証する。

完了条件: 拡張後の契約で current/comparison ともに金額・点数・wow が取得できる。
既存 consumer（StoreHourlyChart 等）が回帰なく動く。

### Phase 2: HourlyChart 移行

HourlyChart の入力を raw CTS から `timeSlotLane.bundle` に切り替える。
`buildHourlyDataSets` の引数を bundle 形式に変更し、
`selectCtsWithFallback` への HourlyChart 経由の依存を削除する。

完了条件: HourlyChart が raw CTS を直接消費しなくなる。ダッシュボードと
モーダルの時間帯表示が一致する。

### Phase 3: フォールバック撤廃と撤退判定

`selectCtsWithFallback` の独自フォールバック機構を完全削除する。
旧経路 consumer が 0 件であることを `timeSlotLaneSurfaceGuard` で確認する。
経路統一を保証するガードテストを追加する。

完了条件: `selectCtsWithFallback` が削除されている。surface guard baseline 0。
新規ガードテストが CI で通っている。

### Phase 4: ドキュメント更新

`runtime-data-path.md` / `data-pipeline-integrity.md` を最新状態に更新する。
`cd app && npm run docs:generate` を実行し generated section を最新化する。

完了条件: 関連 references が最新状態。docs:check 通過。

## やってはいけないこと

- HourlyChart の移行（Phase 2）から先に着手し、quantity を後付けで埋める
  → 「金額は bundle、点数は raw」の混在状態が発生し plan §0 違反
- `ComparisonScope` 全体に wow alignment を導入して影響範囲を広げる
  → 必要なら `timeSlotLane` 内部で wow を扱い、ComparisonScope 自体は触らない
  方を優先（影響範囲を局所化）
- 旧 `selectCtsWithFallback` を残したまま新経路を導入する
  → どちらも live になり drift の温床。撤廃と新経路導入を 1 commit にまとめる
  か、Phase 3 で確実に廃止する
- leaf-grain 用途で raw CTS が必要な consumer（DrilldownWaterfall /
  CategoryDrilldown）に手を入れる → 別 project の scope。本 project は触らない

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts` | 拡張対象の契約型 |
| `app/src/application/hooks/timeSlot/useTimeSlotBundle.ts` | 拡張対象の hook 実装 |
| `app/src/application/hooks/timeSlot/projectTimeSlotSeries.ts` | projection ロジック |
| `app/src/presentation/pages/Dashboard/widgets/HourlyChart.tsx` | 移行対象の consumer |
| `app/src/presentation/pages/Dashboard/widgets/HourlyChart.builders.ts` | 移行対象のロジック |
| `app/src/application/hooks/duckdb/dayDetailDataLogic.ts` | `selectCtsWithFallback` 定義（撤廃対象） |
| `app/src/application/hooks/plans/useDayDetailPlan.ts` | フォールバック呼び出し元（Phase A 完了済） |
| `app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts` | consumer baseline 監視 |
| `projects/completed/calendar-modal-route-unification/HANDOFF.md` | 先行 project（Phase A handler 統一の完了状態） |
