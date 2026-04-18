# HANDOFF — category-leaf-daily-series

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**未着手。** `calendar-modal-bundle-migration` の archive に伴い、Phase 3
「削除実行」が本 project に移管された。先行 project の HANDOFF §1.2 に
撤退条件が固定されている。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を 1-2 段で要約する。

### 高優先（Phase 1: 契約設計）

- `CategoryLeafDailySeries`（または同等）の型契約を設計
  - 粒度: `(deptCode, lineCode, klassCode, dateKey)` + `amount` / `quantity` /
    `customers` 等の最小面
  - 時間帯別（hour 次元）を含めるかは separate decision（hourDetail のために必要）
- 先行 bundle 契約（`CategoryDailyBundle.types.ts`）と sibling 関係の形式を踏襲
- Infra query（SQL）の射影形を併せて設計

### 中優先（Phase 2-4: 実装と移行）

- projection pure 関数 + parity test
- bundle hook（`useCategoryLeafDailyBundle`）
- `DrilldownWaterfall` / `CategoryDrilldown` / `HourlyChart.hourDetail` を順次移行
- `useDayDetailPlan` から `prevDayRecords` / `cumPrevRecords`（raw CTS）を撤去

### 低優先（Phase 5: 撤退実行）

- `selectCtsWithFallback` / `selectCtsWithFallbackFromPair` 削除
- surface guard 追加（raw CTS の presentation 直接 import を 0 件化）

### Out of scope（別 project）

- wow alignment の bundle 対応（契約外と固定済み）
- DayDetailModal 構造リフレッシュ（`calendar-modal-refresh` 仮）

## 3. ハマりポイント

### 3.1. Shapley 5 要素分解は leaf-grain key を要求する

`DrilldownWaterfall` の `decompose5` / `decomposePriceMix` は `(dept, line, klass)`
3 次元の同時集計を必要とする。bundle 契約の設計時に「key 粒度 = 3 次元タプル」を
前提とすること。`CategoryDailyBundle` の dept のみ粒度では扱えない。

### 3.2. 時間帯 × leaf-grain の複合粒度

`HourlyChart.hourDetail` は `(hour, dept, line, klass)` 4 次元を同時に扱う。
bundle 契約を「日次 leaf-grain」で作るか「時間帯 leaf-grain」まで広げるかは
要件調整（両方必要かもしれない）。設計 Phase 1 で判断を明文化する。

### 3.3. 比較期間のフォールバック概念を残すか

`selectCtsWithFallback` は「前年スコープが空なら当年スコープで代替」という
救済機構だった。`data-flow-unification` 以降は write path が保証されているため
不要だが、leaf-grain bundle にも同様のフォールバックを埋めるかは設計判断。
基本は不要（bundle 契約側で usedFallback meta を表現するのみ）が望ましい。

### 3.4. 既存 consumer の順序

- `DrilldownWaterfall` → dayRecords / prevDayRecords / wowPrevDayRecords
- `CategoryDrilldown` → records / prevRecords / cumRecords / cumPrevRecords / wowRecords
- `HourlyChart.hourDetail` → dayRecords / prevDayRecords

wow 経路は `timeSlotLane` 同様 **bundle 対象外**とし、既存の raw 取得を維持する
可能性がある。Phase 1 で方針を確定する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `projects/completed/calendar-modal-bundle-migration/HANDOFF.md` | 先行 project。§1.2 に撤退条件 |
| `app/src/application/hooks/categoryDaily/CategoryDailyBundle.types.ts` | dept 粒度 bundle（拡張参考） |
| `app/src/application/hooks/timeSlot/TimeSlotBundle.types.ts` | 時間帯 bundle（拡張参考） |
| `app/src/application/hooks/duckdb/dayDetailDataLogic.ts` | `selectCtsWithFallback` / `selectCtsWithFallbackFromPair` 定義（削除対象） |
| `app/src/application/hooks/plans/useDayDetailPlan.ts` | `prevDayRecords` / `cumPrevRecords` の供給元（撤去対象）|
| `app/src/presentation/pages/Dashboard/widgets/DrilldownWaterfall.tsx` | leaf-grain consumer 1 |
| `app/src/presentation/pages/Dashboard/widgets/CategoryDrilldown.tsx` | leaf-grain consumer 2 |
| `app/src/presentation/pages/Dashboard/widgets/HourlyChart.tsx` | leaf-grain consumer 3（hourDetail）|
