# Read-Path Duplicate Audit

> 目的: `classified_sales` / `special_sales` / `transfers` を read-path で直接 `SUM` している経路に、
> データロード重複や同一レーン内の行重複に対する暗黙前提が残っていないかを spot audit する。
> 本文書は `references/03-guides/data-load-idempotency-plan.md` の残タスク 1 を閉じるための正式監査レポートである。
>
> 監査日: 2026-04-12
> 対象リポジトリ: `Watanabe-Masao/Test4`

## 結論

監査対象のうち、**即時の修正が必要な「パラメータ不一致バグ」や「非標準 SQL」は確認されなかった**。
一方で、**read-path が `classified_sales` を事前集約なしに直接 `SUM` しているため、
同一レーン内の行重複に対してフラジャイルな箇所は残っている**。

結論を 2 点で固定する:

1. `purchaseComparison.ts::querySalesTotal` に **`isPrevYear` 無効化バグは存在しない**。
   `purchaseWhere(..., { type: 'boolean', column: 'is_prev_year', value: isPrevYear })` により
   `classified_sales.is_prev_year` 条件は正しく WHERE に入っている。
   懸念は **同一レーン内での重複行に対する脆弱性** のみである。

2. `freePeriodFactQueries.ts` の `GROUP BY p.cost, p.price` は **標準 SQL として正しい**。
   真の懸念は `classified_sales` を事前集約しないまま `SUM(cs.sales_amount)` /
   `SUM(cs.customers)` を取っている点であり、`cs` 側に同一 `(store_id, date_key, is_prev_year)`
   レーンの重複行があると日別 fact が膨張しうる。

したがって、本監査で閉じるべき残タスクは **「read-path の暗黙前提を洗い出すこと」** であり、
現時点の結論は **「重大な新規バグは未検出。ただし read-path の一部は duplicate-safe ではなく、
将来の refactor 候補として明示管理する」** である。

---

## 監査対象と判定

| 対象 | 判定 | 監査所見 |
|---|---|---|
| `app/src/infrastructure/duckdb/queries/purchaseComparison.ts::querySalesTotal` | **注意** | `isPrevYear` 条件は正しく反映。`classified_sales` 直接 `SUM` のため、同一レーン重複には脆弱 |
| `app/src/infrastructure/duckdb/queries/freePeriodFactQueries.ts::queryFreePeriodDaily` | **注意** | `GROUP BY p.cost, p.price` は標準 SQL。懸念は `classified_sales` 直接 `SUM` による duplicate sensitivity |
| `purchaseComparison.ts::querySalesDaily` | **注意** | `store_day_summary` 経由。`is_prev_year` 条件は正しく反映されるが、正しさは summary 正本の健全性に依存 |
| `purchaseComparison.ts::queryStoreCostPrice` | **概ね良好** | `purchase/special_sales/transfers` は UNION ALL 後に store_id で再集約しており、集計意図は明確。重複安全性は loader 契約に依存 |
| `purchaseComparison.ts::queryStoreDailyMarkupRate` | **概ね良好** | 上と同様。日別再集約はあるが、基表重複を吸収するための canonicalization ではない |
| `purchaseComparison.ts::querySpecialSalesDaily` | **概ね良好** | `special_sales` を store/day/type で集約。レポート用途として自然だが duplicate-proof ではない |
| `purchaseComparison.ts::queryTransfersDaily` | **概ね良好** | `transfers` を store/day/direction で集約。duplicate-proof ではないが明示的なバグは未検出 |

---

## 詳細所見

### 1. `querySalesTotal` — パラメータ不一致バグはなし、脆弱性は duplicate sensitivity のみ

対象実装:

- `querySalesTotal` は `purchaseWhere(dateFrom, dateTo, storeIds, { type: 'boolean', column: 'is_prev_year', value: isPrevYear })`
  で WHERE を組み立て、`classified_sales` に対して `SUM(sales_amount)` を取っている。
- 同じパターンは `querySalesDaily` にも使われており、`is_prev_year` 条件は purchase 専用ではなく
  `buildTypedWhere` により一般のテーブル WHERE として使われている。

監査判断:

- Explore agent の「`isPrevYear` パラメータが効いていない」は **誤り**。
- 実際には `classified_sales.is_prev_year = <isPrevYear>` が正しく組み込まれるため、
  **current / prevYear レーンの取り違えバグは存在しない**。
- ただし、`classified_sales` を **事前集約や canonicalization なしで直接 `SUM`** しているため、
  同一 `(store_id, date_key, is_prev_year)` レーンに重複行が存在すると total が膨張しうる。

結論:

- **バグ分類:** parameter mismatch ではない
- **真の分類:** duplicate-sensitive read path
- **対応優先度:** 低〜中（直ちに壊れている証拠はないが、正本契約が崩れた際の防御は弱い）

### 2. `freePeriodFactQueries` — `GROUP BY p.cost, p.price` は妥当、懸念は `classified_sales` の直接 SUM

対象実装:

- `queryFreePeriodDaily` は `classified_sales cs` を基表にし、
  `purchase` を `(store_id, date_key)` で一度集約したサブクエリ `p` と LEFT JOIN している。
- そのうえで `SUM(cs.sales_amount)`, `SUM(cs.customers)`, `SUM(cs.discount_71 + ... + cs.discount_74)` を取り、
  `p.cost`, `p.price` は非集約列として `GROUP BY cs.store_id, cs.date_key, cs.day, cs.is_prev_year, p.cost, p.price`
  に含めている。

監査判断:

- Explore agent の「`GROUP BY p.cost, p.price` は非標準 SQL」は **誤り**。
  これは SELECT に現れる非集約列を GROUP BY に入れているだけで、**標準 SQL として正しい**。
- 真の懸念は、`cs` 側がレーン単位で事前集約されていないことにある。
  そのため、`classified_sales` に同一レーン重複があると `sales/customers/discount` が膨張しうる。
- 一方で `purchase` 側は `SUM(cost) AS cost, SUM(price) AS price` を `(store_id, date_key)` で
  先に集約してから JOIN しており、`p` 側だけが multiplicative join の原因になる構造ではない。

結論:

- **バグ分類:** non-standard SQL ではない
- **真の分類:** `classified_sales` direct-SUM による duplicate-sensitive read path
- **対応優先度:** 中（自由期間 fact は画面/分析面への波及が大きいため、将来の readModel 化候補）

### 3. `querySalesDaily` — summary 正本依存の read path

対象実装:

- `store_day_summary` から `SUM(sales)` を day ごとに取得している。
- `is_prev_year` 条件は `purchaseWhere(... extra boolean ...)` により正しく付与される。

監査判断:

- パラメータ不一致はなし。
- この経路自体は `classified_sales` 直接参照ではなく summary view 依存であり、
  重複脆弱性の本体は summary 側に持ち込まれた場合に現れる。
- data-load idempotency 側で `loadMonth` の replace 契約と前年 purge は修正済みであるため、
  現状は **summary 正本が壊れていない限り許容** と判断する。

### 4. `purchase` / `special_sales` / `transfers` の日別・店舗別集計群

対象実装:

- `queryStoreCostPrice`
- `queryStoreDailyMarkupRate`
- `querySpecialSalesDaily`
- `queryTransfersDaily`

監査判断:

- いずれも対象テーブルを明示的に `SUM` し、レポートが必要とする粒度
  (`store_id`, `day`, `type`, `direction`) で再集約している。
- これらは **duplicate-proof ではない**。ただしそれはバグというより、
  loader / canonicalization 契約に依存する read-path の性質である。
- 今回の監査では、**新規の設計逸脱やパラメータ誤用は未検出**。

---

## リスク整理

### 高リスク（今回未検出）

- `isPrevYear` 条件が無視される
- `prev/current` レーンが取り違えられる
- JOIN によって行数が意図せず乗算される

→ 今回の監査対象では **明示的には未検出**。

### 中リスク（残存）

- `classified_sales` を read-path で直接 `SUM` している経路は、
  loader 契約が将来崩れた際に duplicate-sensitive
- summary / raw table を直接読む query は canonical readModel ほど防御的ではない

→ 将来の refactor 候補として残す。

### 低リスク（現状許容）

- `purchase` / `special_sales` / `transfers` の単純再集約クエリ
- 画面/分析用途の spot query

→ 直ちに readModel 化は不要。

---

## 最終判断

本監査により、`data-load-idempotency-plan.md` に残っていた
「read-path クエリの spot audit」は **実施済み** と判断する。

監査結果は以下の通り。

- `querySalesTotal` に parameter mismatch bug はない
- `freePeriodFactQueries` の `GROUP BY p.cost, p.price` は標準 SQL として妥当
- ただし、`classified_sales` を direct-SUM する経路には duplicate sensitivity が残る
- これは **既知の設計負債 / 将来の readModel 化候補** であり、
  現時点で idempotency plan を reopen する根拠にはならない

したがって、本監査報告の追加をもって **残タスク 1 はクローズ** とする。

---

## フォローアップ（別スコープ）

本レポートは残タスクを閉じるための監査であり、以下は **別スコープの改善候補** として扱う。

1. `classified_sales` direct-SUM 経路の readModel 化優先度整理
2. 自由期間分析 fact の canonical readModel 化検討
3. `query-access-audit` generated report に duplicate-sensitive route 注記を追加するかの検討

---

## 参照

- `references/03-guides/data-load-idempotency-plan.md`
- `app/src/infrastructure/duckdb/queries/purchaseComparison.ts`
- `app/src/infrastructure/duckdb/queries/freePeriodFactQueries.ts`
