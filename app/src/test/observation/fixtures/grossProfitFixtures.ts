/**
 * grossProfit 観測フィクスチャ
 *
 * 4 カテゴリ: normal / nullZeroMissing / extreme / boundary
 * 各カテゴリで 8 関数すべてが踏まれるデータを含む
 */
import type {
  InvMethodInput,
  EstMethodInput,
  DiscountImpactInput,
  MarkupRateInput,
  TransferTotalsInput,
} from '@/domain/calculations/grossProfit'

export interface GrossProfitFixture {
  readonly name: string
  readonly invMethod: InvMethodInput
  readonly estMethod: EstMethodInput
  readonly coreSales: {
    totalSales: number
    flowerSalesPrice: number
    directProduceSalesPrice: number
  }
  readonly discountRate: { discountAmount: number; salesAmount: number }
  readonly discountImpact: DiscountImpactInput
  readonly markupRates: MarkupRateInput
  readonly transferTotals: TransferTotalsInput
  readonly inventoryCost: { totalCost: number; deliverySalesCost: number }
}

export const NORMAL: GrossProfitFixture = {
  name: 'normal',
  invMethod: {
    openingInventory: 1_000_000,
    closingInventory: 800_000,
    totalPurchaseCost: 500_000,
    totalSales: 900_000,
  },
  estMethod: {
    coreSales: 500_000,
    discountRate: 0.05,
    markupRate: 0.3,
    costInclusionCost: 10_000,
    openingInventory: 1_000_000,
    inventoryPurchaseCost: 300_000,
  },
  coreSales: { totalSales: 900_000, flowerSalesPrice: 50_000, directProduceSalesPrice: 40_000 },
  discountRate: { discountAmount: 25_000, salesAmount: 500_000 },
  discountImpact: { coreSales: 500_000, markupRate: 0.3, discountRate: 0.05 },
  markupRates: {
    purchasePrice: 100_000,
    purchaseCost: 70_000,
    deliveryPrice: 20_000,
    deliveryCost: 15_000,
    transferPrice: 10_000,
    transferCost: 8_000,
    defaultMarkupRate: 0.25,
  },
  transferTotals: {
    interStoreInPrice: 10_000,
    interStoreInCost: 7_000,
    interStoreOutPrice: 5_000,
    interStoreOutCost: 3_500,
    interDepartmentInPrice: 8_000,
    interDepartmentInCost: 6_000,
    interDepartmentOutPrice: 4_000,
    interDepartmentOutCost: 3_000,
  },
  inventoryCost: { totalCost: 500_000, deliverySalesCost: 40_000 },
}

export const NULL_ZERO_MISSING: GrossProfitFixture = {
  name: 'null-zero-missing',
  invMethod: {
    openingInventory: null,
    closingInventory: null,
    totalPurchaseCost: 500_000,
    totalSales: 900_000,
  },
  estMethod: {
    coreSales: 500_000,
    discountRate: 0.05,
    markupRate: 0.3,
    costInclusionCost: 10_000,
    openingInventory: null,
    inventoryPurchaseCost: 300_000,
  },
  coreSales: { totalSales: 0, flowerSalesPrice: 0, directProduceSalesPrice: 0 },
  discountRate: { discountAmount: 0, salesAmount: 0 },
  discountImpact: { coreSales: 0, markupRate: 0, discountRate: 0 },
  markupRates: {
    purchasePrice: 0,
    purchaseCost: 0,
    deliveryPrice: 0,
    deliveryCost: 0,
    transferPrice: 0,
    transferCost: 0,
    defaultMarkupRate: 0.25,
  },
  transferTotals: {
    interStoreInPrice: 0,
    interStoreInCost: 0,
    interStoreOutPrice: 0,
    interStoreOutCost: 0,
    interDepartmentInPrice: 0,
    interDepartmentInCost: 0,
    interDepartmentOutPrice: 0,
    interDepartmentOutCost: 0,
  },
  inventoryCost: { totalCost: 0, deliverySalesCost: 0 },
}

export const EXTREME: GrossProfitFixture = {
  name: 'extreme',
  invMethod: {
    openingInventory: 1e12,
    closingInventory: 9e11,
    totalPurchaseCost: 5e11,
    totalSales: 8e11,
  },
  estMethod: {
    coreSales: 5e11,
    discountRate: 0.001,
    markupRate: 0.5,
    costInclusionCost: 1e9,
    openingInventory: 1e12,
    inventoryPurchaseCost: 3e11,
  },
  coreSales: { totalSales: 1e12, flowerSalesPrice: 1e10, directProduceSalesPrice: 5e9 },
  discountRate: { discountAmount: 1e10, salesAmount: 1e12 },
  discountImpact: { coreSales: 5e11, markupRate: 0.5, discountRate: 0.001 },
  markupRates: {
    purchasePrice: 1e11,
    purchaseCost: 7e10,
    deliveryPrice: 2e10,
    deliveryCost: 1.5e10,
    transferPrice: 1e10,
    transferCost: 8e9,
    defaultMarkupRate: 0.25,
  },
  transferTotals: {
    interStoreInPrice: 1e10,
    interStoreInCost: 7e9,
    interStoreOutPrice: 5e9,
    interStoreOutCost: 3.5e9,
    interDepartmentInPrice: 8e9,
    interDepartmentInCost: 6e9,
    interDepartmentOutPrice: 4e9,
    interDepartmentOutCost: 3e9,
  },
  inventoryCost: { totalCost: 5e11, deliverySalesCost: 4e10 },
}

export const BOUNDARY: GrossProfitFixture = {
  name: 'boundary',
  invMethod: {
    openingInventory: 0,
    closingInventory: 0,
    totalPurchaseCost: 100,
    totalSales: 100,
  },
  estMethod: {
    coreSales: 100,
    discountRate: 0,
    markupRate: 0,
    costInclusionCost: 0,
    openingInventory: 0,
    inventoryPurchaseCost: 0,
  },
  coreSales: { totalSales: 50, flowerSalesPrice: 30, directProduceSalesPrice: 30 },
  discountRate: { discountAmount: 100, salesAmount: 100 },
  discountImpact: { coreSales: 100, markupRate: 1, discountRate: 0.5 },
  markupRates: {
    purchasePrice: 1,
    purchaseCost: 1,
    deliveryPrice: 0,
    deliveryCost: 0,
    transferPrice: 0,
    transferCost: 0,
    defaultMarkupRate: 0,
  },
  transferTotals: {
    interStoreInPrice: 1,
    interStoreInCost: 1,
    interStoreOutPrice: 0,
    interStoreOutCost: 0,
    interDepartmentInPrice: 0,
    interDepartmentInCost: 0,
    interDepartmentOutPrice: 0,
    interDepartmentOutCost: 0,
  },
  inventoryCost: { totalCost: 1, deliverySalesCost: 1 },
}

export const ALL_FIXTURES: readonly GrossProfitFixture[] = [
  NORMAL,
  NULL_ZERO_MISSING,
  EXTREME,
  BOUNDARY,
]
