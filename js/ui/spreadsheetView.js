/**
 * @file スプレッドシートビュー
 * @description 帳合先×日付のスプレッドシート形式UI
 */

import { query } from '../services/database/queryBuilder.js';
import { formatNumber, formatDate } from '../utils/helpers.js';

/**
 * スプレッドシートビュークラス
 */
export class SpreadsheetView {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.startDate = null;
    this.endDate = null;
    this.selectedStore = null;
    this.data = null;
  }

  /**
   * 初期化
   * @param {Date} startDate - 開始日
   * @param {Date} endDate - 終了日
   * @param {string} storeId - 店舗ID（省略時は全店舗）
   */
  async initialize(startDate, endDate, storeId = null) {
    if (!this.container) {
      console.error('Spreadsheet container not found');
      return;
    }

    this.startDate = startDate || this._getDefaultStartDate();
    this.endDate = endDate || this._getDefaultEndDate();
    this.selectedStore = storeId;

    await this.render();
  }

  /**
   * レンダリング
   */
  async render() {
    this.container.innerHTML = this._createLoadingState();

    try {
      // データを取得・集計
      await this.loadData();

      // UI構築
      const html = `
        <div class="spreadsheet-view">
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

    // 仕入データを取得
    let shiireQuery = query('shiire').whereDateBetween('date', start, end);
    if (this.selectedStore) {
      shiireQuery = shiireQuery.whereEquals('store', this.selectedStore);
    }
    const shiireData = await shiireQuery.execute();

    // 売上データを取得
    let uriageQuery = query('uriage').whereDateBetween('date', start, end);
    if (this.selectedStore) {
      uriageQuery = uriageQuery.whereEquals('store', this.selectedStore);
    }
    const uriageData = await uriageQuery.execute();

    // データを集計
    this.data = this._aggregateData(shiireData, uriageData);
  }

  /**
   * データを集計
   * @private
   */
  _aggregateData(shiireData, uriageData) {
    // 日付リストを生成
    const dates = this._generateDateRange(this.startDate, this.endDate);

    // 帳合先ごとにデータを集計
    const supplierMap = new Map();

    // 仕入データを集計
    shiireData.forEach(record => {
      const supplier = record.supplier || 'unknown';
      const supplierName = record.supplierName || supplier;
      const dateKey = this._getDateKey(new Date(record.date));

      if (!supplierMap.has(supplier)) {
        supplierMap.set(supplier, {
          supplierId: supplier,
          supplierName: supplierName,
          dailyData: {},
          total: { cost: 0, sales: 0, profit: 0 }
        });
      }

      const supplierData = supplierMap.get(supplier);

      if (!supplierData.dailyData[dateKey]) {
        supplierData.dailyData[dateKey] = { cost: 0, sales: 0, profit: 0 };
      }

      supplierData.dailyData[dateKey].cost += record.cost || 0;
      supplierData.total.cost += record.cost || 0;
    });

    // 売上データを集計（仕入先別に紐付け）
    uriageData.forEach(record => {
      // 売上データから仕入先を特定（通常は商品マスタと紐付けが必要）
      // 簡易実装：売上は全体として集計
      const dateKey = this._getDateKey(new Date(record.date));

      // 各帳合先の売上を按分（仕入比率で配分）
      const totalCostForDate = Array.from(supplierMap.values())
        .reduce((sum, s) => sum + (s.dailyData[dateKey]?.cost || 0), 0);

      if (totalCostForDate > 0) {
        supplierMap.forEach(supplierData => {
          const costRatio = (supplierData.dailyData[dateKey]?.cost || 0) / totalCostForDate;
          const allocatedSales = (record.sales || 0) * costRatio;

          if (!supplierData.dailyData[dateKey]) {
            supplierData.dailyData[dateKey] = { cost: 0, sales: 0, profit: 0 };
          }

          supplierData.dailyData[dateKey].sales += allocatedSales;
          supplierData.dailyData[dateKey].profit =
            supplierData.dailyData[dateKey].sales - supplierData.dailyData[dateKey].cost;

          supplierData.total.sales += allocatedSales;
        });
      }
    });

    // 各帳合先の粗利を計算
    supplierMap.forEach(supplierData => {
      supplierData.total.profit = supplierData.total.sales - supplierData.total.cost;
    });

    // 総計を計算
    const grandTotal = {
      cost: 0,
      sales: 0,
      profit: 0
    };

    supplierMap.forEach(supplierData => {
      grandTotal.cost += supplierData.total.cost;
      grandTotal.sales += supplierData.total.sales;
      grandTotal.profit += supplierData.total.profit;
    });

    return {
      suppliers: Array.from(supplierMap.values())
        .sort((a, b) => b.total.cost - a.total.cost), // 仕入額でソート
      dates: dates,
      grandTotal: grandTotal
    };
  }

  /**
   * ツールバーを作成
   * @private
   */
  _createToolbar() {
    return `
      <div class="spreadsheet-toolbar">
        <div class="toolbar-left">
          <h2>📊 帳合先別日次推移</h2>
        </div>
        <div class="toolbar-right">
          <div class="date-range-picker">
            <input type="date" id="start-date" value="${this._formatDateInput(this.startDate)}">
            <span>〜</span>
            <input type="date" id="end-date" value="${this._formatDateInput(this.endDate)}">
            <button class="btn btn-primary" onclick="spreadsheetView.applyDateRange()">適用</button>
          </div>
          <button class="btn btn-secondary" onclick="spreadsheetView.exportCSV()">
            📥 CSV出力
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
      return '<div class="no-data">データがありません</div>';
    }

    const { suppliers, dates, grandTotal } = this.data;

    return `
      <div class="spreadsheet-container">
        <table class="spreadsheet-table">
          ${this._createTableHeader(dates)}
          ${this._createTableBody(suppliers, dates)}
          ${this._createTableFooter(dates, grandTotal)}
        </table>
      </div>
    `;
  }

  /**
   * テーブルヘッダーを作成
   * @private
   */
  _createTableHeader(dates) {
    const dateHeaders = dates.map(date => {
      const d = new Date(date);
      const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
      return `
        <th class="date-header">
          ${d.getMonth() + 1}/${d.getDate()}<br>
          <span class="weekday">(${weekday})</span>
        </th>
      `;
    }).join('');

    return `
      <thead>
        <tr>
          <th class="supplier-header sticky-col">帳合先</th>
          <th class="metric-header sticky-col-2">指標</th>
          ${dateHeaders}
          <th class="total-header">合計</th>
        </tr>
      </thead>
    `;
  }

  /**
   * テーブルボディを作成
   * @private
   */
  _createTableBody(suppliers, dates) {
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

      return `
        <tr class="supplier-row">
          <td class="supplier-cell sticky-col" rowspan="3">${supplier.supplierName}</td>
          <td class="metric-cell sticky-col-2">原価</td>
          ${costCells}
          <td class="total-cell">${formatNumber(supplier.total.cost)}</td>
        </tr>
        <tr class="supplier-row">
          <td class="metric-cell sticky-col-2">売価</td>
          ${salesCells}
          <td class="total-cell">${formatNumber(supplier.total.sales)}</td>
        </tr>
        <tr class="supplier-row profit-row">
          <td class="metric-cell sticky-col-2">粗利</td>
          ${profitCells}
          <td class="total-cell ${supplier.total.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
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
      `<td class="footer-cell">${formatNumber(t.cost)}</td>`
    ).join('');

    const salesCells = dailyTotals.map(t =>
      `<td class="footer-cell">${formatNumber(t.sales)}</td>`
    ).join('');

    const profitCells = dailyTotals.map(t => {
      const profitClass = t.profit >= 0 ? 'profit-positive' : 'profit-negative';
      return `<td class="footer-cell ${profitClass}">${formatNumber(t.profit)}</td>`;
    }).join('');

    return `
      <tfoot>
        <tr class="footer-row">
          <td class="footer-label sticky-col" rowspan="3">総計</td>
          <td class="footer-label sticky-col-2">原価</td>
          ${costCells}
          <td class="footer-total">${formatNumber(grandTotal.cost)}</td>
        </tr>
        <tr class="footer-row">
          <td class="footer-label sticky-col-2">売価</td>
          ${salesCells}
          <td class="footer-total">${formatNumber(grandTotal.sales)}</td>
        </tr>
        <tr class="footer-row profit-row">
          <td class="footer-label sticky-col-2">粗利</td>
          ${profitCells}
          <td class="footer-total ${grandTotal.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
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
    // 既に onclick で設定済み
  }

  /**
   * 日付範囲を適用
   */
  async applyDateRange() {
    const startInput = document.getElementById('start-date');
    const endInput = document.getElementById('end-date');

    if (startInput && endInput) {
      this.startDate = new Date(startInput.value);
      this.endDate = new Date(endInput.value);
      await this.render();
    }
  }

  /**
   * CSVエクスポート
   */
  exportCSV() {
    if (!this.data) return;

    const { suppliers, dates } = this.data;

    // CSVヘッダー
    const header = ['帳合先', '指標', ...dates.map(d => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }), '合計'];

    // CSVデータ
    const rows = [header.join(',')];

    suppliers.forEach(supplier => {
      // 原価行
      const costRow = [
        `"${supplier.supplierName}"`,
        '原価',
        ...dates.map(date => supplier.dailyData[date]?.cost || 0),
        supplier.total.cost
      ];
      rows.push(costRow.join(','));

      // 売価行
      const salesRow = [
        '',
        '売価',
        ...dates.map(date => supplier.dailyData[date]?.sales || 0),
        supplier.total.sales
      ];
      rows.push(salesRow.join(','));

      // 粗利行
      const profitRow = [
        '',
        '粗利',
        ...dates.map(date => supplier.dailyData[date]?.profit || 0),
        supplier.total.profit
      ];
      rows.push(profitRow.join(','));
    });

    // 総計行
    const dailyTotals = dates.map(date => {
      return suppliers.reduce((sum, s) => sum + (s.dailyData[date]?.cost || 0), 0);
    });

    rows.push(['総計', '原価', ...dailyTotals, this.data.grandTotal.cost].join(','));

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
      <div class="loading-state">
        <div class="spinner"></div>
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
      <div class="error-state">
        <div class="error-icon">❌</div>
        <h2>エラーが発生しました</h2>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * 日付範囲を生成
   * @private
   */
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

  /**
   * 日付キーを取得
   * @private
   */
  _getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 日付をinput用にフォーマット
   * @private
   */
  _formatDateInput(date) {
    return this._getDateKey(date);
  }

  /**
   * デフォルト開始日を取得
   * @private
   */
  _getDefaultStartDate() {
    const date = new Date();
    date.setDate(1); // 月初
    return date;
  }

  /**
   * デフォルト終了日を取得
   * @private
   */
  _getDefaultEndDate() {
    const date = new Date();
    return date;
  }
}

/**
 * グローバルインスタンス
 */
export let spreadsheetView = null;

/**
 * スプレッドシートビューを初期化
 * @param {string} containerId - コンテナID
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 * @param {string} storeId - 店舗ID
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
