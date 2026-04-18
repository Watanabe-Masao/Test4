# HANDOFF — category-leaf-daily-series

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 1〜5 実装完了（surface guard 0 到達のみ未達、別 ratchet-down project へ移管）。**
`CategoryLeafDailyBundle` を新設し、`useDayDetailPlan` の fallback 付き pair 呼び出し
4 箇所を 2 bundle 呼び出しに集約。`selectCtsWithFallback` / `selectCtsWithFallbackFromPair` /
`buildCtsPairInput` と関連テストを削除。fallback 意味論は bundle 内部に畳み込み済み。

**残件**: 3 consumer およびその周辺 32 files の `CategoryTimeSalesRecord` 直接 import
を `CategoryLeafDailyEntry` に置換する ratchet-down 作業は scope が広いため本 project
では未実施。surface guard の baseline 0 化は**後続 project で ratchet-down 方式で
進める**方針。

## 1.1. Phase 1〜5 成果サマリ

### 採用設計

| 論点 | 採用 | 根拠 |
|---|---|---|
| `CategoryLeafDailyEntry` の構造 | `CategoryTimeSalesRecord` の type alias | consumer 側無変更で bundle 配線のみ切替可能、影響範囲を最小化 |
| bundle 内部 fallback | pair + 単発 fallback の 2 query を hook 内で畳み込み | 消費側は `bundle.comparisonSeries` のみ意識。意味論を 1 箇所に凝集 |
| 3 consumer の型更新 | 後続 ratchet-down project で実施 | 影響ファイル 32 で本 project の scope creep となる |

### 新設ファイル

| パス | 役割 |
|---|---|
| `application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts` | 契約型（Frame / Entry / Series / Bundle / Provenance / Meta）|
| `application/hooks/categoryLeafDaily/projectCategoryLeafDailySeries.ts` | pure projection（records → series）|
| `application/hooks/categoryLeafDaily/useCategoryLeafDailyBundle.ts` | bundle hook（pair + fallback を 1 API に集約）|
| `application/hooks/categoryLeafDaily/__tests__/projectCategoryLeafDailySeries.test.ts` | truth-table test |

### 変更ファイル

| パス | 変更 |
|---|---|
| `application/hooks/plans/useDayDetailPlan.ts` | `selectCtsWithFallbackFromPair` 依存を撤去し `useCategoryLeafDailyBundle` を 2 回（day / cum）呼び出す形に再編。192 行 budget 遵守 |
| `application/hooks/duckdb/dayDetailDataLogic.ts` | `selectCtsWithFallback` / `selectCtsWithFallbackFromPair` / `buildCtsPairInput` を削除。`DayDetailData` の CTS entry 型を `CategoryLeafDailyEntry` に切替 |
| `application/hooks/duckdb/__tests__/dayDetailDataLogic.test.ts` | 削除された helper のテストを撤去、`makeAsyncResult` ヘルパも除去 |
| `test/allowlists/performance.ts` | `useCategoryLeafDailyBundle.ts` を `pairJustifiedSingle` に登録（fallback 単発呼び出しは pair 化不能） |
| `test/guards/responsibilityTagGuard.test.ts` | `UNCLASSIFIED_BASELINE` を 402→401 に ratchet-down |

### データフロー（Phase 5 後）

```
useDayDetailPlan
  ├─ useCategoryLeafDailyBundle(dayFrame)        [当日 + 比較日 leaf-grain]
  │   └─ categoryTimeRecordsPairHandler（current + comparison）
  │      + categoryTimeRecordsHandler（comparison 空時の fallback）
  │   → dayLeafBundle.currentSeries / comparisonSeries
  ├─ useCategoryLeafDailyBundle(cumFrame)        [累計 leaf-grain]
  │   → cumLeafBundle.currentSeries / comparisonSeries
  ├─ useTimeSlotBundle(timeSlotFrame)            [時間帯集計]
  └─ wow（単発、categoryTimeRecordsHandler）

DayDetailModal → DayDetailHourlyTab / DayDetailSalesTab → 3 consumer
  dayRecords = dayLeafBundle.currentSeries.entries（CategoryLeafDailyEntry[]）
  prevDayRecords = dayLeafBundle.comparisonSeries.entries（fallback 反映後）
  cumRecords / cumPrevRecords も同様
```

## 2. 次にやること（後続 ratchet-down project 候補）

### 目標

`CategoryTimeSalesRecord` の presentation 直接 import を 32 → 0 に ratchet-down する。

### アプローチ

1. `categoryLeafDailyLaneSurfaceGuard` を新設し、初期 baseline 32 で登録する
2. ファイルを数件ずつ `CategoryLeafDailyEntry` 参照に置換する PR を段階的に出す
3. 各 PR で baseline を減らす（ratchet-down）
4. 0 到達したら contract を育てる（例: `CategoryLeafDailyEntry` を独自構造に進化、
   `CategoryTimeSalesRecord` からの alias を解除）

### 対象ファイル一覧（32 件）

- YoYWaterfall 系（5 ファイル: builders / data / logic / vm / tests）
- CategoryFactor 系（3 ファイル）
- CategoryDrilldown / DrilldownWaterfall / HourlyChart + tests
- useDrilldown 系
- CategoryHierarchyData / HierarchyDropdown
- UnifiedWidgetContext / widgets/types.ts
- Admin/RawDataTabBuilders
- 各種 test ファイル

## 3. ハマりポイント

### 3.1. `CategoryLeafDailyEntry` は現状 `CategoryTimeSalesRecord` の alias

同型 alias のため surface guard を「`CategoryTimeSalesRecord` を presentation で
import 禁止」と書いても、実質的に追加の安全性は稼げない。guard の意味は「infra 由来の
名前を使わない」という layer 規律のみ。将来、`CategoryLeafDailyEntry` を独自構造に
進化させたときに初めて型制約として効く。

### 3.2. bundle 内部 fallback の発火条件

`useCategoryLeafDailyBundle` の fallback は:
- frame.comparison が存在
- pair 呼び出しの comparison が 0 件
- fallback 呼び出しが 0 件超

の**全て**を満たしたときだけ発火する。`usedComparisonFallback: true` は
`meta.provenance` に明示される。

### 3.3. wow は本契約の対象外

`timeSlotLane` と同じ policy を踏襲。HourlyChart 時間帯モードの wow は別経路で
維持されているため、bundle 契約側で wow alignment を導入しない。

### 3.4. Shapley 5 要素分解の pending 設計

`DrilldownWaterfall` の `decompose5` / `decomposePriceMix` は `(dept, line, klass)`
leaf-grain key が前提。entries が同粒度を持っていれば動作する。bundle 契約は現状
records の pass-through なので問題ないが、将来 entries を日次集約（dateKey 粒度）に
進化させる場合は leaf-grain key を別 field として残す必要がある。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `app/src/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types.ts` | 契約型（本 project の核）|
| `app/src/application/hooks/categoryLeafDaily/useCategoryLeafDailyBundle.ts` | bundle hook 実装 |
| `app/src/application/hooks/plans/useDayDetailPlan.ts` | bundle 経由への再編後の plan |
| `projects/completed/calendar-modal-bundle-migration/HANDOFF.md` | 先行 project（§1.2 に撤退条件 + 本 project との連結）|
| `projects/presentation-cts-surface-ratchetdown/HANDOFF.md` | 後続 project（32 件 surface guard 0 到達の ratchet-down）|

Archived: 2026-04-18
