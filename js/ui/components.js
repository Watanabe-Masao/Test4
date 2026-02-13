/**
 * UI Components Module
 * Reusable UI component generators
 */

import { appState } from '../models/state.js';
import { fmt, parseNum } from '../utils/helpers.js';

/**
 * Updates store selection chips
 */
export function updateStoreChips() {
    const container = document.getElementById('store-chips');
    if (!container) return;

    const stores = appState.getAllStores();
    let html = '<div class="chip active" data-store="all">全店舗</div>';

    Object.entries(stores)
        .sort((a, b) => +a[0] - +b[0])
        .forEach(([id]) => {
            html += `<div class="chip" data-store="${id}">${id.padStart(2, '0')}</div>`;
        });

    container.innerHTML = html;
}

/**
 * Updates store inventory UI
 */
export function updateStoreInventoryUI() {
    const container = document.getElementById('store-inventory-container');
    if (!container) return;

    const stores = appState.getAllStores();
    const storeIds = Object.keys(stores).sort((a, b) => +a - +b);

    if (storeIds.length === 0) {
        container.innerHTML = '<div style="font-size:0.65rem;color:var(--text4);padding:8px;text-align:center">店舗データ読込後に表示</div>';
        return;
    }

    let html = '<table style="width:100%;font-size:0.62rem;border-collapse:collapse">';
    html += '<thead><tr style="background:var(--bg4)">';
    html += '<th style="padding:4px;text-align:left">店舗</th>';
    html += '<th style="padding:4px;text-align:right">期首在庫</th>';
    html += '<th style="padding:4px;text-align:right">期末在庫</th>';
    html += '</tr></thead><tbody>';

    storeIds.forEach(sid => {
        const store = stores[sid];
        const inv = appState.getStoreInventory(sid) || { invStart: 0, invEnd: 0 };

        html += '<tr style="border-bottom:1px solid var(--border)">';
        html += `<td style="padding:4px;color:var(--text2)">${sid.padStart(2, '0')} ${store?.name || ''}</td>`;
        html += `<td style="padding:2px"><input type="text" class="inv-input" data-store="${sid}" data-type="start" value="${fmt(inv.invStart)}" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:3px 5px;color:var(--text);font-family:\'JetBrains Mono\',monospace;font-size:0.62rem;text-align:right"></td>`;
        html += `<td style="padding:2px"><input type="text" class="inv-input" data-store="${sid}" data-type="end" value="${fmt(inv.invEnd)}" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:3px 5px;color:var(--text);font-family:\'JetBrains Mono\',monospace;font-size:0.62rem;text-align:right"></td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Add event listeners for inventory inputs
    container.querySelectorAll('.inv-input').forEach(input => {
        input.addEventListener('change', updateStoreInventory);
    });
}

/**
 * Updates store inventory when input changes
 * @param {Event} event - Change event
 */
function updateStoreInventory(event) {
    const input = event.target;
    const storeId = input.dataset.store;
    const type = input.dataset.type;
    const value = parseNum(input.value);

    const inv = appState.getStoreInventory(storeId) || { invStart: 0, invEnd: 0 };

    if (type === 'start') {
        inv.invStart = value;
    } else {
        inv.invEnd = value;
    }

    appState.setStoreInventory(storeId, inv);
    input.value = fmt(value);
}

/**
 * Creates a KPI card element
 * @param {Object} config - KPI card configuration
 * @returns {string} HTML string
 */
export function createKPICard(config) {
    const {
        label,
        value,
        sub,
        color = 'primary',
        icon = '',
        progress = null
    } = config;

    let html = `<div class="kpi-card" data-color="${color}">`;
    html += '<div class="kpi-header">';
    html += `<div class="kpi-label">${label}</div>`;
    if (icon) html += `<div class="kpi-icon">${icon}</div>`;
    html += '</div>';
    html += `<div class="kpi-value">${value}</div>`;
    if (sub) html += `<div class="kpi-sub">${sub}</div>`;

    if (progress !== null) {
        html += '<div class="kpi-progress">';
        html += `<div class="kpi-progress-bar" style="width:${progress}%;background:var(--${color})"></div>`;
        html += '</div>';
    }

    html += '</div>';
    return html;
}

/**
 * Creates an alert card
 * @param {string} type - Alert type (danger, warning, success, info)
 * @param {string} title - Alert title
 * @param {string} description - Alert description
 * @param {string} icon - Alert icon (optional)
 * @returns {string} HTML string
 */
export function createAlertCard(type, title, description, icon = '') {
    const iconMap = {
        danger: '❌',
        warning: '⚠️',
        success: '✅',
        info: 'ℹ️'
    };

    const alertIcon = icon || iconMap[type] || 'ℹ️';

    return `
        <div class="alert-card ${type}">
            <div class="alert-icon">${alertIcon}</div>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-desc">${description}</div>
            </div>
        </div>
    `;
}

/**
 * Creates a stat card
 * @param {Object} config - Stat card configuration
 * @returns {string} HTML string
 */
export function createStatCard(config) {
    const { label, value, sub } = config;

    return `
        <div class="stat-card">
            <div class="label">${label}</div>
            <div class="value">${value}</div>
            ${sub ? `<div class="sub">${sub}</div>` : ''}
        </div>
    `;
}

/**
 * Creates a summary card
 * @param {Object} config - Summary card configuration
 * @returns {string} HTML string
 */
export function createSummaryCard(config) {
    const { type, label, value, sub } = config;

    return `
        <div class="summary-card ${type}">
            <div class="sc-label">${label}</div>
            <div class="sc-value">${value}</div>
            ${sub ? `<div class="sc-sub">${sub}</div>` : ''}
        </div>
    `;
}

/**
 * Creates a store tag
 * @param {string} storeId - Store ID
 * @param {string} type - Tag type (from, to, bumon)
 * @returns {string} HTML string
 */
export function createStoreTag(storeId, type = 'from') {
    const stores = appState.getAllStores();
    const store = stores[storeId];
    const storeName = store?.name || storeId;

    return `<span class="store-tag ${type}">${storeId.padStart(2, '0')} ${storeName}</span>`;
}

/**
 * Creates an empty state element
 * @param {string} icon - Icon emoji
 * @param {string} title - Title text
 * @param {string} description - Description text
 * @returns {string} HTML string
 */
export function createEmptyState(icon, title, description) {
    return `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <h3>${title}</h3>
            <p>${description}</p>
        </div>
    `;
}

/**
 * Creates a loading state element
 * @param {string} message - Loading message
 * @returns {string} HTML string
 */
export function createLoadingState(message = 'データ処理中...') {
    return `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Creates a section header
 * @param {Object} config - Section configuration
 * @returns {string} HTML string
 */
export function createSectionHeader(config) {
    const { icon, name, meta, cost, price, expanded = false } = config;

    return `
        <div class="section${expanded ? ' expanded' : ''}">
            <div class="section-header">
                <div class="section-icon ${icon}">${config.iconEmoji || ''}</div>
                <div class="section-info">
                    <div class="section-name">${name}</div>
                    ${meta ? `<div class="section-meta">${meta}</div>` : ''}
                </div>
                ${cost !== undefined ? `
                    <div class="section-stats">
                        <span class="sl">原価</span> <span class="cost">${fmt(cost)}</span>
                        <span class="sl">売価</span> <span class="price">${fmt(price)}</span>
                    </div>
                ` : ''}
                <div class="section-toggle">▼</div>
            </div>
            <div class="section-body">
                ${config.body || ''}
            </div>
        </div>
    `;
}

/**
 * Creates a table from data
 * @param {Array} headers - Table headers
 * @param {Array} rows - Table rows
 * @param {Object} options - Table options
 * @returns {string} HTML string
 */
export function createTable(headers, rows, options = {}) {
    const { className = '', stickyHeader = true } = options;

    let html = `<table class="${className}">`;

    // Headers
    if (headers.length > 0) {
        html += '<thead><tr>';
        headers.forEach((header, index) => {
            const align = index === 0 ? 'left' : (header.align || 'right');
            html += `<th style="text-align:${align}">${header.label || header}</th>`;
        });
        html += '</tr></thead>';
    }

    // Body
    html += '<tbody>';
    rows.forEach(row => {
        const rowClass = row.isTotal ? ' class="row-total"' : '';
        html += `<tr${rowClass}>`;

        row.cells.forEach((cell, index) => {
            const align = index === 0 ? 'left' : 'right';
            const className = cell.className || '';
            const value = cell.value !== undefined ? cell.value : cell;

            html += `<td style="text-align:${align}" class="${className}">${value}</td>`;
        });

        html += '</tr>';
    });
    html += '</tbody></table>';

    return html;
}

/**
 * Updates the generate button state
 * @param {boolean} enabled - Whether button should be enabled
 */
export function updateGenerateButton(enabled) {
    const generateBtn = document.getElementById('btn-generate');
    const spreadsheetBtn = document.getElementById('btn-spreadsheet');

    if (generateBtn) {
        generateBtn.disabled = !enabled;
    }
    if (spreadsheetBtn) {
        spreadsheetBtn.disabled = !enabled;
    }
}

/**
 * Shows/hides the export button
 * @param {boolean} show - Whether to show the button
 */
export function toggleExportButton(show) {
    const btn = document.getElementById('btn-export');
    if (btn) {
        btn.style.display = show ? 'block' : 'none';
    }
}

/**
 * Updates view tabs visibility and state
 * @param {boolean} show - Whether to show tabs
 * @param {string} activeView - Active view name
 */
export function updateViewTabs(show, activeView = 'dashboard') {
    const tabs = document.getElementById('view-tabs');
    if (tabs) {
        tabs.style.display = show ? 'flex' : 'none';

        if (show) {
            tabs.querySelectorAll('.topbar-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === activeView);
            });
        }
    }
}

/**
 * Updates stats row visibility
 * @param {boolean} show - Whether to show stats
 */
export function updateStatsRow(show) {
    const statsRow = document.getElementById('stats-row');
    if (statsRow) {
        statsRow.style.display = show ? 'grid' : 'none';
    }
}

/**
 * Updates view title
 * @param {string} title - Title text
 */
export function updateViewTitle(title) {
    const titleEl = document.getElementById('view-title');
    if (titleEl) {
        titleEl.textContent = title;
    }
}

/**
 * Updates store badge
 * @param {string} storeId - Store ID (or 'all')
 */
export function updateStoreBadge(storeId) {
    const badge = document.getElementById('store-badge');
    if (!badge) return;

    if (storeId === 'all') {
        badge.style.display = 'none';
    } else {
        badge.textContent = storeId.padStart(2, '0');
        badge.style.display = 'inline-block';
    }
}
