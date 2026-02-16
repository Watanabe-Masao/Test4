export type StoreId = 'SAPPORO' | 'TOKYO' | 'OSAKA';

export interface Purchase {
  date: string;
  storeId: StoreId;
  amount: number;
}

export interface Sale {
  date: string;
  storeId: StoreId;
  amount: number;
}

export interface Transfer {
  date: string;
  fromStoreId: StoreId;
  toStoreId: StoreId;
  amount: number;
}

export interface Budget {
  month: string;
  storeId: StoreId;
  grossProfitTarget: number;
}

export interface Dataset {
  purchases: Purchase[];
  sales: Sale[];
  transfers: Transfer[];
  budgets: Budget[];
}

export interface DailyTrendPoint {
  date: string;
  grossProfit: number;
  grossMarginRate: number;
}

export interface StoreGrossProfit {
  storeId: StoreId;
  sales: number;
  purchases: number;
  transferIn: number;
  transferOut: number;
  grossProfit: number;
  grossMarginRate: number;
}

export interface ReportValues {
  totalSales: number;
  totalGrossProfit: number;
  overallGrossMarginRate: number;
  budgetAchievementRate: number;
}

export interface Output {
  storeGrossProfit: StoreGrossProfit[];
  dailyTrend: DailyTrendPoint[];
  report: ReportValues;
}
