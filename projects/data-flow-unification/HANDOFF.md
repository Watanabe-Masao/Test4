# HANDOFF — data-flow-unification

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**解決済み。** 根本原因を特定し修正完了。ガードテスト追加・診断ログ除去まで完了。

## 2. 根本原因

### `deleteMonth()` が `is_prev_year=true` 行を巻き込み削除していた

**ファイル:** `app/src/infrastructure/duckdb/deletePolicy.ts`

`deleteMonth()` は `DELETE FROM table WHERE year = ? AND month = ?` を実行していたが、
`is_prev_year` 列を区別していなかった。これにより `is_prev_year=true`（前年データ）と
`is_prev_year=false`（当年データ）が同時に削除されていた。

#### 発生メカニズム

`useDuckDB` の初回ロードシーケンス:

```
1. resetTables()
2. loadMonth(currentMonth, 2026, 4)        ← 当月ロード
3. loadMonth(prevYear, 2025, 4, true)      ← 前年4月 CTS 18680行 INSERT
4. 歴史月ループ:
   loadMonth(historicalData, 2025, 4)      ← 当年ロード (isPrevYear=false)
     → purgeLoadTarget → deleteMonth(2025, 4)
     → DELETE FROM category_time_sales WHERE year = 2025 AND month = 4
     → ★ step 3 で入れた is_prev_year=true の 18680行も消える ★
     → 当年データのみ再INSERT
5. materializeSummary()
```

結果: `category_time_sales` の `is_prev_year=true` 行は 2月〜3月だけが残り、
4月のデータがない。comparison query が `WHERE date_key BETWEEN '2025-04-02' AND
'2025-04-14' AND is_prev_year = TRUE` で **0 件**を返す。

#### 診断ログによる実証

```
ctsPrevCount: 31133          ← 前年 CTS データはある
ctsMinDate: "2025-02-01"    ← しかし日付範囲は 2月〜3月
ctsMaxDate: "2025-03-31"    ← 4月のデータがない
dateFrom: "2025-04-02"      ← クエリは4月を探している → 0件
```

### 修正内容

`deleteMonth()` で `TABLES_WITH_PREV_YEAR_FLAG` に該当するテーブルは
`AND is_prev_year = false` 条件を付けて当年行のみ削除。
前年行の削除は `deletePrevYearRowsAt()` が責任を持つ設計を維持。

### 再発防止

`dataIntegrityGuard.test.ts` に Pattern 2 のテストとして以下を追加:
- `deleteMonth` が `TABLES_WITH_PREV_YEAR_FLAG` を参照していること
- `deleteMonth` が `is_prev_year = false` 条件を使っていること

## 3. 解決手順（時系列）

| # | 修正 | ファイル | 効果 |
|---|---|---|---|
| 1 | スライダー分母固定 | `ConditionSummaryEnhanced.tsx` | 客数がスライダーに連動 |
| 2 | MA色重複 | `DailySalesChartBody.builders.ts`, `theme.ts` | 売上MA/点数MAを色で区別 |
| 3 | 5要素分解フォールバック | `YoYWaterfallChart.data.ts` | hasQuantity=false 時に2要素表示 |
| 4 | SQL エラー（customers, total, alias） | `freePeriodFactQueries.ts` 他 | クエリエラー解消 |
| 5 | materializeSummary force | `storeDaySummary.ts`, `useDuckDB.ts` | 差分ロード後の再マテリアライズ |
| 6 | calculateYoYRatio 統一 | `conditionSummaryCardBuilders.ts` | ドメイン関数準拠 |
| 7 | 欠落4スライス追加 | `loadComparisonDataAsync.ts` | purchase/directProduce/transfers のロード |
| 8 | useAutoLoadPrevYear 削除 | dead code 除去 | 二重経路の解消 |
| 9 | QueryExecutor.dataVersion | `QueryPort.ts`, `useQueryWithHandler.ts` | DuckDB ロード後の再クエリ保証 |
| **10** | **deleteMonth 前年行保護** | **`deletePolicy.ts`** | **根本原因の修正** |
| 11 | ガードテスト追加 | `dataIntegrityGuard.test.ts` | 再発防止 |
| 12 | 診断ログ除去 | 6ファイル | Phase 1 完了 |
| 13 | orphan テストのリネーム | `application/comparison/adjacentMonthUtils.test.ts` | dead hook 名のテスト整理 |
| 14 | stale comment 除去 | 5ファイル（hooks/comparison/storage/presentation） | 削除済みフック参照の解消 |

## 4. ハマりポイント

### 4.1. `deleteMonth` vs `deletePrevYearRowsAt` の責務分離

`deleteMonth` は「当月データの差し替え」に使われる。`is_prev_year=true` 行を消すのは
`deletePrevYearRowsAt` の責務。この境界を破ると、歴史月ロード時に前年データが
巻き込まれて消える。**ガードテストで保護済み。**

### 4.2. `deletePrevYearMonth` の year-shift 設計

`deletePrevYearMonth(conn, year, month)` は引数として **当年** を受け取り、
内部で `year - 1` する。絶対位置で消す場合は `deletePrevYearRowsAt` を使う。

### 4.3. 診断ログの設計原則

Phase 1 で追加した診断ログは 5 段構造（取得→state→DuckDB→consumer→計算）で設計。
構造化ログ名で grep 可能にし、Phase 5 で一括除去する前提。

## 5. 次フェーズ: カレンダーモーダルの正規ルート統一

### 背景

カレンダーモーダル（`useDayDetailPlan`）は `categoryTimeRecordsHandler` を直接呼び、
前年データ取得に独自フォールバック（`selectCtsWithFallback`）を持つ。
ダッシュボードは `categoryDailyLane.bundle` 経由の正本経路。
この二重経路が「モーダルでは動くがダッシュボードでは動かない」バグの構造的原因。

### 統一方針

| データ種別 | 現状（モーダル） | 統一先 | 制約 |
|---|---|---|---|
| 数量（totalQuantity） | raw CTS 直接合算 | `categoryDailyLane.bundle` | なし |
| 時間帯データ | raw CTS `timeSlots` | `timeSlotLane.bundle` | なし |
| leaf-grain CTS（5要素分解） | raw CTS 直接参照 | `categoryTimeRecordsPairHandler` に一本化 | dept\|line\|klass 粒度が必要 |

### 実施順序

1. **Phase A: paired handler 統一**
   - モーダルの `useDayDetailPlan` が `categoryTimeRecordsHandler` を個別呼びしている箇所を
     `categoryTimeRecordsPairHandler` 経由に統一
   - これで取得経路は 1 本化。raw CTS 参照は残るが、handler は共通

2. **Phase B: 数量・時間帯の bundle 経由化**
   - モーダルの数量合算を `categoryDailyLane.bundle.currentSeries.grandTotals.salesQty` 経由に
   - モーダルの時間帯データを `timeSlotLane.bundle` 経由に
   - `selectCtsWithFallback` の独自フォールバック機構を廃止

3. **Phase C: leaf-grain 対応（将来）**
   - `CategoryLeafDailySeries` を新設し、5要素分解も正本経由にする
   - Phase 6.5-5b の permanent floor を解消
   - 影響範囲が大きいため、別プロジェクトとして計画

### 旧経路の撤退判定

各 Phase 完了時に以下を確認:
- 旧経路を使う consumer が 0 件であること（`categoryDailyLaneSurfaceGuard` で検証）
- ガードテストの baseline が 0 に到達していること
- 全チャートで前年データが正しく表示されること

旧経路の削除は Phase B 完了後に実施。Phase C は別プロジェクト。

## 6. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md` | 冪等性保証の先行 project |
| `references/01-principles/data-pipeline-integrity.md` | データパイプライン整合性 |
| `references/03-guides/runtime-data-path.md` | 実行時データ経路 |
