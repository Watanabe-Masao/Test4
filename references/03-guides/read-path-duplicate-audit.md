# Read-path 重複耐性 Spot Audit レポート

> **役割: 根拠資料**
> 実施: 2026-04-12 / idempotent load contract Phase 3.a 完了後の残タスク
> 関連: `data-load-idempotency-plan.md` / PR #993-#999
>
> 本書は分類の機械的根拠を保持する。優先順位や Done 定義の正本は
> `data-load-idempotency-plan.md` §7-8。本書とズレた場合は plan を真とする。

## 目的

idempotent load contract（`loadMonth` の replace セマンティクス）が main に
landed した後、`classified_sales` / `special_sales` / `transfers` の 3 テーブルを
SUM している read-path クエリに、「ロード境界が正しい」ことを暗黙の前提に
している脆弱な集約パターンが残っていないかを機械的に洗い出す。

目的はあくまで **可視化** であり、本 audit の範囲で read-path 側の refactor は
行わない。フラジャイルなクエリをリストアップし、将来のバグ混入や退行を
検出しやすくするための情報を team に共有することが deliverable。

## 判定基準

各 SQL クエリを以下の 3 つにカテゴライズする:

| Risk | 条件 |
|---|---|
| **FRAGILE** | SUM を直接取る + 防御集約なし + GROUP BY で重複吸収されない + 仮に 3 テーブルに重複行が混入したら silent に double count する |
| **PARTIAL** | SUM を取るが、`is_prev_year` フィルタや GROUP BY の粒度で一部の重複パターンを吸収できる |
| **SAFE** | 既に集約済みの VIEW（`store_day_summary`）経由で読む / 防御集約（`MAX(customers)` 等）を使う / lookup 目的で SUM していない |

## サマリ

調査対象: `app/src/application/queries/` および `app/src/infrastructure/duckdb/queries/`
配下で 3 テーブルのいずれかを参照しているクエリ全て。

- **FRAGILE → SAFE 昇格済み**: 2 箇所（`purchaseComparison.ts` の UNION ALL クエリ 2 件 — PR D で pre-aggregate refactor 適用）
- **FRAGILE（残）**: 4 箇所（`purchaseComparison.ts` 3 件 + `freePeriodFactQueries.ts` 1 件）
- **PARTIAL**: 3 箇所
- **SAFE**: `store_day_summary` VIEW 経由の全クエリ（約 10 箇所）+ VIEW 本体

FRAGILE の集中スポットは `infrastructure/duckdb/queries/purchaseComparison.ts`
で、UNION ALL と raw SUM の組み合わせが典型的な脆弱パターンだった。
PR D で UNION ALL 2 件は pre-aggregate refactor 済み。残る 3 件 (3/4/5) は
audit 推奨事項上「JSDoc only mitigation」分類で refactor 計画なし。
`freePeriodFactQueries.ts` の daily 集計は PR E で refactor 予定。

### 一覧表

| # | File:line | Table | 集約 | Risk | 備考 |
|---|---|---|---|---|---|
| 1 | `purchaseComparison.ts:107-130` | purchase + special_sales + transfers | UNION ALL + SUM(cost/price) | **SAFE (PR D)** | source ごとに subquery で `(year, month, store_id, day)` 事前集約 |
| 2 | `purchaseComparison.ts:151-175` | 同上 | UNION ALL + SUM(cost/price) GROUP BY store_id, day | **SAFE (PR D)** | daily 版、同パターン |
| 3 | `purchaseComparison.ts:280-300` | special_sales | SUM(cost/price) GROUP BY store_id, day, type | FRAGILE | 直接 SUM |
| 4 | `purchaseComparison.ts:307-326` | transfers | SUM(cost/price) GROUP BY store_id, day, direction | FRAGILE | 直接 SUM |
| 5 | `purchaseComparison.ts:342-360` | classified_sales | SUM(sales_amount) | FRAGILE | `is_prev_year` フィルタあり、同一レーン内重複に脆弱 |
| 6 | `freePeriodFactQueries.ts:46-67` | classified_sales + purchase | SUM(sales_amount/customers/discount_*) | FRAGILE | cs 側を事前集約しない |
| 7 | `categoryDiscount.ts:82-112` | classified_sales | SUM(sales_amount/discount_*) GROUP BY category | PARTIAL | `is_prev_year` フィルタ + GROUP BY で一部吸収 |
| 8 | `categoryDiscount.ts:115-142` | classified_sales | SUM(sales_amount/discount_*) GROUP BY date_key + category | PARTIAL | daily 版 |
| 9 | `discountFactQueries.ts:33-69` | classified_sales | SUM(discount_*) GROUP BY store_id, day, dept, line, class | PARTIAL | 粒度が細かく吸収率高い |
| 10 | `schemas.ts:264-388` | store_day_summary VIEW | 全 source を subquery で事前集約してから LEFT JOIN | SAFE | 防御集約 `MAX(customers)` 付き |
| 11-* | `storeDaySummary.ts` / `storeAggregation.ts` / `dailyRecords.ts` / etc. | store_day_summary 経由 | - | SAFE | VIEW が集約済みなので下流は影響を受けない |

---

## FRAGILE（優先度: 高）

> **注意:** §1 と §2 は **PR D で SAFE 化済み**（pre-aggregate refactor）。
> 以下の SQL 引用と failure mode は refactor 前の状態の歴史的記録として残してある。
> 現在の実装は各 source を subquery で `(year, month, store_id, day)` 事前集約してから
> UNION する。詳細: `app/src/infrastructure/duckdb/queries/purchaseComparison.ts`
> および `__tests__/readPathDuplicateResistance.test.ts` の FRAGILE/1 / FRAGILE/2。

### 1. `queryStoreCostPrice()` — `purchaseComparison.ts:107-130`

```sql
SELECT
  store_id,
  COALESCE(SUM(cost), 0) AS total_cost,
  COALESCE(SUM(price), 0) AS total_price
FROM (
  SELECT store_id, cost, price FROM purchase ${w}
  UNION ALL
  SELECT store_id, cost, price FROM special_sales ${w}
  UNION ALL
  SELECT store_id, cost, price FROM transfers ${w}
) combined
GROUP BY store_id
```

**失敗モード:** `UNION ALL` は重複行を保持する。3 テーブルのいずれかに重複
レコードが混入していた場合、外側の SUM がそれを足し込み、store 単位の
total_cost / total_price が倍化する。source テーブル側で事前集約していない
ため、ロード境界の正しさが結果の正しさと直結する。

### 2. `queryStoreDailyMarkupRate()` — `purchaseComparison.ts:151-175`

#1 の daily 版（`GROUP BY store_id, day`）。failure mode は同じで、粒度が
(store, day) になっているだけ。

### 3. `querySpecialSalesDaily()` — `purchaseComparison.ts:280-300`

```sql
SELECT
  store_id, day, type AS category_key,
  COALESCE(SUM(cost), 0) AS total_cost,
  COALESCE(SUM(price), 0) AS total_price
FROM special_sales
${where}
GROUP BY store_id, day, type
```

**失敗モード:** `special_sales` を直接 SUM。`(store_id, day, type)` で GROUP BY
するが、まさにこの粒度で重複行（例: 同じ store×day×type の行が 2 個）が
混入すると cost/price が倍化する。`special_sales` は `is_prev_year` 列を
持たないため、前年データと当年データが同一 (year, month) に共存することは
ないが、一度でもロードバグで重複が入ればこのクエリは silent に壊れる。

### 4. `queryTransfersDaily()` — `purchaseComparison.ts:307-326`

#3 と完全に同じ構造で、対象が `transfers`、キーが `direction`。

### 5. `querySalesTotal()` — `purchaseComparison.ts:342-360`

```sql
SELECT COALESCE(SUM(sales_amount), 0) AS total_sales
FROM classified_sales
${where}
```

`isPrevYear` パラメータは `purchaseWhere(...)` 経由で `is_prev_year` カラムの
フィルタとして where 句に反映されており、当年レーン / 前年レーンの切り替えは
正しく効いている（`:349-353`）。したがって前年行との混線リスクはない。

**残るリスク:** 単一レーン（例: 当年）内で同じ `classified_sales` 行が
重複した場合、SUM は素直に二重に足し込む。`classified_sales` は明細行が
多いテーブルなので dedup キーが長く（store × day × dept × line × class）、
重複の検出は難しい。

### 6. `queryFreePeriodDaily()` — `freePeriodFactQueries.ts:46-67`

```sql
SELECT
  cs.store_id, cs.date_key, cs.day,
  EXTRACT(DOW FROM cs.date_key::DATE)::INT AS "dow",
  SUM(cs.sales_amount) AS "sales",
  SUM(cs.customers) AS "customers",
  COALESCE(p.cost, 0) AS "purchaseCost",
  COALESCE(p.price, 0) AS "purchasePrice",
  SUM(cs.discount_71 + cs.discount_72 + cs.discount_73 + cs.discount_74) AS "discount",
  cs.is_prev_year AS "isPrevYear"
FROM classified_sales cs
LEFT JOIN (
  SELECT store_id, date_key, SUM(cost) AS cost, SUM(price) AS price
  FROM purchase
  GROUP BY store_id, date_key
) p ON cs.store_id = p.store_id AND cs.date_key = p.date_key
${where}
GROUP BY cs.store_id, cs.date_key, cs.day, cs.is_prev_year, p.cost, p.price
```

**ポイント:** `purchase` 側は subquery で事前集約してから LEFT JOIN しており、
そちらは安全。しかし `classified_sales cs` 側は事前集約せずに SUM を取って
いる。GROUP BY には `(store_id, date_key, day, is_prev_year, p.cost, p.price)`
が入っているため、classified_sales が特定 (store, date, レーン) で複数行
持っているとき（実際には dept × line × class × day の明細に分かれている）、
SUM で集約されて 1 レコードになる。

ここで classified_sales の行が仮に重複していた場合、同一明細行が 2 回足し
込まれて sales / customers / discount が倍化する。

補足: `GROUP BY ... p.cost, p.price` は一見非標準のように見えるが、これは
`COALESCE(p.cost, 0)` / `COALESCE(p.price, 0)` が SELECT 側で非集約カラム
として現れるため、標準 SQL の GROUP BY 規則に従って必須になっている
（DuckDB で非 aggregate カラムを SELECT するには GROUP BY に含めるか
集約関数で包むかの二択）。`p.cost` / `p.price` は subquery で既に一意なので、
GROUP BY に含めても集約単位は壊れない。

---

## PARTIAL（優先度: 中）

### 7. `queryCategoryDiscount()` — `categoryDiscount.ts:82-112`

```sql
SELECT
  ${col.code} AS code, ${col.name} AS name,
  COALESCE(SUM(sales_amount), 0) AS sales_amount,
  COALESCE(SUM(discount_71), 0) AS discount_71,
  ...
FROM classified_sales
${where}${parentWhere}
GROUP BY ${col.code}, ${col.name}
```

**緩和策:**
- `where` に `is_prev_year` フィルタが入っており、前年レーンとの混線はない
- GROUP BY は category 粒度（department / line / class のいずれか）で集約

**残留リスク:** 同一 category 内で複数の classified_sales 行が存在する場合
（これは正常なケース — 例えば同じ dept 内に複数明細行がある）、これらが
SUM で足し込まれるのが仕様。したがって category 粒度では重複検知できず、
明細行レベルで重複があれば SUM は倍化する。

### 8. `queryCategoryDiscountDaily()` — `categoryDiscount.ts:115-142`

#7 の daily 版（`GROUP BY date_key, ${col.code}, ${col.name}`）。
リスクプロファイルは同じ。

### 9. `queryDiscountFact()` — `discountFactQueries.ts:33-69`

```sql
GROUP BY cs.store_id, cs.day, cs.department_name, cs.line_name, cs.class_name
```

**緩和策:** GROUP BY 粒度が (store, day, dept, line, class) と最も細かい。
通常の明細構造だとここが一意になるので、SUM は事実上 1:1 になる。

**残留リスク:** 厳密には同じ (store, day, dept, line, class) が 2 行
ある場合（ロードバグ時）、SUM は倍化する。ただし発火条件は FRAGILE グループ
より狭い。

---

## SAFE: `store_day_summary` VIEW と下流クエリ

### VIEW 本体 — `schemas.ts:264-388`

VIEW は source テーブル（`purchase` / `special_sales` / `transfers` /
`classified_sales`）をいずれも **subquery で事前集約してから** LEFT JOIN
するパターンを一貫して採用している。例:

```sql
LEFT JOIN (
  SELECT year, month, store_id, day,
    SUM(cost) AS cost, SUM(price) AS price
  FROM transfers WHERE direction = 'interStoreIn'
  GROUP BY year, month, store_id, day
) t_si ON ...
```

`special_sales` の subquery では `customers` だけ `MAX(customers) AS customers`
として防御的に集約している（重複行は同じ customer 数を持つはず、という
前提のもと MAX を取れば倍化しない）。この MAX は idempotent load contract 
の前段階で `SUM(customers) → MAX(customers)` に変更された暫定修正で、
ロード境界が正しくなった現在でも defense-in-depth として機能している。

**下流クエリ:**
VIEW を経由してのみデータを読むクエリは全て SAFE:

- `storeDaySummary.ts` 系のクエリ（日別サマリ、集約）
- `storeAggregation.ts` 系（期間集約）
- `dailyRecords.ts`（日次レコード抽出）
- `conditionMatrix.ts`（条件別マトリクス）
- `advancedAnalytics.ts` など

VIEW が重複を構造的に吸収するため、下流で SUM を再度取っても二重化しない。

---

## 推奨事項

1. **FRAGILE クエリに回帰テストを追加する**
   mock conn ベースで良い。`special_sales` / `transfers` / `classified_sales` に
   重複行を挿入した状態で各クエリを実行し、出力が倍化しないことを assert する。
   例:
   ```
   test: querySpecialSalesDaily は source 重複があっても cost/price を倍化しない
   ```
   冪等性契約（`dataLoaderPureFunctions.test.ts`）と同じ位置づけで、
   ロード境界と read-path の両側から重複防止を固める。

2. **`purchaseComparison.ts` の UNION ALL クエリに pre-aggregate 層を入れる**
   refactor は本 audit 範囲外だが、将来のタスクとして `store_day_summary` VIEW
   のパターン（source テーブルを subquery で `GROUP BY year, month, store_id, day`
   してから UNION / JOIN）を検討する価値がある。これが入れば FRAGILE → SAFE に
   昇格する。

3. **`freePeriodFactQueries.DAILY_SQL` の `classified_sales` 側も pre-aggregate する**
   現在の `purchase` 側と同じく、`cs` 側を subquery で事前集約してから JOIN
   すれば、明細行重複が入っても daily 集計は倍化しなくなる。

4. **FRAGILE クエリに JSDoc コメントで前提を明示する**
   refactor を入れるまでの間、該当関数の JSDoc に
   > この関数は source テーブル (`special_sales` 等) の行重複がないことを前提に
   > している。ロード境界が壊れると silent に倍化するため、`dataLoader.ts::loadMonth`
   > の replace セマンティクス契約と一体で動作する。
   のような 1 段落を追加することで、将来の読み手がリスクを認識できる。

5. **PARTIAL 3 件はそのまま据え置きで OK**
   GROUP BY 粒度が細かいため実際に発火する確率は低く、ロード境界が正しい
   限り影響は出ない。JSDoc での前提明示だけ入れれば十分。

## やらないこと（本 audit 範囲外）

- read-path クエリの refactor（上記 2, 3）
- JSDoc 前提コメントの追加（上記 4）
- 回帰テストの追加（上記 1）

これらは全て別タスクとして切り出すべき内容で、本 audit では
**「どのクエリがロード境界の正しさに依存しているか」の可視化** のみを行う。

## 結論

idempotent load contract（Phase 0-3.a, 全て main に landed）により
ロード境界側の冪等性は機械的にロックされている。本 audit で洗い出した
**6 件の FRAGILE クエリ** と **3 件の PARTIAL クエリ** は、ロード境界が
正しく動作し続ける限り silent に壊れることはないが、逆に言えばロード境界の
契約が破られた瞬間にダッシュボードで異常値が出る経路になる。

現時点で修正は不要。将来この領域で追加の防御を入れるなら、
優先順位は **FRAGILE 6 件への回帰テスト追加 → pre-aggregate refactor** の順。
