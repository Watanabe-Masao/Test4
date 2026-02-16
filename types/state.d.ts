export type DATA = Record<string, unknown[]>;

export interface StoreInfo {
  code: string;
  name: string;
}

export interface SupplierInfo {
  name: string;
  cat: string;
}

export type STORES = Record<string, StoreInfo>;
export type SUPPLIERS = Record<string, SupplierInfo>;

export interface StoreInventory {
  invStart: number;
  invEnd: number;
}

export type STORE_INVENTORY = Record<string, StoreInventory>;

export interface BudgetInfo {
  daily: Record<string, number>;
  total: number;
}

export type STORE_BUDGET = Record<string, BudgetInfo>;

export interface ResultDaily {
  sales?: number;
  baihen?: number;
  [key: string]: unknown;
}

export interface ResultStore {
  daily: Record<number, ResultDaily>;
  totalSales?: number;
  grossProfit?: number;
  [key: string]: unknown;
}

export type result = Record<string, ResultStore> | null;
