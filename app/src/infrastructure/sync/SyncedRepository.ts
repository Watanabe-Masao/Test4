/**
 * 同期リポジトリ
 *
 * Supabase（マスター書き込み）と Firestore（読み取りキャッシュ）を
 * 統合し、DataRepository インターフェースを提供するオーケストレータ。
 *
 * データフロー:
 *   書き込み: App → Supabase → SyncService → Firestore
 *   読み取り: Firestore (キャッシュ) → fallback → Supabase
 *
 * Firestore からの読み取りが失敗した場合、Supabase にフォールバックする。
 */
import type { DataRepository, PersistedSessionMeta, MonthDataSummaryItem } from '@/domain/repositories'
import type { ImportedData, DataType, BudgetData } from '@/domain/models'
import { createEmptyImportedData } from '@/domain/models'
import type { SupabaseRepository } from '../supabase/SupabaseRepository'
import type { FirestoreReadCache } from '../firebase/FirestoreReadCache'
import { SyncService } from './SyncService'

// ─── シリアライズ / デシリアライズ（Firestore キャッシュ用）─

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

/** StoreDayRecord 系のフィールド名 → 種別名 */
const STORE_DAY_FIELDS: readonly { field: keyof ImportedData; type: string }[] = [
  { field: 'purchase', type: 'purchase' },
  { field: 'sales', type: 'sales' },
  { field: 'discount', type: 'discount' },
  { field: 'prevYearSales', type: 'prevYearSales' },
  { field: 'prevYearDiscount', type: 'prevYearDiscount' },
  { field: 'interStoreIn', type: 'interStoreIn' },
  { field: 'interStoreOut', type: 'interStoreOut' },
  { field: 'flowers', type: 'flowers' },
  { field: 'directProduce', type: 'directProduce' },
  { field: 'consumables', type: 'consumables' },
]

/** Firestore スライスマップから ImportedData を復元する */
function deserializeSlices(slices: Map<string, unknown>): ImportedData {
  const base = createEmptyImportedData()
  const result: Record<string, unknown> = { ...base }

  for (const { field, type } of STORE_DAY_FIELDS) {
    const val = slices.get(type)
    if (val != null && typeof val === 'object') {
      result[field] = val
    }
  }

  const rawStores = slices.get('stores') as Record<string, unknown> | undefined
  result.stores = rawStores && typeof rawStores === 'object'
    ? new Map(Object.entries(rawStores))
    : new Map()

  const rawSuppliers = slices.get('suppliers') as Record<string, unknown> | undefined
  result.suppliers = rawSuppliers && typeof rawSuppliers === 'object'
    ? new Map(Object.entries(rawSuppliers))
    : new Map()

  const rawSettings = slices.get('settings') as Record<string, unknown> | undefined
  result.settings = rawSettings && typeof rawSettings === 'object'
    ? new Map(Object.entries(rawSettings))
    : new Map()

  const rawBudget = slices.get('budget') as Record<string, Record<string, unknown>> | undefined
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

  const rawCTS = slices.get('categoryTimeSales') as { records?: unknown[] } | undefined
  result.categoryTimeSales = rawCTS && Array.isArray(rawCTS.records)
    ? rawCTS
    : { records: [] }

  const rawPCTS = slices.get('prevYearCategoryTimeSales') as { records?: unknown[] } | undefined
  result.prevYearCategoryTimeSales = rawPCTS && Array.isArray(rawPCTS.records)
    ? rawPCTS
    : { records: [] }

  const rawDKpi = slices.get('departmentKpi') as { records?: unknown[] } | undefined
  result.departmentKpi = rawDKpi && Array.isArray(rawDKpi.records)
    ? rawDKpi
    : { records: [] }

  return result as unknown as ImportedData
}

// ─── SyncedRepository ────────────────────────────────────

export class SyncedRepository implements DataRepository {
  readonly supabase: SupabaseRepository
  readonly firestore: FirestoreReadCache
  readonly syncService: SyncService

  constructor(
    supabase: SupabaseRepository,
    firestore: FirestoreReadCache,
  ) {
    this.supabase = supabase
    this.firestore = firestore
    this.syncService = new SyncService(supabase, firestore)
  }

  isAvailable(): boolean {
    return this.supabase.isAvailable()
  }

  /**
   * 書き込み: Supabase に保存 → Firestore に同期
   */
  async saveMonthlyData(data: ImportedData, year: number, month: number): Promise<void> {
    await this.supabase.saveMonthlyData(data, year, month)

    // Firestore キャッシュへ同期（非同期、失敗してもマスター保存は成功）
    this.syncService.syncAll(year, month).catch((err) => {
      console.warn('[SyncedRepository] Firestore sync failed after save:', err)
    })
  }

  /**
   * 読み取り: Firestore から読み、失敗時は Supabase にフォールバック
   */
  async loadMonthlyData(year: number, month: number): Promise<ImportedData | null> {
    try {
      const cached = await this.loadFromFirestore(year, month)
      if (cached) return cached
    } catch {
      // Firestore 失敗 → フォールバック
    }

    const data = await this.supabase.loadMonthlyData(year, month)

    if (data) {
      this.syncService.syncAll(year, month).catch(() => { /* silent */ })
    }

    return data
  }

  /**
   * 部分保存: Supabase に保存 → 対象スライスのみ Firestore に同期
   */
  async saveDataSlice(
    data: ImportedData,
    year: number,
    month: number,
    dataTypes: readonly DataType[],
  ): Promise<void> {
    await this.supabase.saveDataSlice(data, year, month, dataTypes)

    const syncTypes = [
      ...dataTypes,
      'stores',
      'suppliers',
      'settings',
      'budget',
    ]
    this.syncService.syncSlices(year, month, syncTypes).catch((err) => {
      console.warn('[SyncedRepository] Firestore sync failed after saveDataSlice:', err)
    })
  }

  /**
   * スライス読み取り: Firestore → Supabase フォールバック
   */
  async loadDataSlice<T>(year: number, month: number, dataType: string): Promise<T | null> {
    try {
      const cached = await this.firestore.readSlice<T>(year, month, dataType)
      if (cached !== null) return cached
    } catch {
      // Firestore 失敗 → フォールバック
    }

    return this.supabase.loadDataSlice<T>(year, month, dataType)
  }

  async getSessionMeta(): Promise<PersistedSessionMeta | null> {
    try {
      const cached = await this.firestore.readSessionMeta()
      if (cached) return { year: cached.year, month: cached.month, savedAt: cached.savedAt }
    } catch {
      // フォールバック
    }

    return this.supabase.getSessionMeta()
  }

  async clearMonth(year: number, month: number): Promise<void> {
    await this.supabase.clearMonth(year, month)
    await this.syncService.clearFirestoreCache(year, month).catch(() => { /* silent */ })
  }

  async clearAll(): Promise<void> {
    const months = await this.supabase.listStoredMonths()
    await this.supabase.clearAll()

    for (const { year, month } of months) {
      await this.syncService.clearFirestoreCache(year, month).catch(() => { /* silent */ })
    }
  }

  async listStoredMonths(): Promise<{ year: number; month: number }[]> {
    return this.supabase.listStoredMonths()
  }

  async getDataSummary(year: number, month: number): Promise<MonthDataSummaryItem[]> {
    return this.supabase.getDataSummary(year, month)
  }

  /**
   * SyncService インスタンスを公開する（テスト・管理画面向け）
   */
  getSyncService(): SyncService {
    return this.syncService
  }

  /** Firestore キャッシュから ImportedData を復元する */
  protected async loadFromFirestore(year: number, month: number): Promise<ImportedData | null> {
    const meta = await this.firestore.readSessionMeta()
    if (!meta || meta.year !== year || meta.month !== month) return null

    const slices = await this.firestore.readAllSlices(year, month)
    if (slices.size === 0) return null

    return deserializeSlices(slices)
  }
}
