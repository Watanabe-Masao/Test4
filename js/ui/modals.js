/**
 * Modal Management Module
 * Handles all modal dialogs in the application
 * @version 2.0.1 - Fixed quote escaping and global exports
 */

import { appState } from '../models/state.js';
import { CATEGORIES } from '../config/constants.js';
import { fmt, showToast } from '../utils/helpers.js';
import { exportSettingsToFile, importSettingsFromObject, clearAllSettings } from '../services/storageService.js';

/**
 * Shows the consumable modal
 */
export function showConsumableModal() {
    updateConsumableStatus();
    const modal = document.getElementById('consumable-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Closes the consumable modal
 */
export function closeConsumableModal() {
    const modal = document.getElementById('consumable-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Updates consumable status display
 */
function updateConsumableStatus() {
    const countEl = document.getElementById('consumable-count');
    if (!countEl) return;

    const consumables = {};
    const stores = appState.getAllStores();

    // Collect all consumables data
    Object.keys(stores).forEach(storeId => {
        const storeConsumables = appState.getConsumables(storeId);
        if (storeConsumables) {
            consumables[storeId] = storeConsumables;
        }
    });

    const storeCount = Object.keys(consumables).length;

    if (storeCount === 0) {
        countEl.innerHTML = '未読込';
        return;
    }

    let totalCost = 0;
    let totalItems = 0;

    Object.values(consumables).forEach(storeDays => {
        Object.values(storeDays).forEach(day => {
            totalCost += day.cost;
            totalItems += day.items.length;
        });
    });

    countEl.innerHTML = `${storeCount}店舗 / ${totalItems}品目 / <span style="color:#f97316">${fmt(totalCost)}円</span>`;
}

/**
 * Shows the supplier settings modal
 */
export function showSupplierSettingsModal() {
    updateSupplierSettingsUI();
    const modal = document.getElementById('supplier-settings-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Closes the supplier settings modal
 */
export function closeSupplierSettingsModal() {
    const modal = document.getElementById('supplier-settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Updates supplier settings UI
 */
function updateSupplierSettingsUI() {
    const container = document.getElementById('supplier-settings-content');
    if (!container) return;

    const suppliers = appState.getAllSuppliers();
    const supCodes = Object.keys(suppliers).sort();

    if (supCodes.length === 0) {
        container.innerHTML = '<div style="font-size:0.65rem;color:var(--text4);padding:16px;text-align:center">仕入データ読込後に表示されます</div>';
        return;
    }

    let html = '<table style="width:100%;font-size:0.68rem;border-collapse:collapse">';
    html += '<thead><tr style="background:var(--bg4);position:sticky;top:0">';
    html += '<th style="padding:8px;text-align:left">コード</th>';
    html += '<th style="padding:8px;text-align:left">仕入先名</th>';
    html += '<th style="padding:8px;text-align:center">帳合分類</th>';
    html += '<th style="padding:8px;text-align:center">売価計算</th>';
    html += '<th style="padding:8px;text-align:center">値入率</th>';
    html += '</tr></thead><tbody>';

    supCodes.forEach(code => {
        const sup = suppliers[code];
        const setting = appState.getSupplierSettings(code) || {};
        const currentCat = appState.getSupplierCategory(code) || 'other';
        const usePriceCalc = setting.usePriceCalc || false;
        const marginRate = setting.marginRate || 0.26;

        html += '<tr style="border-bottom:1px solid var(--border)">';
        html += `<td style="padding:6px;font-family:\'JetBrains Mono\',monospace;color:var(--text3)">${code}</td>`;
        html += `<td style="padding:6px">${sup.name}</td>`;
        html += `<td style="padding:6px"><select data-code="${code}" data-field="cat" style="width:100%;padding:4px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text);font-size:0.65rem">`;

        Object.entries(CATEGORIES).forEach(([k, v]) => {
            html += `<option value="${k}"${k === currentCat ? ' selected' : ''}>${v.icon} ${v.name}</option>`;
        });

        html += '</select></td>';
        html += `<td style="padding:6px;text-align:center"><label style="display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer">`;
        html += `<input type="checkbox" data-code="${code}" data-field="usePriceCalc" ${usePriceCalc ? 'checked' : ''} style="accent-color:var(--primary)">`;
        html += '<span style="font-size:0.6rem;color:var(--text3)">値入率から算出</span></label></td>';
        html += `<td style="padding:6px"><input type="text" data-code="${code}" data-field="marginRate" value="${marginRate}" `;
        html += `style="width:60px;padding:4px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text);font-family:\'JetBrains Mono\',monospace;font-size:0.65rem;text-align:center" ${usePriceCalc ? '' : 'disabled'}></td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    html += '<div style="margin-top:12px;padding:10px;background:var(--bg4);border-radius:6px;font-size:0.6rem;color:var(--text3)">';
    html += '<strong>💡 売価計算について:</strong><br>';
    html += '「値入率から算出」にチェックを入れると、仕入ファイルの売価を無視し、原価÷(1-値入率)で売価を再計算します。<br>';
    html += '（例: 0074721 あさくらセンタの売価が仮の場合に使用）';
    html += '</div>';

    container.innerHTML = html;

    // Add event listeners for checkbox changes
    container.querySelectorAll('input[data-field="usePriceCalc"]').forEach(cb => {
        cb.addEventListener('change', e => {
            const code = e.target.dataset.code;
            const marginInput = container.querySelector(`input[data-code="${code}"][data-field="marginRate"]`);
            if (marginInput) {
                marginInput.disabled = !e.target.checked;
            }
        });
    });
}

/**
 * Saves supplier settings from modal
 */
export function saveSupplierSettings() {
    const container = document.getElementById('supplier-settings-content');
    if (!container) return;

    // Update category mappings
    container.querySelectorAll('select[data-field="cat"]').forEach(sel => {
        const code = sel.dataset.code;
        appState.setSupplierCategory(code, sel.value);

        const supplier = appState.getSupplier(code);
        if (supplier) {
            supplier.cat = sel.value;
            appState.setSupplier(code, supplier);
        }
    });

    // Update supplier settings
    container.querySelectorAll('input[data-field="usePriceCalc"]').forEach(cb => {
        const code = cb.dataset.code;
        const marginInput = container.querySelector(`input[data-code="${code}"][data-field="marginRate"]`);

        const settings = {
            usePriceCalc: cb.checked,
            marginRate: parseFloat(marginInput?.value) || 0.26
        };

        appState.setSupplierSettings(code, settings);
    });

    closeSupplierSettingsModal();
    showToast('仕入先設定を保存しました', 'success');
}

/**
 * Shows the settings modal
 */
export function showSettingsModal() {
    renderSettingsContent();
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Closes the settings modal
 */
export function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Renders settings modal content
 */
function renderSettingsContent() {
    const container = document.getElementById('settings-content');
    if (!container) return;

    const currentTheme = appState.getTheme();

    container.innerHTML = `
        <div style="margin-bottom:20px">
            <div style="font-size:0.8rem;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px">📊 目標設定</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <div style="background:var(--bg3);padding:10px;border-radius:7px">
                    <label style="display:block;font-size:0.6rem;color:var(--text4);margin-bottom:4px">目標粗利率 (%)</label>
                    <input type="number" id="set-target-margin" value="${document.getElementById('target-margin')?.value || 25.00}" step="0.01" style="width:100%;padding:6px;background:var(--bg4);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:\'JetBrains Mono\',monospace;font-size:0.8rem">
                </div>
                <div style="background:var(--bg3);padding:10px;border-radius:7px">
                    <label style="display:block;font-size:0.6rem;color:var(--text4);margin-bottom:4px">警告しきい値 (%)</label>
                    <input type="number" id="set-warning-margin" value="${document.getElementById('warning-margin')?.value || 23.00}" step="0.01" style="width:100%;padding:6px;background:var(--bg4);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:\'JetBrains Mono\',monospace;font-size:0.8rem">
                </div>
            </div>
        </div>
        <div style="margin-bottom:20px">
            <div style="font-size:0.8rem;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px">🌸 売上納品掛率</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <div style="background:var(--bg3);padding:10px;border-radius:7px">
                    <label style="display:block;font-size:0.6rem;color:var(--text4);margin-bottom:4px">花 掛け率</label>
                    <input type="number" id="set-hana-rate" value="${document.getElementById('hana-rate')?.value || 0.80}" step="0.01" style="width:100%;padding:6px;background:var(--bg4);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:\'JetBrains Mono\',monospace;font-size:0.8rem">
                </div>
                <div style="background:var(--bg3);padding:10px;border-radius:7px">
                    <label style="display:block;font-size:0.6rem;color:var(--text4);margin-bottom:4px">産直 掛け率</label>
                    <input type="number" id="set-sanchoku-rate" value="${document.getElementById('sanchoku-rate')?.value || 0.85}" step="0.01" style="width:100%;padding:6px;background:var(--bg4);border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:\'JetBrains Mono\',monospace;font-size:0.8rem">
                </div>
            </div>
        </div>
        <div style="margin-bottom:20px">
            <div style="font-size:0.8rem;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px">🎨 表示設定</div>
            <div style="background:var(--bg3);padding:12px;border-radius:7px;display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-size:0.75rem;font-weight:500">テーマ</div>
                    <div style="font-size:0.6rem;color:var(--text4)">ダーク / ライト</div>
                </div>
                <select id="set-theme" style="padding:6px 12px;background:var(--bg4);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:0.75rem">
                    <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>🌙 ダーク</option>
                    <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>☀️ ライト</option>
                </select>
            </div>
        </div>
        <div style="margin-bottom:20px">
            <div style="font-size:0.8rem;font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:6px">💾 データ管理</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <button onclick="window.exportSettingsClick()" style="padding:10px;background:var(--bg3);border:1px solid var(--border);border-radius:7px;color:var(--text2);font-size:0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">📤 設定エクスポート</button>
                <button onclick="document.getElementById('import-settings').click()" style="padding:10px;background:var(--bg3);border:1px solid var(--border);border-radius:7px;color:var(--text2);font-size:0.7rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">📥 設定インポート</button>
                <input type="file" id="import-settings" accept=".json" style="display:none">
            </div>
            <button onclick="window.clearAllSettingsClick()" style="width:100%;margin-top:8px;padding:10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:7px;color:var(--danger);font-size:0.7rem;cursor:pointer">🗑️ 全設定をリセット</button>
        </div>
    `;
}

/**
 * Saves all settings from modal
 */
export function saveAllSettings() {
    const targetMargin = document.getElementById('set-target-margin')?.value;
    const warningMargin = document.getElementById('set-warning-margin')?.value;
    const hanaRate = document.getElementById('set-hana-rate')?.value;
    const sanchokuRate = document.getElementById('set-sanchoku-rate')?.value;
    const theme = document.getElementById('set-theme')?.value;

    if (targetMargin) document.getElementById('target-margin').value = targetMargin;
    if (warningMargin) document.getElementById('warning-margin').value = warningMargin;
    if (hanaRate) document.getElementById('hana-rate').value = hanaRate;
    if (sanchokuRate) document.getElementById('sanchoku-rate').value = sanchokuRate;

    if (theme) {
        appState.setTheme(theme);
        document.documentElement.setAttribute('data-theme', theme);
        const btn = document.getElementById('theme-toggle');
        if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    closeSettingsModal();
    showToast('設定を保存しました', 'success');
}

/**
 * Shows the validation modal
 * @param {Array} warnings - Validation warnings
 */
export function showValidationModal(warnings) {
    const container = document.getElementById('validation-content');
    if (!container) return;

    let html = '<div style="display:flex;flex-direction:column;gap:8px">';

    if (warnings.length === 0) {
        html += '<div style="text-align:center;padding:24px;color:var(--success)">';
        html += '<div style="font-size:2rem;margin-bottom:8px">✅</div>';
        html += '<div style="font-weight:600">全てのチェックをパスしました</div>';
        html += '</div>';
    } else {
        warnings.forEach(w => {
            const color = w.type === 'error' ? 'var(--danger)' :
                         w.type === 'warning' ? 'var(--warning)' : 'var(--info)';
            const icon = w.type === 'error' ? '❌' :
                        w.type === 'warning' ? '⚠️' : 'ℹ️';

            html += `<div style="padding:12px;background:var(--bg3);border-radius:8px;border-left:3px solid ${color}">`;
            html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">`;
            html += `<span>${icon}</span>`;
            html += `<span style="font-weight:600;color:${color}">${w.msg}</span>`;
            html += '</div>';
            html += `<div style="font-size:0.7rem;color:var(--text3);margin-left:24px">${w.detail}</div>`;
            html += '</div>';
        });
    }

    html += '</div>';
    container.innerHTML = html;

    const modal = document.getElementById('validation-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Closes the validation modal
 */
export function closeValidationModal() {
    const modal = document.getElementById('validation-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Setup global functions for modal callbacks
 */
export function setupModalGlobalFunctions() {
    // Export modal functions to global scope for HTML onclick handlers
    window.showSettingsModal = showSettingsModal;
    window.closeSettingsModal = closeSettingsModal;
    window.saveAllSettings = saveAllSettings;
    window.showSupplierSettingsModal = showSupplierSettingsModal;
    window.closeSupplierSettingsModal = closeSupplierSettingsModal;
    window.saveSupplierSettings = saveSupplierSettings;

    window.exportSettingsClick = () => {
        const settings = exportSettingsToFile();
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shiire_settings_' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('設定をエクスポートしました', 'success');
    };

    window.clearAllSettingsClick = () => {
        clearAllSettings(true);
        closeSettingsModal();
    };

    // Import settings file handler
    const importInput = document.getElementById('import-settings');
    if (importInput) {
        importInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const settings = JSON.parse(ev.target.result);
                    importSettingsFromObject(settings);
                    renderSettingsContent();
                    showToast('設定をインポートしました', 'success');
                } catch (err) {
                    showToast('インポートエラー: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }
}
