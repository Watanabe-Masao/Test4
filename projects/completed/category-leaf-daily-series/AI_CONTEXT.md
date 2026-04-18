# AI_CONTEXT — category-leaf-daily-series

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

カテゴリ leaf-grain 正本化 — `CategoryLeafDailySeries` 新設と 3 consumer 載せ替え
（category-leaf-daily-series）

## Purpose

dept\|line\|klass 粒度（leaf-grain）を必要とする 3 presentation consumer
（`DrilldownWaterfall` の Shapley 5 要素分解 / `CategoryDrilldown` のカテゴリ階層
ドリルダウン / `HourlyChart.hourDetail` の選択時間帯カテゴリ別内訳）のために
raw CTS（`CategoryTimeSalesRecord`）が presentation 層に残っている。
`categoryDailyLane.bundle` は dept 粒度までしか持たないため、leaf-grain を
扱える正本契約（`CategoryLeafDailySeries` 等）を新設し、3 consumer を載せ替えて
raw CTS の presentation 依存を完全に解消する。

これにより `selectCtsWithFallback` / `selectCtsWithFallbackFromPair` の削除が
可能となり、`calendar-modal-bundle-migration` Phase 3 の「削除実行」を完遂できる。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 必要に応じて関連 references/ ドキュメント

## Why this project exists

`calendar-modal-bundle-migration` は Phase 1 / 2 で timeSlotLane 契約拡張と
HourlyChart の時間帯集計 bundle 移行を完了した。しかし hourDetail / DrilldownWaterfall /
CategoryDrilldown の leaf-grain 依存は残り、raw CTS が presentation 層に届く経路が
維持されている。この経路を閉じるには **bundle 契約の粒度拡張**（dept →
dept\|line\|klass）が必要で、影響範囲が広いため独立 project として切り出した。
根拠: `references/03-guides/project-checklist-governance.md` §0
（複数の動線・コンテキストを混ぜない原則）。

先行 project `calendar-modal-bundle-migration` の HANDOFF §1.2 に撤退条件が
明文化されており、本 project はその条件を満たすことをゴールとする。

## Scope

含む:
- `CategoryLeafDailySeries`（または同等）契約型の設計・新設
- `CategoryLeafDailyBundle` hook と projection 関数の実装
- `DrilldownWaterfall` の leaf-grain 経由への載せ替え
- `CategoryDrilldown` の leaf-grain 経由への載せ替え
- `HourlyChart.hourDetail` の leaf-grain 経由への載せ替え
- `useDayDetailPlan` から `prevDayRecords` / `cumPrevRecords`（raw CTS）を取り除く
- `selectCtsWithFallback` / `selectCtsWithFallbackFromPair` の削除
- leaf-grain surface guard 追加（raw CTS の presentation 直接 import を 0 に ratchet-down）

含まない:
- wow alignment の bundle 対応（`timeSlotLane` / `calendar-modal-bundle-migration` で
  方針固定済み — `sameDate` / `sameDayOfWeek` 限定、wow は raw 継続）
- DayDetailModal 自体の構造リフレッシュ（`calendar-modal-refresh` 仮として後続）
- IndexedDB → DuckDB ロード経路（`data-flow-unification` で完了）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane |
| `references/03-guides/chart-data-flow-map.md` | HourlyChart 2 経路（bundle + leaf-grain）の現状 |
| `app/src/application/hooks/categoryDaily/CategoryDailyBundle.types.ts` | dept 粒度の bundle 契約（拡張参考） |
| `projects/completed/calendar-modal-bundle-migration/HANDOFF.md` | 先行 project。§1.2 に撤退条件 |
