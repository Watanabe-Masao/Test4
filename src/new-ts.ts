import { Dataset, Output, StoreId } from './types.js';

const orderedStores: StoreId[] = ['SAPPORO', 'TOKYO', 'OSAKA'];

const round = (value: number, digits = 6): number => {
  const scale = 10 ** digits;
  return Math.round((value + Number.EPSILON) * scale) / scale;
};

const rate = (value: number, base: number): number => (base === 0 ? 0 : round((value / base) * 100, 6));

export function calculateNewTsOutput(dataset: Dataset): Output {
  const salesByStore = new Map<StoreId, number>();
  const purchaseByStore = new Map<StoreId, number>();
  const transferInByStore = new Map<StoreId, number>();
  const transferOutByStore = new Map<StoreId, number>();

  for (const sale of dataset.sales) {
    salesByStore.set(sale.storeId, (salesByStore.get(sale.storeId) ?? 0) + sale.amount);
  }
  for (const purchase of dataset.purchases) {
    purchaseByStore.set(purchase.storeId, (purchaseByStore.get(purchase.storeId) ?? 0) + purchase.amount);
  }
  for (const transfer of dataset.transfers) {
    transferInByStore.set(transfer.toStoreId, (transferInByStore.get(transfer.toStoreId) ?? 0) + transfer.amount);
    transferOutByStore.set(transfer.fromStoreId, (transferOutByStore.get(transfer.fromStoreId) ?? 0) + transfer.amount);
  }

  const storeGrossProfit = orderedStores.map((storeId) => {
    const sales = round(salesByStore.get(storeId) ?? 0, 6);
    const purchases = round(purchaseByStore.get(storeId) ?? 0, 6);
    const transferIn = round(transferInByStore.get(storeId) ?? 0, 6);
    const transferOut = round(transferOutByStore.get(storeId) ?? 0, 6);
    const grossProfit = round(sales - purchases + transferIn - transferOut, 6);

    return {
      storeId,
      sales,
      purchases,
      transferIn,
      transferOut,
      grossProfit,
      grossMarginRate: rate(grossProfit, sales)
    };
  });

  const byDate = new Map<string, { sales: number; purchases: number }>();
  for (const sale of dataset.sales) {
    const current = byDate.get(sale.date) ?? { sales: 0, purchases: 0 };
    current.sales += sale.amount;
    byDate.set(sale.date, current);
  }
  for (const purchase of dataset.purchases) {
    const current = byDate.get(purchase.date) ?? { sales: 0, purchases: 0 };
    current.purchases += purchase.amount;
    byDate.set(purchase.date, current);
  }

  const dailyTrend = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => {
      const grossProfit = round(values.sales - values.purchases, 6);
      return {
        date,
        grossProfit,
        grossMarginRate: rate(grossProfit, values.sales)
      };
    });

  const totalSales = round(storeGrossProfit.reduce((acc, row) => acc + row.sales, 0), 6);
  const totalGrossProfit = round(storeGrossProfit.reduce((acc, row) => acc + row.grossProfit, 0), 6);
  const totalBudget = round(dataset.budgets.reduce((acc, row) => acc + row.grossProfitTarget, 0), 6);

  return {
    storeGrossProfit,
    dailyTrend,
    report: {
      totalSales,
      totalGrossProfit,
      overallGrossMarginRate: rate(totalGrossProfit, totalSales),
      budgetAchievementRate: rate(totalGrossProfit, totalBudget)
    }
  };
}
