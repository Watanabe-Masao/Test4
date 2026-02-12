/**
 * Utility Helper Functions
 * 仕入粗利管理システム v8
 */

import { CATEGORIES, CALC_CONSTANTS } from '../config/constants.js';

/**
 * Parses a number from a string or number, removing formatting characters
 * @param {string|number} s - The value to parse
 * @returns {number} The parsed number, or 0 if parsing fails
 */
export function parseNum(s) {
    return parseInt(String(s).replace(/[^\d.-]/g, '')) || 0;
}

/**
 * Formats a number as a Japanese-style locale string
 * @param {number} n - The number to format
 * @returns {string} The formatted number or '-' if invalid
 */
export function fmt(n) {
    return n == null || isNaN(n) ? '-' : Math.round(n).toLocaleString('ja-JP');
}

/**
 * Formats a number as a percentage
 * @param {number} n - The number to format (as decimal, e.g., 0.25 for 25%)
 * @param {number} d - The number of decimal places (default: 2)
 * @returns {string} The formatted percentage or '-' if invalid
 */
export function fmtPct(n, d = 2) {
    return n == null || isNaN(n) ? '-' : (n * 100).toFixed(d) + '%';
}

/**
 * Formats an input field by removing non-digit characters and adding locale formatting
 * @param {HTMLInputElement} el - The input element to format
 */
export function formatInput(el) {
    let v = el.value.replace(/[^\d]/g, '');
    if (v) {
        el.value = parseInt(v).toLocaleString('ja-JP');
    }
}

/**
 * Parses a date from various formats (Excel serial, Japanese, ISO)
 * @param {string|number} v - The value to parse
 * @returns {Date|null} The parsed Date object or null if parsing fails
 */
export function parseDate(v) {
    if (!v) return null;

    // Handle Excel serial date (number)
    if (typeof v === 'number') {
        return new Date((v - CALC_CONSTANTS.EXCEL_DATE_OFFSET) * CALC_CONSTANTS.MS_PER_DAY);
    }

    const s = String(v);

    // Try Japanese date format: YYYY年M月D日
    let m = s.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if (m) {
        return new Date(+m[1], +m[2] - 1, +m[3]);
    }

    // Try ISO date format with dash: YYYY-MM-DD
    m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
        return new Date(+m[1], +m[2] - 1, +m[3]);
    }

    // Try ISO date format with slash: YYYY/MM/DD
    m = s.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (m) {
        return new Date(+m[1], +m[2] - 1, +m[3]);
    }

    return null;
}

/**
 * Gets the category order array sorted by their order values
 * @returns {string[]} Array of category keys in order
 */
export function getCatOrder() {
    return Object.entries(CATEGORIES)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([k]) => k);
}

/**
 * Shows a toast notification
 * @param {string} msg - The message to display
 * @param {'success'|'error'|'warning'|'info'} type - The type of toast
 */
export function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;

    const icon = type === 'success' ? '✓' :
                 type === 'error' ? '✕' :
                 type === 'warning' ? '⚠' : 'ℹ';

    toast.innerHTML = `<span>${icon}</span> ${msg}`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), CALC_CONSTANTS.TOAST_DURATION);
}

/**
 * Reads an Excel file and returns the data
 * @param {File} file - The file to read
 * @returns {Promise<Array>} Promise resolving to the sheet data
 */
export function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = e => {
            try {
                const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
                resolve(data);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error('ファイル読込エラー'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Debounces a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} The debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Deep clones an object
 * @param {Object} obj - The object to clone
 * @returns {Object} The cloned object
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Safely gets a nested property from an object
 * @param {Object} obj - The object to get from
 * @param {string} path - The path to the property (e.g., 'a.b.c')
 * @param {*} defaultValue - The default value if property doesn't exist
 * @returns {*} The property value or default value
 */
export function getNestedProperty(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = result[key];
        } else {
            return defaultValue;
        }
    }

    return result;
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - The value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Generates a unique ID
 * @returns {string} A unique ID string
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Formats a date to Japanese format
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string (YYYY年MM月DD日)
 */
export function formatDateJP(date) {
    if (!date || !(date instanceof Date) || isNaN(date)) return '-';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}年${month}月${day}日`;
}

/**
 * Calculates the sum of values in an array
 * @param {number[]} arr - Array of numbers
 * @returns {number} The sum
 */
export function sum(arr) {
    return arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
}

/**
 * Calculates the average of values in an array
 * @param {number[]} arr - Array of numbers
 * @returns {number} The average
 */
export function average(arr) {
    if (!arr || arr.length === 0) return 0;
    return sum(arr) / arr.length;
}

/**
 * Groups an array of objects by a key
 * @param {Array} arr - Array to group
 * @param {string|Function} key - Key to group by (property name or function)
 * @returns {Object} Grouped object
 */
export function groupBy(arr, key) {
    return arr.reduce((result, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        (result[groupKey] = result[groupKey] || []).push(item);
        return result;
    }, {});
}

/**
 * Sorts an array of objects by a key
 * @param {Array} arr - Array to sort
 * @param {string} key - Key to sort by
 * @param {boolean} ascending - Sort direction (default: true)
 * @returns {Array} Sorted array
 */
export function sortBy(arr, key, ascending = true) {
    return [...arr].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
}
