# HANDOFF — category-leaf-daily-entry-shape-break

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 1-2 完了 / Phase 3 未着手 (2026-04-20)。**

先行 project `presentation-cts-surface-ratchetdown` で presentation 層の
`CategoryTimeSalesRecord` 直接 import は 0 に到達し、guard も固定モードに
移行済み。しかし `CategoryLeafDailyEntry = CategoryTimeSalesRecord` の **型 alias**
のため、TypeScript 上は依然 raw 型と同一で、presentation は alias 経由で
`.department.code` 等の raw フィールドに触れる。

本 project は `CategoryLeafDailyEntry` を **flat 独立 interface** に進化させ、
真の structural isolation を達成する。

### 1.1 Phase 1 完了 (2026-04-19)

- `CategoryLeafDailyEntry` を intersection 型に進化させ flat field
  (`deptCode / deptName / lineCode / lineName / klassCode / klassName`) を並行提供
- `projectCategoryLeafDailySeries.ts` に `toCategoryLeafDailyEntries` 純関数を
  切り出し、flat field 生成の唯一点とした
- parity test 3 件で nested ↔ flat の 6 不変を凍結
- `useDayDetailPlan` / `useYoYWaterfallPlan` の acquisition 境界で projection を適用し
  下流には flat field 付き entry を配布

### 1.2 Phase 2 完了 (2026-04-20)

- `categoryLeafDailyNestedFieldGuard.test.ts` を新設 (5 tests: 本体 + baseline +
  orphan + stale + flat field 生成点の存在確認)
- 初期 baseline 7 ファイル (production only) を固定:
  - `categoryFactorBreakdownLogic.ts` (16 件)
  - `useHierarchyDropdown.ts` (13 件)
  - `drilldownUtils.ts` (8 件)
  - `HourlyChart.logic.ts` (4 件)
  - `DrilldownWaterfall.tsx` (4 件)
  - `categoryHierarchyHooks.ts` (2 件)
  - `categoryFactorUtils.ts` (1 件)
- `categoryLeafDailyLaneSurfaceGuard` (import surface / baseline 0 固定) との
  2 層防御が成立。Phase 3 以降は field surface 側を単調減少させる。

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先（Phase 1: flat shape 追加 + projection 層拡張）

- `CategoryLeafDailyEntry` の現 alias を残したまま、**intersection 型**で
  新 flat field (`deptCode / deptName / lineCode / lineName / klassCode / klassName`)
  を追加: `type CategoryLeafDailyEntry = CategoryTimeSalesRecord & { readonly deptCode: ...; ... }`
- `projectCategoryLeafDailySeries` で projection 実装 (raw field を読んで
  flat field を computed して entry に同梱)
- parity test: `projection(r).deptCode === r.department.code` 等の不変を固定
- **非破壊的。既存 consumer は壊れない。**

### 中優先（Phase 2-N: consumer 移行）

新 guard `categoryLeafDailyNestedFieldGuard` を新設し、presentation 層での
`.department.` / `.line.` / `.klass.` アクセス数を ratchet-down。

1 PR あたり 3〜5 ファイル程度でクラスタごとに段階移行:
- Phase 2: DrilldownWaterfall 周辺
- Phase 3: HourlyChart 周辺
- Phase 4: YoYWaterfall + 階層・Period フィルタ
- Phase 5: 残り (useDrilldown hooks / context / Admin)

### 低優先（Phase Final: alias 解除 + 独立 interface 化）

- baseline 0 到達後、`CategoryLeafDailyEntry` を intersection から
  **独立 interface** に昇格 (`CategoryTimeSalesRecord` 継承を切断)
- `projectCategoryLeafDailySeries` で raw → flat 完全変換
- `categoryLeafDailyNestedFieldGuard` を「追加禁止」固定モードに
- 先行 guard `categoryLeafDailyLaneSurfaceGuard` との役割整理 (import surface と
  field surface の 2 層防御)

## 3. ハマりポイント

### 3.1. Phase 1 の intersection 型が中間状態

Phase 1 で `CategoryLeafDailyEntry = CategoryTimeSalesRecord & { deptCode, ... }` に
する意図は「既存 consumer を壊さず新 field を並行提供する」非破壊経路の確保。
ただし intersection のため raw field もまだ見える。Phase Final で初めて独立 interface
(`& CategoryTimeSalesRecord` を外す) に進化させる。**Phase 1 で完全隔離は到達しない。**

### 3.2. projection 層を唯一の生成点にする

flat field (`deptCode` 等) は `projectCategoryLeafDailySeries` のみが生成する。
consumer が手動で `{ ...rec, deptCode: rec.department.code }` 等を組まないよう
guard / code review で押さえる。projection の一意性は parity test で固定。

### 3.3. fixture の shape

presentation 層の test fixture は raw 型で書かれているものが多い。alias 解除後は
flat shape で書き直す必要がある。**fixture helper** を 1 つ導入して
`makeLeafDailyEntry(partial): CategoryLeafDailyEntry` を提供すると移行コストが下がる。
先行 project の教訓 (test 除外 policy) を踏襲するか、本 project で test も touch するかは
Phase 1 立案時に決める。

### 3.4. 非 presentation 消費者 (application / features)

`useDayDetailPlan` / `dayDetailDataLogic` 等 application 層にも
`CategoryLeafDailyEntry[]` を引き回す箇所がある。これらは bundle projection
の入口なので flat field を扱う責務を持つ。presentation の raw field アクセス
ratchet-down と同時に application 層の型参照も新 shape に整合させる。

### 3.5. `CategoryTimeSalesRecord` は削除しない

domain/infra/application 層での raw 型使用は存置 (query 結果型・正本)。
本 project は「alias を解除して presentation を隔離する」が目標であって、
raw 型そのものの抹消ではない。`CategoryTimeSalesRecord` → `CategoryLeafDailyEntry`
の **projection 境界** を明示することが本質。

### 3.6. guard 2 層防御の維持

- `categoryLeafDailyLaneSurfaceGuard`: import surface (domain/models/record を
  presentation から import しない) の固定モード
- `categoryLeafDailyNestedFieldGuard` (新設): field surface (`.department.` 等
  raw nested field) の ratchet-down → 0 到達後固定モード

両 guard が揃って初めて「presentation が raw 型を見ない」が成立する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `app/src/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts` | 本 project が進化させる中心型 |
| `app/src/application/hooks/categoryLeafDaily/projectCategoryLeafDailySeries.ts` | projection 層 (flat field 生成点) |
| `app/src/test/guards/categoryLeafDailyLaneSurfaceGuard.test.ts` | 先行 guard (import surface) |
| `app/src/domain/models/DataTypes.ts` | `CategoryTimeSalesRecord` (raw 型 / 置換元) |
| `projects/completed/presentation-cts-surface-ratchetdown/HANDOFF.md` | 先行 project |
| `projects/completed/category-leaf-daily-series/HANDOFF.md` | 親 project |
