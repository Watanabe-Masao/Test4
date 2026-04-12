# 引き継ぎ書 — idempotent load contract

> **役割: 起点文書**
> idempotent load contract の次作業を引き継ぐ後任者が最初に読む文書。
> 完了済みの全景、次にやることの優先順位、ハマりポイント、参照先を 1 画面で把握できる。
> 詳細仕様は本 handoff の末尾にある関連文書を参照する。

## 1. 現在地

idempotent load contract の本体スコープ（Phase 0 / 1 / 2 / 3.a / 3.b / 3.c）は
全て **main 上で landed 済み**（2026-04-12）。関連 PR は #993 / #994 / #995 /
#996 / #998 / #999。

「ロード境界の責務が呼び出し側に漏れていた」という根本問題は構造的に解消され、
`classified_sales` / `special_sales` / `transfers` の重複発生経路は **ロード層側
では塞がれている**。`store_day_summary.customers` が `1.56e+17` を返す事件の
再発は機械的に防がれている状態。

### API 境界の最終形

| 操作 | API |
|---|---|
| 月データを差し替えたい | `loadMonth(conn, db, data, year, month, isPrevYear?)` — 当年・前年とも caller-free |
| 月データを消したい | `deleteMonth(...)` / `deletePrevYearMonth(...)` — explicit remove 専用 |

呼び出し側（`useDuckDB.ts` 等）は「削除順序」を一切持たない。削除は全て
`loadMonth` 内部の `purgeLoadTarget` か、明示 remove 経路で完結する。

### 冪等性の機械的ロック

以下 4 テストで冪等契約を固定済み（`dataLoaderPureFunctions.test.ts`）:

1. 当年 `loadMonth` は先頭で `(year, month)` を purge する
2. 当年 `loadMonth` を 2 回呼んでも毎回 purge が走る（append 退行検出）
3. INSERT 失敗時に cleanup で対象月を再 purge する
4. `isPrevYear=true` で `(year, month)` 自身の前年行を purge する（year-shift 退行検出）

これらは pre-commit / CI で走るため、将来 append モードや year-shift に
退行したら即座に赤くなる。

## 2. 次にやること

**優先度付きで 3 件**。全て read-path spot audit（Phase 3.c）の結果を根拠に
しており、詳細は [`read-path-duplicate-audit.md`](./read-path-duplicate-audit.md)
の「推奨事項」セクションを参照。

### 高優先: FRAGILE クエリへの回帰テスト追加

Audit で FRAGILE 判定した 6 クエリに、mock conn ベースの回帰テストを追加する。
ロード境界が壊れたら即座に発火する検知網を作るのが目的。

対象:

| # | File:line | クエリ名 |
|---|---|---|
| 1 | `purchaseComparison.ts:107-130` | `queryStoreCostPrice` |
| 2 | `purchaseComparison.ts:151-175` | `queryStoreDailyMarkupRate` |
| 3 | `purchaseComparison.ts:280-300` | `querySpecialSalesDaily` |
| 4 | `purchaseComparison.ts:307-326` | `queryTransfersDaily` |
| 5 | `purchaseComparison.ts:342-360` | `querySalesTotal` |
| 6 | `freePeriodFactQueries.ts:46-67` | `queryFreePeriodDaily` |

テストパターンの雛形（`dataLoaderPureFunctions.test.ts` の既存パターンが流用可能）:

```ts
// 1. mock conn に特定クエリを受け取ったら重複行込みの result set を返させる
// 2. クエリを呼ぶ
// 3. 返ってきた cost / price / sales 等が「重複なしの値」と一致することを assert
//    （つまり duplication に対して stable である）
```

実装コストは 1 クエリあたり 15-30 分程度。

### 中優先: `purchaseComparison.ts` の UNION ALL クエリに pre-aggregate 層を入れる

FRAGILE 1/2 の `queryStoreCostPrice` / `queryStoreDailyMarkupRate` は、
`UNION ALL` で 3 テーブルを結合した後に外側で SUM している。これを
`store_day_summary` VIEW と同じパターン（source テーブルを subquery で
`GROUP BY year, month, store_id, day` してから UNION / JOIN）に書き換えれば、
source 側に重複があっても subquery で吸収される。

FRAGILE → SAFE に昇格する構造変更で、追加防御として最も効く。ただし refactor
なので必ず先に高優先の回帰テストを入れてから取り組むこと。

### 中優先: `freePeriodFactQueries.DAILY_SQL` の `cs` 側も pre-aggregate する

現在 `purchase p` は subquery で事前集約してから JOIN しているが、`classified_sales cs`
側は直接 SUM している。`cs` 側も同じパターンで事前集約すれば同上。

### 低優先: FRAGILE / PARTIAL クエリへの JSDoc 前提コメント追加

上記 refactor を入れるまでの間、FRAGILE 6 件 + PARTIAL 3 件の関数 JSDoc に

> この関数は source テーブル (...) の行重複がないことを前提にしている。
> ロード境界が壊れると silent に倍化するため、`dataLoader.ts::loadMonth` の
> replace セマンティクス契約と一体で動作する。

と 1 段落追加して、将来の読み手にリスクを認識させる。

## 3. ハマりポイント

### 3.1. `deletePrevYearMonth` の year-shift 設計

`deletePrevYearMonth(conn, year, month)` は引数として **current year を受け取り、
内部で `prevYear = year - 1` してから削除する** 設計。これは意味論的には正しい
（「当年文脈での explicit remove」として `deleteMonth` とペアで使うため）が、
この関数を「指定 (year, month) 位置の前年行を消す」と誤解すると 1 年ずれる。

**Phase 2 初版でこれを踏んで回帰を出した。** `purgeLoadTarget(isPrevYear=true)`
が `deletePrevYearMonth(year, month)` を呼んでいたが、`year` に既に前年
（例: 2024）が入っていたため `deletePrevYearMonth` が `2023` にシフトして
誤った年を削除していた。

**現在の対策:** Phase 3.a で `deletePrevYearRowsAt(year, month)`（year-shift
しない新関数）を導入し、`deletePrevYearMonth` は `deletePrevYearRowsAt(year-1, month)`
の thin wrapper に refactor した。この 2 つの関数の意味論の違いは
`deletePolicy.ts` の JSDoc に明記してあるので、将来追加の削除 API を入れる
ときは必ず「当年文脈か、絶対位置か」を意識すること。

### 3.2. `store_day_summary.customers = MAX(customers)`

`schemas.ts:354` 付近で `flowers` サブクエリは `MAX(customers)` を使う（他の
集約は `SUM`）。これは **暫定修正の名残ではなく、defense-in-depth として
意図的に残している** もの。「重複行は同じ customer 数を持つはずなので、
MAX を取れば倍化しない」という前提のもとでの防御。ロード境界が正しく動作
している限り最大値と総和は一致するが、ロード層が万が一壊れたときに
ダッシュボードの客数指標だけは自明に暴発しない保険になっている。

勝手に `SUM` に戻さないこと。戻すと過去の `1.56e+17` 事件が再発する経路が
また開く。

### 3.3. Stacked PR の auto-retarget は「マージ間隔が十分」が前提

Phase 2-3.a を 4 PR の stacked 構成（#993 → #994 → #995 → #996）で運用したが、
merge を 24 秒以内に連続実行したため GitHub の auto-retarget（下位 PR がマージ
されたら上位 PR の base が main に繰り上がる）が間に合わず、#994 / #995 / #996
は「merged 扱いだが main には届いていない」状態になった。

**対策として #998 で回収 PR を作って land させた。** 今後 stacked PR を
連続 merge するときは、各マージ間で数分待つか、最後の 1 本を main 直 target に
するか、そもそも stacked を避けて rebase して merge するのが無難。

## 4. 参照先

### このスコープで作った / 更新した文書

| ファイル | 内容 |
|---|---|
| `references/03-guides/data-load-idempotency-plan.md` | 根本問題の診断 + Phase 0-3.c 全履歴 |
| `references/03-guides/read-path-duplicate-audit.md` | FRAGILE 6 / PARTIAL 3 / SAFE 経路の可視化レポート |
| `references/03-guides/data-load-idempotency-handoff.md`（本書） | 次作業者の入口 |

### 実装の主要ファイル（landing 後の main 上の最終状態）

| ファイル | 役割 |
|---|---|
| `app/src/infrastructure/duckdb/dataLoader.ts` | `loadMonth`（replace 正本）+ `purgeLoadTarget` helper |
| `app/src/infrastructure/duckdb/deletePolicy.ts` | `deleteMonth` / `deletePrevYearMonth` / `deletePrevYearRowsAt` + JSDoc で意味論を区別 |
| `app/src/application/runtime-adapters/useDuckDB.ts` | 変更月再ロード / obsolete-month remove 経路（後者のみ explicit remove 使用） |
| `app/src/infrastructure/duckdb/worker/workerHandlers.ts` | `executeDeleteMonth`（当年+前年の explicit remove 合成） |
| `app/src/infrastructure/duckdb/schemas.ts` | `store_day_summary` VIEW（source 事前集約 + 防御集約） |
| `app/src/infrastructure/duckdb/__tests__/dataLoaderPureFunctions.test.ts` | 冪等性契約の機械的ロック 4 テスト |

### 関連 PR

| # | 内容 | 状態 |
|---|---|---|
| #993 | Phase 0 契約明文化 + Phase 1 helper 抽出 | Merged |
| #994 | Phase 2 reload path の二重 delete 除去 + fix commit | Merged |
| #995 | Phase 3.b 冪等性テスト + latent bug を `it.fails` でロック | Merged |
| #996 | Phase 3.a year-shift 解消 + workaround 除去 | Merged |
| #998 | stacked PR land 回収 | Merged |
| #999 | Phase 3.c read-path spot audit + 本 handoff | Open（本書の origin） |

## 5. やらないこと

本 handoff に書いてある以外のスコープ拡張は意識的にしないこと。
特に以下は罠なので避ける:

- `loadMonth` → `replaceMonth` への rename（churn コストが高く、得るものは
  名前だけ）
- DuckDB WASM の `UPSERT` / `UNIQUE` 制約採用（WASM ランタイムではサポートが
  限定的でランタイムエラーになる）
- `store_day_summary` VIEW の全カラム防御集約化（追加複雑度が大きく、
  ロード層が正しい限り得るものは 0）
- audit の FRAGILE 9 件をまとめて refactor する大 PR（回帰テストなしで
  refactor を入れると 2 次被害のリスクが高い。必ず「テスト → refactor」の
  順序を守る）

## 6. 起動方法

次セッションを開始する後任者は以下の順で読むと最短で追いつける:

1. **本書（handoff）** — 全景把握（15 分）
2. **`data-load-idempotency-plan.md` §7 現状** — Phase 別の完了状況（10 分）
3. **`read-path-duplicate-audit.md`** — 次作業の対象クエリと失敗モード（20 分）
4. （必要なら）`dataLoader.ts` + `deletePolicy.ts` + `useDuckDB.ts` の
   JSDoc を読む（20 分）

ここまでで約 1 時間。その後、高優先の「FRAGILE クエリへの回帰テスト追加」から
着手できる。
