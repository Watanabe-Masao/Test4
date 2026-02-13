/**
 * @file ダッシュボードUI
 * @description メインダッシュボード画面の構築
 */

import { calculator, reportGenerator } from '../services/database/index.js';
import { formatNumber, formatDate, formatPercent } from '../utils/helpers.js';

/**
 * ダッシュボードクラス
 */
export class Dashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentView = 'daily'; // daily, weekly, monthly
    this.currentDate = new Date();
    this.selectedStore = null; // null = 全店舗
    this.data = null;
  }

  /**
   * ダッシュボードを初期化
   */
  async initialize() {
    if (!this.container) {
      console.error('Dashboard container not found');
      return;
    }

    await this.render();
  }

  /**
   * ダッシュボードをレンダリング
   */
  async render() {
    this.container.innerHTML = this._createLoadingState();

    try {
      // データを取得
      await this.loadData();

      // UI構築
      const html = `
        <div class="dashboard">
          ${this._createHeader()}
          ${this._createControlBar()}
          ${this._createSummaryCards()}
          ${this._createCharts()}
          ${this._createDataTable()}
        </div>
      `;

      this.container.innerHTML = html;
      this._attachEventListeners();
    } catch (error) {
      console.error('Failed to render dashboard:', error);
      this.container.innerHTML = this._createErrorState(error.message);
    }
  }

  /**
   * データをロード
   */
  async loadData() {
    switch (this.currentView) {
      case 'daily':
        this.data = await calculator.calculateDailyProfit(
          this.currentDate,
          this.selectedStore
        );
        break;

      case 'weekly':
        this.data = await reportGenerator.generateWeeklyReport(this.currentDate);
        break;

      case 'monthly':
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth() + 1;
        this.data = await reportGenerator.generateMonthlyReport(
          year,
          month,
          this.selectedStore
        );
        break;

      default:
        throw new Error('Invalid view type');
    }

    // 推定計算を実行
    await this._calculateEstimatedMetrics();
  }

  /**
   * 推定計算を実行
   * @private
   */
  async _calculateEstimatedMetrics() {
    if (!this.data) return;

    // 月次ビューの場合のみ推定計算を実行
    if (this.currentView === 'monthly') {
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth() + 1;

      // 推定計算用のパラメータを準備
      const params = {
        invStart: this.data.inventory?.start || 0,
        totalCost: this.data.cost?.adjusted || this.data.cost?.original || 0,
        totalSales: this.data.sales || 0,
        totalBaihen: this.data.baihen || 0,
        deliverySalesCost: this.data.delivery?.cost || 0,
        deliverySalesPrice: this.data.delivery?.sales || 0,
        totalConsumable: this.data.consumable || 0,
        defaultMarginRate: 0.26
      };

      // 推定計算を実行
      this.data.estimated = calculator.calculateEstimatedMetrics(params);

      // 日別推定在庫を計算
      if (this.data.dailyData && this.data.dailyData.length > 0) {
        const dailyParams = this.data.dailyData.map(day => ({
          date: day.date,
          invStart: day.inventory?.start || 0,
          purchases: day.shiire || 0,
          sales: day.sales || 0,
          baihen: day.baihen || 0,
          marginRate: this.data.estimated.coreMarginRate
        }));

        this.data.estimatedInventoryTrend = calculator.calculateDailyEstimatedInventory(
          dailyParams,
          params.invStart,
          this.data.estimated.coreMarginRate,
          this.data.estimated.baihenRateSales
        );
      }
    }
  }

  /**
   * ヘッダーを作成
   * @private
   */
  _createHeader() {
    return `
      <div class="dashboard-header">
        <h1>📊 粗利ダッシュボード</h1>
        <div class="header-actions">
          <button class="btn btn-primary" onclick="dashboard.exportReport()">
            📤 エクスポート
          </button>
          <button class="btn btn-secondary" onclick="dashboard.refresh()">
            🔄 更新
          </button>
        </div>
      </div>
    `;
  }

  /**
   * コントロールバーを作成
   * @private
   */
  _createControlBar() {
    return `
      <div class="control-bar">
        <div class="view-selector">
          <button class="view-btn ${this.currentView === 'daily' ? 'active' : ''}"
                  data-view="daily">日次</button>
          <button class="view-btn ${this.currentView === 'weekly' ? 'active' : ''}"
                  data-view="weekly">週次</button>
          <button class="view-btn ${this.currentView === 'monthly' ? 'active' : ''}"
                  data-view="monthly">月次</button>
        </div>

        <div class="date-selector">
          <button class="btn-icon" onclick="dashboard.previousPeriod()">◀</button>
          <span class="current-date">${this._formatCurrentPeriod()}</span>
          <button class="btn-icon" onclick="dashboard.nextPeriod()">▶</button>
          <button class="btn-icon" onclick="dashboard.today()">今日</button>
        </div>

        <div class="store-selector">
          <select id="store-select" onchange="dashboard.changeStore(this.value)">
            <option value="">全店舗</option>
            <option value="01">店舗01</option>
            <option value="02">店舗02</option>
            <option value="03">店舗03</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * サマリーカードを作成
   * @private
   */
  _createSummaryCards() {
    if (!this.data) return '';

    const sales = this.data.sales || 0;
    const profit = this.data.profit?.actual || this.data.profit || 0;
    const profitRate = this.data.profit?.rate || 0;
    const cost = this.data.cost?.adjusted || this.data.cost?.original || 0;

    // 基本カード
    let cardsHtml = `
      <div class="summary-cards">
        <div class="summary-card sales">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <div class="card-label">売上</div>
            <div class="card-value">${formatNumber(sales)}円</div>
          </div>
        </div>

        <div class="summary-card profit">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <div class="card-label">粗利</div>
            <div class="card-value">${formatNumber(profit)}円</div>
          </div>
        </div>

        <div class="summary-card rate">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <div class="card-label">粗利率</div>
            <div class="card-value">${formatPercent(profitRate)}</div>
          </div>
        </div>

        <div class="summary-card cost">
          <div class="card-icon">🏷️</div>
          <div class="card-content">
            <div class="card-label">仕入原価</div>
            <div class="card-value">${formatNumber(cost)}円</div>
          </div>
        </div>
    `;

    // 推定計算カード（月次ビューのみ）
    if (this.currentView === 'monthly' && this.data.estimated) {
      const est = this.data.estimated;
      cardsHtml += `
        <div class="summary-card estimated-inventory">
          <div class="card-icon">📦</div>
          <div class="card-content">
            <div class="card-label">推定期末在庫</div>
            <div class="card-value">${formatNumber(est.estimatedInvEnd)}円</div>
          </div>
        </div>

        <div class="summary-card estimated-margin">
          <div class="card-icon">💎</div>
          <div class="card-content">
            <div class="card-label">推定粗利率</div>
            <div class="card-value">${formatPercent(est.estimatedGrossRate * 100)}</div>
            <div class="card-detail">コア値入率: ${formatPercent(est.coreMarginRate * 100)}</div>
          </div>
        </div>

        <div class="summary-card baihen-rate">
          <div class="card-icon">🏷️</div>
          <div class="card-content">
            <div class="card-label">売変率</div>
            <div class="card-value">${formatPercent(est.baihenRateSales * 100)}</div>
            <div class="card-detail">値引損失: ${formatNumber(est.baihenLossCost)}円</div>
          </div>
        </div>

        <div class="summary-card cost-discount">
          <div class="card-icon">⚠️</div>
          <div class="card-content">
            <div class="card-label">原価値引率</div>
            <div class="card-value">${formatPercent(est.baihenRateCost * 100)}</div>
            <div class="card-detail">推定粗利: ${formatNumber(est.estimatedGrossProfit)}円</div>
          </div>
        </div>
      `;
    }

    cardsHtml += `</div>`;
    return cardsHtml;
  }

  /**
   * チャートを作成
   * @private
   */
  _createCharts() {
    if (!this.data) return '';

    let chartsHtml = `<div class="charts-container">`;

    // 推定在庫推移グラフ（月次ビュー、推定データがある場合）
    if (this.currentView === 'monthly' && this.data.estimatedInventoryTrend) {
      chartsHtml += `
        <div class="chart-card">
          <h3>📊 推定在庫推移</h3>
          <div id="inventory-trend-chart" class="chart-content">
            ${this._createInventoryTrendChart()}
          </div>
        </div>
      `;
    }

    chartsHtml += `
        <div class="chart-card">
          <h3>📈 推移グラフ</h3>
          <div id="trend-chart" class="chart-placeholder">
            チャートライブラリ統合待ち
          </div>
        </div>

        <div class="chart-card">
          <h3>🥧 カテゴリ別内訳</h3>
          <div id="category-chart" class="chart-placeholder">
            ${this._createCategoryBreakdown()}
          </div>
        </div>
      </div>
    `;

    return chartsHtml;
  }

  /**
   * 推定在庫推移チャートを作成
   * @private
   */
  _createInventoryTrendChart() {
    if (!this.data.estimatedInventoryTrend) return '';

    const trend = this.data.estimatedInventoryTrend;
    const maxValue = Math.max(...trend.map(d => d.estimatedInventory));
    const minValue = Math.min(...trend.map(d => d.estimatedInventory));
    const range = maxValue - minValue;

    // シンプルな折れ線グラフを作成
    const points = trend.map((d, i) => {
      const x = (i / (trend.length - 1)) * 100;
      const y = range > 0 ? ((maxValue - d.estimatedInventory) / range) * 80 + 10 : 50;
      return `${x},${y}`;
    }).join(' ');

    return `
      <div class="inventory-trend-container">
        <div class="chart-legend">
          <div class="legend-item">
            <span class="legend-color" style="background: #4CAF50;"></span>
            <span>推定在庫</span>
          </div>
          <div class="legend-stats">
            <span>最大: ${formatNumber(maxValue)}円</span>
            <span>最小: ${formatNumber(minValue)}円</span>
          </div>
        </div>
        <svg viewBox="0 0 100 100" class="inventory-chart">
          <polyline
            points="${points}"
            fill="none"
            stroke="#4CAF50"
            stroke-width="0.5"
            stroke-linejoin="round"
          />
          ${trend.map((d, i) => {
            const x = (i / (trend.length - 1)) * 100;
            const y = range > 0 ? ((maxValue - d.estimatedInventory) / range) * 80 + 10 : 50;
            return `<circle cx="${x}" cy="${y}" r="1" fill="#4CAF50"/>`;
          }).join('')}
        </svg>
        <div class="chart-table">
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th>推定在庫</th>
                <th>推定売上原価</th>
              </tr>
            </thead>
            <tbody>
              ${trend.slice(0, 10).map(d => `
                <tr>
                  <td>${formatDate(new Date(d.date))}</td>
                  <td class="text-right">${formatNumber(d.estimatedInventory)}</td>
                  <td class="text-right">${formatNumber(d.estimatedCogs)}</td>
                </tr>
              `).join('')}
              ${trend.length > 10 ? `
                <tr>
                  <td colspan="3" class="text-center">... 他${trend.length - 10}日</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * カテゴリ別内訳を作成
   * @private
   */
  _createCategoryBreakdown() {
    if (!this.data.shiire?.byCategory) {
      return '<p class="no-data">データなし</p>';
    }

    const categories = this.data.shiire.byCategory;
    const total = Object.values(categories).reduce((sum, val) => sum + val, 0);

    const html = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => {
        const percent = total > 0 ? (amount / total) * 100 : 0;
        return `
          <div class="category-item">
            <div class="category-label">${this._getCategoryLabel(category)}</div>
            <div class="category-bar">
              <div class="category-fill" style="width: ${percent}%"></div>
            </div>
            <div class="category-value">${formatNumber(amount)}円 (${formatPercent(percent)})</div>
          </div>
        `;
      })
      .join('');

    return html;
  }

  /**
   * データテーブルを作成
   * @private
   */
  _createDataTable() {
    if (!this.data) return '';

    if (this.currentView === 'monthly' && this.data.dailyData) {
      return this._createDailyTable(this.data.dailyData);
    }

    return '';
  }

  /**
   * 日次データテーブルを作成
   * @private
   */
  _createDailyTable(dailyData) {
    const rows = dailyData
      .map(day => {
        return `
          <tr>
            <td>${formatDate(new Date(day.date))}</td>
            <td class="text-right">${formatNumber(day.sales)}</td>
            <td class="text-right">${formatNumber(day.cost?.adjusted || 0)}</td>
            <td class="text-right">${formatNumber(day.profit?.actual || 0)}</td>
            <td class="text-right">${formatPercent(day.profit?.rate || 0)}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div class="data-table-container">
        <h3>📅 日次データ</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>日付</th>
              <th class="text-right">売上</th>
              <th class="text-right">原価</th>
              <th class="text-right">粗利</th>
              <th class="text-right">粗利率</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
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
        <button class="btn btn-primary" onclick="dashboard.refresh()">再試行</button>
      </div>
    `;
  }

  /**
   * イベントリスナーを設定
   * @private
   */
  _attachEventListeners() {
    // ビュー切り替えボタン
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.changeView(view);
      });
    });
  }

  /**
   * ビューを変更
   */
  async changeView(view) {
    this.currentView = view;
    await this.render();
  }

  /**
   * 店舗を変更
   */
  async changeStore(storeId) {
    this.selectedStore = storeId || null;
    await this.render();
  }

  /**
   * 前の期間へ
   */
  async previousPeriod() {
    switch (this.currentView) {
      case 'daily':
        this.currentDate.setDate(this.currentDate.getDate() - 1);
        break;
      case 'weekly':
        this.currentDate.setDate(this.currentDate.getDate() - 7);
        break;
      case 'monthly':
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        break;
    }
    await this.render();
  }

  /**
   * 次の期間へ
   */
  async nextPeriod() {
    switch (this.currentView) {
      case 'daily':
        this.currentDate.setDate(this.currentDate.getDate() + 1);
        break;
      case 'weekly':
        this.currentDate.setDate(this.currentDate.getDate() + 7);
        break;
      case 'monthly':
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        break;
    }
    await this.render();
  }

  /**
   * 今日へ
   */
  async today() {
    this.currentDate = new Date();
    await this.render();
  }

  /**
   * 更新
   */
  async refresh() {
    await this.render();
  }

  /**
   * レポートをエクスポート
   */
  async exportReport() {
    try {
      const report = reportGenerator.formatReport(this.data, 'json');
      const blob = new Blob([report], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${this._formatCurrentPeriod()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    }
  }

  /**
   * 現在の期間をフォーマット
   * @private
   */
  _formatCurrentPeriod() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    const date = this.currentDate.getDate();

    switch (this.currentView) {
      case 'daily':
        return `${year}年${month}月${date}日`;
      case 'weekly':
        return `${year}年${month}月 第${Math.ceil(date / 7)}週`;
      case 'monthly':
        return `${year}年${month}月`;
      default:
        return '';
    }
  }

  /**
   * カテゴリラベルを取得
   * @private
   */
  _getCategoryLabel(category) {
    const labels = {
      fruits: '青果',
      vegetables: '野菜',
      market: '市場',
      sanchoku: '産直',
      hana: '花',
      other: 'その他'
    };
    return labels[category] || category;
  }
}

/**
 * グローバルインスタンス
 */
export let dashboard = null;

/**
 * ダッシュボードを初期化
 * @param {string} containerId - コンテナID
 */
export function initDashboard(containerId = 'content') {
  dashboard = new Dashboard(containerId);
  return dashboard;
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
  window.initDashboard = initDashboard;
}
