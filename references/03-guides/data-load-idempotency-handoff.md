# idempotent load contract — 歴史的 handoff

> **役割: 機能説明文書（背景・ハマりポイントの記録）**
>
> 本文書は idempotent load contract が確立されるまでの経緯と、将来の読み手が
> 同じ罠を踏まないためのハマりポイントを記録する。
>
> **live な作業項目は本文書に書かない。**
> 対応 project は 2026-04-12 に archive 済み（Phase F: Option A 確定）:
> [`projects/completed/data-load-idempotency-hardening/`](../../projects/completed/data-load-idempotency-hardening/)
>
> 関連文書:
>
> | 役割 | 文書 |
> |---|---|
> | 設計・歴史 | [`data-load-idempotency-plan.md`](./data-load-idempotency-plan.md) |
> | FRAGILE 分類根拠 | [`read-path-duplicate-audit.md`](./read-path-duplicate-audit.md) |
> | 歴史的 project 記録（archived） | `projects/completed/data-load-idempotency-hardening/` |

## 1. 経緯 (2026-04-12 時点)

idempotent load contract の本体スコープ（Phase 0 / 1 / 2 / 3.a / 3.b / 3.c）は
全て **main 上で landed 済み**。関連 PR は #993 / #994 / #995 / #996 / #998 / #999。

「ロード境界の責務が呼び出し側に漏れていた」という根本問題は構造的に解消され、
`classified_sales` / `special_sales` / `transfers` の重複発生経路は **ロード層側
では塞がれている**。`store_day_summary.customers` が `1.56e+17` を返す事件の
再発は機械的に防がれている状態。

その後の追加防御として、PR A〜E（2026-04-12）で:

- duplicate-injected mock conn helper の追加（PR B）
- FRAGILE 6 件の構造的回帰テスト追加（PR C）
- `purchaseComparison.ts` FRAGILE 1/2 の pre-aggregate refactor（PR D）
- `freePeriodFactQueries.ts` FRAGILE 6 の pre-aggregate refactor（PR E）
- `@risk` JSDoc タグと `@defense` 防御コメントの転記

を実施し、FRAGILE 6 件のうち 3 件は SAFE 化、残 3 件は audit 推奨事項
「JSDoc only mitigation」分類で `.fails` ロックのまま据え置き。

## 2. API 境界の最終形

| 操作 | API |
|---|---|
| 月データを差し替えたい | `loadMonth(conn, db, data, year, month, isPrevYear?)` — 当年・前年とも caller-free |
| 月データを消したい | `deleteMonth(...)` / `deletePrevYearMonth(...)` — explicit remove 専用 |

呼び出し側（`useDuckDB.ts` 等）は「削除順序」を一切持たない。削除は全て
`loadMonth` 内部の `purgeLoadTarget` か、明示 remove 経路で完結する。

## 3. ハマりポイント

### 3.1. `deletePrevYearMonth` の year-shift 設計

`deletePrevYearMonth(conn, year, month)` は引数として **current year を受け取り、
内部で `prevYear = year - 1` してから削除する** 設計。これは意味論的には正しい
（「当年文脈での explicit remove」として `deleteMonth` とペアで使うため）が、
この関数を「指定 (year, month) 位置の前年行を消す」と誤解すると 1 年ずれる。

**Phase 2 初版でこれを踏んで回帰を出した。**

**現在の対策:** Phase 3.a で `deletePrevYearRowsAt(year, month)`（year-shift
しない新関数）を導入し、`deletePrevYearMonth` は `deletePrevYearRowsAt(year-1, month)`
の thin wrapper に refactor した。`deletePolicy.ts` の JSDoc に
`@defense year-shift` で意味論を明示済み。将来追加の削除 API を入れるときは
必ず「当年文脈か、絶対位置か」を意識すること。

### 3.2. `store_day_summary.customers = MAX(customers)`

`schemas.ts:354` 付近で `flowers` サブクエリは `MAX(customers)` を使う（他の
集約は `SUM`）。これは **暫定修正の名残ではなく、defense-in-depth として
意図的に残している** もの。「重複行は同じ customer 数を持つはずなので、
MAX を取れば倍化しない」という前提のもとでの防御。ロード境界が正しく動作
している限り最大値と総和は一致するが、ロード層が万が一壊れたときに
ダッシュボードの客数指標だけは自明に暴発しない保険になっている。

`@defense customers=MAX` コメントで意図を明示済み。
**勝手に SUM に戻さないこと。** 戻すと過去の `1.56e+17` 事件が再発する経路が
また開く。

### 3.3. Stacked PR の auto-retarget は「マージ間隔が十分」が前提

Phase 2-3.a を 4 PR の stacked 構成（#993 → #994 → #995 → #996）で運用したが、
merge を 24 秒以内に連続実行したため GitHub の auto-retarget（下位 PR がマージ
されたら上位 PR の base が main に繰り上がる）が間に合わず、#994 / #995 / #996
は「merged 扱いだが main には届いていない」状態になった。

**対策として #998 で回収 PR を作って land させた。** 今後 stacked PR を
連続 merge するときは、各マージ間で数分待つか、最後の 1 本を main 直 target に
するか、そもそも stacked を避けて rebase して merge するのが無難。

## 4. 実装の主要ファイル（landing 後の main 上の最終状態）

| ファイル | 役割 |
|---|---|
| `app/src/infrastructure/duckdb/dataLoader.ts` | `loadMonth`（replace 正本）+ `purgeLoadTarget` helper |
| `app/src/infrastructure/duckdb/deletePolicy.ts` | `deleteMonth` / `deletePrevYearMonth` / `deletePrevYearRowsAt` + `@defense year-shift` |
| `app/src/application/runtime-adapters/useDuckDB.ts` | 変更月再ロード / obsolete-month remove 経路 |
| `app/src/infrastructure/duckdb/worker/workerHandlers.ts` | `executeDeleteMonth`（当年+前年の explicit remove 合成） |
| `app/src/infrastructure/duckdb/schemas.ts` | `store_day_summary` VIEW + `@defense customers=MAX` |
| `app/src/infrastructure/duckdb/__tests__/dataLoaderPureFunctions.test.ts` | 冪等性契約の機械的ロック 4 テスト |
| `app/src/infrastructure/duckdb/__tests__/helpers/duplicateInjectedMockConn.ts` | FRAGILE 6 件用の共有テスト helper |
| `app/src/infrastructure/duckdb/__tests__/readPathDuplicateResistance.test.ts` | FRAGILE 6 件の構造的回帰テスト |

## 5. 関連 PR

| # | 内容 | 状態 |
|---|---|---|
| #993 | Phase 0 契約明文化 + Phase 1 helper 抽出 | Merged |
| #994 | Phase 2 reload path の二重 delete 除去 + fix commit | Merged |
| #995 | Phase 3.b 冪等性テスト + latent bug を `it.fails` でロック | Merged |
| #996 | Phase 3.a year-shift 解消 + workaround 除去 | Merged |
| #998 | stacked PR land 回収 | Merged |
| #999 | Phase 3.c read-path spot audit | Merged（2026-04-12） |
| #1001 | docs: 旧 handoff 初版を main に追加 | Merged（2026-04-12） |
| (PR A-E) | duplicate-injected helper / 回帰テスト / FRAGILE 1/2/6 refactor | branch landed |
