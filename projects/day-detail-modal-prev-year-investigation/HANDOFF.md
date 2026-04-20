# HANDOFF — day-detail-modal-prev-year-investigation

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 1: 静的解析パート完了 / runtime 観測パート未着手。** 先行セッション
(2026-04-19) で 3 症状 (要因分解 2-factor のみ / 時間帯分析「データなし」 /
ドリルダウン非表示) を観測し、以下を切り分け済み:

- Phase 1 (category-leaf-daily-entry-shape-break) は無関係 (型 alias 置換のみ)
- Worker timeout (`useCalculation`) は別の処理系 (main dashboard 用) で、
  DayDetailModal の CTS/time_slots クエリとは独立

残る候補: **データ or クエリ or インジェスト** の 3 択 (`AI_CONTEXT.md` §Why 参照)。

### 1.1 静的解析による事前絞り込み (2026-04-19 追記)

コードパスを静的に読解し、候補 A/B/C の判別に使える構造シグナルを確認した。
runtime 観測なしで原因層を確定することはできないが、**runtime 観測時に見る
場所**と**各候補の予測値**を精密化できた。

#### データフロー (prev year lane)

1. xlsx import → `CategoryTimeSalesProcessor` が `timeSlots: TimeSlotEntry[]`
   を含む `CategoryTimeSalesRecord[]` を生成
   (`app/src/infrastructure/dataProcessing/CategoryTimeSalesProcessor.ts:154-182`)
2. IndexedDB に `categoryTimeSales` slice として保存 (timeSlots 含む)
3. `useLoadComparisonData` → `loadComparisonDataAsync` が IndexedDB から
   prev year 月を読み出し、`dataStore.appData.prevYear` に書き込む
   (`app/src/features/comparison/application/loadComparisonDataAsync.ts:135-143, 219`)
4. `useDuckDB` が `prevYear` fingerprint の変化を検知し
   `loadMonth(..., isPrevYear=true)` を呼ぶ
   (`app/src/application/runtime-adapters/useDuckDB.ts:142-150` 初回 /
   `202-213` 差分 / `216-235` prevYear のみ更新)
5. `insertCategoryTimeSales(conn, db, records, isPrevYear=true)` が
   `category_time_sales` + `time_slots` 両方に `is_prev_year=true` で INSERT
   (`app/src/infrastructure/duckdb/tableInserts.ts:57-111`)
   - **重要**: `time_slots` 行は `rec.timeSlots` の各要素で生成される
     (L90-105)。`rec.timeSlots === []` なら 0 行
6. pair handler が `isPrevYear=COMPARISON_SCOPE (=true)` で comparison 側を
   実行 (`createPairedHandler.ts:51-57`)
7. `queryCategoryTimeRecords` が `category_time_sales LEFT JOIN time_slots`
   を実行 (`ctsHierarchyQueries.ts:212-230`)。JOIN キーは 6 個
   (`store_id / date_key / dept_code / line_code / klass_code / is_prev_year`)
8. `groupRowsToRecords` が `pushRecord` で `CategoryTimeSalesRecord` に変換
   (`ctsHierarchyQueries.ts:235-282`)。**time_slots が NULL でも pushRecord は
   呼ばれる** — `row.hour === null` のときは `timeSlots: []` 付きの record が
   作られる (L252-254, L260 の push)

#### 構造的に重要な分岐

**(a) L216-235 の既知バグ fix**: `useDuckDB.ts` に「前年データだけ更新された
場合の再ロード」ブランチが明示的に書かれている (`#時間帯前年表示バグ` の
fix コメント付き)。条件は `prevYearFp !== loadedPrevYearFp.current`。
**このブランチが発火しない条件が残っているか** が B 候補の主要仮説。

**(b) `computeMonthFingerprint` は `timeSlots` を見ない**:
`app/src/application/hooks/duckdbFingerprint.ts:37-48` は
`data.categoryTimeSales.records.length` のみ使う。prev year の CTS records
数が同じで timeSlots 中身だけ変わった場合、fingerprint は変化せず再ロード
されない。ただし初回ロード時は fingerprint 変化があるのでこの経路は通常
問題にならない。

**(c) `pushRecord` が time_slots 空でも record を返す**: これにより
- A 候補 (CTS 0 行) → `entries.length === 0`
- B 候補 (CTS あり / time_slots 0 行) → `entries[0].timeSlots.length === 0`,
  `totalQuantity > 0`
- C 候補 (CTS に totalQuantity=0) → `entries[0].totalQuantity === 0`
という Phase 1 checklist 通りの discrimination が runtime 観測で可能。

#### 観測済み事実と整合する仮説ランキング

**B 候補 (最有力)**: カード値 (1,411,635 等) は StoreResult 経由なので CTS
の total_amount が populated なら説明可能。一方、時間帯タブ / 3-5 factor /
ドリルダウンは `timeSlots` に依存する。prev year の
`CategoryTimeSalesRecord[].timeSlots === []` であれば、上記 3 症状すべて
説明できる。原因候補:
- prev year を legacy xlsx formatで import した過去データが timeSlots 無しで
  IndexedDB に残存
- `mergeAdjacentMonthRecords` による隣接月 renumbering で中心月データ不在

**A 候補 (次点)**: `prevYear` が dataStore で null または CTS records 0。
`useLoadComparisonData` の `sourceMonth.year === 0` ガード
(`useLoadComparisonData.ts:76`) が誤発火するケースなど。カード値が出ている
ことと整合しにくい (StoreResult も同じ prev year 月から取るため) が、
別経路で取得される可能性は残る。

**C 候補 (低)**: ingest 時点で totalQuantity=0 の異常値。parser に populated
データが来ているのでコードパス上は考えにくいが、xlsx 側データそのものが
不正の可能性は否定できない。

### 1.2 候補シグネチャカタログ (diagnostic test で機械確定)

診断テスト: `app/src/infrastructure/duckdb/__tests__/dayDetailPrevYearCandidateSignatures.test.ts`

実行: `cd app && npx vitest run src/infrastructure/duckdb/__tests__/dayDetailPrevYearCandidateSignatures.test.ts --reporter=verbose`

`queryCategoryTimeRecords` に各候補の SQL 結果を注入して得られた observable
シグネチャ:

| 候補 | entries.length | entries[0].totalQuantity | entries[0].timeSlots.length | totalAmount |
|---|---:|---:|---:|---:|
| **A** (CTS 0 件) | 0 | - | - | - |
| **B** (CTS あり / time_slots NULL) | 1 | 120 | 0 | 150000 |
| **C** (CTS あり / totalQuantity=0) | 1 | 0 | 0 | 0 |
| 正常 | 1 | 120 | 2 | 150000 |

**runtime 観測時の判定手順** (本番環境でも完結):

1. 本番環境にデプロイ済みであることを確認 (本 branch / PR を merge してデプロイ)
2. ブラウザで対象ページを開く
3. DevTools → Console で有効化:
   `localStorage.setItem('__debug_dayDetailPrevYear', '1')`
4. ページをリロード
5. DayDetailModal を開く (任意の日付)
6. Console に自動出力される `[DayDetailModal:prev-year-observation]` ログを確認
   - `comparison.entriesLen === 0` → **A**
   - `comparison.entriesLen > 0 && comparison.firstTimeSlotsLen === 0` → **B**
   - `comparison.firstTotalQty === 0` → **C**
   - `provenance.usedComparisonFallback === true` → primary 空 → fallback 発火
7. 上の表（§1.2）と突合して候補確定
8. 調査終了後は `localStorage.removeItem('__debug_dayDetailPrevYear')`

**ログ実装**: `app/src/application/hooks/plans/useDayDetailPlanObservation.ts`
(localStorage フラグで on/off。デフォルト off なので通常ユーザーには影響なし。
原因確定後に削除)

B 候補が観測されれば、次に
`dataStore.appData.prevYear.categoryTimeSales.records[0].timeSlots.length`
を確認し、
- `=== 0` → 原因は ingest 前 (IndexedDB or xlsx import)
- `> 0` → 原因は `insertCategoryTimeSales` → `time_slots` INSERT 時点
  (fingerprint の再ロード漏れ等 / useDuckDB.ts L216-235 の fix が効いていない)

## 2. 次にやること

詳細は `checklist.md` を参照。**最初の 10 分で原因層を絞り込む**調査から着手する。

### 高優先 (Phase 1: runtime 観測で原因層を絞る)

> **静的解析の裏付けあり (§1.1 参照)**: observable 値と候補のマッピングは
> `pushRecord` の挙動 (time_slots NULL でも record を返す) と JOIN キー
> (6 個) から構造的に裏付け済み。

- **DevTools の React component tree で DayDetailModal を開いた状態で `dayLeafBundle.currentSeries.entries[0]` の内容を確認**
  - `timeSlots: []` なら time_slots JOIN が空 → **B 候補**
  - `totalQuantity === 0` なら data ingest の集計不整合 → **C 候補**
  - entries 自体が `[]` なら query 側が 0 行返却 → **A 候補**
- **DuckDB console で直接 SQL を投げて prev year CTS records の存在を確認**
  ```sql
  SELECT COUNT(*) FROM category_time_sales WHERE is_prev_year = TRUE;
  SELECT COUNT(*) FROM time_slots WHERE is_prev_year = TRUE;
  ```
  - cts >0, ts 0 → **B 確定**
  - 両方 0 → **A / C のいずれか** (次に IndexedDB 側の records 数を確認)
- `meta.provenance.usedComparisonFallback` が `true` か確認 (bundle の fallback
  発火有無)
- **追加確認 (B 候補ならここまで追う)**:
  `dataStore.appData.prevYear.categoryTimeSales.records[0].timeSlots.length`
  を DevTools で確認。`0` なら ingest 前から timeSlots 空 → 根本原因は
  IndexedDB 側 / xlsx import 時点

### 中優先 (Phase 2: 原因確定)

- 上記で原因層が**データ側**と判明した場合:
  - データインジェストパス (xlsx import 等) の `is_prev_year` flag 設定漏れを確認
  - time_slots table のインデックス投入漏れを確認
- **コード側**と判明した場合:
  - JOIN 条件 `cts.is_prev_year = ts.is_prev_year` が意図通りか
  - `buildCtsConditions` の `params.isPrevYear ?? false` のデフォルト挙動

### 低優先 (Phase 3: fix 方針決定)

- 修正が 1-3 ファイルで済む: `quick-fixes` に task 追加
- 複数層に跨る修正: 専用 fix project を起票
- データ再整備が必要: 運用手順書を別 doc に整理

## 3. ハマりポイント

### 3.1. 集計カード値は表示されている

前年 1,411,635 / 当年 1,552,468 等のカード値は `StoreResult` (budget +
summary) 経由で表示されているため、**per-record の CTS データが空でもカード
は表示される**。「一部は動く = 全部動く」の誤認を避ける。

### 3.2. Worker timeout は同時発生しているが別原因

console log に `[useCalculation] Worker 計算失敗、同期フォールバック` が出る
が、これは `calculateAllStores` (main dashboard 用) の timeout。
DayDetailModal の DuckDB query は独立しており、この timeout の影響を直接は
受けない。ただし同じ**データサイズで主スレッド処理が重い**症状の表れである
可能性はある (低優先の調査観点)。

### 3.3. bundle fallback は発火するが fallback 側も空なら意味がない

`useCategoryLeafDailyBundle` は prev year primary が空なら same-date current
year fallback を実行する。**ただし fallback も 0 行 or timeSlots 空なら症状
は改善しない**。fallback が発火したかは `meta.provenance.usedComparisonFallback`
で観測できる。

### 3.4. 「前年」の意味の揺れ

UI 上の「前年」は 3 系統ある:
- StoreResult の prev-year amount (budget / summary 経由)
- `isPrevYear=true` の category_time_sales record (DuckDB)
- 前年同日付の current-year record (fallback 時)

どの系統が空かを切り分けないと原因を誤認する。

### 3.5. 調査 scope と fix scope の分離

本 project は**調査のみ**。原因層が確定したら別 project / quick-fixes で fix
する。調査 scope で fix を始めると完了基準がぶれる。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | completion 判定の入力 |
| `app/src/application/hooks/plans/useDayDetailPlan.ts` | DayDetailModal の Screen Plan (データ取得の起点) |
| `app/src/application/hooks/categoryLeafDaily/useCategoryLeafDailyBundle.ts` | bundle + fallback ロジック (L183-230 が provenance 組み立て) |
| `app/src/infrastructure/duckdb/queries/ctsHierarchyQueries.ts` | `queryCategoryTimeRecords` の CTS + time_slots LEFT JOIN |
| `app/src/infrastructure/duckdb/queries/categoryTimeSales.ts` | `buildCtsConditions` (`is_prev_year` WHERE 条件) |
| `projects/category-leaf-daily-entry-shape-break/HANDOFF.md` | 関連先行 project (データ取得経路の context) |
