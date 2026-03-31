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
import { toMonthlyData, toLegacyImportedData } from '@/domain/models/monthlyDataAdapter'

// ─── Types ────────────────────────────────────────────
export interface DataStore {
  // ─── Authoritative State（正本） ──────────────────────
  /** アプリケーションデータ全体（current + prevYear） */
  appData: AppData
  /** 現在月の authoritative state（appData.current への alias） */
  currentMonthData: MonthlyData | null
  /** 当月データ version（currentMonthData 更新でインクリメント） */
  authoritativeDataVersion: number
  /** 比較データ version（prevYear 更新でインクリメント） */
  comparisonDataVersion: number

  // ─── Legacy State（互換 mirror） ──────────────────────
  /** legacy mirror: 旧コードの s.data 参照向け。正本は appData。 */
  legacyData: ImportedData
  /** legacy mirror alias: 旧コードの s.data 参照を壊さない互換 getter */
  readonly data: ImportedData
  /** legacy: authoritativeDataVersion を使用してください */
  dataVersion: number

  // ─── Derived State ──────────────────────────────────
  storeResults: ReadonlyMap<string, StoreResult>
  storeExplanations: ReadonlyMap<string, StoreExplanations>
  validationMessages: readonly ValidationMessage[]

  // ─── Actions ────────────────────────────────────────
  /** 現在月データを設定する（正本更新） */
  setCurrentMonthData: (monthly: MonthlyData) => void
  /** 前年月データを設定する */
  setPrevYearMonthData: (monthly: MonthlyData | null) => void
  /** AppData を一括設定する */
  replaceAppData: (appData: AppData) => void
  /** legacy: setCurrentMonthData を使用してください */
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
  state: { legacyData: ImportedData; dataVersion: number },
  payload: PrevYearPayload,
) {
  return {
    legacyData: {
      ...state.legacyData,
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
    data: {
      ...state.legacyData,
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
    dataVersion: state.dataVersion,
  }
}

// ─── Store ────────────────────────────────────────────
export const useDataStore = create<DataStore>()(
  devtools(
    (set) => ({
      // Authoritative State
      appData: { current: null, prevYear: null },
      currentMonthData: null,
      authoritativeDataVersion: 0,
      comparisonDataVersion: 0,

      // Legacy State
      legacyData: initialData,
      data: initialData,
      dataVersion: 0,

      // Derived State
      storeResults: new Map(),
      storeExplanations: new Map(),
      validationMessages: [],

      // ─── Actions ──────────────────────────────────
      setCurrentMonthData: (monthly) =>
        set(
          (state) => {
            const legacy = toLegacyImportedData({ current: monthly, prevYear: null })
            const mergedLegacy = {
              ...legacy,
              prevYearClassifiedSales: state.legacyData.prevYearClassifiedSales,
              prevYearCategoryTimeSales: state.legacyData.prevYearCategoryTimeSales,
              prevYearFlowers: state.legacyData.prevYearFlowers,
              prevYearPurchase: state.legacyData.prevYearPurchase,
              prevYearDirectProduce: state.legacyData.prevYearDirectProduce,
              prevYearInterStoreIn: state.legacyData.prevYearInterStoreIn,
              prevYearInterStoreOut: state.legacyData.prevYearInterStoreOut,
            }
            const nextVersion = state.authoritativeDataVersion + 1
            return {
              appData: { current: monthly, prevYear: state.appData.prevYear },
              currentMonthData: monthly,
              authoritativeDataVersion: nextVersion,
              legacyData: mergedLegacy,
              data: mergedLegacy,
              dataVersion: nextVersion,
            }
          },
          false,
          'setCurrentMonthData',
        ),

      setPrevYearMonthData: (monthly) =>
        set(
          (state) => ({
            appData: { current: state.appData.current, prevYear: monthly },
            comparisonDataVersion: state.comparisonDataVersion + 1,
          }),
          false,
          'setPrevYearMonthData',
        ),

      replaceAppData: (newAppData) =>
        set(
          (state) => {
            const nextAuth =
              newAppData.current !== state.appData.current
                ? state.authoritativeDataVersion + 1
                : state.authoritativeDataVersion
            const nextComp =
              newAppData.prevYear !== state.appData.prevYear
                ? state.comparisonDataVersion + 1
                : state.comparisonDataVersion
            return {
              appData: newAppData,
              currentMonthData: newAppData.current,
              authoritativeDataVersion: nextAuth,
              comparisonDataVersion: nextComp,
              ...(newAppData.current
                ? (() => {
                    const ld = {
                      ...toLegacyImportedData({ current: newAppData.current, prevYear: null }),
                      prevYearClassifiedSales: state.legacyData.prevYearClassifiedSales,
                      prevYearCategoryTimeSales: state.legacyData.prevYearCategoryTimeSales,
                      prevYearFlowers: state.legacyData.prevYearFlowers,
                      prevYearPurchase: state.legacyData.prevYearPurchase,
                      prevYearDirectProduce: state.legacyData.prevYearDirectProduce,
                      prevYearInterStoreIn: state.legacyData.prevYearInterStoreIn,
                      prevYearInterStoreOut: state.legacyData.prevYearInterStoreOut,
                    }
                    return { legacyData: ld, data: ld, dataVersion: nextAuth }
                  })()
                : {}),
            }
          },
          false,
          'replaceAppData',
        ),

      setImportedData: (data) =>
        set(
          (state) => {
            // legacy 互換: ImportedData から currentMonthData を導出
            const origin = state.currentMonthData?.origin ?? {
              year: 0,
              month: 0,
              importedAt: new Date().toISOString(),
            }
            const monthly = toMonthlyData(data, origin)
            const nextVersion = state.authoritativeDataVersion + 1
            return {
              appData: { current: monthly, prevYear: state.appData.prevYear },
              currentMonthData: monthly,
              authoritativeDataVersion: nextVersion,
              legacyData: data,
              data: data,
              dataVersion: nextVersion,
            }
          },
          false,
          'setImportedData',
        ),

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
            const newSettings = new Map(state.legacyData.settings)
            const merged = mergeInventoryConfig(newSettings.get(storeId), storeId, config)
            newSettings.set(storeId, merged)
            // currentMonthData も同期更新
            const updatedCurrentMonth = state.currentMonthData
              ? { ...state.currentMonthData, settings: newSettings }
              : null
            const nextVersion = state.authoritativeDataVersion + 1
            return {
              appData: { current: updatedCurrentMonth, prevYear: state.appData.prevYear },
              currentMonthData: updatedCurrentMonth,
              authoritativeDataVersion: nextVersion,
              legacyData: { ...state.legacyData, settings: newSettings },
              data: { ...state.legacyData, settings: newSettings },
              dataVersion: nextVersion,
            }
          },
          false,
          'updateInventory',
        ),

      reset: () =>
        set(
          (state) => ({
            appData: { current: null, prevYear: null },
            currentMonthData: null,
            authoritativeDataVersion: state.authoritativeDataVersion + 1,
            comparisonDataVersion: state.comparisonDataVersion + 1,
            legacyData: initialData,
            dataVersion: state.authoritativeDataVersion + 1,
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

// ─── Authoritative Selectors ─────────────────────────
// これらが Phase 2 以降の正規入口。旧 s.data は段階的に移行。

/**
 * 現在月の MonthlyData を取得する。
 * store state から直接読む（selector 内変換なし）。
 * null = 未ロード。
 */
export function useCurrentMonthData(): MonthlyData | null {
  return useDataStore((s) => s.currentMonthData)
}

/**
 * AppData（current + prevYear）を取得する。
 * store state から直接読む（selector 内変換なし）。
 */
export function useAppData(): AppData {
  return useDataStore((s) => s.appData)
}
