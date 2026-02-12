/**
 * Storage Service
 * Handles LocalStorage operations for settings persistence
 */

import { appState } from '../models/state.js';
import { STORAGE_KEY, DEFAULT_CONFIG } from '../config/constants.js';
import { showToast } from '../utils/helpers.js';

/**
 * Saves settings to LocalStorage
 * @param {Object} additionalSettings - Additional settings to save
 */
export function saveSettings(additionalSettings = {}) {
    try {
        const settings = {
            theme: appState.getTheme(),
            supplierSettings: appState.getAllSupplierSettings(),
            supplierCatMap: appState.getAllSupplierCategories(),
            ...additionalSettings
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        return true;
    } catch (e) {
        console.warn('設定保存エラー:', e);
        showToast('設定の保存に失敗しました', 'error');
        return false;
    }
}

/**
 * Loads settings from LocalStorage
 * @returns {Object|null} Loaded settings or null
 */
export function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;

        const settings = JSON.parse(saved);
        return settings;
    } catch (e) {
        console.warn('設定読込エラー:', e);
        return null;
    }
}

/**
 * Applies loaded settings to application state
 * @param {Object} settings - Settings to apply
 */
export function applySettings(settings) {
    if (!settings) return;

    // Apply theme
    if (settings.theme) {
        appState.setTheme(settings.theme);
        applyTheme(settings.theme);
    }

    // Apply supplier settings
    if (settings.supplierSettings) {
        Object.entries(settings.supplierSettings).forEach(([code, setting]) => {
            appState.setSupplierSettings(code, setting);
        });
    }

    // Apply supplier category mappings
    if (settings.supplierCatMap) {
        Object.entries(settings.supplierCatMap).forEach(([code, cat]) => {
            appState.setSupplierCategory(code, cat);
        });
    }

    showToast('保存された設定を復元しました', 'info');
}

/**
 * Applies theme to document
 * @param {string} theme - Theme name ('dark' or 'light')
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

/**
 * Toggles between dark and light theme
 * @returns {string} New theme
 */
export function toggleTheme() {
    const currentTheme = appState.getTheme();
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    appState.setTheme(newTheme);
    applyTheme(newTheme);
    saveSettings();

    return newTheme;
}

/**
 * Clears all settings from LocalStorage
 * @param {boolean} confirm - Whether to skip confirmation
 * @returns {boolean} Success status
 */
export function clearAllSettings(confirm = true) {
    if (confirm && !window.confirm('全ての設定をリセットしますか？')) {
        return false;
    }

    try {
        localStorage.removeItem(STORAGE_KEY);
        appState.reset();

        showToast('設定をリセットしました', 'info');
        return true;
    } catch (e) {
        console.warn('設定削除エラー:', e);
        showToast('設定の削除に失敗しました', 'error');
        return false;
    }
}

/**
 * Gets a specific setting value from UI
 * @param {string} elementId - Element ID
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Setting value
 */
export function getSettingValue(elementId, defaultValue = null) {
    const el = document.getElementById(elementId);
    return el ? el.value : defaultValue;
}

/**
 * Sets a setting value in UI
 * @param {string} elementId - Element ID
 * @param {*} value - Value to set
 */
export function setSettingValue(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) {
        el.value = value;
    }
}

/**
 * Collects all settings from UI
 * @returns {Object} Settings object
 */
export function collectUISettings() {
    return {
        targetMargin: getSettingValue('target-margin', DEFAULT_CONFIG.targetMargin),
        warningMargin: getSettingValue('warning-margin', DEFAULT_CONFIG.warningMargin),
        hanaRate: getSettingValue('hana-rate', DEFAULT_CONFIG.hanaRate),
        sanchokuRate: getSettingValue('sanchoku-rate', DEFAULT_CONFIG.sanchokuRate),
        marginRate: getSettingValue('margin-rate', DEFAULT_CONFIG.marginRate),
        budget: getSettingValue('budget', DEFAULT_CONFIG.defaultBudget)
    };
}

/**
 * Applies UI settings from object
 * @param {Object} settings - Settings to apply
 */
export function applyUISettings(settings) {
    if (settings.targetMargin) setSettingValue('target-margin', settings.targetMargin);
    if (settings.warningMargin) setSettingValue('warning-margin', settings.warningMargin);
    if (settings.hanaRate) setSettingValue('hana-rate', settings.hanaRate);
    if (settings.sanchokuRate) setSettingValue('sanchoku-rate', settings.sanchokuRate);
    if (settings.marginRate) setSettingValue('margin-rate', settings.marginRate);
    if (settings.budget) setSettingValue('budget', settings.budget);
}

/**
 * Saves all current settings (UI + State)
 * @returns {boolean} Success status
 */
export function saveAllSettings() {
    const uiSettings = collectUISettings();
    return saveSettings(uiSettings);
}

/**
 * Loads and applies all settings
 */
export function loadAndApplyAllSettings() {
    const settings = loadSettings();
    if (settings) {
        applySettings(settings);
        applyUISettings(settings);
    }
}

/**
 * Exports current settings as downloadable file
 * @returns {Object} Settings object
 */
export function exportSettingsToFile() {
    const settings = {
        version: 'v8',
        exportDate: new Date().toISOString(),
        theme: appState.getTheme(),
        ...collectUISettings(),
        supplierSettings: appState.getAllSupplierSettings(),
        supplierCatMap: appState.getAllSupplierCategories()
    };

    return settings;
}

/**
 * Imports settings from object
 * @param {Object} settings - Settings object
 */
export function importSettingsFromObject(settings) {
    if (!settings) return;

    applySettings(settings);
    applyUISettings(settings);
    saveSettings(settings);
}
