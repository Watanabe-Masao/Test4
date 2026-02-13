/**
 * @file Professional Dashboard Application
 * @description Main orchestrator for the professional purchasing and profit management dashboard
 * @version 1.0.0
 */

import { DataRepository } from '../../services/database/repository.js';
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
      pivotMode: 'supplier', // 'supplier' or 'store'
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
      this._adjustDateRangeToData();
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
   * Adjust date range to match actual data if current month has no data
   * @private
   */
  _adjustDateRangeToData() {
    const { shiire, uriage } = this.state.data;

    // If we already have data in the current range, keep it
    if (shiire.length > 0 || uriage.length > 0) return;

    // Otherwise, find the actual date range from all data in repositories
    // and reload with that range
    const allData = [...(this._allShiire || []), ...(this._allUriage || [])];
    if (allData.length === 0) return;

    let minDate = Infinity, maxDate = -Infinity;
    allData.forEach(item => {
      if (item.date < minDate) minDate = item.date;
      if (item.date > maxDate) maxDate = item.date;
    });

    if (minDate !== Infinity) {
      this.state.dateRange = { start: minDate, end: maxDate };
      // Re-filter data with the new date range
      this.state.data.shiire = (this._allShiire || []).filter(
        item => item.date >= minDate && item.date <= maxDate
      );
      this.state.data.uriage = (this._allUriage || []).filter(
        item => item.date >= minDate && item.date <= maxDate
      );
      this.state.data.baihen = (this._allBaihen || []).filter(
        item => item.date >= minDate && item.date <= maxDate
      );
      console.log(`📅 Date range adjusted to: ${new Date(minDate).toLocaleDateString()} ~ ${new Date(maxDate).toLocaleDateString()}`);
    }
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
      this._allShiire = shiireData;
      this.state.data.shiire = shiireData.filter(item =>
        item.date >= start && item.date <= end
      );

      // Load sales data
      const uriageData = await this.repositories.uriage.getAll();
      this._allUriage = uriageData;
      this.state.data.uriage = uriageData.filter(item =>
        item.date >= start && item.date <= end
      );

      // Load discount data
      const baihenData = await this.repositories.baihen.getAll();
      this._allBaihen = baihenData;
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
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap" id="store-selector">
              <!-- Store chips will be inserted here -->
            </div>
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
              <h2>📊 仕入分析 (日付別×帳合先別)</h2>
              <div style="display:flex;gap:8px">
                <button class="btn-small" id="btn-toggle-pivot-mode">店舗別に切替</button>
                <button class="btn-small" id="btn-pivot-export">CSV出力</button>
              </div>
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
    this._renderStoreSelector();
    this._renderKPICards();
    this._renderPivotTable();
    this._renderCharts();
    this._renderBudgetProgress();
  }

  /**
   * Render store selector chips
   * @private
   */
  _renderStoreSelector() {
    const container = document.getElementById('store-selector');
    if (!container) return;

    // Get unique stores from data
    const stores = new Set();
    this.state.data.shiire.forEach(item => stores.add(item.store));
    this.state.data.uriage.forEach(item => stores.add(item.store));

    const storeArray = ['all', ...Array.from(stores).sort()];
    const selectedStores = this.state.selectedStores;

    container.innerHTML = storeArray.map(store => {
      const isSelected = selectedStores.includes(store);
      const label = store === 'all' ? '全店舗' : `店舗 ${store}`;
      return `
        <button
          class="btn-small store-chip"
          data-store="${store}"
          style="background: ${isSelected ? 'var(--primary-blue)' : 'var(--bg-hover)'}; color: ${isSelected ? 'white' : 'var(--text-secondary)'}; border: 1px solid ${isSelected ? 'var(--primary-blue)' : 'var(--bg-border)'}"
        >
          ${label}
        </button>
      `;
    }).join('');
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

    // Filter by selected stores if not "all"
    const selectedStores = this.state.selectedStores;
    const filterByStore = (item) => {
      if (selectedStores.includes('all')) return true;
      return selectedStores.includes(item.store);
    };

    const filteredShiire = shiire.filter(filterByStore);
    const filteredUriage = uriage.filter(filterByStore);
    const filteredBaihen = baihen.filter(filterByStore);
    const filteredBudget = budget.filter(filterByStore);

    // Total sales
    const totalSales = filteredUriage.reduce((sum, item) => sum + (item.sales || 0), 0);

    // Total purchase cost (COGS from shiire data)
    const totalPurchase = filteredShiire.reduce((sum, item) => sum + (item.cost || 0), 0);

    // Gross profit = Sales - Purchase Cost
    // 注: 実際の原価は仕入データから取得
    const grossProfit = totalSales - totalPurchase;

    // Profit rate
    const profitRate = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    // Baihen rate (discount rate)
    const totalBaihen = Math.abs(filteredBaihen.reduce((sum, item) => sum + (item.amount || 0), 0));
    const baihenRate = (totalSales + totalBaihen) > 0 ? (totalBaihen / (totalSales + totalBaihen)) * 100 : 0;

    // Average daily sales
    const uniqueDays = new Set(filteredUriage.map(item => new Date(item.date).toDateString())).size;
    const avgDailySales = uniqueDays > 0 ? totalSales / uniqueDays : 0;

    // Budget achievement
    const totalBudget = filteredBudget.reduce((sum, item) => sum + (item.sales || 0), 0);
    const budgetAchievement = totalBudget > 0 ? (totalSales / totalBudget) * 100 : 0;

    // Estimated inventory
    const openingInventory = settings
      .filter(s => selectedStores.includes('all') || selectedStores.includes(s.store))
      .reduce((sum, item) => sum + (item.openingInventory || 0), 0);
    const estimatedInventory = openingInventory + totalPurchase - totalPurchase;

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
   * Render pivot table (日付別×帳合先別 with 原価/売価 sub-columns)
   * @private
   */
  _renderPivotTable() {
    const container = document.getElementById('pivot-table-container');
    if (!container) return;

    const { shiire } = this.state.data;
    const selectedStores = this.state.selectedStores;

    // Filter by selected stores
    const filteredShiire = shiire.filter(item =>
      selectedStores.includes('all') || selectedStores.includes(item.store)
    );

    if (filteredShiire.length === 0) {
      container.innerHTML = '<div class="no-data">データがありません</div>';
      return;
    }

    const pivotMode = this.state.pivotMode || 'supplier';

    if (pivotMode === 'store') {
      container.innerHTML = this._renderStorePivotHTML(filteredShiire);
    } else {
      container.innerHTML = this._renderSupplierPivotHTML(filteredShiire);
    }
  }

  /**
   * Render supplier-based pivot table (日付×帳合先 with 原価/売価)
   * @private
   */
  _renderSupplierPivotHTML(data) {
    // Collect unique suppliers
    const supplierMap = new Map();
    data.forEach(item => {
      const key = item.supplier || 'unknown';
      if (!supplierMap.has(key)) {
        supplierMap.set(key, item.supplierName || item.supplier || '不明');
      }
    });
    const suppliers = Array.from(supplierMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'ja'));

    // Collect unique dates (sorted)
    const dateSet = new Set();
    data.forEach(item => dateSet.add(item.date));
    const dates = Array.from(dateSet).sort((a, b) => a - b);

    // Build data map: "date::supplier" -> { cost, amount }
    const dataMap = new Map();
    data.forEach(item => {
      const key = `${item.date}::${item.supplier || 'unknown'}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, { cost: 0, amount: 0 });
      }
      const entry = dataMap.get(key);
      entry.cost += item.cost || 0;
      entry.amount += item.amount || 0;
    });

    // --- Build HTML ---
    let html = '<div class="pivot-table-wrapper"><table class="pivot-table">';

    // Header row 1: Supplier names with colspan=2
    html += '<thead><tr>';
    html += '<th rowspan="2" style="min-width:70px">日付</th>';
    suppliers.forEach(([code, name], idx) => {
      const bgClass = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<th colspan="2" style="text-align:center;border-bottom:1px solid var(--bg-border);background:${bgClass}">${name}</th>`;
    });
    html += '<th colspan="2" style="text-align:center;border-bottom:1px solid var(--bg-border);background:var(--primary-blue);color:white">合計</th>';
    html += '</tr>';

    // Header row 2: 原価/売価 sub-columns
    html += '<tr>';
    suppliers.forEach(([code, name], idx) => {
      const bgClass = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<th style="text-align:right;font-size:11px;padding:6px 10px;background:${bgClass}">原価</th>`;
      html += `<th style="text-align:right;font-size:11px;padding:6px 10px;background:${bgClass}">売価</th>`;
    });
    html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:var(--primary-blue);color:white">原価</th>';
    html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:var(--primary-blue);color:white">売価</th>';
    html += '</tr></thead>';

    // Data rows
    html += '<tbody>';
    const supplierTotals = new Map();
    suppliers.forEach(([code]) => supplierTotals.set(code, { cost: 0, amount: 0 }));
    let grandTotalCost = 0;
    let grandTotalAmount = 0;

    dates.forEach(date => {
      const d = new Date(date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      let rowCost = 0;
      let rowAmount = 0;

      html += '<tr>';
      html += `<td class="pivot-cell-dim pivot-cell-sticky">${dateStr}</td>`;

      suppliers.forEach(([code], idx) => {
        const key = `${date}::${code}`;
        const val = dataMap.get(key) || { cost: 0, amount: 0 };
        rowCost += val.cost;
        rowAmount += val.amount;
        const st = supplierTotals.get(code);
        st.cost += val.cost;
        st.amount += val.amount;

        const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.03)' : 'rgba(16,185,129,0.03)';
        html += `<td class="pivot-cell-value" style="background:${bg}">${val.cost ? Math.round(val.cost).toLocaleString() : ''}</td>`;
        html += `<td class="pivot-cell-value" style="background:${bg}">${val.amount ? Math.round(val.amount).toLocaleString() : ''}</td>`;
      });

      grandTotalCost += rowCost;
      grandTotalAmount += rowAmount;

      html += `<td class="pivot-cell-value" style="font-weight:600;color:var(--color-amber)">${rowCost ? Math.round(rowCost).toLocaleString() : ''}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:600;color:var(--color-amber)">${rowAmount ? Math.round(rowAmount).toLocaleString() : ''}</td>`;
      html += '</tr>';
    });

    // Total row
    html += '<tr class="pivot-row-total">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:var(--bg-hover);font-weight:700">合計</td>';
    suppliers.forEach(([code], idx) => {
      const st = supplierTotals.get(code);
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.08)' : 'rgba(16,185,129,0.08)';
      html += `<td class="pivot-cell-value" style="font-weight:700;background:${bg}">${st.cost ? Math.round(st.cost).toLocaleString() : ''}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:700;background:${bg}">${st.amount ? Math.round(st.amount).toLocaleString() : ''}</td>`;
    });
    html += `<td class="pivot-cell-value" style="font-weight:700;color:var(--color-amber)">${Math.round(grandTotalCost).toLocaleString()}</td>`;
    html += `<td class="pivot-cell-value" style="font-weight:700;color:var(--color-amber)">${Math.round(grandTotalAmount).toLocaleString()}</td>`;
    html += '</tr>';

    // Rate row (原価率 = 原価 / 売価 × 100)
    html += '<tr class="pivot-row-rate">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:rgba(79,70,229,0.06);font-weight:700">原価率</td>';
    suppliers.forEach(([code], idx) => {
      const st = supplierTotals.get(code);
      const rate = st.amount > 0 ? ((st.cost / st.amount) * 100).toFixed(1) : '-';
      const rateNum = st.amount > 0 ? (st.cost / st.amount) * 100 : 0;
      const color = rateNum > 80 ? 'var(--danger-red)' : rateNum > 60 ? 'var(--warning-yellow)' : 'var(--success-green)';
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;color:${color};font-weight:700;background:${bg}">${rate}%</td>`;
    });
    const totalRate = grandTotalAmount > 0 ? ((grandTotalCost / grandTotalAmount) * 100).toFixed(1) : '-';
    html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;font-weight:700;color:var(--color-amber)">${totalRate}%</td>`;
    html += '</tr>';

    // Profit rate row (粗利率 = (売価 - 原価) / 売価 × 100)
    html += '<tr class="pivot-row-rate">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:rgba(79,70,229,0.06);font-weight:700">粗利率</td>';
    suppliers.forEach(([code], idx) => {
      const st = supplierTotals.get(code);
      const rate = st.amount > 0 ? (((st.amount - st.cost) / st.amount) * 100).toFixed(1) : '-';
      const rateNum = st.amount > 0 ? ((st.amount - st.cost) / st.amount) * 100 : 0;
      const color = rateNum >= 30 ? 'var(--success-green)' : rateNum >= 15 ? 'var(--warning-yellow)' : 'var(--danger-red)';
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;color:${color};font-weight:700;background:${bg}">${rate}%</td>`;
    });
    const totalProfitRate = grandTotalAmount > 0 ? (((grandTotalAmount - grandTotalCost) / grandTotalAmount) * 100).toFixed(1) : '-';
    html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;font-weight:700;color:var(--color-amber)">${totalProfitRate}%</td>`;
    html += '</tr>';

    html += '</tbody></table></div>';
    return html;
  }

  /**
   * Render store-based pivot table (日付×店舗 with 原価/売価)
   * @private
   */
  _renderStorePivotHTML(data) {
    // Collect unique stores
    const storeSet = new Set();
    data.forEach(item => storeSet.add(item.store));
    const stores = Array.from(storeSet).sort();

    // Collect unique dates
    const dateSet = new Set();
    data.forEach(item => dateSet.add(item.date));
    const dates = Array.from(dateSet).sort((a, b) => a - b);

    // Build data map: "date::store" -> { cost, amount }
    const dataMap = new Map();
    data.forEach(item => {
      const key = `${item.date}::${item.store}`;
      if (!dataMap.has(key)) {
        dataMap.set(key, { cost: 0, amount: 0 });
      }
      const entry = dataMap.get(key);
      entry.cost += item.cost || 0;
      entry.amount += item.amount || 0;
    });

    let html = '<div class="pivot-table-wrapper"><table class="pivot-table">';

    // Headers
    html += '<thead><tr>';
    html += '<th rowspan="2" style="min-width:70px">日付</th>';
    stores.forEach((store, idx) => {
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<th colspan="2" style="text-align:center;border-bottom:1px solid var(--bg-border);background:${bg}">店舗 ${store}</th>`;
    });
    html += '<th colspan="2" style="text-align:center;border-bottom:1px solid var(--bg-border);background:var(--primary-blue);color:white">合計</th>';
    html += '</tr><tr>';
    stores.forEach((store, idx) => {
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<th style="text-align:right;font-size:11px;padding:6px 10px;background:${bg}">原価</th>`;
      html += `<th style="text-align:right;font-size:11px;padding:6px 10px;background:${bg}">売価</th>`;
    });
    html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:var(--primary-blue);color:white">原価</th>';
    html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:var(--primary-blue);color:white">売価</th>';
    html += '</tr></thead>';

    html += '<tbody>';
    const storeTotals = new Map();
    stores.forEach(s => storeTotals.set(s, { cost: 0, amount: 0 }));
    let grandCost = 0, grandAmount = 0;

    dates.forEach(date => {
      const d = new Date(date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      let rowCost = 0, rowAmount = 0;

      html += '<tr>';
      html += `<td class="pivot-cell-dim pivot-cell-sticky">${dateStr}</td>`;

      stores.forEach((store, idx) => {
        const val = dataMap.get(`${date}::${store}`) || { cost: 0, amount: 0 };
        rowCost += val.cost;
        rowAmount += val.amount;
        const st = storeTotals.get(store);
        st.cost += val.cost;
        st.amount += val.amount;
        const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.03)' : 'rgba(16,185,129,0.03)';
        html += `<td class="pivot-cell-value" style="background:${bg}">${val.cost ? Math.round(val.cost).toLocaleString() : ''}</td>`;
        html += `<td class="pivot-cell-value" style="background:${bg}">${val.amount ? Math.round(val.amount).toLocaleString() : ''}</td>`;
      });

      grandCost += rowCost;
      grandAmount += rowAmount;
      html += `<td class="pivot-cell-value" style="font-weight:600;color:var(--color-amber)">${rowCost ? Math.round(rowCost).toLocaleString() : ''}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:600;color:var(--color-amber)">${rowAmount ? Math.round(rowAmount).toLocaleString() : ''}</td>`;
      html += '</tr>';
    });

    // Total row
    html += '<tr class="pivot-row-total">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:var(--bg-hover);font-weight:700">合計</td>';
    stores.forEach((store, idx) => {
      const st = storeTotals.get(store);
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.08)' : 'rgba(16,185,129,0.08)';
      html += `<td class="pivot-cell-value" style="font-weight:700;background:${bg}">${st.cost ? Math.round(st.cost).toLocaleString() : ''}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:700;background:${bg}">${st.amount ? Math.round(st.amount).toLocaleString() : ''}</td>`;
    });
    html += `<td class="pivot-cell-value" style="font-weight:700;color:var(--color-amber)">${Math.round(grandCost).toLocaleString()}</td>`;
    html += `<td class="pivot-cell-value" style="font-weight:700;color:var(--color-amber)">${Math.round(grandAmount).toLocaleString()}</td>`;
    html += '</tr>';

    html += '</tbody></table></div>';
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

    // Pivot mode toggle button
    const btnTogglePivotMode = document.getElementById('btn-toggle-pivot-mode');
    if (btnTogglePivotMode) {
      btnTogglePivotMode.addEventListener('click', () => {
        this.state.pivotMode = this.state.pivotMode === 'supplier' ? 'store' : 'supplier';
        this._renderPivotTable();
        btnTogglePivotMode.textContent = this.state.pivotMode === 'supplier' ? '店舗別に切替' : '帳合先別に切替';
      });
    }

    // Store selector chips (delegated event)
    const storeSelector = document.getElementById('store-selector');
    if (storeSelector) {
      storeSelector.addEventListener('click', (e) => {
        const chip = e.target.closest('.store-chip');
        if (!chip) return;

        const store = chip.dataset.store;

        if (store === 'all') {
          this.state.selectedStores = ['all'];
        } else {
          // Toggle store selection
          if (this.state.selectedStores.includes('all')) {
            this.state.selectedStores = [store];
          } else if (this.state.selectedStores.includes(store)) {
            this.state.selectedStores = this.state.selectedStores.filter(s => s !== store);
            if (this.state.selectedStores.length === 0) {
              this.state.selectedStores = ['all'];
            }
          } else {
            this.state.selectedStores.push(store);
          }
        }

        this._renderStoreSelector();
        this._renderDashboard();
      });
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
