export type ActiveTab = 'transfer' | 'costInclusion' | 'purchase'
export type TransferType = 'interStore' | 'interDepartment'
export type CostInclusionViewMode = 'item' | 'account' | 'daily'

export interface FlowEntry {
  from: string
  to: string
  fromName: string
  toName: string
  cost: number
  price: number
}

export interface ItemAggregate {
  itemCode: string
  itemName: string
  accountCode: string
  totalQuantity: number
  totalCost: number
  dayCount: number
}

export interface AccountAggregate {
  accountCode: string
  totalCost: number
  itemCount: number
}

export interface ItemDetail {
  day: number
  storeId: string
  storeName: string
  quantity: number
  cost: number
}

export interface FlowGroup {
  fromId: string
  fromName: string
  entries: FlowEntry[]
  totalCost: number
  totalPrice: number
}

export interface DailyCostInclusionEntry {
  day: number
  cost: number
  itemCount: number
  items: readonly {
    itemCode: string
    itemName: string
    accountCode: string
    quantity: number
    cost: number
  }[]
}

export interface DailyTotals {
  inCost: number
  inPrice: number
  outCost: number
  outPrice: number
}

export interface PairDailyEntry {
  day: number
  cost: number
  price: number
}

export interface TransferPivotStore {
  storeId: string
  storeName: string
}

export interface TransferPivotCell {
  cost: number
  price: number
}

export interface TransferPivotRow {
  day: number
  cells: Record<string, TransferPivotCell>
  inCost: number
  inPrice: number
  outCost: number
  outPrice: number
  net: number
}

export interface TransferPivotData {
  stores: TransferPivotStore[]
  rows: TransferPivotRow[]
  totals: {
    byStore: Record<string, TransferPivotCell>
    inCost: number
    inPrice: number
    outCost: number
    outPrice: number
    net: number
  }
}

// ─── Purchase pivot types ────────────────────────────

/** 仕入ピボットの列定義 */
export interface PurchasePivotColumn {
  key: string
  label: string
  color: string
  isCustom: boolean
}

/** 仕入ピボットのセル（原価/売価） */
export interface PurchasePivotCell {
  cost: number
  price: number
}

/** 仕入ピボットの行（日付単位） */
export interface PurchasePivotRow {
  day: number
  cells: Record<string, PurchasePivotCell>
  totalCost: number
  totalPrice: number
}

/** 仕入ピボットデータ全体 */
export interface PurchasePivotData {
  columns: PurchasePivotColumn[]
  rows: PurchasePivotRow[]
  totals: {
    byColumn: Record<string, PurchasePivotCell>
    grandCost: number
    grandPrice: number
  }
}
