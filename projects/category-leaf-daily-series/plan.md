# plan — category-leaf-daily-series

## 不可侵原則

1. **bundle 契約を先に確定してから consumer を載せ替える** — `TimeSlotBundle`
   拡張（quantity additive）と同じ順序。契約拡張なしに consumer を改修しない
2. **削除は全 consumer 載せ替え完了後** — `selectCtsWithFallback` /
   `selectCtsWithFallbackFromPair` は 3 consumer が leaf-grain 正本経由に
   載せ替わるまで削除しない。中途状態を短期間でも作らない
3. **wow は bundle 対象外を維持** — `timeSlotLane` と同じ方針。wow 経路を
   bundle で扱わないのは `calendar-modal-bundle-migration` で fixed
4. **hourDetail の時間帯 × leaf-grain 粒度は Phase 1 で明示判断する** —
   「日次 leaf-grain」と「時間帯 × leaf-grain」のどちらか / 両方かを先に決める
5. **`data-flow-unification` / `calendar-modal-bundle-migration` の成果を壊さない** —
   write path 保証 / timeSlotLane 契約 / HourlyChart の bundle 経由化を退行させない

## Phase 構造

### Phase 1: 契約設計

`CategoryLeafDailySeries`（または同等）の型契約を設計し、先行 bundle
（`CategoryDailyBundle` / `TimeSlotBundle`）と sibling 関係の形式で固定する。
粒度が日次のみで十分か、時間帯まで必要かを consumer 要件から逆算して決定する。

完了条件: 契約型ファイル（`CategoryLeafDailyBundle.types.ts` 等）が存在し、
consumer 3 種の要件を満たすことが truth-table コメントで明文化されている。

### Phase 2: Infra + projection 実装

SQL 射影（leaf-grain の集計クエリ）と projection pure 関数、parity test を
新設する。先行 `projectCategoryDailySeries` / `projectTimeSlotSeries` と同じ
パターンで、fixture ベースの truth-table で意味境界を凍結する。

完了条件: `projectCategoryLeafDailySeries` + parity test が緑。
`useCategoryLeafDailyBundle` hook が標準の `useQueryWithHandler` 経由で動く。

### Phase 3: consumer 載せ替え

- `DrilldownWaterfall` の `decompose5` / `decomposePriceMix` 入力を leaf-grain
  正本経由に
- `CategoryDrilldown` のカテゴリ階層（dept → line → klass）を leaf-grain 正本経由に
- `HourlyChart.hourDetail` の選択時間帯カテゴリ別内訳を leaf-grain 正本経由に

完了条件: 3 consumer の raw CTS 直接参照が 0 件。表示値が回帰なく動く。

### Phase 4: 撤退実行

- `useDayDetailPlan` から `prevDayRecords` / `cumPrevRecords`（raw CTS）を撤去
- `selectCtsWithFallback` / `selectCtsWithFallbackFromPair` を削除
- leaf-grain surface guard を追加（raw CTS の presentation 直接 import を 0 に
  ratchet-down）

完了条件: 上記 3 シンボル / 残存 raw CTS 参照が完全に消え、surface guard が
baseline 0 で通る。

### Phase 5: ドキュメント更新

`chart-data-flow-map.md` の HourlyChart セクションを leaf-grain も bundle 経由と
なった最終状態に更新。`runtime-data-path.md` / `data-pipeline-integrity.md` も
対応更新。doc-registry に記録。

完了条件: 関連 references が最新状態。docs:check 通過。

## やってはいけないこと

- consumer 載せ替え（Phase 3）から先に着手し、契約拡張（Phase 1-2）を後回しにする
  → 中途状態で「raw 経路と leaf-grain bundle が混在」し plan §0 違反
- `categoryDailyLane.bundle` に leaf-grain を後付けで乗せる
  → dept 粒度の契約（`CategoryDailyBundle.types.ts`）を壊す。sibling 関係を保つ
- wow alignment の leaf-grain 対応を本 project に混ぜる
  → scope creep。`timeSlotLane` と同じ方針（bundle 対象外）を踏襲する
- `selectCtsWithFallback` を consumer 載せ替え前に削除する
  → ランタイムで空表示になるケースが発生する
- DayDetailModal 自体の構造リフレッシュに踏み込む
  → `calendar-modal-refresh`（仮）の領域

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/application/hooks/categoryDaily/CategoryDailyBundle.types.ts` | dept 粒度 bundle（拡張参考） |
| `app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts` | 時間帯 bundle（拡張参考） |
| `app/src/application/hooks/duckdb/dayDetailDataLogic.ts` | `selectCtsWithFallback` / `selectCtsWithFallbackFromPair` 定義（削除対象） |
| `app/src/application/hooks/plans/useDayDetailPlan.ts` | `prevDayRecords` / `cumPrevRecords` の供給元（撤去対象）|
| `app/src/presentation/pages/Dashboard/widgets/DrilldownWaterfall.tsx` | leaf-grain consumer 1 |
| `app/src/presentation/pages/Dashboard/widgets/CategoryDrilldown.tsx` | leaf-grain consumer 2 |
| `app/src/presentation/pages/Dashboard/widgets/HourlyChart.tsx` | leaf-grain consumer 3（hourDetail）|
| `app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts` | surface guard の参考 |
| `projects/completed/calendar-modal-bundle-migration/HANDOFF.md` | 先行 project（撤退条件は §1.2）|
