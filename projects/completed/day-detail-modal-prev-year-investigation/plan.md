# plan — day-detail-modal-prev-year-investigation

## 不可侵原則

1. **本 project は調査のみ** — fix 実装は scope 外。原因確定時点で
   別 project / quick-fixes に task を引き渡す
2. **現実を正直に観測する** — 症状の見た目で仮説を固定しない。DevTools / SQL /
   Network tab で runtime データを直接見て判定する
3. **候補は 3 層 (A/B/C) のいずれか** — データ / クエリ / インジェスト。
   想像で新候補を増やさず、観測結果で確定する
4. **Worker timeout と混同しない** — `useCalculation` の timeout は別処理系
   (main dashboard 用)。本調査と並発生しているが別原因
5. **完了条件は「原因層の確定」** — fix 実装が無くても原因確定で完了とする

## Phase 構造

### Phase 1: runtime 観測で原因層を絞る (10 分目安)

DayDetailModal を開いた状態で以下を観測:

1. **React DevTools**: DayDetailModal 内の hook/state から
   `dayLeafBundle.currentSeries.entries` の長さと `entries[0]` の中身を確認
   - `entries.length === 0` → A 候補 (query 0 行返却)
   - `entries[0].totalQuantity === 0` → C 候補 (ingest 集計)
   - `entries[0].timeSlots.length === 0` → B 候補 (time_slots JOIN)

2. **DuckDB console** (DevTools → Console で直接 SQL 実行可能):
   ```sql
   SELECT COUNT(*) AS cts_prev FROM category_time_sales WHERE is_prev_year = TRUE;
   SELECT COUNT(*) AS ts_prev FROM time_slots WHERE is_prev_year = TRUE;
   SELECT COUNT(*) AS cts_cur FROM category_time_sales WHERE is_prev_year = FALSE;
   SELECT COUNT(*) AS ts_cur FROM time_slots WHERE is_prev_year = FALSE;
   ```
   - prev 0 / cur >0 → **A または C 確定** (ingest で prev year flag が欠落)
   - prev >0 / ts_prev 0 → **B 確定** (time_slots の ingest 漏れ)
   - 全て >0 → JOIN 条件 or WHERE 条件の検証へ

3. **Provenance 観測**: `dayLeafBundle.meta.provenance.usedComparisonFallback`
   - `true` なら primary 空 → fallback 発火 → fallback も空の可能性を追う
   - `false` なら primary が返っているが中身が不完全

**完了条件**: 候補 A/B/C のいずれか 1 つに確定する (または「新候補 D」が
必要と判断される)。

### Phase 2: 原因の精密特定

Phase 1 の結果を受けて:

**A 候補の場合** (query 0 行返却):
- `buildCtsConditions` の `is_prev_year` WHERE の値を実行時に確認
- bundle の `pairInput.comparisonDateFrom/To` が正しく設定されているか
- DuckDB 側のインデックスを確認

**B 候補の場合** (time_slots JOIN 空):
- LEFT JOIN の結合キー 6 個
  (`store_id / date_key / dept_code / line_code / klass_code / is_prev_year`)
  のうちどれが不一致か SQL で特定
- time_slots table のサンプル行を 10 件取得して `is_prev_year` 分布を確認

**C 候補の場合** (ingest 集計):
- xlsx / csv import の集計コードで `totalQuantity` の計算を確認
- `category_time_sales` の `total_quantity` column が NULL / 0 の割合

**完了条件**: 問題のコード/データ/設定を 1-3 箇所に絞り込む。

### Phase 3: fix 方針の決定 + 引き渡し

- **軽微 (1-3 ファイル修正)**: `projects/quick-fixes/checklist.md` に
  task を追加し引き渡す
- **複数層に跨る**: 新 fix project を起票 (名前候補:
  `day-detail-modal-data-fix` / `cts-prev-year-ingest-fix` 等)
- **データ再整備**: 運用手順を `references/03-guides/` に別 doc 化

**完了条件**: 次の作業者が「何をどう直すか」を迷わない状態。

## やってはいけないこと

- 原因を確定する前に fix commit を打つ → 調査 scope 外、再発時に原因が
  不明のまま修正を積み重ねるリスク
- 仮説だけで plan を書き換える → observed data で plan を更新する
- Phase 1 を飛ばして Phase 2 に行く → 候補層が絞れないと精密特定の作業が
  発散する
- Worker timeout の profiling を本 project で始める → scope 外

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/application/hooks/plans/useDayDetailPlan.ts` | Screen Plan (L47 emptyEntries / L174+ dayRecords 組み立て) |
| `app/src/application/hooks/categoryLeafDaily/useCategoryLeafDailyBundle.ts` | bundle + fallback (L183-230) |
| `app/src/application/queries/cts/CategoryTimeRecordsHandler.ts` | query handler |
| `app/src/application/queries/cts/CategoryTimeRecordsPairHandler.ts` | pair handler (current + comparison 並列取得) |
| `app/src/infrastructure/duckdb/queries/ctsHierarchyQueries.ts` | `queryCategoryTimeRecords` (L207-) |
| `app/src/infrastructure/duckdb/queries/categoryTimeSales.ts` | `buildCtsConditions` (L34 is_prev_year WHERE) |
| `app/src/application/workers/useWorkerCalculation.ts` | Worker timeout 参照 (別問題) |
