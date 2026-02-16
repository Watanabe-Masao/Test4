import { parseDate } from '../../domain/date';
import type { DaySummary, ImportDataSet, StoresMap, SuppliersMap } from '../../types/models';

export function processShiire(params: {
  data: ImportDataSet;
  stores: StoresMap;
  suppliers: SuppliersMap;
}) {
  const sheet = params.data.shiire;
  if (!sheet || sheet.length < 4) return {} as Record<string, Record<number, DaySummary>>;

  const result: Record<string, Record<number, DaySummary>> = {};

  for (let col = 3; col < sheet[0].length; col += 2) {
    const supplierMatch = String(sheet[0][col] ?? '').match(/(\d{7})/);
    const storeMatch = String(sheet[1][col] ?? '').match(/(\d{4}):/);
    if (!supplierMatch || !storeMatch) continue;

    const supplierCode = supplierMatch[1];
    const supplier = params.suppliers[supplierCode] ?? { name: supplierCode, cat: 'other' };
    const storeId = String(parseInt(storeMatch[1], 10));
    if (!params.stores[storeId]) continue;

    for (let row = 3; row < sheet.length; row++) {
      const date = parseDate(sheet[row][0]);
      if (!date) continue;
      const day = date.getDate();

      const cost = parseFloat(String(sheet[row][col] ?? 0)) || 0;
      const price = parseFloat(String(sheet[row][col + 1] ?? 0)) || 0;

      result[storeId] ??= {};
      result[storeId][day] ??= { suppliers: {} };
      result[storeId][day].suppliers ??= {};
      result[storeId][day].suppliers![supplierCode] ??= { cost: 0, price: 0, name: supplier.name };

      result[storeId][day].suppliers![supplierCode].cost += cost;
      result[storeId][day].suppliers![supplierCode].price += price;
    }
  }

  return result;
}

export function processUriage(params: { data: ImportDataSet; stores: StoresMap }) {
  const sheet = params.data.uriage;
  if (!sheet || sheet.length < 3) return {} as Record<string, Record<number, DaySummary>>;

  const result: Record<string, Record<number, DaySummary>> = {};
  const storeColumns: Record<string, number> = {};

  for (let col = 3; col < sheet[0].length; col += 2) {
    const storeMatch = String(sheet[0][col] ?? '').match(/(\d{4}):/);
    if (!storeMatch) continue;
    const storeId = String(parseInt(storeMatch[1], 10));
    if (params.stores[storeId]) storeColumns[storeId] = col;
  }

  for (let row = 3; row < sheet.length; row++) {
    const date = parseDate(sheet[row][0]);
    if (!date) continue;
    const day = date.getDate();

    Object.entries(storeColumns).forEach(([storeId, col]) => {
      result[storeId] ??= {};
      result[storeId][day] = {
        ...result[storeId][day],
        sales: parseFloat(String(sheet[row][col] ?? 0)) || 0,
      };
    });
  }

  return result;
}

export function processTenkanIn(params: { data: ImportDataSet; stores: StoresMap }) {
  const sheet = params.data.tenkanIn;
  if (!sheet || sheet.length < 2) return {} as Record<string, Record<number, DaySummary>>;

  const result: Record<string, Record<number, DaySummary>> = {};

  for (let row = 1; row < sheet.length; row++) {
    const storeCode = String(sheet[row][0] ?? '').trim();
    const dateVal = sheet[row][1];
    const storeCodeOut = String(sheet[row][2] ?? '').trim();
    const costIn = Math.abs(parseFloat(String(sheet[row][3] ?? 0)) || 0);
    const priceIn = Math.abs(parseFloat(String(sheet[row][4] ?? 0)) || 0);

    const date = parseDate(dateVal);
    if (!date) continue;

    const day = date.getDate();
    const storeId = String(parseInt(storeCode, 10) || 0);
    const fromStoreId = String(parseInt(storeCodeOut, 10) || 0);
    if (!params.stores[storeId]) continue;

    const isBumon = storeCode === storeCodeOut || storeId === fromStoreId;

    result[storeId] ??= {};
    result[storeId][day] ??= { tenkanIn: [], bumonIn: [] };
    result[storeId][day].tenkanIn ??= [];
    result[storeId][day].bumonIn ??= [];

    if (isBumon) {
      result[storeId][day].bumonIn!.push({
        cost: costIn,
        price: priceIn,
        fromStore: fromStoreId,
      });
    } else {
      result[storeId][day].tenkanIn!.push({
        cost: costIn,
        price: priceIn,
        fromStore: fromStoreId,
        fromStoreName: params.stores[fromStoreId]?.name ?? fromStoreId,
      });
    }
  }

  return result;
}
