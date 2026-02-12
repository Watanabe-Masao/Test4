/**
 * Data Processor Service
 * Processes raw data into structured formats for calculation
 */

import { appState } from '../models/state.js';
import { parseDate } from '../utils/helpers.js';

/**
 * Processes shiire (purchasing) data
 * @returns {Object} Processed purchasing data by store and day
 */
export function processShiire() {
    const data = appState.getData('shiire');
    if (!data || data.length < 4) return {};

    const result = {};
    const stores = appState.getAllStores();
    const suppliers = appState.getAllSuppliers();

    // Iterate through columns (each column pair represents supplier-store combination)
    for (let col = 3; col < data[0].length; col += 2) {
        const supStr = String(data[0][col] || '');
        const stoStr = String(data[1][col] || '');

        const supMatch = supStr.match(/(\d{7})/);
        const stoMatch = stoStr.match(/(\d{4}):/);

        if (!supMatch || !stoMatch) continue;

        const supplierCode = supMatch[1];
        const supplierInfo = suppliers[supplierCode] || { name: supplierCode, cat: 'other' };
        const storeId = String(parseInt(stoMatch[1]));

        if (!stores[storeId]) continue;

        // Get supplier settings
        const supSetting = appState.getSupplierSettings(supplierCode) || {};
        const usePriceCalc = supSetting.usePriceCalc || false;
        const supMarginRate = supSetting.marginRate || 0.26;

        // Process daily data
        for (let row = 4; row < data.length; row++) {
            const date = parseDate(data[row][0]);
            if (!date) continue;

            const day = date.getDate();
            const cost = parseFloat(data[row][col]) || 0;
            let price = parseFloat(data[row][col + 1]) || 0;

            // Recalculate price from margin rate if configured
            if (usePriceCalc && cost > 0) {
                price = Math.round(cost / (1 - supMarginRate));
            }

            if (cost === 0 && price === 0) continue;

            // Initialize structures
            if (!result[storeId]) result[storeId] = {};
            if (!result[storeId][day]) {
                result[storeId][day] = {
                    suppliers: {},
                    total: { cost: 0, price: 0 }
                };
            }
            if (!result[storeId][day].suppliers[supplierCode]) {
                result[storeId][day].suppliers[supplierCode] = {
                    ...supplierInfo,
                    cost: 0,
                    price: 0,
                    usePriceCalc
                };
            }

            // Accumulate data
            result[storeId][day].suppliers[supplierCode].cost += cost;
            result[storeId][day].suppliers[supplierCode].price += price;
            result[storeId][day].total.cost += cost;
            result[storeId][day].total.price += price;
        }
    }

    return result;
}

/**
 * Processes uriage (sales) data
 * @returns {Object} Processed sales data by store and day
 */
export function processUriage() {
    const data = appState.getData('uriage');
    if (!data || data.length < 3) return {};

    const result = {};
    const cols = {};
    const stores = appState.getAllStores();

    // Detect store columns
    for (let col = 3; col < data[0].length; col += 2) {
        const stoStr = String(data[0][col] || '');
        const match = stoStr.match(/(\d{4}):/);

        if (match) {
            const storeId = String(parseInt(match[1]));
            if (stores[storeId]) {
                cols[storeId] = col;
            }
        }
    }

    // Process daily sales data
    for (let row = 3; row < data.length; row++) {
        const date = parseDate(data[row][0]);
        if (!date) continue;

        const day = date.getDate();

        Object.entries(cols).forEach(([storeId, col]) => {
            if (!result[storeId]) result[storeId] = {};
            result[storeId][day] = {
                sales: parseFloat(data[row][col]) || 0
            };
        });
    }

    return result;
}

/**
 * Processes baihen (discount/markdown) data
 * @returns {Object} Processed discount data by store and day
 */
export function processBaihen() {
    const data = appState.getData('baihen');
    if (!data || data.length < 3) return {};

    const result = {};
    const cols = {};

    // Detect store columns from header row (row 0)
    for (let col = 3; col < data[0].length; col += 2) {
        const stoStr = String(data[0][col] || '');
        const stoMatch = stoStr.match(/(\d{4}):/);

        if (stoMatch) {
            const storeId = String(parseInt(stoMatch[1]));
            cols[storeId] = { sales: col, baihen: col + 1 };
        }
    }

    // Process data rows (starting from row 3)
    for (let row = 3; row < data.length; row++) {
        const dateStr = String(data[row][0] || '');
        const date = parseDate(dateStr);
        if (!date) continue;

        const day = date.getDate();

        Object.entries(cols).forEach(([storeId, colInfo]) => {
            const sales = parseFloat(data[row][colInfo.sales]) || 0;
            const baihen = parseFloat(data[row][colInfo.baihen]) || 0;

            if (sales === 0) return;

            if (!result[storeId]) result[storeId] = {};
            result[storeId][day] = {
                sales,
                baihen: Math.abs(baihen) // Store as absolute value
            };
        });
    }

    return result;
}

/**
 * Processes tenkan-in (inter-store incoming) data
 * Distinguishes between inter-store and inter-department transfers
 * @returns {Object} Processed incoming transfer data
 */
export function processTenkanIn() {
    const data = appState.getData('tenkanIn');
    if (!data || data.length < 2) return {};

    const result = {};
    const stores = appState.getAllStores();

    for (let row = 1; row < data.length; row++) {
        const storeCode = String(data[row][0] || '').trim();
        const dateVal = data[row][1];
        const storeCodeOut = String(data[row][2] || '').trim();
        const costIn = parseFloat(data[row][3]) || 0;
        const priceIn = parseFloat(data[row][4]) || 0;

        const date = parseDate(dateVal);
        if (!date) continue;

        const day = date.getDate();
        const storeId = String(parseInt(storeCode) || 0);
        const storeIdOut = String(parseInt(storeCodeOut) || 0);

        if (!stores[storeId]) continue;

        // Determine if this is inter-department (same store) or inter-store
        const isBumon = (storeCode === storeCodeOut) || (storeId === storeIdOut);

        if (!result[storeId]) result[storeId] = {};
        if (!result[storeId][day]) {
            result[storeId][day] = { tenkanIn: [], bumonIn: [] };
        }

        if (isBumon) {
            // Inter-department transfer
            result[storeId][day].bumonIn.push({
                cost: costIn,
                price: priceIn,
                fromStore: storeIdOut
            });
        } else {
            // Inter-store transfer
            result[storeId][day].tenkanIn.push({
                cost: costIn,
                price: priceIn,
                fromStore: storeIdOut,
                fromStoreName: stores[storeIdOut]?.name || storeIdOut
            });
        }
    }

    return result;
}

/**
 * Processes tenkan-out (inter-store outgoing) data
 * Distinguishes between inter-store and inter-department transfers
 * @returns {Object} Processed outgoing transfer data
 */
export function processTenkanOut() {
    const data = appState.getData('tenkanOut');
    if (!data || data.length < 2) return {};

    const result = {};
    const stores = appState.getAllStores();

    for (let row = 1; row < data.length; row++) {
        const dateVal = data[row][0];
        const storeCode = String(data[row][1] || '').trim();
        const storeCodeIn = String(data[row][2] || '').trim();
        const bumonCodeIn = String(data[row][3] || '').trim();
        const costOut = parseFloat(data[row][4]) || 0;
        const priceOut = parseFloat(data[row][5]) || 0;

        const date = parseDate(dateVal);
        if (!date) continue;

        const day = date.getDate();
        const storeId = String(parseInt(storeCode) || 0);
        const storeIdIn = String(parseInt(storeCodeIn) || 0);

        if (!stores[storeId]) continue;

        // Determine if this is inter-department (same store) or inter-store
        const isBumon = (storeCode === storeCodeIn) || (storeId === storeIdIn);

        if (!result[storeId]) result[storeId] = {};
        if (!result[storeId][day]) {
            result[storeId][day] = { tenkanOut: [], bumonOut: [] };
        }

        if (isBumon) {
            // Inter-department transfer
            result[storeId][day].bumonOut.push({
                cost: costOut,
                price: priceOut,
                toStore: storeIdIn,
                bumonCode: bumonCodeIn
            });
        } else {
            // Inter-store transfer
            result[storeId][day].tenkanOut.push({
                cost: costOut,
                price: priceOut,
                toStore: storeIdIn,
                toStoreName: stores[storeIdIn]?.name || storeIdIn,
                bumonCode: bumonCodeIn
            });
        }
    }

    return result;
}

/**
 * Processes hana (flowers) or sanchoku (direct delivery) data
 * These are sales-based deliveries with cost calculated from selling price * rate
 * @param {string} type - 'hana' or 'sanchoku'
 * @param {number} rate - Cost rate (default: 0.80 for hana, 0.85 for sanchoku)
 * @returns {Object} Processed data by store and day
 */
export function processHanaSanchoku(type, rate = null) {
    const data = appState.getData(type);
    if (!data || data.length < 3) return {};

    // Get rate from parameter or use default
    if (rate === null) {
        rate = type === 'hana' ? 0.80 : 0.85;
    }

    const result = {};
    const cols = {};

    // Detect store columns from header row (row 0): 0001:StoreName format
    for (let col = 3; col < data[0].length; col += 2) {
        const stoStr = String(data[0][col] || '');
        const stoMatch = stoStr.match(/(\d{4}):/);

        if (stoMatch) {
            const storeId = String(parseInt(stoMatch[1]));
            cols[storeId] = col;
        }
    }

    // Process data rows (starting from row 3)
    for (let row = 3; row < data.length; row++) {
        const dateStr = String(data[row][0] || '');
        const date = parseDate(dateStr);
        if (!date) continue;

        const day = date.getDate();

        Object.entries(cols).forEach(([storeId, col]) => {
            const price = parseFloat(data[row][col]) || 0;
            if (price === 0) return;

            const cost = Math.round(price * rate);

            if (!result[storeId]) result[storeId] = {};
            if (!result[storeId][day]) {
                result[storeId][day] = { price: 0, cost: 0 };
            }

            result[storeId][day].price += price;
            result[storeId][day].cost += cost;
        });
    }

    return result;
}

/**
 * Aggregates all processed data for a store
 * @param {string} storeId - The store ID
 * @returns {Object} Aggregated store data
 */
export function aggregateStoreData(storeId) {
    const shiire = processShiire();
    const uriage = processUriage();
    const tenkanInData = processTenkanIn();
    const tenkanOutData = processTenkanOut();
    const hana = processHanaSanchoku('hana');
    const sanchoku = processHanaSanchoku('sanchoku');
    const baihenData = processBaihen();

    const daily = {};
    const transferDetails = {
        tenkanIn: [],
        tenkanOut: [],
        bumonIn: [],
        bumonOut: []
    };

    // Process each day (1-31)
    for (let day = 1; day <= 31; day++) {
        const s = shiire[storeId]?.[day] || { suppliers: {}, total: { cost: 0, price: 0 } };
        const u = uriage[storeId]?.[day] || { sales: 0 };
        const ti = tenkanInData[storeId]?.[day] || { tenkanIn: [], bumonIn: [] };
        const to = tenkanOutData[storeId]?.[day] || { tenkanOut: [], bumonOut: [] };
        const h = hana[storeId]?.[day] || { cost: 0, price: 0 };
        const sa = sanchoku[storeId]?.[day] || { cost: 0, price: 0 };
        const bh = baihenData[storeId]?.[day] || { sales: 0, baihen: 0 };
        const cons = appState.getConsumables(storeId)?.[day] || { cost: 0, items: [] };

        // Calculate transfer totals
        const tenkanInTotal = { cost: 0, price: 0 };
        const tenkanOutTotal = { cost: 0, price: 0 };
        const bumonInTotal = { cost: 0, price: 0 };
        const bumonOutTotal = { cost: 0, price: 0 };

        (ti.tenkanIn || []).forEach(t => {
            tenkanInTotal.cost += t.cost;
            tenkanInTotal.price += t.price;
        });
        (ti.bumonIn || []).forEach(t => {
            bumonInTotal.cost += t.cost;
            bumonInTotal.price += t.price;
        });
        (to.tenkanOut || []).forEach(t => {
            tenkanOutTotal.cost += t.cost;
            tenkanOutTotal.price += t.price;
        });
        (to.bumonOut || []).forEach(t => {
            bumonOutTotal.cost += t.cost;
            bumonOutTotal.price += t.price;
        });

        // Skip days with no activity
        const hasActivity = u.sales !== 0 || s.total.cost !== 0 ||
            tenkanInTotal.cost !== 0 || tenkanOutTotal.cost !== 0 ||
            bumonInTotal.cost !== 0 || bumonOutTotal.cost !== 0 ||
            h.cost !== 0 || sa.cost !== 0 || cons.cost !== 0;

        if (!hasActivity) continue;

        // Calculate discount rate (based on selling price)
        const baihenAmt = bh.baihen || 0;
        const grossSales = u.sales + baihenAmt; // Sales before discount
        const baihenRate = grossSales > 0 ? baihenAmt / grossSales : 0;

        // Core sales (excluding flowers and direct delivery)
        const coreSales = u.sales - (h.price || 0) - (sa.price || 0);
        const coreGrossSales = coreSales + baihenAmt;

        daily[day] = {
            sales: u.sales,
            suppliers: s.suppliers,
            shiire: s.total,
            tenkanIn: ti.tenkanIn || [],
            tenkanOut: to.tenkanOut || [],
            bumonIn: ti.bumonIn || [],
            bumonOut: to.bumonOut || [],
            tenkanInTotal,
            tenkanOutTotal,
            bumonInTotal,
            bumonOutTotal,
            hana: h,
            sanchoku: sa,
            consumable: cons,
            baihen: baihenAmt,
            baihenRate,
            grossSales,
            coreSales,
            coreGrossSales
        };

        // Collect transfer details
        (ti.tenkanIn || []).forEach(t => transferDetails.tenkanIn.push({ ...t, day }));
        (ti.bumonIn || []).forEach(t => transferDetails.bumonIn.push({ ...t, day }));
        (to.tenkanOut || []).forEach(t => transferDetails.tenkanOut.push({ ...t, day }));
        (to.bumonOut || []).forEach(t => transferDetails.bumonOut.push({ ...t, day }));
    }

    return {
        daily,
        transferDetails
    };
}

/**
 * Gets the hana/sanchoku rate from settings
 * @param {string} type - 'hana' or 'sanchoku'
 * @returns {number} The rate value
 */
export function getHanaSanchokuRate(type) {
    // This would ideally get from UI or settings
    // For now, return defaults
    return type === 'hana' ? 0.80 : 0.85;
}
