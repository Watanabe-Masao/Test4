/**
 * Data Loader Service
 * Handles file loading, auto-detection, and initial data processing
 */

import { appState } from '../models/state.js';
import { FILE_TYPES } from '../config/constants.js';
import { parseDate, parseNum, showToast, readExcelFile, fmt } from '../utils/helpers.js';

/**
 * Detects the file type based on filename and content
 * @param {string} filename - The filename
 * @param {Array} data - The file data
 * @returns {string|null} The detected file type or null
 */
export function detectFileType(filename, data) {
    const lowerName = filename.toLowerCase();

    // Check filename patterns
    for (const [type, config] of Object.entries(FILE_TYPES)) {
        for (const pattern of config.patterns) {
            if (lowerName.includes(pattern.toLowerCase())) {
                return type;
            }
        }
    }

    // Check header patterns
    if (data && data.length > 0) {
        const headerStr = data.slice(0, 3)
            .flat()
            .map(x => String(x || ''))
            .join(' ')
            .toLowerCase();

        for (const [type, config] of Object.entries(FILE_TYPES)) {
            const matches = config.headerPatterns.filter(p =>
                headerStr.includes(p.toLowerCase())
            );
            if (matches.length >= 1) {
                return type;
            }
        }
    }

    return null;
}

/**
 * Loads a single file
 * @param {File} file - The file to load
 * @param {string} type - The file type
 * @returns {Promise<void>}
 */
export async function loadFile(file, type) {
    try {
        const data = await readExcelFile(file);
        appState.setData(type, data);

        // Post-processing based on file type
        if (type === 'shiire') {
            detectStoresAndSuppliers(data);
        } else if (type === 'hana' || type === 'sanchoku') {
            detectStoresFromHanaSanchoku(type, data);
        } else if (type === 'settings') {
            processSettings(data);
        } else if (type === 'budget') {
            processBudget(data);
        }

        showToast(`${FILE_TYPES[type].name}: ${file.name}`, 'success');
        return { success: true, type, filename: file.name };
    } catch (err) {
        showToast(`${file.name}: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * Handles dropped files with auto-detection
 * @param {FileList} files - The dropped files
 * @returns {Promise<Array>} Results for each file
 */
export async function handleDroppedFiles(files) {
    const fileArray = Array.from(files);
    const results = [];

    for (const file of fileArray) {
        try {
            const data = await readExcelFile(file);
            const type = detectFileType(file.name, data);

            if (type) {
                const result = await loadFile(file, type);
                results.push(result);
            } else {
                showToast(`${file.name}の種類を判定できません`, 'warning');
                results.push({ success: false, filename: file.name, error: 'Unknown type' });
            }
        } catch (err) {
            showToast(`${file.name}: ${err.message}`, 'error');
            results.push({ success: false, filename: file.name, error: err.message });
        }
    }

    if (results.filter(r => r.success).length > 0) {
        showToast(`${results.filter(r => r.success).length}件のファイルを読み込みました`, 'success');
    }

    return results;
}

/**
 * Detects stores and suppliers from shiire (purchasing) data
 * @param {Array} data - The shiire data
 */
export function detectStoresAndSuppliers(data) {
    if (!data || data.length < 2) return;

    const stores = {};
    const suppliers = {};

    // Parse header rows to detect suppliers and stores
    for (let col = 3; col < data[0].length; col += 2) {
        const supStr = String(data[0][col] || '');
        const stoStr = String(data[1][col] || '');

        // Detect supplier: 0074721:Name format
        const supMatch = supStr.match(/(\d{7}):?(.*)$/);
        if (supMatch) {
            const code = supMatch[1];
            const name = supMatch[2]?.trim() || code;
            if (!suppliers[code]) {
                const category = appState.getSupplierCategory(code) || 'other';
                suppliers[code] = { name, cat: category };
            }
        }

        // Detect store: 0001:StoreName format
        const stoMatch = stoStr.match(/(\d{4}):(.+)$/);
        if (stoMatch) {
            const code = stoMatch[1];
            const name = stoMatch[2].replace(/毎日屋/g, '').trim();
            const id = String(parseInt(code));
            if (!stores[id]) {
                stores[id] = { code, name };
            }
        }
    }

    // Update state
    Object.entries(stores).forEach(([id, store]) => {
        appState.setStore(id, store);
    });

    Object.entries(suppliers).forEach(([code, supplier]) => {
        appState.setSupplier(code, supplier);
    });

    showToast(`店舗${Object.keys(stores).length}件、仕入先${Object.keys(suppliers).length}件を検出`, 'info');
}

/**
 * Detects stores from hana (flowers) or sanchoku (direct delivery) data
 * @param {string} type - 'hana' or 'sanchoku'
 * @param {Array} data - The file data
 */
export function detectStoresFromHanaSanchoku(type, data) {
    if (!data || data.length < 2) return;

    const stores = {};

    // Parse header row to detect stores
    for (let col = 3; col < data[0].length; col += 2) {
        const stoStr = String(data[0][col] || '');
        const stoMatch = stoStr.match(/(\d{4}):(.+)$/);

        if (stoMatch) {
            const code = stoMatch[1];
            const name = stoMatch[2].replace(/毎日屋/g, '').trim();
            const id = String(parseInt(code));

            if (!stores[id]) {
                stores[id] = { code, name };
            }
        }
    }

    // Update state
    Object.entries(stores).forEach(([id, store]) => {
        appState.setStore(id, store);
    });

    if (Object.keys(stores).length > 0) {
        showToast(`${FILE_TYPES[type].name}から店舗${Object.keys(stores).length}件を検出`, 'info');
    }
}

/**
 * Processes initial settings file (inventory data)
 * @param {Array} data - The settings file data
 */
export function processSettings(data) {
    if (!data || data.length < 2) return;

    let count = 0;
    for (let row = 1; row < data.length; row++) {
        const storeCode = data[row][0];
        const invStart = parseFloat(data[row][1]) || 0;
        const invEnd = parseFloat(data[row][2]) || 0;

        if (storeCode) {
            const sid = String(parseInt(storeCode));
            appState.setStoreInventory(sid, { invStart, invEnd });
            count++;
        }
    }

    showToast(`店舗別在庫設定を読み込みました（${count}店舗）`, 'success');
}

/**
 * Processes budget file (daily budget data)
 * @param {Array} data - The budget file data
 */
export function processBudget(data) {
    if (!data || data.length < 2) return;

    let storeCount = 0;
    const storeBudgets = {};

    for (let row = 1; row < data.length; row++) {
        const storeCode = data[row][0];
        const dateStr = String(data[row][1] || '');
        const budgetVal = parseFloat(data[row][2]) || 0;

        if (!storeCode) continue;

        const sid = String(parseInt(storeCode));
        const date = parseDate(dateStr);
        if (!date) continue;

        const day = date.getDate();

        if (!storeBudgets[sid]) {
            storeBudgets[sid] = { daily: {}, total: 0 };
            storeCount++;
        }

        storeBudgets[sid].daily[day] = budgetVal;
        storeBudgets[sid].total += budgetVal;
    }

    // Update state
    Object.entries(storeBudgets).forEach(([sid, budget]) => {
        appState.setStoreBudget(sid, budget);
    });

    showToast(`日別予算データを読み込みました（${storeCount}店舗）`, 'success');
}

/**
 * Processes consumable files (cost allocation)
 * @param {FileList} files - The consumable files
 * @param {string} mode - 'overwrite' or 'append'
 * @returns {Promise<Object>} Processing results
 */
export async function processConsumableFiles(files, mode = 'overwrite') {
    if (!files || files.length === 0) return { success: false };

    // Clear existing data if overwrite mode
    if (mode === 'overwrite') {
        appState.clearConsumables();
    }

    const fileArray = Array.from(files);
    let loadedCount = 0;
    let totalCost = 0;
    let newItems = 0;

    for (const file of fileArray) {
        try {
            const data = await readExcelFile(file);

            // Extract store code from filename (first 2 digits)
            const storeMatch = file.name.match(/^(\d{2})/);
            if (!storeMatch) {
                showToast(`${file.name}: 店舗コードが判定できません`, 'warning');
                continue;
            }

            const sid = String(parseInt(storeMatch[1]));
            let storeConsumables = appState.getConsumables(sid) || {};

            // Extract data for account code 81257
            for (let row = 1; row < data.length; row++) {
                const kamokuCode = String(data[row][0] || '');
                if (kamokuCode !== '81257') continue;

                const itemCode = String(data[row][1] || '');
                const itemName = String(data[row][2] || '');
                const qty = parseFloat(data[row][3]) || 0;
                const cost = parseFloat(data[row][4]) || 0;
                const dateStr = String(data[row][5] || '');

                const date = parseDate(dateStr);
                if (!date) continue;

                const day = date.getDate();

                if (!storeConsumables[day]) {
                    storeConsumables[day] = { cost: 0, items: [] };
                }

                storeConsumables[day].cost += cost;
                storeConsumables[day].items.push({ itemCode, itemName, qty, cost });
                totalCost += cost;
                newItems++;
            }

            appState.setConsumables(sid, storeConsumables);
            loadedCount++;
        } catch (err) {
            showToast(`${file.name}: ${err.message}`, 'error');
        }
    }

    if (loadedCount > 0) {
        const modeText = mode === 'overwrite' ? '上書き' : '追加';
        showToast(
            `原価算入比 ${loadedCount}ファイル${modeText} (${newItems}品/${fmt(totalCost)})`,
            'success'
        );
    }

    return {
        success: loadedCount > 0,
        loadedCount,
        totalCost,
        newItems
    };
}

/**
 * Initializes drag and drop functionality
 * @param {HTMLElement} dropZone - The drop zone element
 * @param {Function} onDrop - Callback when files are dropped
 */
export function initDropZone(dropZone, onDrop) {
    if (!dropZone) return;

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        if (onDrop) {
            await onDrop(e.dataTransfer.files);
        } else {
            await handleDroppedFiles(e.dataTransfer.files);
        }
    });

    dropZone.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.xlsx,.xls';
        input.onchange = async () => {
            if (onDrop) {
                await onDrop(input.files);
            } else {
                await handleDroppedFiles(input.files);
            }
        };
        input.click();
    });
}

/**
 * Validates that required data is loaded
 * @returns {Object} Validation results
 */
export function validateRequiredData() {
    const warnings = [];

    // Required files check
    if (!appState.hasData('shiire')) {
        warnings.push({
            type: 'error',
            msg: '仕入データがありません',
            detail: '仕入ファイルを読み込んでください'
        });
    }

    if (!appState.hasData('uriage')) {
        warnings.push({
            type: 'error',
            msg: '売上データがありません',
            detail: '売上ファイルを読み込んでください'
        });
    }

    // Store count check
    const stores = appState.getAllStores();
    const storeCount = Object.keys(stores).length;
    if (storeCount === 0) {
        warnings.push({
            type: 'warning',
            msg: '店舗が検出されません',
            detail: '仕入データの形式を確認してください'
        });
    }

    // Inventory settings check
    const invCount = Object.keys(stores).filter(sid =>
        appState.getStoreInventory(sid) !== null
    ).length;

    if (invCount === 0) {
        warnings.push({
            type: 'warning',
            msg: '在庫設定がありません',
            detail: '初期設定ファイルを読み込むか、手動で設定してください'
        });
    } else if (invCount < storeCount) {
        warnings.push({
            type: 'warning',
            msg: `一部店舗の在庫設定がありません (${invCount}/${storeCount})`,
            detail: '全店舗の期首・期末在庫を設定してください'
        });
    }

    // Budget check
    const budgetCount = Object.keys(stores).filter(sid =>
        appState.getStoreBudget(sid) !== null
    ).length;

    if (budgetCount === 0) {
        warnings.push({
            type: 'info',
            msg: '予算データがありません',
            detail: '予算ファイルを読み込むとより詳細な分析が可能です'
        });
    }

    // Baihen check
    if (!appState.hasData('baihen')) {
        warnings.push({
            type: 'info',
            msg: '売変データがありません',
            detail: '売変ファイルを読み込むと推定粗利計算が可能です'
        });
    }

    const hasErrors = warnings.filter(w => w.type === 'error').length > 0;

    return {
        isValid: !hasErrors,
        warnings,
        hasErrors,
        hasWarnings: warnings.filter(w => w.type === 'warning').length > 0,
        hasInfo: warnings.filter(w => w.type === 'info').length > 0
    };
}
