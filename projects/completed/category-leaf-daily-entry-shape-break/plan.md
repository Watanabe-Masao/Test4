# plan — category-leaf-daily-entry-shape-break

## 不可侵原則

1. **動作を変えない** — 本 project は型形状の進化と consumer の field アクセスパターン
   置換に閉じる。値の計算方法・表示・UI ロジック等には一切手を入れない
2. **非破壊段階移行** — Phase 1 で intersection 型で flat field を **並行** 追加し、
   Phase Final まで既存 consumer が壊れない経路を確保する
3. **projection 層を唯一の生成点にする** — flat field (`deptCode` 等) は
   `projectCategoryLeafDailySeries` のみが生成する。consumer が手動で構築しない
4. **ratchet-down 方式** — 1 PR あたり 3〜5 ファイルで段階的に
   `.department.code` → `.deptCode` 等の field 置換を進め、各 PR で baseline を減らす
5. **`CategoryTimeSalesRecord` は削除しない** — domain/infra/application 層での
   raw 型使用は存置。本 project は「presentation を raw 型から隔離する projection 境界
   の明示化」であって、raw 型そのものの抹消ではない
6. **test ファイルは allowlist 除外を基本** — 先行 project と同じ policy。
   presentation 配下の test は guard 対象外とする。必要なら
   `makeLeafDailyEntry` fixture helper を導入して fixture 改修コストを下げる
7. **guard 2 層防御を最終到達点にする** — `categoryLeafDailyLaneSurfaceGuard`
   (import surface / 固定済み) + `categoryLeafDailyNestedFieldGuard`
   (field surface / 新設 → 段階縮退 → 固定モード) の両立で初めて「見ない」を達成

## Phase 構造

### Phase 1: flat shape 追加 + projection 層拡張 (非破壊)

`CategoryLeafDailyEntry` を intersection 型に変更し、flat field を並行提供する:

```ts
export type CategoryLeafDailyEntry = CategoryTimeSalesRecord & {
  readonly deptCode: string
  readonly deptName: string
  readonly lineCode: string
  readonly lineName: string
  readonly klassCode: string
  readonly klassName: string
}
```

`projectCategoryLeafDailySeries` で flat field を computed して entry に同梱。
`useCategoryLeafDailyBundle` は projection を通した entry のみを配布する。
parity test で `projection(r).deptCode === r.department.code` 等の不変を固定。

**完了条件**: 既存 consumer 未変更で build + test + guard 全 PASS。
flat field が全 entry に付与され、parity test が安定。

### Phase 2: 新 guard 新設 + 初期 baseline 固定

`categoryLeafDailyNestedFieldGuard.test.ts` を新設。presentation 層 (production) で
`\.department\.` / `\.line\.` / `\.klass\.` の access 数を計測し、初期 baseline として
固定。`categoryLeafDailyLaneSurfaceGuard` と同じ ALLOWLIST pattern + BASELINE 定数
+ orphan/stale test で構造を揃える。

**完了条件**: guard が CI PASS、baseline = 現状値で固定。

### Phase 3: consumer 段階移行 (ratchet-down)

presentation 層の `.department.code` / `.department.name` / `.line.code` /
`.line.name` / `.klass.code` / `.klass.name` アクセスを `.deptCode` / `.deptName` /
`.lineCode` / `.lineName` / `.klassCode` / `.klassName` に段階置換。

クラスタごとに複数 PR に分割 (1 PR 3-5 files):
- Phase 3a: DrilldownWaterfall 周辺
- Phase 3b: HourlyChart 周辺
- Phase 3c: YoYWaterfall + 階層・Period フィルタ
- Phase 3d: 残り (useDrilldown hooks / context / Admin)

各 PR で guard baseline を更新し単調減少。

**完了条件**: 全クラスタ移行完了、baseline 0 到達。

### Phase 4: alias 解除 + 独立 interface 化

baseline 0 到達後、`CategoryLeafDailyEntry` を intersection から独立 interface に昇格:

```ts
export interface CategoryLeafDailyEntry {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly storeId: string
  readonly deptCode: string
  readonly deptName: string
  readonly lineCode: string
  readonly lineName: string
  readonly klassCode: string
  readonly klassName: string
  readonly timeSlots: readonly TimeSlotEntry[]
  readonly totalQuantity: number
  readonly totalAmount: number
}
```

`projectCategoryLeafDailySeries` で raw → flat 完全変換 (nested field を参照しない
entry 構造に)。`CategoryTimeSalesRecord` からの継承 (`& CategoryTimeSalesRecord`) を
切り、TypeScript 上で別型として扱われるようにする。

**完了条件**: 型分離後も build + test + guard 全 PASS。parity test が新 shape で
安定。presentation から raw nested field アクセスが **型レベルで不可能** になる。

### Phase 5: guard 固定化 + 2 層防御の確定

`categoryLeafDailyNestedFieldGuard` を「追加禁止」固定モードに移行。
`categoryLeafDailyLaneSurfaceGuard` (import surface) と合わせて 2 層防御を確定。
新 consumer が raw 型や raw field に触れないことを CI が機械的に保証する状態へ。

**完了条件**: 2 guard が共に固定モード。presentation 層 production で
`CategoryTimeSalesRecord` import 0 + `.department.*` / `.line.*` / `.klass.*`
access 0。

## やってはいけないこと

- Phase 1 を飛ばして一気に独立 interface 化 → 全 presentation consumer が同時に
  コンパイルエラーになり、変更粒度が爆発してレビュー不能になる
- projection 層以外 (consumer) で flat field を手動生成 → projection 層の
  一意性が崩れ、値の発散を起こし得る
- `CategoryTimeSalesRecord` 側の構造変更 → 本 project scope 外。raw 型は
  domain/infra の正本として不変
- 同じ PR に動作変更 (計算ロジック / UI) を混ぜる → ratchet-down の意図が
  不明瞭になり、回帰原因の切り分けができなくなる
- test fixture を無理に全変換する → 先行 project と同様に allowlist 除外を
  基本とし、必要なら fixture helper で段階移行する

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts` | 本 project の中心型 (alias → intersection → 独立 interface の進化経路) |
| `app/src/application/hooks/categoryLeafDaily/projectCategoryLeafDailySeries.ts` | projection 層 (flat field 生成の唯一点) |
| `app/src/application/hooks/categoryLeafDaily/__tests__/projectCategoryLeafDailySeries.test.ts` | parity test (入出力の不変確認) |
| `app/src/test/guards/categoryLeafDailyLaneSurfaceGuard.test.ts` | 先行 guard (import surface、固定モード) |
| `app/src/test/guards/categoryLeafDailyNestedFieldGuard.test.ts` | 新 guard (field surface、本 project で新設) |
| `app/src/domain/models/DataTypes.ts` | `CategoryTimeSalesRecord` (raw 型 / projection の入力側) |
| `projects/completed/presentation-cts-surface-ratchetdown/` | 先行 project (import 経路隔離) |
