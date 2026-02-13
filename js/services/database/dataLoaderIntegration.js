/**
 * @file DataLoader と IndexedDB の統合
 * @description ExcelファイルからIndexedDBへのデータ保存を管理
 */

import { syncManager, MERGE_MODE } from './syncManager.js';
import { importDialog } from '../../ui/importDialog.js';
import { parseDate, parseNum } from '../../utils/helpers.js';

/**
 * 仕入データをIndexedDB用に変換
 * @param {Array} rawData - Excelから読み込んだ生データ
 * @returns {Array} 変換されたデータ
 */
export function convertShiireData(rawData) {
  if (!rawData || rawData.length < 3) {
    return [];
  }

  const converted = [];
  const headerRow = rawData[0];
  const storeRow = rawData[1];

  // データ行を処理（3行目以降）
  for (let row = 2; row < rawData.length; row++) {
    const dateValue = rawData[row][0];
    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) continue;

    // 各仕入先のデータを処理
    for (let col = 3; col < headerRow.length; col += 2) {
      const supplierStr = String(headerRow[col] || '');
      const storeStr = String(storeRow[col] || '');

      // 仕入先コードと名前を抽出
      const supMatch = supplierStr.match(/(\d{7}):?(.*)$/);
      if (!supMatch) continue;

      const supplierCode = supMatch[1];
      const supplierName = supMatch[2]?.trim() || supplierCode;

      // 店舗コードを抽出
      const stoMatch = storeStr.match(/(\d{4})/);
      if (!stoMatch) continue;

      const storeCode = String(parseInt(stoMatch[1]));

      // 仕入金額を取得
      const cost = parseNum(rawData[row][col]);
      if (cost === 0) continue; // 0円はスキップ

      converted.push({
        date: date.getTime(),
        store: storeCode,
        supplier: supplierCode,
        supplierName,
        category: getCategoryFromSupplier(supplierCode),
        cost,
        amount: parseNum(rawData[row][col + 1]) || 0
      });
    }
  }

  return converted;
}

/**
 * 売上データをIndexedDB用に変換
 * @param {Array} rawData - Excelから読み込んだ生データ
 * @returns {Array} 変換されたデータ
 */
export function convertUriageData(rawData) {
  if (!rawData || rawData.length < 3) {
    return [];
  }

  const converted = [];
  const headerRow = rawData[0];

  // データ行を処理（2行目以降）
  for (let row = 1; row < rawData.length; row++) {
    const dateValue = rawData[row][0];
    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) continue;

    // 各店舗のデータを処理
    for (let col = 1; col < headerRow.length; col += 3) {
      const storeStr = String(headerRow[col] || '');

      // 店舗コードを抽出
      const stoMatch = storeStr.match(/(\d{4})/);
      if (!stoMatch) continue;

      const storeCode = String(parseInt(stoMatch[1]));

      const sales = parseNum(rawData[row][col]);
      const cost = parseNum(rawData[row][col + 1]);
      const profit = parseNum(rawData[row][col + 2]);

      if (sales === 0) continue;

      converted.push({
        date: date.getTime(),
        store: storeCode,
        sales,
        cost,
        profit,
        profitRate: sales > 0 ? (profit / sales) * 100 : 0
      });
    }
  }

  return converted;
}

/**
 * 売変データをIndexedDB用に変換
 */
export function convertBaihenData(rawData) {
  if (!rawData || rawData.length < 3) {
    return [];
  }

  const converted = [];
  const headerRow = rawData[0];

  for (let row = 1; row < rawData.length; row++) {
    const dateValue = rawData[row][0];
    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) continue;

    for (let col = 1; col < headerRow.length; col++) {
      const storeStr = String(headerRow[col] || '');
      const stoMatch = storeStr.match(/(\d{4})/);
      if (!stoMatch) continue;

      const storeCode = String(parseInt(stoMatch[1]));
      const amount = parseNum(rawData[row][col]);

      if (amount === 0) continue;

      converted.push({
        date: date.getTime(),
        store: storeCode,
        amount
      });
    }
  }

  return converted;
}

/**
 * 消耗品データをIndexedDB用に変換
 */
export function convertConsumablesData(rawData) {
  if (!rawData || rawData.length < 3) {
    return [];
  }

  const converted = [];
  const headerRow = rawData[0];

  for (let row = 1; row < rawData.length; row++) {
    const dateValue = rawData[row][0];
    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) continue;

    for (let col = 1; col < headerRow.length; col++) {
      const storeStr = String(headerRow[col] || '');
      const stoMatch = storeStr.match(/(\d{4})/);
      if (!stoMatch) continue;

      const storeCode = String(parseInt(stoMatch[1]));
      const cost = parseNum(rawData[row][col]);

      if (cost === 0) continue;

      converted.push({
        date: date.getTime(),
        store: storeCode,
        cost
      });
    }
  }

  return converted;
}

/**
 * 店間データをIndexedDB用に変換
 */
export function convertTenkanData(rawData, isIn = true) {
  console.log(`🔍 convertTenkanData called with ${isIn ? 'IN' : 'OUT'} mode`);
  console.log(`📊 Raw data length: ${rawData?.length || 0}`);

  if (!rawData || rawData.length < 3) {
    console.warn('⚠️ Raw data is empty or too short (need at least 3 rows)');
    return [];
  }

  const converted = [];
  const headerRow = rawData[0];

  console.log('📋 Header row:', headerRow);
  console.log('📋 First data row:', rawData[1]);

  for (let row = 1; row < rawData.length; row++) {
    const dateValue = rawData[row][0];
    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) {
      console.warn(`⚠️ Could not parse date at row ${row}:`, dateValue);
      continue;
    }

    for (let col = 1; col < headerRow.length; col++) {
      const storeStr = String(headerRow[col] || '');
      const stoMatch = storeStr.match(/(\d{4})/);
      if (!stoMatch) {
        if (col === 1) {
          console.warn(`⚠️ Header column ${col} does not match pattern /\\d{4}/:`, storeStr);
        }
        continue;
      }

      const storeCode = String(parseInt(stoMatch[1]));
      const amount = parseNum(rawData[row][col]);

      if (amount === 0) continue;

      converted.push({
        date: date.getTime(),
        store: storeCode,
        amount
      });
    }
  }

  console.log(`✅ Converted ${converted.length} tenkan ${isIn ? 'IN' : 'OUT'} records`);
  if (converted.length > 0) {
    console.log('📦 Sample converted record:', converted[0]);
  } else {
    console.warn('⚠️ No records were converted! Check:');
    console.warn('  1. Header row has store codes in format like "0001" or "店舗0001"');
    console.warn('  2. Data rows have valid dates in column 0');
    console.warn('  3. Data rows have non-zero amounts');
  }

  return converted;
}

/**
 * 産直・花データをIndexedDB用に変換
 */
export function convertHanaSanchokuData(rawData, type) {
  if (!rawData || rawData.length < 3) {
    return [];
  }

  const converted = [];
  const headerRow = rawData[0];

  for (let row = 1; row < rawData.length; row++) {
    const dateValue = rawData[row][0];
    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) continue;

    for (let col = 3; col < headerRow.length; col += 2) {
      const storeStr = String(headerRow[col] || '');
      const stoMatch = storeStr.match(/(\d{4})/);
      if (!stoMatch) continue;

      const storeCode = String(parseInt(stoMatch[1]));
      const cost = parseNum(rawData[row][col]);
      const amount = parseNum(rawData[row][col + 1]);

      if (cost === 0) continue;

      converted.push({
        date: date.getTime(),
        store: storeCode,
        cost,
        amount
      });
    }
  }

  return converted;
}

/**
 * 予算データをIndexedDB用に変換
 */
export function convertBudgetData(rawData) {
  if (!rawData || rawData.length < 2) {
    return [];
  }

  const converted = [];

  for (let row = 1; row < rawData.length; row++) {
    const storeValue = rawData[row][0];
    if (!storeValue) continue;

    const storeCode = String(parseInt(storeValue));
    const sales = parseNum(rawData[row][1]);
    const profit = parseNum(rawData[row][2]);

    if (sales === 0) continue;

    converted.push({
      store: storeCode,
      sales,
      profit,
      profitRate: sales > 0 ? (profit / sales) * 100 : 0,
      date: Date.now() // 現在時刻をタイムスタンプとして使用
    });
  }

  return converted;
}

/**
 * 仕入先コードからカテゴリを判定
 * @param {string} supplierCode - 仕入先コード
 * @returns {string} カテゴリ
 */
function getCategoryFromSupplier(supplierCode) {
  const code = parseInt(supplierCode);

  if (code >= 74700 && code <= 74799) return 'fruits';
  if (code >= 74800 && code <= 74899) return 'vegetables';
  if (code >= 74900 && code <= 74999) return 'market';
  if (code >= 77700 && code <= 77799) return 'sanchoku';
  if (code >= 78800 && code <= 78899) return 'hana';

  return 'other';
}

/**
 * データ型に応じた変換関数を取得
 * @param {string} dataType - データ型
 * @returns {Function} 変換関数
 */
export function getConverterForType(dataType) {
  const converters = {
    shiire: convertShiireData,
    uriage: convertUriageData,
    baihen: convertBaihenData,
    consumables: convertConsumablesData,
    tenkanIn: (data) => convertTenkanData(data, true),
    tenkanOut: (data) => convertTenkanData(data, false),
    sanchoku: (data) => convertHanaSanchokuData(data, 'sanchoku'),
    hana: (data) => convertHanaSanchokuData(data, 'hana'),
    budget: convertBudgetData
  };

  return converters[dataType] || null;
}

/**
 * Excelデータを変換してIndexedDBにインポート
 * @param {string} dataType - データ型
 * @param {Array} rawData - Excelから読み込んだ生データ
 * @param {boolean} showDialog - ダイアログを表示するか
 * @returns {Promise<Object>} インポート結果
 */
export async function importToIndexedDB(dataType, rawData, showDialog = true) {
  // データを変換
  const converter = getConverterForType(dataType);
  if (!converter) {
    throw new Error(`Unknown data type: ${dataType}`);
  }

  const convertedData = converter(rawData);

  if (convertedData.length === 0) {
    throw new Error('変換できるデータがありません');
  }

  console.log(`📊 Converted ${convertedData.length} records for ${dataType}`);

  if (showDialog) {
    // ダイアログを表示してユーザーに確認
    return new Promise((resolve, reject) => {
      importDialog.show(
        dataType,
        convertedData,
        async (mode) => {
          // インポート完了
          const result = syncManager.getLastSync(dataType);
          resolve(result);
        },
        () => {
          // キャンセル
          reject(new Error('User cancelled import'));
        }
      );
    });
  } else {
    // ダイアログなしで直接インポート（SMARTモード）
    return await syncManager.importData(dataType, convertedData, MERGE_MODE.SMART);
  }
}

/**
 * 複数のデータ型を一括インポート
 * @param {Object} dataMap - データ型とデータのマップ { dataType: rawData }
 * @returns {Promise<Array>} インポート結果の配列
 */
export async function importMultipleToIndexedDB(dataMap) {
  const results = [];

  for (const [dataType, rawData] of Object.entries(dataMap)) {
    try {
      const result = await importToIndexedDB(dataType, rawData, false);
      results.push({ dataType, success: true, result });
    } catch (error) {
      console.error(`Failed to import ${dataType}:`, error);
      results.push({ dataType, success: false, error: error.message });
    }
  }

  return results;
}
