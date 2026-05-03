/**
 * DuckDB テーブル・VIEW の DDL 定数
 *
 * 全テーブルに year, month, day, date_key を持たせ、
 * date_key BETWEEN で月跨ぎクエリに対応する。
 *
 * StoreDayIndex系（purchase, transfers, flowers等）は
 * dataLoader が year/month を外部付与してINSERTする。
 * @responsibility R:unclassified
 */

/** スキーマバージョン（マイグレーション時にインクリメント） */
export const SCHEMA_VERSION = 4

/** スキーマメタテーブル DDL */
export const SCHEMA_META_DDL = `
CREATE TABLE IF NOT EXISTS schema_meta (
  version    INTEGER NOT NULL,
  created_at VARCHAR NOT NULL,
  updated_at VARCHAR NOT NULL
)`

export const TABLE_NAMES = [
  'classified_sales',
  'category_time_sales',
  'time_slots',
  'purchase',
  'special_sales',
  'transfers',
  'consumables',
  'department_kpi',
  'budget',
  'inventory_config',
  'app_settings',
  'weather_hourly',
] as const

export type TableName = (typeof TABLE_NAMES)[number]

// ── classified_sales ──
// ソース: ClassifiedSalesRecord（year/month/day 自己保持）
export const CLASSIFIED_SALES_DDL = `
CREATE TABLE IF NOT EXISTS classified_sales (
  year            INTEGER NOT NULL,
  month           INTEGER NOT NULL,
  day             INTEGER NOT NULL,
  date_key        VARCHAR NOT NULL,
  store_id        VARCHAR NOT NULL,
  store_name      VARCHAR,
  group_name      VARCHAR,
  department_name VARCHAR,
  line_name       VARCHAR,
  class_name      VARCHAR,
  sales_amount    DOUBLE NOT NULL,
  discount_71     DOUBLE DEFAULT 0,
  discount_72     DOUBLE DEFAULT 0,
  discount_73     DOUBLE DEFAULT 0,
  discount_74     DOUBLE DEFAULT 0,
  is_prev_year    BOOLEAN DEFAULT FALSE
)`

// ── category_time_sales ──
// ソース: CategoryTimeSalesRecord（year/month/day 自己保持）
// timeSlots は time_slots テーブルに正規化展開
export const CATEGORY_TIME_SALES_DDL = `
CREATE TABLE IF NOT EXISTS category_time_sales (
  year           INTEGER NOT NULL,
  month          INTEGER NOT NULL,
  day            INTEGER NOT NULL,
  date_key       VARCHAR NOT NULL,
  store_id       VARCHAR NOT NULL,
  dept_code      VARCHAR NOT NULL,
  dept_name      VARCHAR,
  line_code      VARCHAR NOT NULL,
  line_name      VARCHAR,
  klass_code     VARCHAR NOT NULL,
  klass_name     VARCHAR,
  total_quantity DOUBLE NOT NULL,
  total_amount   DOUBLE NOT NULL,
  dow            INTEGER NOT NULL,
  is_prev_year   BOOLEAN DEFAULT FALSE
)`

// ── time_slots ──
// ソース: CategoryTimeSalesRecord.timeSlots[] 展開（1レコード×N時間帯 → N行）
export const TIME_SLOTS_DDL = `
CREATE TABLE IF NOT EXISTS time_slots (
  year         INTEGER NOT NULL,
  month        INTEGER NOT NULL,
  day          INTEGER NOT NULL,
  date_key     VARCHAR NOT NULL,
  store_id     VARCHAR NOT NULL,
  dept_code    VARCHAR NOT NULL,
  line_code    VARCHAR NOT NULL,
  klass_code   VARCHAR NOT NULL,
  hour         INTEGER NOT NULL,
  quantity     DOUBLE NOT NULL,
  amount       DOUBLE NOT NULL,
  is_prev_year BOOLEAN DEFAULT FALSE
)`

// ── purchase ──
// ソース: PurchaseData = StoreDayIndex<PurchaseDayEntry>（year/month は dataLoader が付与）
export const PURCHASE_DDL = `
CREATE TABLE IF NOT EXISTS purchase (
  year          INTEGER NOT NULL,
  month         INTEGER NOT NULL,
  store_id      VARCHAR NOT NULL,
  day           INTEGER NOT NULL,
  date_key      VARCHAR NOT NULL,
  supplier_code VARCHAR,
  supplier_name VARCHAR,
  cost          DOUBLE NOT NULL,
  price         DOUBLE NOT NULL
)`

// ── special_sales ──
// ソース: SpecialSalesData = StoreDayIndex<SpecialSalesDayEntry>
// type: 'flowers' | 'directProduce' で区別
export const SPECIAL_SALES_DDL = `
CREATE TABLE IF NOT EXISTS special_sales (
  year      INTEGER NOT NULL,
  month     INTEGER NOT NULL,
  store_id  VARCHAR NOT NULL,
  day       INTEGER NOT NULL,
  date_key  VARCHAR NOT NULL,
  type      VARCHAR NOT NULL,
  cost      DOUBLE NOT NULL,
  price     DOUBLE NOT NULL,
  customers INTEGER DEFAULT 0
)`

// ── transfers ──
// ソース: TransferData = StoreDayIndex<TransferDayEntry>
// direction: 'interStoreIn' | 'interStoreOut' | 'interDeptIn' | 'interDeptOut'
export const TRANSFERS_DDL = `
CREATE TABLE IF NOT EXISTS transfers (
  year      INTEGER NOT NULL,
  month     INTEGER NOT NULL,
  store_id  VARCHAR NOT NULL,
  day       INTEGER NOT NULL,
  date_key  VARCHAR NOT NULL,
  direction VARCHAR NOT NULL,
  cost      DOUBLE NOT NULL,
  price     DOUBLE NOT NULL
)`

// ── consumables ──
// ソース: CostInclusionData = StoreDayIndex<CostInclusionDailyRecord>
export const COST_INCLUSIONS_DDL = `
CREATE TABLE IF NOT EXISTS consumables (
  year     INTEGER NOT NULL,
  month    INTEGER NOT NULL,
  store_id VARCHAR NOT NULL,
  day      INTEGER NOT NULL,
  date_key VARCHAR NOT NULL,
  cost     DOUBLE NOT NULL
)`

// ── department_kpi ──
// ソース: DepartmentKpiRecord（year/month は dataLoader が付与）
export const DEPARTMENT_KPI_DDL = `
CREATE TABLE IF NOT EXISTS department_kpi (
  year              INTEGER NOT NULL,
  month             INTEGER NOT NULL,
  dept_code         VARCHAR NOT NULL,
  dept_name         VARCHAR,
  gp_rate_budget    DOUBLE,
  gp_rate_actual    DOUBLE,
  gp_rate_variance  DOUBLE,
  markup_rate       DOUBLE,
  discount_rate     DOUBLE,
  sales_budget      DOUBLE,
  sales_actual      DOUBLE,
  sales_variance    DOUBLE,
  sales_achievement DOUBLE,
  opening_inventory DOUBLE,
  closing_inventory DOUBLE,
  gp_rate_landing   DOUBLE,
  sales_landing     DOUBLE
)`

// ── budget ──
// ソース: BudgetData（日別予算）
export const BUDGET_DDL = `
CREATE TABLE IF NOT EXISTS budget (
  year     INTEGER NOT NULL,
  month    INTEGER NOT NULL,
  store_id VARCHAR NOT NULL,
  day      INTEGER NOT NULL,
  date_key VARCHAR NOT NULL,
  amount   DOUBLE NOT NULL
)`

// ── inventory_config ──
// ソース: InventoryConfig（期首/期末在庫 + 粗利予算）
export const INVENTORY_CONFIG_DDL = `
CREATE TABLE IF NOT EXISTS inventory_config (
  year                INTEGER NOT NULL,
  month               INTEGER NOT NULL,
  store_id            VARCHAR NOT NULL,
  opening_inventory   DOUBLE,
  closing_inventory   DOUBLE,
  gross_profit_budget DOUBLE DEFAULT 0
)`

// ── app_settings ──
// アプリケーション設定（defaultMarkupRate, defaultBudget 等）
// SQL 計算 VIEW が参照する
export const APP_SETTINGS_DDL = `
CREATE TABLE IF NOT EXISTS app_settings (
  key   VARCHAR PRIMARY KEY,
  value DOUBLE NOT NULL
)`

// ── weather_hourly ──
// ソース: 気象庁 ETRN（時間別天気データ）
// date_key を主キーとし、月跨ぎでも連続的に保持
export const WEATHER_HOURLY_DDL = `
CREATE TABLE IF NOT EXISTS weather_hourly (
  date_key            VARCHAR NOT NULL,
  year                INTEGER NOT NULL,
  month               INTEGER NOT NULL,
  day                 INTEGER NOT NULL,
  hour                INTEGER NOT NULL,
  store_id            VARCHAR NOT NULL,
  temperature         DOUBLE,
  humidity            DOUBLE,
  precipitation       DOUBLE,
  wind_speed          DOUBLE,
  weather_code        INTEGER,
  sunshine_duration   DOUBLE
)`

/** 全テーブルの DDL 配列 */
export const ALL_TABLE_DDLS: readonly { readonly name: TableName; readonly ddl: string }[] = [
  { name: 'classified_sales', ddl: CLASSIFIED_SALES_DDL },
  { name: 'category_time_sales', ddl: CATEGORY_TIME_SALES_DDL },
  { name: 'time_slots', ddl: TIME_SLOTS_DDL },
  { name: 'purchase', ddl: PURCHASE_DDL },
  { name: 'special_sales', ddl: SPECIAL_SALES_DDL },
  { name: 'transfers', ddl: TRANSFERS_DDL },
  { name: 'consumables', ddl: COST_INCLUSIONS_DDL },
  { name: 'department_kpi', ddl: DEPARTMENT_KPI_DDL },
  { name: 'budget', ddl: BUDGET_DDL },
  { name: 'inventory_config', ddl: INVENTORY_CONFIG_DDL },
  { name: 'app_settings', ddl: APP_SETTINGS_DDL },
  { name: 'weather_hourly', ddl: WEATHER_HOURLY_DDL },
]

// ── VIEW: store_day_summary ──
// classified_sales を基準に9テーブル LEFT JOIN で store×day を結合。
//
// 【重要: 全 LEFT JOIN は GROUP BY サブクエリ経由】
// 各ソーステーブルは同一 (year, month, store_id, day) に複数行を持ちうる:
//   - classified_sales: 部門×ライン×クラス単位の行
//   - purchase: 仕入先ごとの行
//   - transfers: direction ごとの行
//   - special_sales: type ごとの行（再ロード時に蓄積する可能性あり）
//   - consumables: コスト項目ごとの行
//   - category_time_sales: 部門×ライン×クラス単位の行
//
// 直接 LEFT JOIN すると行が倍増し、合計値が N 倍になる（実際に発生: #前年点数2倍バグ）。
// ガードテスト codePatternGuard.test.ts "B2" で非集約 JOIN を機械的に禁止している。
export const STORE_DAY_SUMMARY_VIEW_DDL = `
CREATE OR REPLACE VIEW store_day_summary AS
SELECT
  cs.year, cs.month, cs.day, cs.date_key, cs.store_id,
  cs.sales,
  cs.sales - COALESCE(ss_f.price, 0) - COALESCE(ss_d.price, 0) AS core_sales,
  cs.sales + ABS(cs.discount_71 + cs.discount_72 + cs.discount_73 + cs.discount_74)
    AS gross_sales,
  cs.discount_71, cs.discount_72, cs.discount_73, cs.discount_74,
  cs.discount_71 + cs.discount_72 + cs.discount_73 + cs.discount_74 AS discount_amount,
  ABS(cs.discount_71 + cs.discount_72 + cs.discount_73 + cs.discount_74)
    AS discount_absolute,
  COALESCE(p.total_cost, 0)  AS purchase_cost,
  COALESCE(p.total_price, 0) AS purchase_price,
  COALESCE(t_si.cost, 0) AS inter_store_in_cost,
  COALESCE(t_si.price, 0) AS inter_store_in_price,
  COALESCE(t_so.cost, 0) AS inter_store_out_cost,
  COALESCE(t_so.price, 0) AS inter_store_out_price,
  COALESCE(t_di.cost, 0) AS inter_dept_in_cost,
  COALESCE(t_di.price, 0) AS inter_dept_in_price,
  COALESCE(t_do.cost, 0) AS inter_dept_out_cost,
  COALESCE(t_do.price, 0) AS inter_dept_out_price,
  COALESCE(ss_f.cost, 0)  AS flowers_cost,
  COALESCE(ss_f.price, 0) AS flowers_price,
  COALESCE(ss_d.cost, 0)  AS direct_produce_cost,
  COALESCE(ss_d.price, 0) AS direct_produce_price,
  COALESCE(con.cost, 0)   AS cost_inclusion_cost,
  COALESCE(ss_f.customers, 0) AS customers,
  COALESCE(qty.total_quantity, 0) AS total_quantity,
  cs.is_prev_year
FROM (
  -- cs: classified_sales は部門×ライン×クラス単位 → store×day に集約
  SELECT year, month, day, date_key, store_id, is_prev_year,
    SUM(sales_amount) AS sales,
    SUM(discount_71) AS discount_71,
    SUM(discount_72) AS discount_72,
    SUM(discount_73) AS discount_73,
    SUM(discount_74) AS discount_74
  FROM classified_sales
  GROUP BY year, month, day, date_key, store_id, is_prev_year
) cs
LEFT JOIN (
  -- p: purchase は仕入先ごとに行あり → store×day に集約
  SELECT year, month, store_id, day,
    SUM(cost) AS total_cost, SUM(price) AS total_price
  FROM purchase
  GROUP BY year, month, store_id, day
) p
  ON cs.year = p.year AND cs.month = p.month
  AND cs.store_id = p.store_id AND cs.day = p.day
LEFT JOIN (
  -- t_si: transfers(interStoreIn) は複数取引あり → store×day に集約
  SELECT year, month, store_id, day,
    SUM(cost) AS cost, SUM(price) AS price
  FROM transfers WHERE direction = 'interStoreIn'
  GROUP BY year, month, store_id, day
) t_si
  ON cs.year = t_si.year AND cs.month = t_si.month
  AND cs.store_id = t_si.store_id AND cs.day = t_si.day
LEFT JOIN (
  -- t_so: transfers(interStoreOut) → store×day に集約
  SELECT year, month, store_id, day,
    SUM(cost) AS cost, SUM(price) AS price
  FROM transfers WHERE direction = 'interStoreOut'
  GROUP BY year, month, store_id, day
) t_so
  ON cs.year = t_so.year AND cs.month = t_so.month
  AND cs.store_id = t_so.store_id AND cs.day = t_so.day
LEFT JOIN (
  -- t_di: transfers(interDeptIn) → store×day に集約
  SELECT year, month, store_id, day,
    SUM(cost) AS cost, SUM(price) AS price
  FROM transfers WHERE direction = 'interDeptIn'
  GROUP BY year, month, store_id, day
) t_di
  ON cs.year = t_di.year AND cs.month = t_di.month
  AND cs.store_id = t_di.store_id AND cs.day = t_di.day
LEFT JOIN (
  -- t_do: transfers(interDeptOut) → store×day に集約
  SELECT year, month, store_id, day,
    SUM(cost) AS cost, SUM(price) AS price
  FROM transfers WHERE direction = 'interDeptOut'
  GROUP BY year, month, store_id, day
) t_do
  ON cs.year = t_do.year AND cs.month = t_do.month
  AND cs.store_id = t_do.store_id AND cs.day = t_do.day
LEFT JOIN (
  -- ss_f: special_sales(flowers) は再ロード時に蓄積しうる → store×day に集約
  -- cost/price は金額（SUM で合算）、customers は件数（MAX で重複排除 — SUM だと二重計上）
  -- @defense customers=MAX: ロード境界が壊れたときの暴発（過去 1.56e+17 事件）を
  --   塞ぐ defense-in-depth。SUM に戻さないこと。
  --   詳細: references/03-implementation/data-load-idempotency-handoff.md §3.2
  SELECT year, month, store_id, day,
    SUM(cost) AS cost, SUM(price) AS price, MAX(customers) AS customers
  FROM special_sales WHERE type = 'flowers'
  GROUP BY year, month, store_id, day
) ss_f
  ON cs.year = ss_f.year AND cs.month = ss_f.month
  AND cs.store_id = ss_f.store_id AND cs.day = ss_f.day
LEFT JOIN (
  -- ss_d: special_sales(directProduce) は再ロード時に蓄積しうる → store×day に集約
  SELECT year, month, store_id, day,
    SUM(cost) AS cost, SUM(price) AS price
  FROM special_sales WHERE type = 'directProduce'
  GROUP BY year, month, store_id, day
) ss_d
  ON cs.year = ss_d.year AND cs.month = ss_d.month
  AND cs.store_id = ss_d.store_id AND cs.day = ss_d.day
LEFT JOIN (
  -- con: consumables はコスト項目ごとに行あり → store×day に集約
  SELECT year, month, store_id, day,
    SUM(cost) AS cost
  FROM consumables
  GROUP BY year, month, store_id, day
) con
  ON cs.year = con.year AND cs.month = con.month
  AND cs.store_id = con.store_id AND cs.day = con.day
LEFT JOIN (
  -- qty: category_time_sales は部門×ライン×クラス単位 → store×day に集約
  -- is_prev_year で JOIN（当年/前年の混在防止）
  SELECT year, month, store_id, day, is_prev_year,
    SUM(total_quantity) AS total_quantity
  FROM category_time_sales
  GROUP BY year, month, store_id, day, is_prev_year
) qty
  ON cs.year = qty.year AND cs.month = qty.month
  AND cs.store_id = qty.store_id AND cs.day = qty.day
  AND cs.is_prev_year = qty.is_prev_year`

// ── マテリアライズ用 ──
// データロード完了後に VIEW → 同名 TABLE に昇格（全後続クエリが高速化）
export const MATERIALIZE_SUMMARY_DDL = `
CREATE TABLE store_day_summary_mat AS SELECT * FROM store_day_summary;
DROP VIEW IF EXISTS store_day_summary;
ALTER TABLE store_day_summary_mat RENAME TO store_day_summary`
