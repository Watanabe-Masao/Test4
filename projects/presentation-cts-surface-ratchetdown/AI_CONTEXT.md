# AI_CONTEXT — presentation-cts-surface-ratchetdown

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

Presentation 層の CategoryTimeSalesRecord 直接 import を 32 → 0 に ratchet-down
（presentation-cts-surface-ratchetdown）

## Purpose

`category-leaf-daily-series` で `CategoryLeafDailyBundle` 契約と `CategoryLeafDailyEntry`
型（`CategoryTimeSalesRecord` の同型 alias）を整備した。次の段階として、presentation
層に残る `CategoryTimeSalesRecord` 直接 import 32 件を `CategoryLeafDailyEntry` に
段階的に置換し、surface guard の baseline を 32 → 0 に ratchet-down する。

本 project は「機能追加」ではなく **layer 規律の整理** に閉じる。動作は変えず、
型参照の向き先だけを infra 由来（`@/domain/models/record`）から正本契約
（`@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types`）に揃える。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 必要に応じて関連 references/ ドキュメント

## Why this project exists

先行 project `category-leaf-daily-series` は bundle 契約と hook 実装、fallback 畳み
込み、旧 helper 削除までを完了した。しかし presentation 層から `CategoryTimeSalesRecord`
を直接 import している 32 件のファイルは、影響範囲が本 project の scope を超えた
ため未着手のまま。これは「infra 由来の型名を presentation が直接知る」という
layer 規律違反で、bundle 契約を将来独自構造に進化させる際の制約になる。

本 project はこの問題単独に focus し、ratchet-down 方式で段階的に 0 到達を目指す。

## Scope

含む:
- `categoryLeafDailyLaneSurfaceGuard.test.ts` の新設（初期 baseline 32）
- 32 件の `CategoryTimeSalesRecord` 直接 import を `CategoryLeafDailyEntry` に置換
  （型参照のみ。実装ロジックは touch しない）
- baseline を段階的に 32 → 0 に ratchet-down
- 0 到達後、guard を永続化（「presentation は infra record 型を直接 import しない」）

含まない:
- `CategoryLeafDailyEntry` の独自構造進化（本 project 完了後、別 project で検討）
- bundle 契約の新しい用途追加
- 動作変更（値の計算方法・表示・ロジック等には一切手を入れない）
- DayDetailModal の構造リフレッシュ（`calendar-modal-refresh` 仮）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `app/src/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts` | `CategoryLeafDailyEntry` の定義元（置換先）|
| `app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts` | 参考実装（同じパターンで ratchet-down 済み）|
| `projects/completed/category-leaf-daily-series/HANDOFF.md` | 先行 project。§2 に対象 32 ファイル一覧と進め方 |
