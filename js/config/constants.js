/**
 * Configuration Constants
 * 仕入粗利管理システム v8
 */

/**
 * Category definitions for suppliers
 */
export const CATEGORIES = {
    market: {
        name: '市場',
        icon: '🏪',
        order: 1
    },
    lfc: {
        name: 'LFC',
        icon: '🚚',
        order: 2
    },
    salad: {
        name: 'サラダクラブ',
        icon: '🥗',
        order: 3
    },
    kakou: {
        name: '加工品',
        icon: '📦',
        order: 4
    },
    chokuden: {
        name: '直伝',
        icon: '🍜',
        order: 5
    },
    hana: {
        name: '花',
        icon: '🌸',
        order: 6
    },
    sanchoku: {
        name: '産直',
        icon: '🥬',
        order: 7
    },
    consumable: {
        name: '原価算入比',
        icon: '🧾',
        order: 7.5
    },
    tenkan: {
        name: '店間移動',
        icon: '🔄',
        order: 8
    },
    bumonkan: {
        name: '部門間移動',
        icon: '🔀',
        order: 9
    },
    other: {
        name: 'その他',
        icon: '📋',
        order: 99
    }
};

/**
 * Supplier to category mapping
 * Maps supplier codes to their corresponding categories
 */
export const SUPPLIER_CAT_MAP = {
    '0074721': 'market',
    '0012104': 'lfc',
    '0012072': 'lfc',
    '0017175': 'salad',
    '0030627': 'kakou',
    '0030344': 'kakou',
    '0044121': 'kakou',
    '0074017': 'kakou',
    '0074088': 'chokuden',
    '0076511': 'chokuden',
    '0017426': 'other',
    '0017663': 'other',
    '0074508': 'other',
    '0075825': 'hana',
    '0076686': 'hana',
    '0037923': 'hana',
    '0011002': 'other'
};

/**
 * Default supplier settings
 * Note: 0074721 uses margin rate calculation because its selling price is provisional
 */
export const DEFAULT_SUPPLIER_SETTINGS = {
    '0074721': {
        marginRate: 0.26,
        usePriceCalc: true
    }
};

/**
 * File type definitions for automatic detection
 */
export const FILE_TYPES = {
    shiire: {
        name: '仕入',
        patterns: ['仕入', 'shiire'],
        headerPatterns: ['取引先コード', '原価金額', '売価金額']
    },
    uriageBaihen: {
        name: '売上・売変',
        patterns: ['売上', 'uriage', '売変', 'baihen'],
        headerPatterns: ['販売金額', '売上', '売変合計']
    },
    settings: {
        name: '初期設定',
        patterns: ['初期', '設定', 'setting'],
        headerPatterns: ['期首', '期末', '在庫']
    },
    budget: {
        name: '予算',
        patterns: ['予算', 'budget'],
        headerPatterns: ['予算']
    },
    tenkanIn: {
        name: '店間入',
        patterns: ['店間入', '入庫'],
        headerPatterns: ['店舗コードIN']
    },
    tenkanOut: {
        name: '店間出',
        patterns: ['店間出', '出庫'],
        headerPatterns: ['店舗コードOUT']
    },
    hana: {
        name: '花',
        patterns: ['花', 'hana'],
        headerPatterns: ['販売金額']
    },
    sanchoku: {
        name: '産直',
        patterns: ['産直', 'sanchoku'],
        headerPatterns: ['販売金額']
    }
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
    targetMargin: '25.00',
    warningMargin: '23.00',
    hanaRate: '0.80',
    sanchokuRate: '0.85',
    marginRate: '0.26',
    defaultBudget: '6,450,000'
};

/**
 * LocalStorage key for settings
 */
export const STORAGE_KEY = 'shiire_settings_v8';

/**
 * Calculation constants
 */
export const CALC_CONSTANTS = {
    /** Excel date offset for converting Excel serial dates */
    EXCEL_DATE_OFFSET: 25569,

    /** Milliseconds per day */
    MS_PER_DAY: 86400000,

    /** Toast notification display duration (ms) */
    TOAST_DURATION: 3200,

    /** Toast animation delay before fade out (ms) */
    TOAST_FADE_DELAY: 2700
};

/**
 * View types available in the application
 */
export const VIEW_TYPES = {
    DASHBOARD: 'dashboard',
    CATEGORY: 'category',
    FORECAST: 'forecast',
    ANALYSIS: 'analysis',
    DAILY: 'daily',
    SUPPLIER: 'supplier',
    SUMMARY: 'summary',
    REPORTS: 'reports'
};

/**
 * Store selection constants
 */
export const STORE_CONSTANTS = {
    ALL_STORES: 'all'
};
