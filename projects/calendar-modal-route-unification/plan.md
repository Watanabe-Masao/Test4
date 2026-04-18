# plan — calendar-modal-route-unification

## Phase A 方針決定（2026-04-18）

棚卸しの結果（HANDOFF.md §3.5 参照）、フォールバック層の存続判断として
**Option C（限定 pair 化 + フォールバック層を Phase B で撤廃）** を採用する。

- Phase A では (day, prevDay) / (cum, cumPrev) の 2 組のみ pair 化
- wow は単独 handler のまま維持（比較相手を持たないため pair 化対象外）
- prevDayFallback / cumPrevFallback は Phase A では撤廃せず、`selectCtsWithFallback`
  への依存も残す
- Phase B で bundle 経由化と同時にフォールバック撤廃を再評価する
- 採用理由: 動線統一を 1 ステップ進めつつ、レンダー初回の空ハンドリング検証を
  Phase B（bundle 経由化と同時）に集約し、回帰リスクを最小化する

## 不可侵原則

1. **正本 lane の優位を破らない** — モーダルとダッシュボードは同じ
   `categoryDailyLane.bundle` / `timeSlotLane.bundle` / `categoryTimeRecordsPairHandler` を
   参照する。consumer ごとに独自 handler / 独自フォールバックを増やさない
2. **`data-flow-unification` の成果を退行させない** — `is_prev_year=true` 行の
   DuckDB ロード網羅性は確立済み。read path 統一の過程で write path 側の
   不変条件（`deleteMonth` の `is_prev_year=false` 条件、`loadComparisonDataAsync` の
   全スライス読込）に手を入れない
3. **UI は取得元を知らない** — モーダル内に「DuckDB / IndexedDB / cache」の
   分岐ロジックを新規追加しない（CLAUDE.md 層境界ルール準拠）
4. **leaf-grain（5 要素分解）には触らない** — 本 project の scope 外。
   `selectCtsWithFallback` を leaf-grain 用途で残す必要があると判明した場合、
   Phase B 完了の判定をブロックし Phase C（別 project）を起こす
5. **数値差は逃げ道にしない** — Phase B で raw 合算と bundle 経由の値に差が
   出た場合、bundle 側を正本として扱い、raw 側を bundle に合わせる
   （bundle を変える場合は別 project の責務）

## Phase 構造

### Phase A: paired handler 統一

`useDayDetailPlan` から `categoryTimeRecordsHandler` を直接呼んでいる箇所を
`categoryTimeRecordsPairHandler` 経由に統一する。raw CTS 参照は残るが
handler は共通化する。

完了条件: モーダル経路の handler 呼び出しが 1 つに集約されている。
回帰テスト（モーダル表示・前年比較表示）が通っている。

### Phase B: 数量・時間帯の bundle 経由化

モーダルの数量合算を `categoryDailyLane.bundle.currentSeries.grandTotals.salesQty` 経由に、
時間帯データを `timeSlotLane.bundle` 経由に移す。
`selectCtsWithFallback` の独自フォールバック機構を完全廃止する。

完了条件: モーダル内に raw CTS の独自合算・独自フォールバックが残っていない。
ダッシュボードとモーダルの表示値が一致する。

### Phase C: 撤退判定とガード固定

`categoryDailyLaneSurfaceGuard` の baseline が 0 に到達したことを検証し、
旧経路を使う consumer が 0 件であることを確認する。
旧経路コードを物理削除し、再発防止ガードを追加する。

完了条件: 旧経路の参照が 0 件。新規ガードテストが CI で通っている。

### Phase D: ドキュメント更新

`runtime-data-path.md` / `data-pipeline-integrity.md` を統一後の経路に合わせて更新する。

完了条件: 関連 references が最新状態に更新されている。

## やってはいけないこと

- モーダル内に「DuckDB が空なら raw CTS にフォールバック」という分岐を新規に書く
  → `data-flow-unification` で write path は保証済み。read path で同じ防御を
  繰り返すと旧経路を温存する正当化に使われ、撤退できなくなる
- handler 統一を後回しにして bundle 経由化（Phase B）から着手する
  → handler が乱立したまま消費側を切り替えると、両方の経路を同時に保守する
  期間が長くなる。Phase A → B → C の順を守る
- 「raw 合算と bundle で値が違うので bundle が壊れている」と決めつける
  → 売上区分・税種別・無効行除外などで正規化される正常差。bundle を疑うのは
  最後で、raw 側の集約条件を bundle に合わせるのが原則
- leaf-grain（5 要素分解）の正本化に手を出す
  → 別 project（Phase C 後継）の所掌。本 project の完了を曖昧にする
- `selectCtsWithFallback` を縮退させる前にガードテストを追加せず削除する
  → 影響範囲が広い。consumer ゼロを `categoryDailyLaneSurfaceGuard` で確認してから削除する

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/application/hooks/plans/useDayDetailPlan.ts` | カレンダーモーダルの Screen Plan |
| `app/src/application/queries/cts/CategoryTimeRecordsHandler.ts` | 単独 handler（旧経路） |
| `app/src/application/queries/cts/CategoryTimeRecordsPairHandler.ts` | paired handler（統一先） |
| `app/src/application/hooks/duckdb/dayDetailDataLogic.ts` | `selectCtsWithFallback` 定義（独自フォールバック・廃止対象） |
| `app/src/application/hooks/categoryDaily/useCategoryDailyBundle.ts` | `categoryDailyLane.bundle` 正本 |
| `app/src/features/time-slot/application/plans/useTimeSlotPlan.ts` | `timeSlotLane.bundle` 正本 |
| `app/src/test/guards/categoryDailyLaneSurfaceGuard.test.ts` | 旧経路 consumer の baseline 監視 |
| `app/src/test/guards/timeSlotLaneSurfaceGuard.test.ts` | 時間帯 lane の旧経路監視 |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane の 2 系統経路 |
| `references/01-principles/data-pipeline-integrity.md` | データパイプライン整合性 |
| `projects/completed/data-flow-unification/HANDOFF.md` | 先行 project。§5 に Phase A/B/C の原計画 |
