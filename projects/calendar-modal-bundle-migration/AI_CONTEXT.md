# AI_CONTEXT — calendar-modal-bundle-migration

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

カレンダーモーダル bundle 移行 — timeSlotLane 契約拡張 + HourlyChart の bundle 経由化
（calendar-modal-bundle-migration）

## Purpose

`calendar-modal-route-unification` の Phase A で handler を統一した次の段階として、
モーダル内の HourlyChart を `timeSlotLane.bundle` 経由化する。
ただし現契約は **金額のみ・wow alignment なし** で HourlyChart の要件を
満たさないため、最初に `timeSlotLane.bundle` の契約拡張（quantity 追加 +
wow alignment 追加）を行い、その上で HourlyChart の bundle 移行と
`selectCtsWithFallback` フォールバック層撤廃を実施する。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 必要に応じて関連 references/ ドキュメント

## Why this project exists

`calendar-modal-route-unification` の Phase B 棚卸しで、`timeSlotLane.bundle` の
現契約（金額のみ・sameDate/sameDayOfWeek のみ）が HourlyChart の要件
（金額 + 点数 + WoW 比較）を満たさないことが判明した。前 project は handler 統一の
scope に留めて archive し、本 project で契約拡張から始める方針を採用した
（plan.md §0「複数の動線・コンテキストを混ぜない原則」/ AAG Layer 4A）。
本 project は契約拡張と移行に閉じる。leaf-grain（dept\|line\|klass）への対応は
さらに後の project とする。

## Scope

含む:
- `timeSlotLane.bundle` 契約の拡張（quantity フィールド追加 + wow alignment 追加）
- 契約拡張の影響範囲調査（HourlyChart 以外の consumer: StoreHourlyChart 等）
- HourlyChart の入力を `timeSlotLane.bundle` 経由に移行
- `selectCtsWithFallback` の独自フォールバック機構の段階的撤廃
- 移行後の旧経路撤退判定（baseline 0 確認）
- 経路統一を保証するガードテスト追加

含まない:
- leaf-grain CTS（5 要素分解）の正本化（後続 project として計画）
- handler 統一（`calendar-modal-route-unification` Phase A で完了）
- IndexedDB → DuckDB ロード経路（`data-flow-unification` で完了）
- DayDetailModal 自体の構造リフレッシュ（`calendar-modal-refresh` 仮として後続）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane の 2 系統経路 |
| `app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts` | 拡張対象の契約型 |
| `projects/completed/calendar-modal-route-unification/HANDOFF.md` | 先行 project（Phase A handler 統一の完了状態） |
| `projects/completed/data-flow-unification/HANDOFF.md` | write path 整合化の先行 project |
