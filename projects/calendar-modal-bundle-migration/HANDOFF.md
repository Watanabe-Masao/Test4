# HANDOFF — calendar-modal-bundle-migration

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**未着手。** `calendar-modal-route-unification` の Phase A 完了 + B-3 採用に伴い、
本 project に Phase B/C/D が移管された。最初の作業は `timeSlotLane.bundle` の
契約拡張（quantity + wow）。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を 1-2 段で要約する。

### 高優先（Phase 1: 契約拡張）

- `timeSlotLane.bundle` の `TimeSlotStoreEntry.byHour` を金額のみから
  金額 + 点数のペア構造に拡張する（または別フィールド追加）
- `comparisonScope` の wow alignment を `timeSlotLane.bundle` で扱える形に拡張する
- 契約変更の影響範囲を調査し、既存 consumer（StoreHourlyChart 等）の互換性を確認する

### 中優先（Phase 2: HourlyChart 移行）

- HourlyChart の入力を raw CTS から `timeSlotLane.bundle` に切り替える
- `selectCtsWithFallback` への HourlyChart 経由の依存を削除する

### 低優先（Phase 3: 撤退判定とガード固定）

- 旧経路 consumer が 0 件であることを `timeSlotLaneSurfaceGuard` で確認する
- `selectCtsWithFallback` の独自フォールバック機構を完全削除する
- 経路統一を保証するガードテストを追加する

### Out of scope（別 project）

- DrilldownWaterfall / CategoryDrilldown の bundle 経由化（leaf-grain 対応 =
  `CategoryLeafDailySeries` 新設が前提のため、別 project として計画）
- DayDetailModal 自体の構造リフレッシュ（`calendar-modal-refresh` 仮として後続）

## 3. ハマりポイント

### 3.1. timeSlotLane の契約変更は他 consumer に波及する

`StoreHourlyChart` 等、HourlyChart 以外の consumer が `timeSlotLane.bundle` を
使っている可能性がある。契約拡張時に既存 consumer の互換性を保証することが必須。
**選択肢**: (a) 後方互換オプショナルフィールドで段階追加、(b) 一括 breaking change で
全 consumer を同時更新。プロジェクト規模を見て判断する。

### 3.2. wow alignment は ComparisonScope の意味論拡張になる

現 `ComparisonScope.alignmentMode` は `sameDate` / `sameDayOfWeek` のみ。
wow（前週同曜日）を加えると意味論が広がる。**ComparisonScope 自体に手を入れるか、
`timeSlotLane` 内部で wow を解決するかの設計判断が必要**。前者は影響範囲大。

### 3.3. `selectCtsWithFallback` 撤廃は `data-flow-unification` の保証に依存

write path（DuckDB への前年データ投入）が完全に保証されているという前提で
フォールバック層を撤廃する。`data-flow-unification` の archive 状態を再確認し、
実運用で前年データが空になるケースが本当にないかを E2E / 手動で検証してから撤廃する。

### 3.4. HourlyChart の数量・金額の表示は意味的に独立

bundle 経由化で「金額は bundle、点数は raw」の混在を**短期間でも**作らない。
契約拡張 → HourlyChart 移行を Phase 1 → Phase 2 で順序通りに進める。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts` | 拡張対象の契約型 |
| `app/src/application/hooks/timeSlot/useTimeSlotBundle.ts` | 拡張対象の hook 実装 |
| `app/src/presentation/pages/Dashboard/widgets/HourlyChart.tsx` | 移行対象の consumer |
| `app/src/presentation/pages/Dashboard/widgets/HourlyChart.builders.ts` | 移行対象のロジック |
| `app/src/application/hooks/duckdb/dayDetailDataLogic.ts` | `selectCtsWithFallback` 定義（撤廃対象） |
| `app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts` | consumer baseline 監視 |
| `projects/completed/calendar-modal-route-unification/HANDOFF.md` | 先行 project |
