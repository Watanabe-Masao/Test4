# AI_CONTEXT — category-leaf-daily-entry-shape-break

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

CategoryLeafDailyEntry 独立構造化 — alias 解除で presentation を raw 型から完全隔離 (Option B 平坦化)（category-leaf-daily-entry-shape-break）

## Purpose

`presentation-cts-surface-ratchetdown` で presentation 層からの raw `CategoryTimeSalesRecord`
直接 import は 0 に到達したが、`CategoryLeafDailyEntry = CategoryTimeSalesRecord`
という **型 alias** のため TypeScript 上は同一型のままで、presentation が alias 経由で
`.department.code` / `.line.code` / `.klass.code` 等の raw フィールドを引き続き触れる
「見かけの isolation」状態にある。

本 project は `CategoryLeafDailyEntry` を **flat な独立 interface** に進化させ
(`deptCode / deptName / lineCode / lineName / klassCode / klassName` 等に平坦化)、
bundle projection 層で raw → entry 変換を完結させることで、presentation が raw
フィールドを型レベルで参照できない **真の structural isolation** を達成する。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 先行 project: `projects/completed/presentation-cts-surface-ratchetdown/HANDOFF.md`
6. 親 project: `projects/completed/category-leaf-daily-series/HANDOFF.md`

## Why this project exists

先行 project (`presentation-cts-surface-ratchetdown`) は **import 経路の隔離**
(presentation が `@/domain/models/record` を直接 import しない) を達成したが、
型システム上の構造的隔離 (`CategoryLeafDailyEntry` が raw 型と別構造を持つ) は
scope 外として意図的に後回しにされた (plan.md §不可侵原則 §3)。

本 project はそれを引き継ぎ、**presentation から raw フィールド `.department.code` 等が
型レベルで不可視になる** ところまで進める。両 project を scope で分離したのは:

- 先行 project は 23 ファイルの型 import を置換するだけで動作不変 (alias 維持)
- 本 project は **presentation consumer の field アクセス書換を伴う** ため
  動作変更リスクが段違い。同じ commit に混ぜるとレビュー粒度が爆発する

## Scope

含む:
- `CategoryLeafDailyEntry` を flat 独立 interface に進化 (Option B: dept/line/klass を平坦化)
- bundle projection 層 (`projectCategoryLeafDailySeries` / `useCategoryLeafDailyBundle`)
  で raw → flat 変換を完結
- presentation consumer の `.department.code` 等 → `.deptCode` 等への段階移行
- 新 guard: presentation 層での旧 nested field (`.department` / `.line` / `.klass`)
  アクセスを ratchet-down で 0 に駆動
- 既存 `categoryLeafDailyLaneSurfaceGuard` の拡張 (alias 解除後の role 整理)

含まない:
- `CategoryTimeSalesRecord` の domain/infra 層での使用 (正本型として存置)
- application/domain 層での field アクセスパターン
- test fixture の shape (presentation 側 fixture のみ必要に応じて更新)
- 時間帯配列 (`timeSlots`) の構造変更 — 将来別 project
- PI 値等の derived field の entry への pre-compute — 将来別 project

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `projects/completed/presentation-cts-surface-ratchetdown/HANDOFF.md` | 先行 project (import 経路隔離) |
| `projects/completed/category-leaf-daily-series/HANDOFF.md` | 親 project (CategoryLeafDailyBundle 新設) |
| `app/src/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts` | 本 project が進化させる中心型 |
| `app/src/domain/models/DataTypes.ts` | `CategoryTimeSalesRecord` (raw 型 / 置換元) |
| `app/src/test/guards/categoryLeafDailyLaneSurfaceGuard.test.ts` | 先行 guard (「追加禁止」固定モード) |
