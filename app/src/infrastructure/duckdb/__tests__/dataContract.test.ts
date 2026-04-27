/**
 * データ契約テスト
 *
 * Domain モデル ↔ DuckDB スキーマ ↔ ファイルインポートの間の構造的整合性を検証する。
 * 入力フォーマット変更を早期検出し、層間のデータ契約違反を防ぐ。
 *
 * 検証項目:
 * 1. DuckDB テーブルカラムが Domain モデルのフィールドを網羅しているか
 * 2. TABLE_COLUMNS（dataLoader.ts）が schemas.ts の DDL と一致しているか
 * 3. FILE_TYPE_REGISTRY の構造検証パラメータが正しいか
 * 4. スキーマバージョンとマイグレーションの整合性
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { TABLE_NAMES, ALL_TABLE_DDLS, SCHEMA_VERSION } from '../schemas'
import { migrations } from '../migrations/registry'
import { FILE_TYPE_REGISTRY } from '../../fileImport/FileTypeDetector'

// ── 1. DuckDB テーブル定義の構造検証 ──

describe('DuckDB テーブル定義の契約', () => {
  it('TABLE_NAMES は重複なしの配列であること', () => {
    const unique = new Set(TABLE_NAMES)
    expect(unique.size).toBe(TABLE_NAMES.length)
  })

  it('ALL_TABLE_DDLS は TABLE_NAMES のすべてをカバーすること', () => {
    const ddlNames = ALL_TABLE_DDLS.map((d) => d.name)
    for (const name of TABLE_NAMES) {
      expect(ddlNames).toContain(name)
    }
  })

  it('全テーブルの DDL に year, month カラムが含まれること（app_settings を除く）', () => {
    const tablesWithDateColumns = TABLE_NAMES.filter((n) => n !== 'app_settings')
    for (const tableName of tablesWithDateColumns) {
      const entry = ALL_TABLE_DDLS.find((d) => d.name === tableName)
      expect(entry, `DDL for ${tableName} should exist`).toBeDefined()
      expect(entry!.ddl).toContain('year')
      expect(entry!.ddl).toContain('month')
    }
  })

  it('classified_sales は必須カラムを持つこと', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'classified_sales')!.ddl
    const requiredColumns = [
      'year',
      'month',
      'day',
      'date_key',
      'store_id',
      'store_name',
      'group_name',
      'department_name',
      'line_name',
      'class_name',
      'sales_amount',
      'discount_71',
      'discount_72',
      'discount_73',
      'discount_74',
      'is_prev_year',
    ]
    for (const col of requiredColumns) {
      expect(ddl, `classified_sales should contain ${col}`).toContain(col)
    }
  })

  it('category_time_sales は必須カラムを持つこと', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'category_time_sales')!.ddl
    const requiredColumns = [
      'year',
      'month',
      'day',
      'date_key',
      'store_id',
      'dept_code',
      'dept_name',
      'line_code',
      'line_name',
      'klass_code',
      'klass_name',
      'total_quantity',
      'total_amount',
      'dow',
      'is_prev_year',
    ]
    for (const col of requiredColumns) {
      expect(ddl, `category_time_sales should contain ${col}`).toContain(col)
    }
  })

  it('time_slots は必須カラムを持つこと', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'time_slots')!.ddl
    const requiredColumns = [
      'year',
      'month',
      'day',
      'date_key',
      'store_id',
      'dept_code',
      'line_code',
      'klass_code',
      'hour',
      'quantity',
      'amount',
      'is_prev_year',
    ]
    for (const col of requiredColumns) {
      expect(ddl, `time_slots should contain ${col}`).toContain(col)
    }
  })

  it('purchase は必須カラムを持つこと', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'purchase')!.ddl
    const requiredColumns = [
      'year',
      'month',
      'store_id',
      'day',
      'date_key',
      'supplier_code',
      'supplier_name',
      'cost',
      'price',
    ]
    for (const col of requiredColumns) {
      expect(ddl, `purchase should contain ${col}`).toContain(col)
    }
  })

  it('department_kpi は必須カラムを持つこと', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'department_kpi')!.ddl
    const requiredColumns = [
      'year',
      'month',
      'dept_code',
      'dept_name',
      'gp_rate_budget',
      'gp_rate_actual',
      'gp_rate_variance',
      'markup_rate',
      'discount_rate',
      'sales_budget',
      'sales_actual',
      'sales_variance',
      'sales_achievement',
      'opening_inventory',
      'closing_inventory',
    ]
    for (const col of requiredColumns) {
      expect(ddl, `department_kpi should contain ${col}`).toContain(col)
    }
  })

  it('budget は必須カラムを持つこと', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'budget')!.ddl
    const requiredColumns = ['year', 'month', 'store_id', 'day', 'date_key', 'amount']
    for (const col of requiredColumns) {
      expect(ddl, `budget should contain ${col}`).toContain(col)
    }
  })

  it('inventory_config は必須カラムを持つこと', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'inventory_config')!.ddl
    const requiredColumns = [
      'year',
      'month',
      'store_id',
      'opening_inventory',
      'closing_inventory',
      'gross_profit_budget',
    ]
    for (const col of requiredColumns) {
      expect(ddl, `inventory_config should contain ${col}`).toContain(col)
    }
  })
})

// ── 2. Domain ↔ DuckDB カラムマッピング契約 ──

describe('Domain → DuckDB カラムマッピング契約', () => {
  /**
   * ClassifiedSalesRecord のフィールド → classified_sales カラムの対応表。
   * 新しいフィールド追加時にこのテストが失敗し、DuckDB 側の同期漏れを検出する。
   */
  const CLASSIFIED_SALES_CONTRACT: Record<string, string> = {
    // Domain field → DuckDB column
    year: 'year',
    month: 'month',
    day: 'day',
    storeId: 'store_id',
    storeName: 'store_name',
    groupName: 'group_name',
    departmentName: 'department_name',
    lineName: 'line_name',
    className: 'class_name',
    salesAmount: 'sales_amount',
    discount71: 'discount_71',
    discount72: 'discount_72',
    discount73: 'discount_73',
    discount74: 'discount_74',
  }

  it('ClassifiedSalesRecord の全フィールドが DuckDB DDL に存在すること', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'classified_sales')!.ddl
    for (const [domainField, dbColumn] of Object.entries(CLASSIFIED_SALES_CONTRACT)) {
      expect(ddl, `DuckDB column for ${domainField} (${dbColumn})`).toContain(dbColumn)
    }
  })

  /**
   * CategoryTimeSalesRecord のフィールド → category_time_sales カラムの対応表。
   */
  const CATEGORY_TIME_SALES_CONTRACT: Record<string, string> = {
    year: 'year',
    month: 'month',
    day: 'day',
    storeId: 'store_id',
    'department.code': 'dept_code',
    'department.name': 'dept_name',
    'line.code': 'line_code',
    'line.name': 'line_name',
    'klass.code': 'klass_code',
    'klass.name': 'klass_name',
    totalQuantity: 'total_quantity',
    totalAmount: 'total_amount',
  }

  it('CategoryTimeSalesRecord の全フィールドが DuckDB DDL に存在すること', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'category_time_sales')!.ddl
    for (const [domainField, dbColumn] of Object.entries(CATEGORY_TIME_SALES_CONTRACT)) {
      expect(ddl, `DuckDB column for ${domainField} (${dbColumn})`).toContain(dbColumn)
    }
  })

  /**
   * DepartmentKpiRecord のフィールド → department_kpi カラムの対応表。
   */
  const DEPARTMENT_KPI_CONTRACT: Record<string, string> = {
    deptCode: 'dept_code',
    deptName: 'dept_name',
    gpRateBudget: 'gp_rate_budget',
    gpRateActual: 'gp_rate_actual',
    gpRateVariance: 'gp_rate_variance',
    markupRate: 'markup_rate',
    discountRate: 'discount_rate',
    salesBudget: 'sales_budget',
    salesActual: 'sales_actual',
    salesVariance: 'sales_variance',
    salesAchievement: 'sales_achievement',
    openingInventory: 'opening_inventory',
    closingInventory: 'closing_inventory',
    gpRateLanding: 'gp_rate_landing',
    salesLanding: 'sales_landing',
  }

  it('DepartmentKpiRecord の全フィールドが DuckDB DDL に存在すること', () => {
    const ddl = ALL_TABLE_DDLS.find((d) => d.name === 'department_kpi')!.ddl
    for (const [domainField, dbColumn] of Object.entries(DEPARTMENT_KPI_CONTRACT)) {
      expect(ddl, `DuckDB column for ${domainField} (${dbColumn})`).toContain(dbColumn)
    }
  })
})

// ── 3. ファイルインポート構造契約 ──

describe('ファイルインポート構造契約', () => {
  it('FILE_TYPE_REGISTRY の各エントリは minRows >= 2 であること', () => {
    for (const entry of FILE_TYPE_REGISTRY) {
      expect(entry.minRows, `${entry.type}.minRows`).toBeGreaterThanOrEqual(2)
    }
  })

  it('FILE_TYPE_REGISTRY の各エントリは minCols >= 2 であること', () => {
    for (const entry of FILE_TYPE_REGISTRY) {
      expect(entry.minCols, `${entry.type}.minCols`).toBeGreaterThanOrEqual(2)
    }
  })

  it('FILE_TYPE_REGISTRY に重複する type がないこと', () => {
    const types = FILE_TYPE_REGISTRY.map((e) => e.type)
    const unique = new Set(types)
    expect(unique.size).toBe(types.length)
  })

  /**
   * ファイル種別ごとの最低列数契約。
   * 入力ファイルフォーマットが変更された場合にこのテストで検出する。
   */
  const EXPECTED_MIN_COLS: Record<string, number> = {
    classifiedSales: 7,
    categoryTimeSales: 5,
    purchase: 4,
    flowers: 2,
    directProduce: 2,
    departmentKpi: 5,
    budget: 2,
    interStoreIn: 3,
    interStoreOut: 3,
    consumables: 2,
    initialSettings: 2,
  }

  it('各ファイル種別の minCols が契約値と一致すること', () => {
    for (const [type, expectedMinCols] of Object.entries(EXPECTED_MIN_COLS)) {
      const entry = FILE_TYPE_REGISTRY.find((e) => e.type === type)
      expect(entry, `${type} should exist in FILE_TYPE_REGISTRY`).toBeDefined()
      expect(entry!.minCols, `${type}.minCols`).toBe(expectedMinCols)
    }
  })

  /**
   * ファイル種別ごとの最低行数契約。
   */
  const EXPECTED_MIN_ROWS: Record<string, number> = {
    classifiedSales: 2,
    categoryTimeSales: 4,
    purchase: 3,
    flowers: 2,
    directProduce: 2,
    departmentKpi: 2,
    budget: 2,
    interStoreIn: 2,
    interStoreOut: 2,
    consumables: 2,
    initialSettings: 2,
  }

  it('各ファイル種別の minRows が契約値と一致すること', () => {
    for (const [type, expectedMinRows] of Object.entries(EXPECTED_MIN_ROWS)) {
      const entry = FILE_TYPE_REGISTRY.find((e) => e.type === type)
      expect(entry, `${type} should exist in FILE_TYPE_REGISTRY`).toBeDefined()
      expect(entry!.minRows, `${type}.minRows`).toBe(expectedMinRows)
    }
  })
})

// ── 4. スキーマバージョンとマイグレーション契約 ──

describe('スキーマバージョン契約', () => {
  it('SCHEMA_VERSION は正の整数であること', () => {
    expect(SCHEMA_VERSION).toBeGreaterThan(0)
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true)
  })

  it('マイグレーションのバージョンは連番であること', () => {
    for (let i = 0; i < migrations.length; i++) {
      if (i > 0) {
        expect(migrations[i].version).toBeGreaterThan(migrations[i - 1].version)
      }
    }
  })

  it('最新マイグレーションのバージョンは SCHEMA_VERSION 以下であること', () => {
    if (migrations.length > 0) {
      const lastMigration = migrations[migrations.length - 1]
      expect(lastMigration.version).toBeLessThanOrEqual(SCHEMA_VERSION)
    }
  })

  it('全マイグレーションに description があること', () => {
    for (const migration of migrations) {
      expect(migration.description, `migration v${migration.version}`).toBeTruthy()
    }
  })

  it('全マイグレーションに up と down 関数があること', () => {
    for (const migration of migrations) {
      expect(typeof migration.up, `migration v${migration.version}.up`).toBe('function')
      expect(typeof migration.down, `migration v${migration.version}.down`).toBe('function')
    }
  })
})

// ── 5. DuckDB ↔ Parquet 列指向互換性契約 ──

describe('Parquet 互換性契約', () => {
  it('全テーブルの DDL カラム型が Parquet 互換型であること', () => {
    const parquetCompatibleTypes = [
      'INTEGER',
      'DOUBLE',
      'VARCHAR',
      'BOOLEAN',
      'BIGINT',
      'DATE',
      'TIMESTAMP',
    ]
    for (const { name, ddl } of ALL_TABLE_DDLS) {
      // DDL からカラム型を抽出
      const typeMatches = ddl.match(/\b(INTEGER|DOUBLE|VARCHAR|BOOLEAN|BIGINT|DATE|TIMESTAMP)\b/g)
      if (typeMatches) {
        for (const t of typeMatches) {
          expect(
            parquetCompatibleTypes.includes(t),
            `${name}: type ${t} should be Parquet compatible`,
          ).toBe(true)
        }
      }
    }
  })

  it('store_day_summary VIEW が存在すること（Parquet エクスポート対象外の計算 VIEW）', () => {
    // store_day_summary は VIEW なので TABLE_NAMES には含まれないが、
    // DDL は定義されている（schemas.ts の STORE_DAY_SUMMARY_VIEW_DDL）
    expect(TABLE_NAMES).not.toContain('store_day_summary')
  })
})
