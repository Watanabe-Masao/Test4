/** @guard C3 store は state 反映のみ */
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { StoreExplanations } from '@/domain/models/analysis'
import type {
  ValidationMessage,
  ClassifiedSalesData,
  CategoryTimeSalesData,
  SpecialSalesData,
  PurchaseData,
  TransferData,
  InventoryConfig,
} from '@/domain/models/record'
import type { ImportedData, StoreResult } from '@/domain/models/storeTypes'
import type { MonthlyData, AppData } from '@/domain/models/MonthlyData'
import { mergeInventoryConfig } from '@/domain/models/record'
import { createEmptyImportedData } from '@/domain/models/storeTypes'
import { toMonthlyData } from '@/domain/models/monthlyDataAdapter'

// ─── Types ────────────────────────────────────────────
export interface DataStore {
  // State
  data: ImportedData
  /** 入力データが変更されるたびにインクリメントされるバージョン番号（キャッシュキー用） */
  dataVersion: number
  storeResults: ReadonlyMap<string, StoreResult>
  storeExplanations: ReadonlyMap<string, StoreExplanations>
  validationMessages: readonly ValidationMessage[]

  // Actions
  setImportedData: (data: ImportedData) => void
  setStoreResults: (results: ReadonlyMap<string, StoreResult>) => void
  setStoreExplanations: (explanations: ReadonlyMap<string, StoreExplanations>) => void
  setValidationMessages: (messages: readonly ValidationMessage[]) => void
  // TODO(Phase 4): comparison 反転後に削除。prevYear は AppData.prevYear から供給。
  setPrevYearAutoData: (payload: {
    prevYearClassifiedSales: ClassifiedSalesData
    prevYearCategoryTimeSales: CategoryTimeSalesData
    prevYearFlowers: SpecialSalesData
    prevYearPurchase?: PurchaseData
    prevYearDirectProduce?: SpecialSalesData
    prevYearInterStoreIn?: TransferData
    prevYearInterStoreOut?: TransferData
  }) => void
  updateInventory: (storeId: string, config: Partial<InventoryConfig>) => void
  reset: () => void
}

// ─── Initial values ──────────────────────────────────
const initialData = createEmptyImportedData()

// ─── 共有 updater ──────────────────────────────────────
type PrevYearPayload = Parameters<DataStore['setPrevYearAutoData']>[0]

function applyPrevYearData(
  state: { data: ImportedData; dataVersion: number },
  payload: PrevYearPayload,
) {
  return {
    data: {
      ...state.data,
      prevYearClassifiedSales: payload.prevYearClassifiedSales,
      prevYearCategoryTimeSales: payload.prevYearCategoryTimeSales,
      prevYearFlowers: payload.prevYearFlowers,
      ...(payload.prevYearPurchase && { prevYearPurchase: payload.prevYearPurchase }),
      ...(payload.prevYearDirectProduce && {
        prevYearDirectProduce: payload.prevYearDirectProduce,
      }),
      ...(payload.prevYearInterStoreIn && { prevYearInterStoreIn: payload.prevYearInterStoreIn }),
      ...(payload.prevYearInterStoreOut && {
        prevYearInterStoreOut: payload.prevYearInterStoreOut,
      }),
    },
    // 前年データは補足データのため dataVersion はインクリメントしない
    // (計算エンジンの再起動を防止)
    dataVersion: state.dataVersion,
  }
}

// ─── Store ────────────────────────────────────────────
export const useDataStore = create<DataStore>()(
  devtools(
    (set) => ({
      // State
      data: initialData,
      dataVersion: 0,
      storeResults: new Map(),
      storeExplanations: new Map(),
      validationMessages: [],

      // Actions
      setImportedData: (data) =>
        set((state) => ({ data, dataVersion: state.dataVersion + 1 }), false, 'setImportedData'),

      setStoreResults: (results) => set({ storeResults: results }, false, 'setStoreResults'),

      setStoreExplanations: (explanations) =>
        set({ storeExplanations: explanations }, false, 'setStoreExplanations'),

      setValidationMessages: (messages) =>
        set({ validationMessages: messages }, false, 'setValidationMessages'),

      setPrevYearAutoData: (payload) =>
        set((state) => applyPrevYearData(state, payload), false, 'setPrevYearAutoData'),

      updateInventory: (storeId, config) =>
        set(
          (state) => {
            const newSettings = new Map(state.data.settings)
            const merged = mergeInventoryConfig(newSettings.get(storeId), storeId, config)
            newSettings.set(storeId, merged)
            return {
              data: { ...state.data, settings: newSettings },
              dataVersion: state.dataVersion + 1,
            }
          },
          false,
          'updateInventory',
        ),

      reset: () =>
        set(
          (state) => ({
            data: initialData,
            dataVersion: state.dataVersion + 1,
            storeResults: new Map(),
            storeExplanations: new Map(),
            validationMessages: [],
          }),
          false,
          'reset',
        ),
    }),
    { name: 'DataStore' },
  ),
)

// ─── MonthlyData / AppData 互換 selector ──────────────
// Phase 2: 新規コードはこちらを使用。旧 s.data は段階的に移行。

/**
 * 現在月の MonthlyData を取得する selector。
 * dataStore.data (ImportedData) から adapter 経由で変換。
 */
export function useCurrentMonthData(year: number, month: number): MonthlyData {
  return useDataStore((s) =>
    toMonthlyData(s.data, { year, month, importedAt: new Date().toISOString() }),
  )
}

/**
 * AppData（current + prevYear）を取得する selector。
 * 現段階では prevYear は null（Phase 4 で comparison から供給）。
 */
export function useAppData(year: number, month: number): AppData {
  return useDataStore((s) => ({
    current: toMonthlyData(s.data, { year, month, importedAt: new Date().toISOString() }),
    prevYear: null,
  }))
}
