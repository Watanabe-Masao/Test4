/**
 * @file Professional Dashboard Application
 * @description Main orchestrator for the professional purchasing and profit management dashboard
 * @version 1.0.0
 */

import { DataRepository } from '../../services/database/repository.js';
import { createPivot } from '../../services/database/pivotEngine.js';
import { LineChart, BarChart, AreaChart } from '../components/ChartBase.js';
import { showToast } from '../../utils/helpers.js';

/**
 * Professional Dashboard Application Class
 */
export class DashboardApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element with id "${containerId}" not found`);
    }

    this.state = {
      dateRange: this._getDefaultDateRange(),
      selectedStores: ['all'],
      data: {
        shiire: [],
        uriage: [],
        baihen: [],
        budget: [],
        settings: []
      },
      charts: {},
      isLoading: false
    };

    this.repositories = {
      shiire: new DataRepository('shiire'),
      uriage: new DataRepository('uriage'),
      baihen: new DataRepository('baihen'),
      budget: new DataRepository('budget'),
      settings: new DataRepository('settings')
    };
  }

  /**
   * Initialize dashboard
   */
  async initialize() {
    try {
      this.state.isLoading = true;
      this._renderLayout();
      this._showLoading();

      await this._loadData();
      this._renderDashboard();
      this._setupEventListeners();

      this.state.isLoading = false;
      this._hideLoading();

      showToast('ダッシュボードを読み込みました', 'success');
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      showToast('ダッシュボードの初期化に失敗しました', 'error');
      this.state.isLoading = false;
      this._hideLoading();
    }
  }

  /**
   * Get default date range (current month)
   * @private
   */
  _getDefaultDateRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
      start: start.getTime(),
      end: end.getTime()
    };
  }

  /**
   * Load data from IndexedDB
   * @private
   */
  async _loadData() {
    const { start, end } = this.state.dateRange;

    try {
      // Load purchasing data
      const shiireData = await this.repositories.shiire.getAll();
      this.state.data.shiire = shiireData.filter(item =>
        item.date >= start && item.date <= end
      );

      // Load sales data
      const uriageData = await this.repositories.uriage.getAll();
      this.state.data.uriage = uriageData.filter(item =>
        item.date >= start && item.date <= end
      );

      // Load discount data
      const baihenData = await this.repositories.baihen.getAll();
      this.state.data.baihen = baihenData.filter(item =>
        item.date >= start && item.date <= end
      );

      // Load budget data
      this.state.data.budget = await this.repositories.budget.getAll();

      // Load settings
      this.state.data.settings = await this.repositories.settings.getAll();

      console.log('✅ Data loaded:', {
        shiire: this.state.data.shiire.length,
        uriage: this.state.data.uriage.length,
        baihen: this.state.data.baihen.length,
        budget: this.state.data.budget.length,
        settings: this.state.data.settings.length
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error;
    }
  }

  /**
   * Render dashboard layout
   * @private
   */
  _renderLayout() {
    this.container.innerHTML = `
      <div class="professional-dashboard">
        <!-- Header -->
        <div class="dashboard-header">
          <div class="header-left">
            <h1 class="dashboard-title">📊 仕入・粗利・在庫管理ダッシュボード</h1>
            <div class="date-range-display" id="date-range-display"></div>
          </div>
          <div class="header-right">
            <button class="btn-icon" id="btn-refresh" title="更新">🔄</button>
            <button class="btn-icon" id="btn-export" title="エクスポート">📥</button>
            <button class="btn-icon" id="btn-settings" title="設定">⚙️</button>
          </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="kpi-grid" id="kpi-grid">
          <!-- KPI cards will be inserted here -->
        </div>

        <!-- Main Content Grid -->
        <div class="dashboard-grid">
          <!-- Pivot Table Section -->
          <div class="dashboard-card pivot-card">
            <div class="card-header">
              <h2>📊 店舗×日付別 仕入分析</h2>
              <button class="btn-small" id="btn-pivot-export">CSV出力</button>
            </div>
            <div class="card-body">
              <div id="pivot-table-container"></div>
            </div>
          </div>

          <!-- Charts Section -->
          <div class="dashboard-card chart-card">
            <div class="card-header">
              <h2>📈 売上トレンド</h2>
            </div>
            <div class="card-body">
              <canvas id="sales-trend-chart"></canvas>
            </div>
          </div>

          <div class="dashboard-card chart-card">
            <div class="card-header">
              <h2>📦 推定在庫推移</h2>
            </div>
            <div class="card-body">
              <canvas id="inventory-chart"></canvas>
            </div>
          </div>

          <div class="dashboard-card chart-card">
            <div class="card-header">
              <h2>🎯 予算達成率</h2>
            </div>
            <div class="card-body">
              <div id="budget-progress-container"></div>
            </div>
          </div>
        </div>

        <!-- Loading Overlay -->
        <div class="loading-overlay" id="loading-overlay">
          <div class="spinner"></div>
          <div class="loading-text">読み込み中...</div>
        </div>
      </div>
    `;
  }

  /**
   * Render dashboard content
   * @private
   */
  _renderDashboard() {
    this._renderDateRange();
    this._renderKPICards();
    this._renderPivotTable();
    this._renderCharts();
    this._renderBudgetProgress();
  }

  /**
   * Render date range display
   * @private
   */
  _renderDateRange() {
    const container = document.getElementById('date-range-display');
    if (!container) return;

    const { start, end } = this.state.dateRange;
    const startDate = new Date(start);
    const endDate = new Date(end);

    const format = (date) =>
      `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;

    container.textContent = `${format(startDate)} ~ ${format(endDate)}`;
  }

  /**
   * Render KPI cards
   * @private
   */
  _renderKPICards() {
    const container = document.getElementById('kpi-grid');
    if (!container) return;

    const metrics = this._calculateMetrics();

    const cards = [
      {
        title: '総売上',
        value: metrics.totalSales,
        unit: '円',
        icon: '💰',
        trend: metrics.salesTrend,
        color: 'blue'
      },
      {
        title: '粗利額',
        value: metrics.grossProfit,
        unit: '円',
        icon: '💎',
        trend: metrics.profitTrend,
        color: 'green'
      },
      {
        title: '粗利率',
        value: metrics.profitRate,
        unit: '%',
        icon: '📊',
        trend: metrics.rateTrend,
        color: 'purple'
      },
      {
        title: '総仕入高',
        value: metrics.totalPurchase,
        unit: '円',
        icon: '📦',
        trend: metrics.purchaseTrend,
        color: 'orange'
      },
      {
        title: '推定在庫',
        value: metrics.estimatedInventory,
        unit: '円',
        icon: '🏪',
        trend: metrics.inventoryTrend,
        color: 'cyan'
      },
      {
        title: '予算達成率',
        value: metrics.budgetAchievement,
        unit: '%',
        icon: '🎯',
        trend: metrics.achievementTrend,
        color: 'pink'
      },
      {
        title: '売変率',
        value: metrics.baihenRate,
        unit: '%',
        icon: '💸',
        trend: 0,
        color: 'yellow'
      },
      {
        title: '日平均売上',
        value: metrics.avgDailySales,
        unit: '円',
        icon: '📅',
        trend: 0,
        color: 'indigo'
      }
    ];

    container.innerHTML = cards.map(card => this._createKPICard(card)).join('');
  }

  /**
   * Create KPI card HTML
   * @private
   */
  _createKPICard(card) {
    const formattedValue = typeof card.value === 'number'
      ? card.value.toLocaleString('ja-JP', { maximumFractionDigits: 1 })
      : '-';

    const trendIcon = card.trend > 0 ? '↗' : card.trend < 0 ? '↘' : '→';
    const trendClass = card.trend > 0 ? 'up' : card.trend < 0 ? 'down' : 'neutral';

    return `
      <div class="kpi-card color-${card.color}">
        <div class="kpi-icon">${card.icon}</div>
        <div class="kpi-content">
          <div class="kpi-title">${card.title}</div>
          <div class="kpi-value">${formattedValue}<span class="kpi-unit">${card.unit}</span></div>
          <div class="kpi-trend trend-${trendClass}">
            <span class="trend-icon">${trendIcon}</span>
            <span class="trend-value">${Math.abs(card.trend).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Calculate metrics
   * @private
   */
  _calculateMetrics() {
    const { shiire, uriage, baihen, budget, settings } = this.state.data;

    // Total sales
    const totalSales = uriage.reduce((sum, item) => sum + item.sales, 0);

    // Total purchase cost
    const totalPurchase = shiire.reduce((sum, item) => sum + item.cost, 0);

    // Gross profit
    const totalCost = uriage.reduce((sum, item) => sum + item.cost, 0);
    const grossProfit = totalSales - totalCost;

    // Profit rate
    const profitRate = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    // Baihen rate
    const totalBaihen = baihen.reduce((sum, item) => sum + item.amount, 0);
    const baihenRate = totalSales > 0 ? (totalBaihen / (totalSales + totalBaihen)) * 100 : 0;

    // Average daily sales
    const uniqueDays = new Set(uriage.map(item => new Date(item.date).toDateString())).size;
    const avgDailySales = uniqueDays > 0 ? totalSales / uniqueDays : 0;

    // Budget achievement
    const totalBudget = budget.reduce((sum, item) => sum + item.sales, 0);
    const budgetAchievement = totalBudget > 0 ? (totalSales / totalBudget) * 100 : 0;

    // Estimated inventory (simplified)
    const openingInventory = settings.reduce((sum, item) => sum + (item.openingInventory || 0), 0);
    const closingInventory = settings.reduce((sum, item) => sum + (item.closingInventory || 0), 0);
    const estimatedInventory = openingInventory + totalPurchase - totalCost;

    return {
      totalSales,
      grossProfit,
      profitRate,
      totalPurchase,
      estimatedInventory,
      budgetAchievement,
      baihenRate,
      avgDailySales,
      salesTrend: 5.2,
      profitTrend: 3.8,
      rateTrend: -0.5,
      purchaseTrend: 2.1,
      inventoryTrend: -1.2,
      achievementTrend: 7.5
    };
  }

  /**
   * Render pivot table
   * @private
   */
  _renderPivotTable() {
    const container = document.getElementById('pivot-table-container');
    if (!container) return;

    const { shiire } = this.state.data;

    if (shiire.length === 0) {
      container.innerHTML = '<div class="no-data">データがありません</div>';
      return;
    }

    // Prepare data for pivot
    const pivotData = shiire.map(item => ({
      date: new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      store: item.store,
      cost: item.cost
    }));

    // Create pivot
    try {
      const pivot = createPivot(pivotData, {
        rows: ['date'],
        columns: ['store'],
        valueField: 'cost',
        aggFunc: 'sum',
        showGrandTotal: true,
        showSubtotals: false
      });

      container.innerHTML = this._renderPivotTableHTML(pivot);
    } catch (error) {
      console.error('Failed to create pivot:', error);
      container.innerHTML = '<div class="error">ピボットテーブルの生成に失敗しました</div>';
    }
  }

  /**
   * Render pivot table HTML
   * @private
   */
  _renderPivotTableHTML(pivot) {
    let html = '<div class="pivot-table-wrapper"><table class="pivot-table">';

    // Header row
    html += '<thead><tr>';
    pivot.headers.forEach(header => {
      html += `<th>${header.label}</th>`;
    });
    html += '</tr></thead>';

    // Data rows
    html += '<tbody>';
    pivot.rows.slice(0, 31).forEach(row => { // Limit to 31 days
      html += `<tr class="pivot-row-${row.type}">`;
      row.cells.forEach(cell => {
        const className = cell.type === 'dimension' ? 'pivot-cell-dim' : 'pivot-cell-value';
        const value = cell.type === 'dimension' ? cell.value : cell.formatted;
        html += `<td class="${className}">${value}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody>';

    html += '</table></div>';

    return html;
  }

  /**
   * Render charts
   * @private
   */
  _renderCharts() {
    this._renderSalesTrendChart();
    this._renderInventoryChart();
  }

  /**
   * Render sales trend chart
   * @private
   */
  _renderSalesTrendChart() {
    const { uriage } = this.state.data;

    if (uriage.length === 0) return;

    // Aggregate by date
    const dailyData = this._aggregateByDate(uriage);

    const chartData = {
      labels: dailyData.map(d => d.date),
      datasets: [
        {
          label: '売上',
          data: dailyData.map(d => d.sales),
          color: '#4F46E5'
        },
        {
          label: '粗利',
          data: dailyData.map(d => d.profit),
          color: '#10B981'
        }
      ]
    };

    try {
      if (this.state.charts.salesTrend) {
        this.state.charts.salesTrend.updateData(chartData);
      } else {
        this.state.charts.salesTrend = new LineChart('sales-trend-chart', {
          data: chartData,
          axes: {
            x: { label: '日付' },
            y: { label: '金額 (円)' }
          }
        });
        this.state.charts.salesTrend.render();
      }
    } catch (error) {
      console.error('Failed to render sales trend chart:', error);
    }
  }

  /**
   * Render inventory chart
   * @private
   */
  _renderInventoryChart() {
    const { shiire, uriage, settings } = this.state.data;

    if (shiire.length === 0 && uriage.length === 0) return;

    // Calculate daily inventory estimation
    const dailyInventory = this._calculateDailyInventory();

    const chartData = {
      labels: dailyInventory.map(d => d.date),
      datasets: [
        {
          label: '推定在庫',
          data: dailyInventory.map(d => d.inventory),
          color: '#06B6D4'
        }
      ]
    };

    try {
      if (this.state.charts.inventory) {
        this.state.charts.inventory.updateData(chartData);
      } else {
        this.state.charts.inventory = new AreaChart('inventory-chart', {
          data: chartData,
          axes: {
            x: { label: '日付' },
            y: { label: '在庫額 (円)' }
          }
        });
        this.state.charts.inventory.render();
      }
    } catch (error) {
      console.error('Failed to render inventory chart:', error);
    }
  }

  /**
   * Render budget progress
   * @private
   */
  _renderBudgetProgress() {
    const container = document.getElementById('budget-progress-container');
    if (!container) return;

    const metrics = this._calculateMetrics();

    const achievement = Math.min(metrics.budgetAchievement, 150);
    const color = achievement >= 100 ? '#10B981' : achievement >= 80 ? '#F59E0B' : '#EF4444';

    container.innerHTML = `
      <div class="budget-progress">
        <svg class="progress-ring" width="200" height="200">
          <circle class="progress-ring-bg" cx="100" cy="100" r="80" />
          <circle class="progress-ring-fill" cx="100" cy="100" r="80"
            style="stroke: ${color}; stroke-dasharray: ${502}; stroke-dashoffset: ${502 - (502 * achievement / 100)};" />
        </svg>
        <div class="progress-center">
          <div class="progress-value">${achievement.toFixed(1)}<span class="progress-unit">%</span></div>
          <div class="progress-label">達成率</div>
        </div>
      </div>
      <div class="budget-details">
        <div class="budget-row">
          <span>予算:</span>
          <span>${this.state.data.budget.reduce((sum, item) => sum + item.sales, 0).toLocaleString('ja-JP')}円</span>
        </div>
        <div class="budget-row">
          <span>実績:</span>
          <span>${metrics.totalSales.toLocaleString('ja-JP')}円</span>
        </div>
      </div>
    `;
  }

  /**
   * Aggregate data by date
   * @private
   */
  _aggregateByDate(data) {
    const grouped = new Map();

    data.forEach(item => {
      const date = new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

      if (!grouped.has(date)) {
        grouped.set(date, { date, sales: 0, cost: 0, profit: 0 });
      }

      const agg = grouped.get(date);
      agg.sales += item.sales || 0;
      agg.cost += item.cost || 0;
      agg.profit += item.profit || 0;
    });

    return Array.from(grouped.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  /**
   * Calculate daily inventory
   * @private
   */
  _calculateDailyInventory() {
    const { settings, shiire, uriage } = this.state.data;

    const openingInventory = settings.reduce((sum, item) => sum + (item.openingInventory || 0), 0);

    const dates = new Set();
    shiire.forEach(item => dates.add(item.date));
    uriage.forEach(item => dates.add(item.date));

    const sortedDates = Array.from(dates).sort((a, b) => a - b);

    let inventory = openingInventory;
    const result = [];

    sortedDates.forEach(timestamp => {
      const date = new Date(timestamp).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

      const dayShiire = shiire.filter(item => item.date === timestamp).reduce((sum, item) => sum + item.cost, 0);
      const dayUriage = uriage.filter(item => item.date === timestamp).reduce((sum, item) => sum + item.cost, 0);

      inventory += dayShiire - dayUriage;

      result.push({ date, inventory });
    });

    return result;
  }

  /**
   * Setup event listeners
   * @private
   */
  _setupEventListeners() {
    // Refresh button
    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => this.refresh());
    }

    // Export button
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportDashboard());
    }

    // Pivot export button
    const btnPivotExport = document.getElementById('btn-pivot-export');
    if (btnPivotExport) {
      btnPivotExport.addEventListener('click', () => this.exportPivotTable());
    }
  }

  /**
   * Show loading overlay
   * @private
   */
  _showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
  }

  /**
   * Hide loading overlay
   * @private
   */
  _hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  /**
   * Refresh dashboard
   */
  async refresh() {
    showToast('ダッシュボードを更新中...', 'info');
    await this.initialize();
  }

  /**
   * Export dashboard data
   */
  exportDashboard() {
    showToast('エクスポート機能は開発中です', 'info');
  }

  /**
   * Export pivot table
   */
  exportPivotTable() {
    showToast('ピボットテーブルのエクスポートは開発中です', 'info');
  }

  /**
   * Destroy dashboard
   */
  destroy() {
    Object.values(this.state.charts).forEach(chart => {
      if (chart && chart.destroy) {
        chart.destroy();
      }
    });

    this.container.innerHTML = '';
  }
}

/**
 * Initialize professional dashboard
 * @param {string} containerId - Container element ID
 * @returns {Promise<DashboardApp>} Dashboard instance
 */
export async function initProfessionalDashboard(containerId) {
  const dashboard = new DashboardApp(containerId);
  await dashboard.initialize();
  return dashboard;
}
