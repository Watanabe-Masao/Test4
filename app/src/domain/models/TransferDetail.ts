import type { CostPricePair } from './CostPricePair'

/** 店間/部門間移動の詳細 */
export interface TransferDetail {
  readonly day: number
  readonly fromStoreId: string
  readonly toStoreId: string
  readonly cost: number
  readonly price: number
}

/** 移動集計 */
export interface TransferDetails {
  readonly interStoreIn: CostPricePair
  readonly interStoreOut: CostPricePair
  readonly interDepartmentIn: CostPricePair
  readonly interDepartmentOut: CostPricePair
  readonly netTransfer: CostPricePair // 店間純増減
}
