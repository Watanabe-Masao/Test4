/**
 * @file スプレッドシートビュー v2 - 洗練版
 * @description 帳合先×日付のスプレッドシート形式UI（データ連携強化版）
 */

import { query } from '../services/database/queryBuilder.js';
import { appState } from '../models/state.js';
import { formatNumber, formatDate } from '../utils/helpers.js';

/**
 * スプレッドシートビュークラス v2
 */
export class SpreadsheetView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.startDate = null;
    this.endDate = null;
    this.selectedStore = null;
    this.data = null;
    this.sortColumn = null;
    this.sortDirection = 'desc';
    this.searchQuery = '';
  }

  /**
   * 初期化
   */
  async initialize(startDate, endDate, storeId = null) {
    if (!this.container) {
      console.error('Spreadsheet container not found');
      return;
    }

    // デフォルト日付設定
    this.startDate = startDate || this._getDefaultStartDate();
    this.endDate = endDate || this._getDefaultEndDate();
    this.selectedStore = storeId || appState.getCurrentStore() || 'all';

    await this.render();
  }

  /**
   * レンダリング
   */
  async render() {
    this.container.innerHTML = this._createLoadingState();

    try {
      // データをロード
      await this.loadData();

      // UI構築
      const html = `
        <div class="spreadsheet-view-v2">
          ${this._createKPICards()}
          ${this._createToolbar()}
          ${this._createSpreadsheet()}
        </div>
      `;

      this.container.innerHTML = html;
      this._attachEventListeners();
    } catch (error) {
      console.error('Failed to render spreadsheet:', error);
      this.container.innerHTML = this._createErrorState(error.message);
    }
  }

  /**
   * データをロード
   */
  async loadData() {
    const start = this.startDate.getTime();
    const end = this.endDate.getTime();

    console.log('📊 Loading spreadsheet data...', {
      start: this.startDate.toISOString(),
      end: this.endDate.toISOString(),
      store: this.selectedStore
    });

    // appStateから結果を取得
    const result = appState.getResult();
    if (!result) {
      throw new Error('データが生成されていません。「ダッシュボード表示」を先に実行してください。');
    }

    // 店舗フィルタリング
    const storeData = this.selectedStore === 'all'
      ? Object.entries(result)
      : [[this.selectedStore, result[this.selectedStore]]];

    if (storeData.length === 0) {
      throw new Error('選択された店舗のデータがありません。');
    }

    // データを集計
    this.data = this._aggregateData(storeData);

    console.log('✅ Spreadsheet data loaded', this.data);
  }

  /**
   * データを集計
   * @private
   */
  _aggregateData(storeData) {
    // 日付リストを生成
    const dates = this._generateDateRange(this.startDate, this.endDate);

    // 帳合先ごとにデータを集計
    const supplierMap = new Map();
    let grandTotal = { cost: 0, sales: 0, profit: 0 };

    storeData.forEach(([storeId, storeResult]) => {
      if (!storeResult || !storeResult.daily) return;

      // 日別データを処理
      Object.entries(storeResult.daily).forEach(([day, dayData]) => {
        const dateKey = this._formatDay(day);

        // 各仕入先のデータを処理
        if (dayData.suppliers) {
          Object.entries(dayData.suppliers).forEach(([supplierCode, supplierData]) => {
            const supplierName = supplierData.name || supplierCode;
            const supplierCat = supplierData.cat || 'other';

            // 仕入先マップに追加
            if (!supplierMap.has(supplierCode)) {
              supplierMap.set(supplierCode, {
                supplierId: supplierCode,
                supplierName: supplierName,
                category: supplierCat,
                dailyData: {},
                total: { cost: 0, sales: 0, profit: 0 },
                stores: new Set([storeId])
              });
            }

            const supplier = supplierMap.get(supplierCode);
            supplier.stores.add(storeId);

            // 日別データを初期化
            if (!supplier.dailyData[dateKey]) {
              supplier.dailyData[dateKey] = { cost: 0, sales: 0, profit: 0 };
            }

            // 原価を加算
            supplier.dailyData[dateKey].cost += supplierData.cost || 0;
            supplier.total.cost += supplierData.cost || 0;

            // 売価を加算（実際の売上との紐付けが必要）
            // 簡易実装：仕入比率で売上を按分
            const dayTotalCost = dayData.shiire?.cost || 0;
            if (dayTotalCost > 0) {
              const costRatio = (supplierData.cost || 0) / dayTotalCost;
              const allocatedSales = (dayData.sales || 0) * costRatio;

              supplier.dailyData[dateKey].sales += allocatedSales;
              supplier.total.sales += allocatedSales;
            }
          });
        }
      });
    });

    // 粗利を計算
    supplierMap.forEach(supplier => {
      supplier.total.profit = supplier.total.sales - supplier.total.cost;

      Object.keys(supplier.dailyData).forEach(dateKey => {
        const daily = supplier.dailyData[dateKey];
        daily.profit = daily.sales - daily.cost;
      });

      // 総計に加算
      grandTotal.cost += supplier.total.cost;
      grandTotal.sales += supplier.total.sales;
      grandTotal.profit += supplier.total.profit;
    });

    // 仕入額でソート
    const suppliers = Array.from(supplierMap.values())
      .sort((a, b) => b.total.cost - a.total.cost);

    return {
      suppliers,
      dates,
      grandTotal,
      storeCount: storeData.length
    };
  }

  /**
   * KPIカードを作成
   * @private
   */
  _createKPICards() {
    if (!this.data) return '';

    const { grandTotal, suppliers, storeCount } = this.data;
    const avgMargin = grandTotal.sales > 0
      ? (grandTotal.sales - grandTotal.cost) / grandTotal.sales
      : 0;

    const marginColor = avgMargin >= 0.25 ? 'success' : avgMargin >= 0.20 ? 'warning' : 'danger';

    return `
      <div class="spreadsheet-kpi-grid">
        <div class="spreadsheet-kpi-card" data-color="primary">
          <div class="kpi-header">
            <span class="kpi-label">総仕入高</span>
            <span class="kpi-icon">💰</span>
          </div>
          <div class="kpi-value">${formatNumber(grandTotal.cost)}<span class="kpi-unit">円</span></div>
          <div class="kpi-sub">${suppliers.length}社 / ${storeCount}店舗</div>
        </div>

        <div class="spreadsheet-kpi-card" data-color="success">
          <div class="kpi-header">
            <span class="kpi-label">総売上高</span>
            <span class="kpi-icon">📊</span>
          </div>
          <div class="kpi-value">${formatNumber(grandTotal.sales)}<span class="kpi-unit">円</span></div>
          <div class="kpi-sub">日平均 ${formatNumber(grandTotal.sales / this.data.dates.length)}円</div>
        </div>

        <div class="spreadsheet-kpi-card" data-color="${marginColor}">
          <div class="kpi-header">
            <span class="kpi-label">粗利益</span>
            <span class="kpi-icon">💎</span>
          </div>
          <div class="kpi-value" style="color:var(--${marginColor})">${formatNumber(grandTotal.profit)}<span class="kpi-unit">円</span></div>
          <div class="kpi-sub">粗利率 ${(avgMargin * 100).toFixed(2)}%</div>
          <div class="kpi-progress">
            <div class="kpi-progress-bar" style="width:${avgMargin * 100}%;background:var(--${marginColor})"></div>
          </div>
        </div>

        <div class="spreadsheet-kpi-card" data-color="info">
          <div class="kpi-header">
            <span class="kpi-label">表示期間</span>
            <span class="kpi-icon">📅</span>
          </div>
          <div class="kpi-value">${this.data.dates.length}<span class="kpi-unit">日間</span></div>
          <div class="kpi-sub">${this._formatDateShort(this.startDate)} 〜 ${this._formatDateShort(this.endDate)}</div>
        </div>
      </div>
    `;
  }

  /**
   * ツールバーを作成
   * @private
   */
  _createToolbar() {
    return `
      <div class="spreadsheet-toolbar-v2">
        <div class="toolbar-section">
          <div class="toolbar-title">
            <span class="toolbar-icon">📋</span>
            <h2>帳合先別日次推移</h2>
          </div>
        </div>

        <div class="toolbar-section toolbar-controls">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              id="supplier-search"
              placeholder="仕入先を検索..."
              value="${this.searchQuery}"
            >
          </div>

          <div class="date-range-picker-v2">
            <input
              type="date"
              id="start-date-v2"
              value="${this._formatDateInput(this.startDate)}"
            >
            <span class="date-separator">〜</span>
            <input
              type="date"
              id="end-date-v2"
              value="${this._formatDateInput(this.endDate)}"
            >
            <button class="btn-apply" onclick="window.spreadsheetView.applyDateRange()">
              <span>✓</span>
              適用
            </button>
          </div>

          <button class="btn-export" onclick="window.spreadsheetView.exportCSV()">
            <span>📥</span>
            CSV出力
          </button>

          <button class="btn-refresh" onclick="window.spreadsheetView.render()">
            <span>🔄</span>
            更新
          </button>
        </div>
      </div>
    `;
  }

  /**
   * スプレッドシートを作成
   * @private
   */
  _createSpreadsheet() {
    if (!this.data || this.data.suppliers.length === 0) {
      return '<div class="no-data-v2">データがありません</div>';
    }

    const { suppliers, dates, grandTotal } = this.data;

    // 検索フィルタリング
    const filteredSuppliers = this.searchQuery
      ? suppliers.filter(s =>
          s.supplierName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          s.supplierId.includes(this.searchQuery)
        )
      : suppliers;

    return `
      <div class="spreadsheet-container-v2">
        <div class="spreadsheet-scroll-wrapper">
          <table class="spreadsheet-table-v2">
            ${this._createTableHeader(dates)}
            ${this._createTableBody(filteredSuppliers, dates)}
            ${this._createTableFooter(dates, grandTotal)}
          </table>
        </div>
      </div>
    `;
  }

  /**
   * テーブルヘッダーを作成
   * @private
   */
  _createTableHeader(dates) {
    const dateHeaders = dates.map(date => {
      const d = this._parseDate(date);
      const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
      const weekdayClass = weekday === '日' ? 'sunday' : weekday === '土' ? 'saturday' : '';

      return `
        <th class="date-header ${weekdayClass}">
          <div class="date-header-content">
            <span class="date-day">${d.getMonth() + 1}/${d.getDate()}</span>
            <span class="date-weekday">(${weekday})</span>
          </div>
        </th>
      `;
    }).join('');

    return `
      <thead>
        <tr>
          <th class="supplier-header sticky-col" rowspan="2">
            帳合先
            <span class="sort-icon" onclick="window.spreadsheetView.sortBy('name')">⇅</span>
          </th>
          <th class="metric-header sticky-col-2" rowspan="2">指標</th>
          ${dateHeaders}
          <th class="total-header" rowspan="2">
            合計
            <span class="sort-icon" onclick="window.spreadsheetView.sortBy('total')">⇅</span>
          </th>
        </tr>
      </thead>
    `;
  }

  /**
   * テーブルボディを作成
   * @private
   */
  _createTableBody(suppliers, dates) {
    if (suppliers.length === 0) {
      return `
        <tbody>
          <tr>
            <td colspan="${dates.length + 3}" class="no-results">
              検索結果がありません
            </td>
          </tr>
        </tbody>
      `;
    }

    const rows = suppliers.map(supplier => {
      // 原価行
      const costCells = dates.map(date => {
        const data = supplier.dailyData[date];
        const cost = data?.cost || 0;
        return `<td class="data-cell cost-cell">${cost > 0 ? formatNumber(cost) : '-'}</td>`;
      }).join('');

      // 売価行
      const salesCells = dates.map(date => {
        const data = supplier.dailyData[date];
        const sales = data?.sales || 0;
        return `<td class="data-cell sales-cell">${sales > 0 ? formatNumber(sales) : '-'}</td>`;
      }).join('');

      // 粗利行
      const profitCells = dates.map(date => {
        const data = supplier.dailyData[date];
        const profit = data?.profit || 0;
        const profitClass = profit >= 0 ? 'profit-positive' : 'profit-negative';
        return `<td class="data-cell profit-cell ${profitClass}">${profit !== 0 ? formatNumber(profit) : '-'}</td>`;
      }).join('');

      // カテゴリアイコン
      const categoryIcons = {
        market: '🏪',
        lfc: '🚚',
        salad: '🥗',
        kakou: '📦',
        chokuden: '🍜',
        hana: '🌸',
        sanchoku: '🥬',
        consumable: '🧾',
        tenkan: '🔄',
        bumonkan: '🔀',
        other: '📋'
      };
      const categoryIcon = categoryIcons[supplier.category] || '📋';

      // 粗利率
      const marginRate = supplier.total.sales > 0
        ? ((supplier.total.sales - supplier.total.cost) / supplier.total.sales * 100).toFixed(1)
        : 0;

      return `
        <tr class="supplier-row">
          <td class="supplier-cell sticky-col" rowspan="3">
            <div class="supplier-info">
              <span class="supplier-icon">${categoryIcon}</span>
              <div class="supplier-details">
                <div class="supplier-name">${supplier.supplierName}</div>
                <div class="supplier-code">${supplier.supplierId}</div>
                <div class="supplier-margin">粗利率 ${marginRate}%</div>
              </div>
            </div>
          </td>
          <td class="metric-cell sticky-col-2 metric-cost">原価</td>
          ${costCells}
          <td class="total-cell total-cost">${formatNumber(supplier.total.cost)}</td>
        </tr>
        <tr class="supplier-row">
          <td class="metric-cell sticky-col-2 metric-sales">売価</td>
          ${salesCells}
          <td class="total-cell total-sales">${formatNumber(supplier.total.sales)}</td>
        </tr>
        <tr class="supplier-row profit-row">
          <td class="metric-cell sticky-col-2 metric-profit">粗利</td>
          ${profitCells}
          <td class="total-cell total-profit ${supplier.total.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
            ${formatNumber(supplier.total.profit)}
          </td>
        </tr>
      `;
    }).join('');

    return `<tbody>${rows}</tbody>`;
  }

  /**
   * テーブルフッターを作成
   * @private
   */
  _createTableFooter(dates, grandTotal) {
    // 日付ごとの合計を計算
    const dailyTotals = dates.map(date => {
      let cost = 0;
      let sales = 0;
      let profit = 0;

      this.data.suppliers.forEach(supplier => {
        const data = supplier.dailyData[date];
        if (data) {
          cost += data.cost;
          sales += data.sales;
          profit += data.profit;
        }
      });

      return { cost, sales, profit };
    });

    const costCells = dailyTotals.map(t =>
      `<td class="footer-cell footer-cost">${formatNumber(t.cost)}</td>`
    ).join('');

    const salesCells = dailyTotals.map(t =>
      `<td class="footer-cell footer-sales">${formatNumber(t.sales)}</td>`
    ).join('');

    const profitCells = dailyTotals.map(t => {
      const profitClass = t.profit >= 0 ? 'profit-positive' : 'profit-negative';
      return `<td class="footer-cell footer-profit ${profitClass}">${formatNumber(t.profit)}</td>`;
    }).join('');

    return `
      <tfoot>
        <tr class="footer-row">
          <td class="footer-label sticky-col" rowspan="3">総計</td>
          <td class="footer-label sticky-col-2">原価</td>
          ${costCells}
          <td class="footer-total footer-total-cost">${formatNumber(grandTotal.cost)}</td>
        </tr>
        <tr class="footer-row">
          <td class="footer-label sticky-col-2">売価</td>
          ${salesCells}
          <td class="footer-total footer-total-sales">${formatNumber(grandTotal.sales)}</td>
        </tr>
        <tr class="footer-row profit-row">
          <td class="footer-label sticky-col-2">粗利</td>
          ${profitCells}
          <td class="footer-total footer-total-profit ${grandTotal.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
            ${formatNumber(grandTotal.profit)}
          </td>
        </tr>
      </tfoot>
    `;
  }

  /**
   * イベントリスナーを設定
   * @private
   */
  _attachEventListeners() {
    // 検索ボックス
    const searchBox = document.getElementById('supplier-search');
    if (searchBox) {
      searchBox.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this._updateTable();
      });
    }
  }

  /**
   * テーブルを更新（検索/ソート後）
   * @private
   */
  _updateTable() {
    const container = document.querySelector('.spreadsheet-container-v2');
    if (container) {
      container.outerHTML = this._createSpreadsheet();
    }
  }

  /**
   * 日付範囲を適用
   */
  async applyDateRange() {
    const startInput = document.getElementById('start-date-v2');
    const endInput = document.getElementById('end-date-v2');

    if (startInput && endInput) {
      this.startDate = new Date(startInput.value);
      this.endDate = new Date(endInput.value);
      await this.render();
    }
  }

  /**
   * ソート
   */
  sortBy(column) {
    if (!this.data) return;

    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }

    this.data.suppliers.sort((a, b) => {
      let aVal, bVal;

      if (column === 'name') {
        aVal = a.supplierName;
        bVal = b.supplierName;
        return this.sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'ja')
          : bVal.localeCompare(aVal, 'ja');
      } else if (column === 'total') {
        aVal = a.total.cost;
        bVal = b.total.cost;
      }

      return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });

    this._updateTable();
  }

  /**
   * CSVエクスポート
   */
  exportCSV() {
    if (!this.data) return;

    const { suppliers, dates } = this.data;

    // CSVヘッダー
    const header = ['帳合先', 'コード', '指標', ...dates.map(d => {
      const date = this._parseDate(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }), '合計'];

    // CSVデータ
    const rows = [header.join(',')];

    suppliers.forEach(supplier => {
      // 原価行
      const costRow = [
        `"${supplier.supplierName}"`,
        supplier.supplierId,
        '原価',
        ...dates.map(date => supplier.dailyData[date]?.cost || 0),
        supplier.total.cost
      ];
      rows.push(costRow.join(','));

      // 売価行
      const salesRow = [
        '',
        '',
        '売価',
        ...dates.map(date => supplier.dailyData[date]?.sales || 0),
        supplier.total.sales
      ];
      rows.push(salesRow.join(','));

      // 粗利行
      const profitRow = [
        '',
        '',
        '粗利',
        ...dates.map(date => supplier.dailyData[date]?.profit || 0),
        supplier.total.profit
      ];
      rows.push(profitRow.join(','));
    });

    // BOM付きCSVとしてダウンロード
    const csv = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `帳合先別推移_${this._formatDateInput(this.startDate)}_${this._formatDateInput(this.endDate)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * ローディング状態を作成
   * @private
   */
  _createLoadingState() {
    return `
      <div class="loading-state-v2">
        <div class="spinner-v2"></div>
        <p>データを読み込み中...</p>
      </div>
    `;
  }

  /**
   * エラー状態を作成
   * @private
   */
  _createErrorState(message) {
    return `
      <div class="error-state-v2">
        <div class="error-icon">❌</div>
        <h2>エラーが発生しました</h2>
        <p>${message}</p>
        <button class="btn-retry" onclick="window.spreadsheetView.render()">
          🔄 再試行
        </button>
      </div>
    `;
  }

  // ===== ヘルパーメソッド =====

  _generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(this._getDateKey(new Date(current)));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  _getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _formatDay(day) {
    // day は "1" 〜 "31" の文字列
    const currentMonth = this.startDate.getMonth();
    const currentYear = this.startDate.getFullYear();
    const date = new Date(currentYear, currentMonth, parseInt(day));
    return this._getDateKey(date);
  }

  _parseDate(dateKey) {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  _formatDateInput(date) {
    return this._getDateKey(date);
  }

  _formatDateShort(date) {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  _getDefaultStartDate() {
    const date = new Date();
    date.setDate(1); // 月初
    return date;
  }

  _getDefaultEndDate() {
    return new Date();
  }
}

/**
 * グローバルインスタンス
 */
export let spreadsheetView = null;

/**
 * スプレッドシートビューを初期化
 */
export async function initSpreadsheetView(containerId = 'content', startDate = null, endDate = null, storeId = null) {
  spreadsheetView = new SpreadsheetView(containerId);
  await spreadsheetView.initialize(startDate, endDate, storeId);
  return spreadsheetView;
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.SpreadsheetView = SpreadsheetView;
  window.initSpreadsheetView = initSpreadsheetView;
  window.spreadsheetView = null;
}
