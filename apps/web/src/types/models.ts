export type Matrix = Array<Array<string | number | Date | null | undefined>>;

export interface StoreInfo {
  name: string;
}

export interface SupplierInfo {
  name: string;
  cat: string;
}

export interface StoresMap {
  [storeId: string]: StoreInfo;
}

export interface SuppliersMap {
  [supplierCode: string]: SupplierInfo;
}

export interface ImportDataSet {
  shiire?: Matrix;
  uriage?: Matrix;
  tenkanIn?: Matrix;
}

export interface DaySummary {
  sales?: number;
  suppliers?: Record<string, { cost: number; price: number; name: string }>;
  tenkanIn?: Array<{ cost: number; price: number; fromStore: string; fromStoreName: string }>;
  bumonIn?: Array<{ cost: number; price: number; fromStore: string }>;
}
