/**
 * Application State Management
 * 仕入粗利管理システム v8
 *
 * Centralizes all application state in a single managed object
 */

import { SUPPLIER_CAT_MAP, DEFAULT_SUPPLIER_SETTINGS } from '../config/constants.js';

/**
 * Application state object
 */
class AppState {
    constructor() {
        // File data
        this.DATA = {};

        // Store and supplier data
        this.STORES = {};
        this.SUPPLIERS = {};

        // Current selections
        this.currentStore = 'all';
        this.currentView = 'dashboard';

        // Calculation results
        this.result = null;
        this.validationWarnings = [];

        // Store-specific data
        this.STORE_INVENTORY = {};  // {storeId: {invStart: number, invEnd: number}}
        this.STORE_BUDGET = {};      // {storeId: {day: budget}}
        this.CONSUMABLES = {};       // {storeId: {day: {cost: number, items: []}}}

        // Supplier settings
        this.SUPPLIER_SETTINGS = { ...DEFAULT_SUPPLIER_SETTINGS };
        this.SUPPLIER_CAT_MAP = { ...SUPPLIER_CAT_MAP };

        // UI state
        this.columnConfig = null;
        this.currentTheme = 'dark';
    }

    /**
     * Resets the DATA object
     */
    resetData() {
        this.DATA = {};
    }

    /**
     * Sets data for a specific file type
     * @param {string} type - The file type
     * @param {Array} data - The file data
     */
    setData(type, data) {
        this.DATA[type] = data;
    }

    /**
     * Gets data for a specific file type
     * @param {string} type - The file type
     * @returns {Array|null} The file data or null
     */
    getData(type) {
        return this.DATA[type] || null;
    }

    /**
     * Checks if a specific data type is loaded
     * @param {string} type - The file type to check
     * @returns {boolean} True if data exists
     */
    hasData(type) {
        return !!this.DATA[type];
    }

    /**
     * Sets the current store
     * @param {string} storeId - The store ID
     */
    setCurrentStore(storeId) {
        this.currentStore = storeId;
    }

    /**
     * Gets the current store
     * @returns {string} The current store ID
     */
    getCurrentStore() {
        return this.currentStore;
    }

    /**
     * Sets the current view
     * @param {string} view - The view name
     */
    setCurrentView(view) {
        this.currentView = view;
    }

    /**
     * Gets the current view
     * @returns {string} The current view name
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Sets the calculation result
     * @param {Object} result - The calculation result
     */
    setResult(result) {
        this.result = result;
    }

    /**
     * Gets the calculation result
     * @returns {Object|null} The calculation result
     */
    getResult() {
        return this.result;
    }

    /**
     * Adds a validation warning
     * @param {Object} warning - The warning object
     */
    addValidationWarning(warning) {
        this.validationWarnings.push(warning);
    }

    /**
     * Clears all validation warnings
     */
    clearValidationWarnings() {
        this.validationWarnings = [];
    }

    /**
     * Gets all validation warnings
     * @returns {Array} Array of warnings
     */
    getValidationWarnings() {
        return this.validationWarnings;
    }

    /**
     * Sets store inventory data
     * @param {string} storeId - The store ID
     * @param {Object} inventory - Inventory data {invStart, invEnd}
     */
    setStoreInventory(storeId, inventory) {
        this.STORE_INVENTORY[storeId] = inventory;
    }

    /**
     * Gets store inventory data
     * @param {string} storeId - The store ID
     * @returns {Object|null} Inventory data or null
     */
    getStoreInventory(storeId) {
        return this.STORE_INVENTORY[storeId] || null;
    }

    /**
     * Sets store budget data
     * @param {string} storeId - The store ID
     * @param {Object} budget - Budget data by day
     */
    setStoreBudget(storeId, budget) {
        this.STORE_BUDGET[storeId] = budget;
    }

    /**
     * Gets store budget data
     * @param {string} storeId - The store ID
     * @returns {Object|null} Budget data or null
     */
    getStoreBudget(storeId) {
        return this.STORE_BUDGET[storeId] || null;
    }

    /**
     * Sets consumables data for a store
     * @param {string} storeId - The store ID
     * @param {Object} consumables - Consumables data
     */
    setConsumables(storeId, consumables) {
        this.CONSUMABLES[storeId] = consumables;
    }

    /**
     * Gets consumables data for a store
     * @param {string} storeId - The store ID
     * @returns {Object|null} Consumables data or null
     */
    getConsumables(storeId) {
        return this.CONSUMABLES[storeId] || null;
    }

    /**
     * Clears all consumables data
     */
    clearConsumables() {
        this.CONSUMABLES = {};
    }

    /**
     * Adds or updates a supplier
     * @param {string} code - Supplier code
     * @param {Object} supplier - Supplier data
     */
    setSupplier(code, supplier) {
        this.SUPPLIERS[code] = supplier;
    }

    /**
     * Gets a supplier by code
     * @param {string} code - Supplier code
     * @returns {Object|null} Supplier data or null
     */
    getSupplier(code) {
        return this.SUPPLIERS[code] || null;
    }

    /**
     * Gets all suppliers
     * @returns {Object} All suppliers
     */
    getAllSuppliers() {
        return this.SUPPLIERS;
    }

    /**
     * Adds or updates a store
     * @param {string} code - Store code
     * @param {Object} store - Store data
     */
    setStore(code, store) {
        this.STORES[code] = store;
    }

    /**
     * Gets a store by code
     * @param {string} code - Store code
     * @returns {Object|null} Store data or null
     */
    getStore(code) {
        return this.STORES[code] || null;
    }

    /**
     * Gets all stores
     * @returns {Object} All stores
     */
    getAllStores() {
        return this.STORES;
    }

    /**
     * Sets supplier settings
     * @param {string} code - Supplier code
     * @param {Object} settings - Settings object
     */
    setSupplierSettings(code, settings) {
        this.SUPPLIER_SETTINGS[code] = settings;
    }

    /**
     * Gets supplier settings
     * @param {string} code - Supplier code
     * @returns {Object|null} Settings or null
     */
    getSupplierSettings(code) {
        return this.SUPPLIER_SETTINGS[code] || null;
    }

    /**
     * Gets all supplier settings
     * @returns {Object} All supplier settings
     */
    getAllSupplierSettings() {
        return this.SUPPLIER_SETTINGS;
    }

    /**
     * Sets supplier category mapping
     * @param {string} code - Supplier code
     * @param {string} category - Category name
     */
    setSupplierCategory(code, category) {
        this.SUPPLIER_CAT_MAP[code] = category;
    }

    /**
     * Gets supplier category
     * @param {string} code - Supplier code
     * @returns {string|null} Category name or null
     */
    getSupplierCategory(code) {
        return this.SUPPLIER_CAT_MAP[code] || null;
    }

    /**
     * Gets all supplier category mappings
     * @returns {Object} All mappings
     */
    getAllSupplierCategories() {
        return this.SUPPLIER_CAT_MAP;
    }

    /**
     * Sets the current theme
     * @param {'dark'|'light'} theme - Theme name
     */
    setTheme(theme) {
        this.currentTheme = theme;
    }

    /**
     * Gets the current theme
     * @returns {'dark'|'light'} Current theme
     */
    getTheme() {
        return this.currentTheme;
    }

    /**
     * Exports the current state as a plain object
     * @returns {Object} State object
     */
    export() {
        return {
            currentStore: this.currentStore,
            currentView: this.currentView,
            currentTheme: this.currentTheme,
            STORE_INVENTORY: this.STORE_INVENTORY,
            STORE_BUDGET: this.STORE_BUDGET,
            CONSUMABLES: this.CONSUMABLES,
            SUPPLIER_SETTINGS: this.SUPPLIER_SETTINGS,
            SUPPLIER_CAT_MAP: this.SUPPLIER_CAT_MAP,
            STORES: this.STORES,
            SUPPLIERS: this.SUPPLIERS
        };
    }

    /**
     * Imports state from a plain object
     * @param {Object} stateObj - State object to import
     */
    import(stateObj) {
        if (stateObj.currentStore) this.currentStore = stateObj.currentStore;
        if (stateObj.currentView) this.currentView = stateObj.currentView;
        if (stateObj.currentTheme) this.currentTheme = stateObj.currentTheme;
        if (stateObj.STORE_INVENTORY) this.STORE_INVENTORY = stateObj.STORE_INVENTORY;
        if (stateObj.STORE_BUDGET) this.STORE_BUDGET = stateObj.STORE_BUDGET;
        if (stateObj.CONSUMABLES) this.CONSUMABLES = stateObj.CONSUMABLES;
        if (stateObj.SUPPLIER_SETTINGS) this.SUPPLIER_SETTINGS = stateObj.SUPPLIER_SETTINGS;
        if (stateObj.SUPPLIER_CAT_MAP) this.SUPPLIER_CAT_MAP = stateObj.SUPPLIER_CAT_MAP;
        if (stateObj.STORES) this.STORES = stateObj.STORES;
        if (stateObj.SUPPLIERS) this.SUPPLIERS = stateObj.SUPPLIERS;
    }

    /**
     * Resets the entire state to initial values
     */
    reset() {
        this.DATA = {};
        this.STORES = {};
        this.SUPPLIERS = {};
        this.currentStore = 'all';
        this.currentView = 'dashboard';
        this.result = null;
        this.validationWarnings = [];
        this.STORE_INVENTORY = {};
        this.STORE_BUDGET = {};
        this.CONSUMABLES = {};
        this.SUPPLIER_SETTINGS = { ...DEFAULT_SUPPLIER_SETTINGS };
        this.SUPPLIER_CAT_MAP = { ...SUPPLIER_CAT_MAP };
        this.columnConfig = null;
        this.currentTheme = 'dark';
    }
}

// Create and export a singleton instance
export const appState = new AppState();
export default appState;
