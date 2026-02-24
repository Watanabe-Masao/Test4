/**
 * Supabase リポジトリ実装
 *
 * DataRepository インターフェースを Supabase で実装する。
 * マスター DB として正規化データの書き込み・読み込みを担当。
 *
 * データは「年月 × データ種別」単位で monthly_data テーブルに保存する。
 * ImportedData の Map フィールドは JSON 互換の plain object に変換して格納する。
 */
import type { DataRepository, PersistedSessionMeta, MonthDataSummaryItem } from '@/domain/repositories'
import type { ImportedData, DataType, BudgetData } from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'
import { getSupabaseClient, isSupabaseAvailable } from './client'

// ─── シリアライズ / デシリアライズ ───────────────────────

/** Map → plain object */
function mapToObj<V>(map: ReadonlyMap<string, V>): Record<string, V> {
  const obj: Record<string, V> = {}
  for (const [k, v] of map) obj[k] = v
  return obj
}

/** BudgetData → JSON 互換 object */
function budgetToSerializable(b: BudgetData): object {
  const dailyObj: Record<string, number> = {}
  for (const [day, amount] of b.daily) {
    dailyObj[String(day)] = amount
  }
  return { storeId: b.storeId, total: b.total, daily: dailyObj }
}

/** JSON → BudgetData */
function budgetFromSerializable(obj: Record<string, unknown>): BudgetData {
  const daily = new Map<number, number>()
  const rawDaily = obj.daily as Record<string, number> | undefined
  if (rawDaily) {
    for (const [k, v] of Object.entries(rawDaily)) {
      daily.set(Number(k), v)
    }
  }
  return { storeId: obj.storeId as string, total: obj.total as number, daily }
}

// ─── データ種別定義 ──────────────────────────────────────

/** StoreDayRecord 系のフィールド名 → 種別名 */
const STORE_DAY_FIELDS: readonly { field: keyof ImportedData; type: string }[] = [
  { field: 'purchase', type: 'purchase' },
  { field: 'interStoreIn', type: 'interStoreIn' },
  { field: 'interStoreOut', type: 'interStoreOut' },
  { field: 'flowers', type: 'flowers' },
  { field: 'directProduce', type: 'directProduce' },
  { field: 'consumables', type: 'consumables' },
]

/** 全データ種別 */
const ALL_DATA_TYPES: readonly string[] = [
  ...STORE_DAY_FIELDS.map((f) => f.type),
  'stores',
  'suppliers',
  'settings',
  'budget',
  'classifiedSales',
  'categoryTimeSales',
  'departmentKpi',
]

/** データ種別の日本語ラベル */
const DATA_TYPE_LABELS: Record<string, string> = {
  purchase: '仕入',
  classifiedSales: '分類別売上',
  interStoreIn: '店間入',
  interStoreOut: '店間出',
  flowers: '花',
  directProduce: '産直',
  consumables: '消耗品',
  stores: '店舗',
  suppliers: '取引先',
  settings: '在庫設定',
  budget: '予算',
  categoryTimeSales: '分類別時間帯売上',
  departmentKpi: '部門KPI',
}

// ─── 行の型（Supabase の untyped client 用） ────────────

interface MonthlyRow {
  year: number
  month: number
  data_type: string
  payload: unknown
}

// ─── SupabaseRepository 実装 ─────────────────────────────

/** ImportedData をシリアライズ */
function serializeImportedData(
  data: ImportedData,
  year: number,
  month: number,
): MonthlyRow[] {
  const rows: MonthlyRow[] = []

  for (const { field, type } of STORE_DAY_FIELDS) {
    rows.push({ year, month, data_type: type, payload: data[field] })
  }

  rows.push({ year, month, data_type: 'stores', payload: mapToObj(data.stores) })
  rows.push({ year, month, data_type: 'suppliers', payload: mapToObj(data.suppliers) })
  rows.push({ year, month, data_type: 'settings', payload: mapToObj(data.settings) })
  rows.push({
    year,
    month,
    data_type: 'budget',
    payload: Object.fromEntries(
      Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
    ),
  })
  rows.push({ year, month, data_type: 'classifiedSales', payload: data.classifiedSales })
  rows.push({ year, month, data_type: 'categoryTimeSales', payload: data.categoryTimeSales })
  rows.push({ year, month, data_type: 'departmentKpi', payload: data.departmentKpi })

  return rows
}

/** 単一フィールドをシリアライズ */
function serializeField(data: ImportedData, dataType: DataType): unknown | undefined {
  if (dataType === 'classifiedSales') return data.classifiedSales
  if (dataType === 'categoryTimeSales') return data.categoryTimeSales
  if (dataType === 'departmentKpi') return data.departmentKpi
  const fieldDef = STORE_DAY_FIELDS.find((f) => f.type === dataType)
  if (fieldDef) return data[fieldDef.field]
  return undefined
}

/** 行配列から ImportedData をデシリアライズ */
function deserializeImportedData(
  rows: readonly { data_type: string; payload: unknown }[],
): ImportedData {
  const base = createEmptyImportedData()
  const result: Record<string, unknown> = { ...base }
  const payloadMap = new Map(rows.map((r) => [r.data_type, r.payload]))

  for (const { field, type } of STORE_DAY_FIELDS) {
    const val = payloadMap.get(type)
    if (val != null && typeof val === 'object') {
      result[field] = val
    }
  }

  const rawStores = payloadMap.get('stores') as Record<string, unknown> | undefined
  result.stores = rawStores && typeof rawStores === 'object'
    ? new Map(Object.entries(rawStores))
    : new Map()

  const rawSuppliers = payloadMap.get('suppliers') as Record<string, unknown> | undefined
  result.suppliers = rawSuppliers && typeof rawSuppliers === 'object'
    ? new Map(Object.entries(rawSuppliers))
    : new Map()

  const rawSettings = payloadMap.get('settings') as Record<string, unknown> | undefined
  result.settings = rawSettings && typeof rawSettings === 'object'
    ? new Map(Object.entries(rawSettings))
    : new Map()

  const rawBudget = payloadMap.get('budget') as Record<string, Record<string, unknown>> | undefined
  if (rawBudget && typeof rawBudget === 'object') {
    const budgetMap = new Map<string, BudgetData>()
    for (const [k, v] of Object.entries(rawBudget)) {
      if (v && typeof v === 'object') {
        budgetMap.set(k, budgetFromSerializable(v))
      }
    }
    result.budget = budgetMap
  } else {
    result.budget = new Map()
  }

  const rawCS = payloadMap.get('classifiedSales') as { records?: unknown[] } | undefined
  result.classifiedSales = rawCS && Array.isArray(rawCS.records)
    ? rawCS
    : { records: [] }

  const rawCTS = payloadMap.get('categoryTimeSales') as { records?: unknown[] } | undefined
  result.categoryTimeSales = rawCTS && Array.isArray(rawCTS.records)
    ? rawCTS
    : { records: [] }

  // prevYearClassifiedSales / prevYearCategoryTimeSales は DB に保存しない

  const rawDKpi = payloadMap.get('departmentKpi') as { records?: unknown[] } | undefined
  result.departmentKpi = rawDKpi && Array.isArray(rawDKpi.records)
    ? rawDKpi
    : { records: [] }

  return result as unknown as ImportedData
}

/** セッションメタを更新 */
async function updateSessionMeta(year: number, month: number): Promise<void> {
  const client = getSupabaseClient()
  if (!client) return

  const { error } = await client
    .from('session_meta')
    .upsert(
      { year, month, saved_at: new Date().toISOString() },
      { onConflict: 'year,month' },
    )

  if (error) throw new Error(`Supabase updateSessionMeta failed: ${error.message}`)
}

export class SupabaseRepository implements DataRepository {
  isAvailable(): boolean {
    return isSupabaseAvailable()
  }

  async saveMonthlyData(data: ImportedData, year: number, month: number): Promise<void> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is not configured')

    const rows = serializeImportedData(data, year, month)

    // 1行ずつ upsert する（大きなペイロードで 500 エラーを回避）
    const errors: string[] = []
    for (const row of rows) {
      const { error } = await client
        .from('monthly_data')
        .upsert([row], { onConflict: 'year,month,data_type' })
      if (error) {
        errors.push(`${row.data_type}: ${error.message}`)
      }
    }

    if (errors.length === rows.length) {
      throw new Error(`Supabase saveMonthlyData failed: ${errors.join('; ')}`)
    }

    await updateSessionMeta(year, month)
  }

  async loadMonthlyData(year: number, month: number): Promise<ImportedData | null> {
    const client = getSupabaseClient()
    if (!client) return null

    const meta = await this.getSessionMeta()
    if (!meta || meta.year !== year || meta.month !== month) return null

    const { data: rows, error } = await client
      .from('monthly_data')
      .select('data_type, payload')
      .eq('year', year)
      .eq('month', month)

    if (error) throw new Error(`Supabase loadMonthlyData failed: ${error.message}`)
    if (!rows || rows.length === 0) return null

    return deserializeImportedData(
      rows as unknown as { data_type: string; payload: unknown }[],
    )
  }

  async saveDataSlice(
    data: ImportedData,
    year: number,
    month: number,
    dataTypes: readonly DataType[],
  ): Promise<void> {
    const client = getSupabaseClient()
    if (!client) throw new Error('Supabase is not configured')

    const rows: MonthlyRow[] = []

    for (const dt of dataTypes) {
      const payload = serializeField(data, dt)
      if (payload !== undefined) {
        rows.push({ year, month, data_type: dt, payload })
      }
    }

    rows.push({ year, month, data_type: 'stores', payload: mapToObj(data.stores) })
    rows.push({ year, month, data_type: 'suppliers', payload: mapToObj(data.suppliers) })
    rows.push({ year, month, data_type: 'settings', payload: mapToObj(data.settings) })
    rows.push({
      year,
      month,
      data_type: 'budget',
      payload: Object.fromEntries(
        Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
      ),
    })

    // 1行ずつ upsert する（大きなペイロードで 500 エラーを回避）
    const errors: string[] = []
    for (const row of rows) {
      const { error } = await client
        .from('monthly_data')
        .upsert([row], { onConflict: 'year,month,data_type' })
      if (error) {
        errors.push(`${row.data_type}: ${error.message}`)
      }
    }

    if (errors.length === rows.length) {
      throw new Error(`Supabase saveDataSlice failed: ${errors.join('; ')}`)
    }

    await updateSessionMeta(year, month)
  }

  async loadDataSlice<T>(year: number, month: number, dataType: string): Promise<T | null> {
    const client = getSupabaseClient()
    if (!client) return null

    const { data, error } = await client
      .from('monthly_data')
      .select('payload')
      .eq('year', year)
      .eq('month', month)
      .eq('data_type', dataType)
      .maybeSingle()

    if (error || !data) return null
    return (data as unknown as { payload: T }).payload
  }

  async getSessionMeta(): Promise<PersistedSessionMeta | null> {
    const client = getSupabaseClient()
    if (!client) return null

    const { data, error } = await client
      .from('session_meta')
      .select('year, month, saved_at')
      .order('saved_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    const row = data as unknown as { year: number; month: number; saved_at: string }
    return { year: row.year, month: row.month, savedAt: row.saved_at }
  }

  async clearMonth(year: number, month: number): Promise<void> {
    const client = getSupabaseClient()
    if (!client) return

    const { error } = await client
      .from('monthly_data')
      .delete()
      .eq('year', year)
      .eq('month', month)

    if (error) throw new Error(`Supabase clearMonth failed: ${error.message}`)

    const meta = await this.getSessionMeta()
    if (meta && meta.year === year && meta.month === month) {
      await client
        .from('session_meta')
        .delete()
        .eq('year', year)
        .eq('month', month)
    }
  }

  async clearAll(): Promise<void> {
    const client = getSupabaseClient()
    if (!client) return

    await client.from('monthly_data').delete().gte('id', '')
    await client.from('session_meta').delete().gte('id', '')
  }

  async listStoredMonths(): Promise<{ year: number; month: number }[]> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data, error } = await client
      .from('monthly_data')
      .select('year, month')

    if (error || !data) return []

    const seen = new Set<string>()
    const result: { year: number; month: number }[] = []
    const rows = data as unknown as { year: number; month: number }[]
    for (const row of rows) {
      const key = `${row.year}-${row.month}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push({ year: row.year, month: row.month })
      }
    }
    return result.sort((a, b) => b.year - a.year || b.month - a.month)
  }

  async getDataSummary(year: number, month: number): Promise<MonthDataSummaryItem[]> {
    const client = getSupabaseClient()
    if (!client) return []

    const { data, error } = await client
      .from('monthly_data')
      .select('data_type, payload')
      .eq('year', year)
      .eq('month', month)

    if (error || !data) return []

    const rows = data as unknown as { data_type: string; payload: unknown }[]

    return ALL_DATA_TYPES.map((dt) => {
      const row = rows.find((r) => r.data_type === dt)
      const label = DATA_TYPE_LABELS[dt] ?? dt
      if (!row?.payload) return { dataType: dt, label, recordCount: 0 }

      let count = 0
      const payload = row.payload as Record<string, unknown>
      if (dt === 'classifiedSales' || dt === 'categoryTimeSales' || dt === 'departmentKpi') {
        count = ((payload as { records?: unknown[] }).records ?? []).length
      } else if (dt === 'stores' || dt === 'suppliers' || dt === 'settings' || dt === 'budget') {
        count = Object.keys(payload).length
      } else {
        for (const days of Object.values(payload)) {
          count += Object.keys(days as Record<string, unknown>).length
        }
      }
      return { dataType: dt, label, recordCount: count }
    })
  }

  /**
   * 指定データ種別の payload を直接取得する（同期サービス向け）。
   */
  async getSerializedSlice(
    year: number,
    month: number,
    dataType: string,
  ): Promise<unknown | null> {
    return this.loadDataSlice(year, month, dataType)
  }

  /**
   * 指定年月の全データ種別の payload を取得する（同期サービス向け）。
   */
  async getAllSerializedSlices(
    year: number,
    month: number,
  ): Promise<Map<string, unknown>> {
    const client = getSupabaseClient()
    if (!client) return new Map()

    const { data, error } = await client
      .from('monthly_data')
      .select('data_type, payload')
      .eq('year', year)
      .eq('month', month)

    if (error || !data) return new Map()

    const result = new Map<string, unknown>()
    const rows = data as unknown as { data_type: string; payload: unknown }[]
    for (const row of rows) {
      result.set(row.data_type, row.payload)
    }
    return result
  }

  /**
   * 同期ログを書き込む
   */
  async writeSyncLog(
    year: number,
    month: number,
    dataType: string,
    status: 'success' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    const client = getSupabaseClient()
    if (!client) return

    await client.from('sync_log').insert({
      year,
      month,
      data_type: dataType,
      synced_at: new Date().toISOString(),
      status,
      error_message: errorMessage ?? null,
    })
  }
}
