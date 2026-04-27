/**
 * DuckDB スキーマ定義の構造テスト
 *
 * DDL 文字列が有効な構造を持ち、テーブル定義が欠落していないことを検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  TABLE_NAMES,
  ALL_TABLE_DDLS,
  CLASSIFIED_SALES_DDL,
  CATEGORY_TIME_SALES_DDL,
  TIME_SLOTS_DDL,
  PURCHASE_DDL,
  SPECIAL_SALES_DDL,
  TRANSFERS_DDL,
  COST_INCLUSIONS_DDL,
  DEPARTMENT_KPI_DDL,
  BUDGET_DDL,
  INVENTORY_CONFIG_DDL,
  APP_SETTINGS_DDL,
  STORE_DAY_SUMMARY_VIEW_DDL,
  MATERIALIZE_SUMMARY_DDL,
} from '../schemas'

describe('TABLE_NAMES', () => {
  it('12テーブルが定義されている', () => {
    expect(TABLE_NAMES).toHaveLength(12)
  })

  it('全てのテーブル名が含まれる', () => {
    expect(TABLE_NAMES).toContain('classified_sales')
    expect(TABLE_NAMES).toContain('category_time_sales')
    expect(TABLE_NAMES).toContain('time_slots')
    expect(TABLE_NAMES).toContain('purchase')
    expect(TABLE_NAMES).toContain('special_sales')
    expect(TABLE_NAMES).toContain('transfers')
    expect(TABLE_NAMES).toContain('consumables')
    expect(TABLE_NAMES).toContain('department_kpi')
    expect(TABLE_NAMES).toContain('budget')
    expect(TABLE_NAMES).toContain('inventory_config')
    expect(TABLE_NAMES).toContain('app_settings')
    expect(TABLE_NAMES).toContain('weather_hourly')
  })
})

describe('ALL_TABLE_DDLS', () => {
  it('TABLE_NAMES と同数の DDL が定義されている', () => {
    expect(ALL_TABLE_DDLS).toHaveLength(TABLE_NAMES.length)
  })

  it('各 DDL の name が TABLE_NAMES に含まれる', () => {
    for (const { name } of ALL_TABLE_DDLS) {
      expect(TABLE_NAMES).toContain(name)
    }
  })

  it('各 DDL が CREATE TABLE 文を含む', () => {
    for (const { ddl } of ALL_TABLE_DDLS) {
      expect(ddl).toContain('CREATE TABLE')
    }
  })
})

describe('テーブル DDL 構造', () => {
  const requiredColumnsMap: Record<string, string[]> = {
    classified_sales: [
      'year',
      'month',
      'day',
      'date_key',
      'store_id',
      'sales_amount',
      'is_prev_year',
    ],
    category_time_sales: [
      'year',
      'month',
      'day',
      'date_key',
      'store_id',
      'dept_code',
      'line_code',
      'klass_code',
      'total_quantity',
      'total_amount',
      'dow',
      'is_prev_year',
    ],
    time_slots: [
      'year',
      'month',
      'day',
      'date_key',
      'store_id',
      'hour',
      'quantity',
      'amount',
      'is_prev_year',
    ],
    purchase: ['year', 'month', 'store_id', 'day', 'date_key', 'cost', 'price'],
    special_sales: ['year', 'month', 'store_id', 'day', 'date_key', 'type', 'cost', 'price'],
    transfers: ['year', 'month', 'store_id', 'day', 'date_key', 'direction', 'cost', 'price'],
    consumables: ['year', 'month', 'store_id', 'day', 'date_key', 'cost'],
    department_kpi: [
      'year',
      'month',
      'dept_code',
      'gp_rate_budget',
      'gp_rate_actual',
      'sales_budget',
      'sales_actual',
    ],
    budget: ['year', 'month', 'store_id', 'day', 'date_key', 'amount'],
    inventory_config: [
      'year',
      'month',
      'store_id',
      'opening_inventory',
      'closing_inventory',
      'gross_profit_budget',
    ],
    app_settings: ['key', 'value'],
  }

  const ddlMap: Record<string, string> = {
    classified_sales: CLASSIFIED_SALES_DDL,
    category_time_sales: CATEGORY_TIME_SALES_DDL,
    time_slots: TIME_SLOTS_DDL,
    purchase: PURCHASE_DDL,
    special_sales: SPECIAL_SALES_DDL,
    transfers: TRANSFERS_DDL,
    consumables: COST_INCLUSIONS_DDL,
    department_kpi: DEPARTMENT_KPI_DDL,
    budget: BUDGET_DDL,
    inventory_config: INVENTORY_CONFIG_DDL,
    app_settings: APP_SETTINGS_DDL,
  }

  for (const [table, requiredColumns] of Object.entries(requiredColumnsMap)) {
    describe(`${table}`, () => {
      it('必須カラムが DDL に含まれる', () => {
        const ddl = ddlMap[table]
        for (const col of requiredColumns) {
          expect(ddl).toContain(col)
        }
      })
    })
  }
})

describe('STORE_DAY_SUMMARY_VIEW_DDL', () => {
  it('VIEW 定義を含む', () => {
    expect(STORE_DAY_SUMMARY_VIEW_DDL).toContain('CREATE OR REPLACE VIEW store_day_summary')
  })

  it('classified_sales を基準テーブルとする', () => {
    expect(STORE_DAY_SUMMARY_VIEW_DDL).toContain('FROM classified_sales')
    // サブクエリ内なので FROM ( SELECT ... FROM classified_sales ) の形
  })

  it('LEFT JOIN で全テーブルを結合する', () => {
    expect(STORE_DAY_SUMMARY_VIEW_DDL).toContain('LEFT JOIN')
    // purchase, transfers(4方向), special_sales(2種), consumables
    const joinCount = (STORE_DAY_SUMMARY_VIEW_DDL.match(/LEFT JOIN/g) || []).length
    expect(joinCount).toBeGreaterThanOrEqual(7)
  })

  it('is_prev_year カラムを含む', () => {
    expect(STORE_DAY_SUMMARY_VIEW_DDL).toContain('is_prev_year')
  })
})

describe('MATERIALIZE_SUMMARY_DDL', () => {
  it('VIEW → 同名 TABLE 置換の DDL を含む', () => {
    expect(MATERIALIZE_SUMMARY_DDL).toContain('CREATE TABLE')
    expect(MATERIALIZE_SUMMARY_DDL).toContain('SELECT * FROM store_day_summary')
    expect(MATERIALIZE_SUMMARY_DDL).toContain('DROP VIEW IF EXISTS store_day_summary')
    expect(MATERIALIZE_SUMMARY_DDL).toContain('RENAME TO store_day_summary')
  })
})
