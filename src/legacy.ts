import { Dataset, Output, StoreId, StoreGrossProfit, DailyTrendPoint } from './types.js';

const storeOrder: StoreId[] = ['SAPPORO', 'TOKYO', 'OSAKA'];

const roundTo = (value: number, digits = 6): number => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

const safeRate = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : roundTo((numerator / denominator) * 100, 6);

export function calculateLegacyOutput(dataset: Dataset): Output {
  const storeRows: StoreGrossProfit[] = storeOrder.map((storeId) => {
    const sales = dataset.sales.filter((x) => x.storeId === storeId).reduce((acc, x) => acc + x.amount, 0);
    const purchases = dataset.purchases
      .filter((x) => x.storeId === storeId)
      .reduce((acc, x) => acc + x.amount, 0);
    const transferIn = dataset.transfers
      .filter((x) => x.toStoreId === storeId)
      .reduce((acc, x) => acc + x.amount, 0);
    const transferOut = dataset.transfers
      .filter((x) => x.fromStoreId === storeId)
      .reduce((acc, x) => acc + x.amount, 0);

    const grossProfit = roundTo(sales - purchases - transferOut + transferIn, 6);
    return {
      storeId,
      sales,
      purchases,
      transferIn,
      transferOut,
      grossProfit,
      grossMarginRate: safeRate(grossProfit, sales)
    };
  });

  const dateSet = new Set<string>();
  [...dataset.sales, ...dataset.purchases, ...dataset.transfers].forEach((record) => {
    dateSet.add(record.date);
  });

  const dailyTrend: DailyTrendPoint[] = [...dateSet]
    .sort((a, b) => a.localeCompare(b))
    .map((date) => {
      const sales = dataset.sales.filter((x) => x.date === date).reduce((acc, x) => acc + x.amount, 0);
      const purchases = dataset.purchases.filter((x) => x.date === date).reduce((acc, x) => acc + x.amount, 0);
      const transferIn = dataset.transfers.filter((x) => x.date === date).reduce((acc, x) => acc + x.amount, 0);
      const transferOut = dataset.transfers.filter((x) => x.date === date).reduce((acc, x) => acc + x.amount, 0);
      const grossProfit = roundTo(sales - purchases + transferIn - transferOut, 6);
      return {
        date,
        grossProfit,
        grossMarginRate: safeRate(grossProfit, sales)
      };
    });

  const totalSales = roundTo(storeRows.reduce((acc, x) => acc + x.sales, 0), 6);
  const totalGrossProfit = roundTo(storeRows.reduce((acc, x) => acc + x.grossProfit, 0), 6);
  const totalBudget = dataset.budgets.reduce((acc, x) => acc + x.grossProfitTarget, 0);

  return {
    storeGrossProfit: storeRows,
    dailyTrend,
    report: {
      totalSales,
      totalGrossProfit,
      overallGrossMarginRate: safeRate(totalGrossProfit, totalSales),
      budgetAchievementRate: safeRate(totalGrossProfit, totalBudget)
    }
  };
}
