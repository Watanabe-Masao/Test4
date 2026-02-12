/**
 * Excel Service
 * Handles Excel file export functionality
 */

import { appState } from '../models/state.js';
import { CATEGORIES } from '../config/constants.js';
import { getCatOrder, showToast } from '../utils/helpers.js';

/**
 * Exports calculation results to Excel file
 * @param {Object} result - The calculation results
 */
export function exportExcel(result) {
    if (!result) {
        showToast('出力するデータがありません', 'warning');
        return;
    }

    const wb = XLSX.utils.book_new();
    const stores = appState.getAllStores();
    const storeIds = Object.keys(stores).sort((a, b) => +a - +b);

    // Create main sheet with all suppliers by category
    createSupplierSheet(wb, result, storeIds);

    // Create individual store sheets
    storeIds.forEach(storeId => {
        createStoreSheet(wb, result[storeId], storeId, stores[storeId]);
    });

    // Generate filename with current date
    const filename = 'shiire_arari_' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '.xlsx';
    XLSX.writeFile(wb, filename);

    showToast('Excelを出力しました', 'success');
}

/**
 * Creates the main supplier sheet (取引先別)
 * @param {Object} wb - The workbook
 * @param {Object} result - Calculation results
 * @param {Array} storeIds - Array of store IDs
 */
function createSupplierSheet(wb, result, storeIds) {
    const allData = [['日']];
    const suppliers = appState.getAllSuppliers();
    const catOrder = getCatOrder();

    // Build header row
    catOrder.forEach(cat => {
        storeIds.forEach(sid => {
            if (!result[sid]?.catTotals[cat]) return;

            const catName = CATEGORIES[cat]?.name || cat;
            const storeCode = sid.padStart(2, '0');
            allData[0].push(`${catName}_${storeCode}_原価`, '_売価');
        });
    });

    // Build data rows for each day
    for (let day = 1; day <= 31; day++) {
        const row = [`${day}日`];

        catOrder.forEach(cat => {
            storeIds.forEach(sid => {
                if (!result[sid]?.catTotals[cat]) return;

                const dayData = result[sid].daily[day];
                let cost = 0;
                let price = 0;

                if (dayData) {
                    if (cat === 'tenkan') {
                        // Inter-store transfers
                        cost = dayData.tenkanInTotal.cost + dayData.tenkanOutTotal.cost;
                        price = dayData.tenkanInTotal.price + dayData.tenkanOutTotal.price;
                    } else if (cat === 'bumonkan') {
                        // Inter-department transfers
                        cost = dayData.bumonInTotal.cost + dayData.bumonOutTotal.cost;
                        price = dayData.bumonInTotal.price + dayData.bumonOutTotal.price;
                    } else if (cat === 'hana') {
                        // Flowers
                        cost = dayData.hana.cost;
                        price = dayData.hana.price;
                    } else if (cat === 'sanchoku') {
                        // Direct delivery
                        cost = dayData.sanchoku.cost;
                        price = dayData.sanchoku.price;
                    } else if (cat === 'consumable') {
                        // Consumables
                        cost = dayData.consumable.cost;
                        price = 0; // Consumables don't have price
                    } else {
                        // Regular suppliers
                        Object.entries(dayData.suppliers).forEach(([code, sup]) => {
                            const supCat = suppliers[code]?.cat || 'other';
                            if (supCat === cat) {
                                cost += sup.cost;
                                price += sup.price;
                            }
                        });
                    }
                }

                row.push(cost || '', price || '');
            });
        });

        allData.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, ws, '取引先別');
}

/**
 * Creates individual store sheet
 * @param {Object} wb - The workbook
 * @param {Object} storeData - Store calculation data
 * @param {string} storeId - Store ID
 * @param {Object} storeInfo - Store information
 */
function createStoreSheet(wb, storeData, storeId, storeInfo) {
    if (!storeData) return;

    const ws = [
        ['店舗', storeInfo.name],
        ['期首在庫', storeData.invStart],
        ['総仕入', storeData.totalCost],
        ['期末在庫', storeData.invEnd],
        ['売上原価', storeData.invStart + storeData.totalCost - storeData.invEnd],
        ['売上実績', storeData.totalSales],
        ['荒利益', storeData.grossProfit],
        ['荒利率', storeData.grossProfitRate],
        ['値入率', storeData.avgMargin],
        [],
        ['帳合', '原価', '売価', '値入率', '構成比']
    ];

    // Add category totals
    const catOrder = getCatOrder();
    catOrder.forEach(cat => {
        const catData = storeData.catTotals[cat];
        if (!catData) return;

        const catName = CATEGORIES[cat]?.name || cat;
        const marginRate = catData.price > 0 ? (catData.price - catData.cost) / catData.price : 0;
        const composition = storeData.totalCost > 0 ? catData.cost / storeData.totalCost : 0;

        ws.push([
            catName,
            catData.cost,
            catData.price,
            marginRate,
            composition
        ]);
    });

    // Add transfer details
    ws.push([]);
    ws.push(['=== 店間・部門間移動詳細 ===']);
    ws.push(['日', '種別', '移動先/元', '部門', '原価', '売価']);

    // Inter-store incoming
    (storeData.transferDetails.tenkanIn || []).forEach(t => {
        ws.push([
            `${t.day}日`,
            '店間入庫',
            t.fromStoreName || t.fromStore,
            '',
            t.cost,
            t.price
        ]);
    });

    // Inter-store outgoing
    (storeData.transferDetails.tenkanOut || []).forEach(t => {
        ws.push([
            `${t.day}日`,
            '店間出庫',
            t.toStoreName || t.toStore,
            t.bumonCode || '',
            t.cost,
            t.price
        ]);
    });

    // Inter-department incoming
    (storeData.transferDetails.bumonIn || []).forEach(t => {
        ws.push([
            `${t.day}日`,
            '部門間入庫',
            '',
            '',
            t.cost,
            t.price
        ]);
    });

    // Inter-department outgoing
    (storeData.transferDetails.bumonOut || []).forEach(t => {
        ws.push([
            `${t.day}日`,
            '部門間出庫',
            '',
            t.bumonCode || '',
            t.cost,
            t.price
        ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(ws);
    XLSX.utils.book_append_sheet(wb, worksheet, '店舗' + storeId.padStart(2, '0'));
}

/**
 * Exports report to Excel
 * @param {string} reportType - Type of report
 * @param {Object} reportData - Report data
 * @param {string} title - Report title
 */
export function exportReport(reportType, reportData, title) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);

    XLSX.utils.book_append_sheet(wb, ws, title);

    const filename = `report_${reportType}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);

    showToast('レポートをエクスポートしました', 'success');
}

/**
 * Exports settings to JSON file
 * @param {Object} settings - Settings object
 */
export function exportSettings(settings) {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shiire_settings_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);

    showToast('設定をエクスポートしました', 'success');
}

/**
 * Imports settings from JSON file
 * @param {File} file - Settings file
 * @returns {Promise<Object>} Imported settings
 */
export function importSettings(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = e => {
            try {
                const settings = JSON.parse(e.target.result);
                showToast('設定をインポートしました', 'success');
                resolve(settings);
            } catch (err) {
                showToast('インポートエラー: ' + err.message, 'error');
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error('ファイル読込エラー'));
        reader.readAsText(file);
    });
}
