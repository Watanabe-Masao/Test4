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
  if (!rawData || rawData.length < 5) {
    return [];
  }

  const converted = [];
  const headerRow = rawData[0];
  const storeRow = rawData[1];

  // データ行を処理（5行目以降 - row 0:仕入先, row 1:店舗, row 2-3:ラベル/集計行）
  for (let row = 4; row < rawData.length; row++) {
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
 * 売上・売変統合データを変換
 *
 * ヘッダー自動検出:
 *   形式A (2行ヘッダー):
 *     行0: 【店舗】  【店舗】  0001:名前  0001:名前  0006:名前 ...
 *     行1: 販売金額  売変合計  販売金額   売変合計   販売金額  ...
 *     行2: 【期間別】(合計値)
 *     行3+: 日付     金額     金額       金額       金額     ...
 *
 *   形式B (3行ヘッダー):
 *     行0: 【店舗】       【店舗】     【店舗】     ...
 *     行1: 0001:名前     0001:名前    0006:名前    ...
 *     行2: 販売金額      売変合計金額  販売金額     ...
 *     行3: 【期間別】    (空)         (空)        ...
 *     行4+: 日付         金額1        金額2       ...
 *
 * @param {Array} rawData - Excelから読み込んだ生データ
 * @returns {Object} { uriage: [], baihen: [] } 両方のデータを含むオブジェクト
 */
export function convertUriageBaihenData(rawData) {
  console.log('🔍 convertUriageBaihenData called');
  console.log(`📊 Raw data length: ${rawData?.length || 0}`);

  if (!rawData || rawData.length < 4) {
    console.warn('⚠️ Raw data is empty or too short (need at least 4 rows)');
    return { uriage: [], baihen: [] };
  }

  console.log('📋 Header row 0:', rawData[0]);
  console.log('📋 Header row 1:', rawData[1]);
  console.log('📋 Header row 2:', rawData[2]);

  // ヘッダー形式を自動検出
  // rawData[1]にタイプラベル（販売/売変）があれば形式A、なければ形式B
  let storeRow, typeRow, dataStartRow;

  const row1Sample = String(rawData[1][1] || '');
  const isFormatA = row1Sample.includes('販売') || row1Sample.includes('売変') || row1Sample.includes('売上');

  if (isFormatA) {
    // 形式A: 2行ヘッダー（店舗コードはrow0、タイプラベルはrow1）
    storeRow = rawData[0];
    typeRow = rawData[1];
    // 【期間別】行を探してスキップ
    dataStartRow = 2;
    for (let i = 2; i < Math.min(rawData.length, 6); i++) {
      const firstCell = String(rawData[i][0] || '');
      if (firstCell.includes('期間別') || firstCell.includes('期間')) {
        dataStartRow = i + 1;
        break;
      }
    }
    console.log('📋 Detected Format A (2-row header), dataStartRow:', dataStartRow);
  } else {
    // 形式B: 3行ヘッダー（店舗コードはrow1、タイプラベルはrow2）
    storeRow = rawData[1];
    typeRow = rawData[2];
    dataStartRow = 4;
    console.log('📋 Detected Format B (3-row header), dataStartRow:', dataStartRow);
  }

  // 列情報を解析
  const columns = [];
  for (let col = 1; col < storeRow.length; col++) {
    const storeStr = String(storeRow[col] || '');
    const typeStr = String(typeRow[col] || '');

    // 店舗コードを抽出
    const stoMatch = storeStr.match(/(\d{4})/);
    if (!stoMatch) continue;

    const storeCode = String(parseInt(stoMatch[1]));

    // データタイプを判定（販売金額 or 売変合計金額）
    const isUriage = typeStr.includes('販売') || typeStr.includes('売上');
    const isBaihen = typeStr.includes('売変');

    if (isUriage || isBaihen) {
      columns.push({
        col,
        store: storeCode,
        type: isUriage ? 'uriage' : 'baihen'
      });
    }
  }

  console.log(`📊 Found ${columns.length} columns:`, columns.slice(0, 5));

  const uriageData = [];
  const baihenData = [];

  // データ行を処理
  for (let row = dataStartRow; row < rawData.length; row++) {
    const dataRow = rawData[row];
    const dateValue = dataRow[0];

    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) {
      console.warn(`⚠️ Could not parse date at row ${row}:`, dateValue);
      continue;
    }

    const timestamp = date.getTime();

    // 各列のデータを処理
    for (const colInfo of columns) {
      const value = parseNum(dataRow[colInfo.col]);

      if (value === 0) continue;

      if (colInfo.type === 'uriage') {
        // 売上データ
        // 注: 現在のスキーマでは sales, cost, profit が必要
        // cost と profit は別途計算するか、またはスキーマを変更する必要がある
        uriageData.push({
          date: timestamp,
          store: colInfo.store,
          sales: value,
          cost: 0, // TODO: 原価データが必要な場合は別途処理
          profit: 0, // TODO: 粗利データが必要な場合は別途処理
          profitRate: 0
        });
      } else if (colInfo.type === 'baihen') {
        // 売変データ
        baihenData.push({
          date: timestamp,
          store: colInfo.store,
          amount: value
        });
      }
    }
  }

  console.log(`✅ Converted ${uriageData.length} uriage records`);
  console.log(`✅ Converted ${baihenData.length} baihen records`);

  if (uriageData.length > 0) {
    console.log('📦 Sample uriage record:', uriageData[0]);
  }
  if (baihenData.length > 0) {
    console.log('📦 Sample baihen record:', baihenData[0]);
  }

  return {
    uriage: uriageData,
    baihen: baihenData
  };
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
 *
 * データ形式:
 * 店間入 (isIn=true):
 *   列0: 店舗コード
 *   列1: 日付
 *   列2: 店コードOUT
 *   列3: 原価金額IN
 *   列4: 売価金額IN
 *
 * 店間出 (isIn=false):
 *   列0: 日付
 *   列1: 店舗コード
 *   列2: 店コードIN
 *   列3: 部門コードIN
 *   列4: 原価金額OUT
 *   列5: 売価金額OUT
 */
export function convertTenkanData(rawData, isIn = true) {
  console.log(`🔍 convertTenkanData called with ${isIn ? 'IN' : 'OUT'} mode`);
  console.log(`📊 Raw data length: ${rawData?.length || 0}`);

  if (!rawData || rawData.length < 2) {
    console.warn('⚠️ Raw data is empty or too short (need at least 2 rows)');
    return [];
  }

  const converted = [];
  const headerRow = rawData[0];

  console.log('📋 Header row:', headerRow);
  console.log('📋 First data row:', rawData[1]);

  // ヘッダー行をスキップしてデータ行を処理
  for (let row = 1; row < rawData.length; row++) {
    const dataRow = rawData[row];

    // 空行をスキップ
    if (!dataRow || dataRow.length === 0) continue;

    let dateValue, storeValue, amountValue;

    if (isIn) {
      // 店間入: 列0=店舗コード, 列1=日付, 列3=原価金額IN
      storeValue = dataRow[0];
      dateValue = dataRow[1];
      amountValue = dataRow[3]; // 原価金額IN
    } else {
      // 店間出: 列0=日付, 列1=店舗コード, 列4=原価金額OUT
      dateValue = dataRow[0];
      storeValue = dataRow[1];
      amountValue = dataRow[4]; // 原価金額OUT
    }

    // 日付をパース
    const date = parseDate(dateValue);
    if (!date) {
      console.warn(`⚠️ Could not parse date at row ${row}:`, dateValue);
      continue;
    }

    // 店舗コードを文字列に変換
    const storeCode = String(storeValue || '').trim();
    if (!storeCode) {
      console.warn(`⚠️ No store code at row ${row}`);
      continue;
    }

    // 金額を数値に変換
    // 店間出の金額はExcelで負の値（例: -3,786）として格納されている。
    // ダッシュボードの計算式は正の値を前提としているため、Math.abs()で正に変換する。
    const rawAmount = parseNum(amountValue);
    const amount = isIn ? rawAmount : Math.abs(rawAmount);
    if (amount === 0) {
      continue; // 金額が0の行はスキップ
    }

    converted.push({
      date: date.getTime(),
      store: storeCode,
      amount: amount
    });
  }

  console.log(`✅ Converted ${converted.length} tenkan ${isIn ? 'IN' : 'OUT'} records`);
  if (converted.length > 0) {
    console.log('📦 Sample converted records:', converted.slice(0, 3));
  } else {
    console.warn('⚠️ No records were converted! Check:');
    console.warn(`  1. ${isIn ? '店間入' : '店間出'} file format is correct`);
    console.warn('  2. Data rows have valid dates');
    console.warn('  3. Data rows have valid store codes');
    console.warn('  4. Data rows have non-zero amounts');
  }

  return converted;
}

/**
 * 産直・花データをIndexedDB用に変換
 *
 * ヘッダー形式:
 *   行0: [空] 【店舗】 【店舗】 0001:店名 0001:店名 0006:店名 0006:店名 ...
 *   行1: 販売金額 来店客数 販売金額 来店客数 販売金額 来店客数 ...
 *   行2: 【期間別】 集計値 ...
 *   行3+: 日付 金額 ...
 *
 * 各店舗が「販売金額」「来店客数」の2列を持つ。
 * 「販売金額」列のみを売価として抽出する。
 */
export function convertHanaSanchokuData(rawData, type) {
  if (!rawData || rawData.length < 4) {
    return [];
  }

  const converted = [];
  const storeRow = rawData[0];
  const typeRow = rawData[1];

  // 販売金額の列を検出（店舗コード + タイプラベルで判定）
  const columns = [];
  for (let col = 1; col < storeRow.length; col++) {
    const storeStr = String(storeRow[col] || '');
    const typeStr = String(typeRow[col] || '');

    const stoMatch = storeStr.match(/(\d{4})/);
    if (!stoMatch) continue;

    // 販売金額列のみを使用（来店客数は除外）
    if (typeStr.includes('販売') || typeStr.includes('売上')) {
      columns.push({ col, store: String(parseInt(stoMatch[1])) });
    }
  }

  // 【期間別】行を探してデータ開始行を特定
  let dataStartRow = 3;
  for (let i = 2; i < Math.min(rawData.length, 6); i++) {
    const firstCell = String(rawData[i][0] || '');
    if (firstCell.includes('期間別') || firstCell.includes('期間')) {
      dataStartRow = i + 1;
      break;
    }
  }

  // データ行を処理
  for (let row = dataStartRow; row < rawData.length; row++) {
    const dateValue = rawData[row][0];
    if (!dateValue) continue;

    const date = parseDate(dateValue);
    if (!date) continue;

    for (const { col, store } of columns) {
      const sellingPrice = parseNum(rawData[row][col]);
      if (sellingPrice === 0) continue;

      converted.push({
        date: date.getTime(),
        store,
        amount: sellingPrice,  // 売価（販売金額）
        cost: sellingPrice     // 後方互換: ダッシュボードは amount || cost で売価を取得
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
 * 初期設定データ(店舗別目標・在庫)をIndexedDB用に変換
 *
 * データ形式:
 *   列0: 店舗コード
 *   列1: 期首在庫
 *   列2: 期末在庫
 *   列3: 粗利額予算
 *
 * 粗利率は budget ファイルの売上予算と組み合わせて計算されます
 */
export function convertSettingsData(rawData) {
  console.log('🔍 convertSettingsData called');
  console.log(`📊 Raw data length: ${rawData?.length || 0}`);

  if (!rawData || rawData.length < 2) {
    console.warn('⚠️ Raw data is empty or too short (need at least 2 rows)');
    return [];
  }

  const converted = [];
  const headerRow = rawData[0];

  console.log('📋 Header row:', headerRow);
  console.log('📋 First data row:', rawData[1]);

  // ヘッダー行をスキップしてデータ行を処理
  for (let row = 1; row < rawData.length; row++) {
    const dataRow = rawData[row];

    // 空行をスキップ
    if (!dataRow || dataRow.length === 0) continue;

    const storeValue = dataRow[0];
    if (!storeValue) continue;

    const storeCode = String(parseInt(storeValue));
    const openingInventory = parseNum(dataRow[1]); // 期首在庫
    const closingInventory = parseNum(dataRow[2]); // 期末在庫
    const profitBudget = parseNum(dataRow[3]);     // 粗利額予算

    converted.push({
      store: storeCode,
      openingInventory,
      closingInventory,
      profitBudget
    });
  }

  console.log(`✅ Converted ${converted.length} settings records`);
  if (converted.length > 0) {
    console.log('📦 Sample converted records:', converted.slice(0, 3));
  } else {
    console.warn('⚠️ No records were converted! Check:');
    console.warn('  1. File has valid store codes in column 0');
    console.warn('  2. Data rows have inventory and budget values');
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
    uriageBaihen: convertUriageBaihenData, // 売上・売変統合
    consumables: convertConsumablesData,
    tenkanIn: (data) => convertTenkanData(data, true),
    tenkanOut: (data) => convertTenkanData(data, false),
    sanchoku: (data) => convertHanaSanchokuData(data, 'sanchoku'),
    hana: (data) => convertHanaSanchokuData(data, 'hana'),
    budget: convertBudgetData,
    settings: convertSettingsData
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

  // 複数のデータタイプを含むオブジェクトか確認
  // (例: uriageBaihen -> { uriage: [], baihen: [] })
  const isMultiType = convertedData && typeof convertedData === 'object' && !Array.isArray(convertedData);

  if (isMultiType) {
    // 複数のデータタイプを一括インポート
    console.log(`📊 Multi-type import for ${dataType}:`, Object.keys(convertedData));

    // 複数データタイプの場合、確認なしで直接インポート
    // (TODO: 将来的には統合ダイアログを実装)
    const results = {};
    let totalRecords = 0;

    for (const [subType, subData] of Object.entries(convertedData)) {
      if (Array.isArray(subData) && subData.length > 0) {
        console.log(`  ➜ ${subType}: ${subData.length} records`);
        totalRecords += subData.length;

        // ダイアログなしで直接インポート (SMARTモード)
        results[subType] = await syncManager.importData(subType, subData, MERGE_MODE.SMART);
      }
    }

    // 成功メッセージを表示
    if (totalRecords > 0) {
      const typeNames = Object.keys(results).join('・');
      console.log(`✅ Imported ${totalRecords} records (${typeNames})`);
    }

    return results;
  } else {
    // 単一のデータタイプ（従来の動作）
    if (!Array.isArray(convertedData) || convertedData.length === 0) {
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
