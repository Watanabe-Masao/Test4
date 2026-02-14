/**
 * @file Professional Dashboard Application
 * @description Main orchestrator for the professional purchasing and profit management dashboard
 * @version 2.1.0
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
        settings: [],
        tenkanIn: [],
        tenkanOut: [],
        sanchoku: [],
        hana: [],
        consumables: []
      },
      charts: {},
      isLoading: false
    };

    this.repositories = {
      shiire: new DataRepository('shiire'),
      uriage: new DataRepository('uriage'),
      baihen: new DataRepository('baihen'),
      budget: new DataRepository('budget'),
      settings: new DataRepository('settings'),
      tenkanIn: new DataRepository('tenkan_in'),
      tenkanOut: new DataRepository('tenkan_out'),
      sanchoku: new DataRepository('sanchoku'),
      hana: new DataRepository('hana'),
      consumables: new DataRepository('consumables')
    };
  }

  /**
   * Normalize timestamp to midnight (start of day) to merge same-day data
   * @private
   */
  _normalizeDate(timestamp) {
    const d = new Date(timestamp);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
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

    // Gather dates from all data sources
    const allData = [
      ...(this._allShiire || []),
      ...(this._allUriage || []),
      ...(this._allTenkanIn || []),
      ...(this._allTenkanOut || []),
      ...(this._allSanchoku || []),
      ...(this._allHana || []),
      ...(this._allConsumables || [])
    ];
    if (allData.length === 0) return;

    let minDate = Infinity, maxDate = -Infinity;
    allData.forEach(item => {
      const nd = this._normalizeDate(item.date);
      if (nd < minDate) minDate = nd;
      if (nd > maxDate) maxDate = nd;
    });

    if (minDate !== Infinity) {
      this.state.dateRange = { start: minDate, end: maxDate };
      const inRange = (item) => {
        const nd = this._normalizeDate(item.date);
        return nd >= minDate && nd <= maxDate;
      };
      // Re-filter all data with the new date range
      this.state.data.shiire = (this._allShiire || []).filter(inRange);
      this.state.data.uriage = (this._allUriage || []).filter(inRange);
      this.state.data.baihen = (this._allBaihen || []).filter(inRange);
      this.state.data.tenkanIn = (this._allTenkanIn || []).filter(inRange);
      this.state.data.tenkanOut = (this._allTenkanOut || []).filter(inRange);
      this.state.data.sanchoku = (this._allSanchoku || []).filter(inRange);
      this.state.data.hana = (this._allHana || []).filter(inRange);
      this.state.data.consumables = (this._allConsumables || []).filter(inRange);
      console.log(`📅 Date range adjusted to: ${new Date(minDate).toLocaleDateString()} ~ ${new Date(maxDate).toLocaleDateString()}`);
    }
  }

  /**
   * Load data from IndexedDB
   * @private
   */
  async _loadData() {
    const { start, end } = this.state.dateRange;
    const inRange = (item) => {
      const nd = this._normalizeDate(item.date);
      return nd >= start && nd <= end;
    };

    try {
      // Load purchasing data
      const shiireData = await this.repositories.shiire.getAll();
      this._allShiire = shiireData;
      this.state.data.shiire = shiireData.filter(inRange);

      // Load sales data
      const uriageData = await this.repositories.uriage.getAll();
      this._allUriage = uriageData;
      this.state.data.uriage = uriageData.filter(inRange);

      // Load discount data
      const baihenData = await this.repositories.baihen.getAll();
      this._allBaihen = baihenData;
      this.state.data.baihen = baihenData.filter(inRange);

      // Load budget data
      this.state.data.budget = await this.repositories.budget.getAll();

      // Load settings (初期設定: 機首在庫, 期末在庫, 粗利額予算)
      this.state.data.settings = await this.repositories.settings.getAll();

      // Load transfer data (店間入/出)
      const tenkanInData = await this.repositories.tenkanIn.getAll();
      this._allTenkanIn = tenkanInData;
      this.state.data.tenkanIn = tenkanInData.filter(inRange);

      const tenkanOutData = await this.repositories.tenkanOut.getAll();
      this._allTenkanOut = tenkanOutData;
      this.state.data.tenkanOut = tenkanOutData.filter(inRange);

      // Load sanchoku data (産直)
      const sanchokuData = await this.repositories.sanchoku.getAll();
      this._allSanchoku = sanchokuData;
      this.state.data.sanchoku = sanchokuData.filter(inRange);

      // Load hana data (花)
      const hanaData = await this.repositories.hana.getAll();
      this._allHana = hanaData;
      this.state.data.hana = hanaData.filter(inRange);

      // Load consumables data (消耗品)
      const consumablesData = await this.repositories.consumables.getAll();
      this._allConsumables = consumablesData;
      this.state.data.consumables = consumablesData.filter(inRange);

      console.log('✅ Data loaded:', {
        shiire: this.state.data.shiire.length,
        uriage: this.state.data.uriage.length,
        baihen: this.state.data.baihen.length,
        budget: this.state.data.budget.length,
        settings: this.state.data.settings.length,
        tenkanIn: this.state.data.tenkanIn.length,
        tenkanOut: this.state.data.tenkanOut.length,
        sanchoku: this.state.data.sanchoku.length,
        hana: this.state.data.hana.length,
        consumables: this.state.data.consumables.length
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error;
    }
  }

  /**
   * Get hana rate from sidebar input
   * @private
   */
  _getHanaRate() {
    const el = document.getElementById('hana-rate');
    return el ? parseFloat(el.value) || 0.80 : 0.80;
  }

  /**
   * Get sanchoku rate from sidebar input
   * @private
   */
  _getSanchokuRate() {
    const el = document.getElementById('sanchoku-rate');
    return el ? parseFloat(el.value) || 0.85 : 0.85;
  }

  /**
   * Get store settings (機首在庫, 期末在庫, 粗利額予算) grouped by store
   * @private
   */
  _getStoreSettings() {
    const settings = this.state.data.settings || [];
    const map = new Map();
    settings.forEach(s => {
      map.set(String(s.store), {
        openingInventory: s.openingInventory || 0,
        closingInventory: s.closingInventory || 0,
        profitBudget: s.profitBudget || 0
      });
    });
    return map;
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
   * Render dashboard content (each section wrapped in try-catch for error isolation)
   * @private
   */
  _renderDashboard() {
    try { this._renderDateRange(); } catch (e) { console.error('DateRange render failed:', e); }
    try { this._renderStoreSelector(); } catch (e) { console.error('StoreSelector render failed:', e); }
    try { this._renderKPICards(); } catch (e) { console.error('KPI render failed:', e); }
    try { this._renderPivotTable(); } catch (e) { console.error('PivotTable render failed:', e); }
    try { this._renderCharts(); } catch (e) { console.error('Charts render failed:', e); }
    try { this._renderBudgetProgress(); } catch (e) { console.error('BudgetProgress render failed:', e); }
  }

  /**
   * Render store selector chips
   * @private
   */
  _renderStoreSelector() {
    const container = document.getElementById('store-selector');
    if (!container) return;

    // Get unique stores from all data types
    const stores = new Set();
    this.state.data.shiire.forEach(item => stores.add(item.store));
    this.state.data.uriage.forEach(item => stores.add(item.store));
    this.state.data.tenkanIn.forEach(item => stores.add(item.store));
    this.state.data.tenkanOut.forEach(item => stores.add(item.store));
    this.state.data.sanchoku.forEach(item => stores.add(item.store));
    this.state.data.hana.forEach(item => stores.add(item.store));
    this.state.data.consumables.forEach(item => stores.add(item.store));

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
        title: '粗利額(算入前)',
        value: metrics.grossProfitBefore,
        unit: '円',
        icon: '💎',
        trend: metrics.profitTrend,
        color: 'green'
      },
      {
        title: '粗利率(算入前)',
        value: metrics.profitRateBefore,
        unit: '%',
        icon: '📊',
        trend: metrics.rateTrend,
        color: 'purple'
      },
      {
        title: '粗利率(算入後)',
        value: metrics.profitRateAfter,
        unit: '%',
        icon: '📊',
        trend: 0,
        color: 'indigo'
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
        title: '消耗品費',
        value: metrics.totalConsumables,
        unit: '円',
        icon: '🧾',
        trend: 0,
        color: 'yellow'
      },
      {
        title: '期首在庫',
        value: metrics.openingInventory,
        unit: '円',
        icon: '📦',
        trend: 0,
        color: 'cyan'
      },
      {
        title: '推定期末在庫',
        value: metrics.estimatedClosingInventory,
        unit: '円',
        icon: '📦',
        trend: 0,
        color: 'pink'
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
            <span class="trend-value">${Math.abs(card.trend || 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Calculate metrics including all data types with 機首在庫/期末在庫
   * @private
   */
  _calculateMetrics() {
    const { shiire, uriage, baihen, budget, settings, tenkanIn, tenkanOut, sanchoku, hana, consumables } = this.state.data;

    const selectedStores = this.state.selectedStores;
    const filterByStore = (item) => {
      if (selectedStores.includes('all')) return true;
      return selectedStores.includes(item.store);
    };

    const filteredShiire = shiire.filter(filterByStore);
    const filteredUriage = uriage.filter(filterByStore);
    const filteredBaihen = baihen.filter(filterByStore);
    const filteredBudget = budget.filter(filterByStore);
    const filteredTenkanIn = tenkanIn.filter(filterByStore);
    const filteredTenkanOut = tenkanOut.filter(filterByStore);
    const filteredSanchoku = sanchoku.filter(filterByStore);
    const filteredHana = hana.filter(filterByStore);
    const filteredConsumables = consumables.filter(filterByStore);

    const hanaRate = this._getHanaRate();
    const sanchokuRate = this._getSanchokuRate();

    // --- Store settings (機首在庫, 期末在庫) ---
    const storeSettings = this._getStoreSettings();
    let openingInventory = 0;
    let closingInventory = 0;
    let profitBudgetTotal = 0;
    if (selectedStores.includes('all')) {
      storeSettings.forEach(s => {
        openingInventory += s.openingInventory;
        closingInventory += s.closingInventory;
        profitBudgetTotal += s.profitBudget;
      });
    } else {
      selectedStores.forEach(store => {
        const s = storeSettings.get(store);
        if (s) {
          openingInventory += s.openingInventory;
          closingInventory += s.closingInventory;
          profitBudgetTotal += s.profitBudget;
        }
      });
    }

    // Total sales from uriage
    const totalSales = filteredUriage.reduce((sum, item) => sum + (item.sales || 0), 0);

    // Total purchase cost from shiire (原価)
    const totalShiireCost = filteredShiire.reduce((sum, item) => sum + (item.cost || 0), 0);
    // Total shiire selling price (売価)
    const totalShiireAmount = filteredShiire.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Transfer costs
    const totalTenkanIn = filteredTenkanIn.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalTenkanOut = filteredTenkanOut.reduce((sum, item) => sum + (item.amount || 0), 0);

    // Sanchoku: cost = amount * rate (amount is selling price in the data)
    const totalSanchokuAmount = filteredSanchoku.reduce((sum, item) => sum + (item.amount || item.cost || 0), 0);
    const totalSanchokuCost = totalSanchokuAmount * sanchokuRate;

    // Hana: cost = amount * rate
    const totalHanaAmount = filteredHana.reduce((sum, item) => sum + (item.amount || item.cost || 0), 0);
    const totalHanaCost = totalHanaAmount * hanaRate;

    // Consumables
    const totalConsumables = filteredConsumables.reduce((sum, item) => sum + (item.cost || 0), 0);

    // --- 当期仕入高 (total purchase for the period) ---
    // = 仕入原価 + 店間入 - 店間出 + 産直原価 + 花原価
    const totalPurchaseCost = totalShiireCost + totalTenkanIn - totalTenkanOut + totalSanchokuCost + totalHanaCost;

    // --- 売価合計 (total selling price for pivot display) ---
    const totalSellingPrice = totalShiireAmount + totalSanchokuAmount + totalHanaAmount;

    // --- 売上原価 (COGS) using inventory formula ---
    // 売上原価 = 期首在庫 + 当期仕入高 - 期末在庫
    // If no settings, fallback to direct cost comparison
    const hasInventorySettings = openingInventory > 0 || closingInventory > 0;

    // COGS before consumables
    const cogsBefore = hasInventorySettings
      ? (openingInventory + totalPurchaseCost - closingInventory)
      : totalPurchaseCost;

    // COGS after consumables
    const cogsAfter = cogsBefore + totalConsumables;

    // Gross profit
    const grossProfitBefore = totalSales - cogsBefore;
    const grossProfitAfter = totalSales - cogsAfter;

    // Profit rates (based on sales)
    const profitRateBefore = totalSales > 0 ? (grossProfitBefore / totalSales) * 100 : 0;
    const profitRateAfter = totalSales > 0 ? (grossProfitAfter / totalSales) * 100 : 0;

    // Baihen rate
    const totalBaihen = Math.abs(filteredBaihen.reduce((sum, item) => sum + (item.amount || 0), 0));
    const baihenRate = (totalSales + totalBaihen) > 0 ? (totalBaihen / (totalSales + totalBaihen)) * 100 : 0;

    // Average daily sales
    const uniqueDays = new Set(filteredUriage.map(item => this._normalizeDate(item.date))).size;
    const avgDailySales = uniqueDays > 0 ? totalSales / uniqueDays : 0;

    // 推定期末在庫 = 期首在庫 + 当期仕入高 - 推定売上原価
    // 推定売上原価 = 売上 × 原価率（仕入データの原価/売価比率から算出）
    const overallCostRatio = totalSellingPrice > 0
      ? totalPurchaseCost / totalSellingPrice
      : 0.74; // デフォルト原価率 74%（粗利率26%相当）
    const estimatedCOGS = totalSales * overallCostRatio;
    const estimatedClosingInventory = openingInventory + totalPurchaseCost - estimatedCOGS;

    return {
      totalSales,
      grossProfitBefore,
      grossProfitAfter,
      profitRateBefore,
      profitRateAfter,
      totalPurchase: totalPurchaseCost,
      totalConsumables,
      baihenRate,
      avgDailySales,
      openingInventory,
      closingInventory,
      estimatedClosingInventory,
      profitBudgetTotal,
      salesTrend: 0,
      profitTrend: 0,
      rateTrend: 0,
      purchaseTrend: 0
    };
  }

  /**
   * Render pivot table (日付別×帳合先別 with 原価/売価 sub-columns + 店間/産直/花/消耗品)
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

    if (filteredShiire.length === 0 &&
        this.state.data.tenkanIn.length === 0 &&
        this.state.data.tenkanOut.length === 0 &&
        this.state.data.sanchoku.length === 0 &&
        this.state.data.hana.length === 0 &&
        this.state.data.consumables.length === 0) {
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
   * Render supplier-based pivot table with all data types
   * Dates are normalized to merge same-day rows from different data sources
   * @private
   */
  _renderSupplierPivotHTML(data) {
    const selectedStores = this.state.selectedStores;
    const storeFilter = (item) => selectedStores.includes('all') || selectedStores.includes(item.store);

    const hanaRate = this._getHanaRate();
    const sanchokuRate = this._getSanchokuRate();

    // === Collect unique suppliers from shiire ===
    const supplierMap = new Map();
    data.forEach(item => {
      const key = item.supplier || 'unknown';
      if (!supplierMap.has(key)) {
        supplierMap.set(key, item.supplierName || item.supplier || '不明');
      }
    });
    const suppliers = Array.from(supplierMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'ja'));

    // === Filter extra data by store ===
    const tenkanIn = this.state.data.tenkanIn.filter(storeFilter);
    const tenkanOut = this.state.data.tenkanOut.filter(storeFilter);
    const sanchokuData = this.state.data.sanchoku.filter(storeFilter);
    const hanaData = this.state.data.hana.filter(storeFilter);
    const consumablesData = this.state.data.consumables.filter(storeFilter);

    // === Determine which extra columns to show ===
    const hasTenkanIn = tenkanIn.length > 0;
    const hasTenkanOut = tenkanOut.length > 0;
    const hasSanchoku = sanchokuData.length > 0;
    const hasHana = hanaData.length > 0;
    const hasConsumables = consumablesData.length > 0;

    // === Collect unique NORMALIZED dates from all sources ===
    const dateSet = new Set();
    data.forEach(item => dateSet.add(this._normalizeDate(item.date)));
    tenkanIn.forEach(item => dateSet.add(this._normalizeDate(item.date)));
    tenkanOut.forEach(item => dateSet.add(this._normalizeDate(item.date)));
    sanchokuData.forEach(item => dateSet.add(this._normalizeDate(item.date)));
    hanaData.forEach(item => dateSet.add(this._normalizeDate(item.date)));
    consumablesData.forEach(item => dateSet.add(this._normalizeDate(item.date)));
    const dates = Array.from(dateSet).sort((a, b) => a - b);

    // === Build data maps using NORMALIZED dates ===
    // Shiire: "normalizedDate::supplier" -> { cost, amount }
    const shiireMap = new Map();
    data.forEach(item => {
      const nd = this._normalizeDate(item.date);
      const key = `${nd}::${item.supplier || 'unknown'}`;
      if (!shiireMap.has(key)) shiireMap.set(key, { cost: 0, amount: 0 });
      const entry = shiireMap.get(key);
      entry.cost += item.cost || 0;
      entry.amount += item.amount || 0;
    });

    // TenkanIn: normalizedDate -> amount
    const tenkanInMap = new Map();
    tenkanIn.forEach(item => {
      const nd = this._normalizeDate(item.date);
      tenkanInMap.set(nd, (tenkanInMap.get(nd) || 0) + (item.amount || 0));
    });

    // TenkanOut: normalizedDate -> amount
    const tenkanOutMap = new Map();
    tenkanOut.forEach(item => {
      const nd = this._normalizeDate(item.date);
      tenkanOutMap.set(nd, (tenkanOutMap.get(nd) || 0) + (item.amount || 0));
    });

    // Sanchoku: normalizedDate -> amount (selling price)
    const sanchokuMap = new Map();
    sanchokuData.forEach(item => {
      const nd = this._normalizeDate(item.date);
      sanchokuMap.set(nd, (sanchokuMap.get(nd) || 0) + (item.amount || item.cost || 0));
    });

    // Hana: normalizedDate -> amount (selling price)
    const hanaMap = new Map();
    hanaData.forEach(item => {
      const nd = this._normalizeDate(item.date);
      hanaMap.set(nd, (hanaMap.get(nd) || 0) + (item.amount || item.cost || 0));
    });

    // Consumables: normalizedDate -> cost
    const consumablesMap = new Map();
    consumablesData.forEach(item => {
      const nd = this._normalizeDate(item.date);
      consumablesMap.set(nd, (consumablesMap.get(nd) || 0) + (item.cost || 0));
    });

    // === Settings for inventory row ===
    const storeSettings = this._getStoreSettings();
    let openingInventory = 0, closingInventory = 0;
    if (selectedStores.includes('all')) {
      storeSettings.forEach(s => { openingInventory += s.openingInventory; closingInventory += s.closingInventory; });
    } else {
      selectedStores.forEach(store => {
        const s = storeSettings.get(store);
        if (s) { openingInventory += s.openingInventory; closingInventory += s.closingInventory; }
      });
    }
    const hasInventory = openingInventory > 0 || closingInventory > 0;

    // === Build HTML ===
    let html = '<div class="pivot-table-wrapper"><table class="pivot-table">';

    // --- Header row 1: Category names ---
    html += '<thead><tr>';
    html += '<th rowspan="2" style="min-width:70px">日付</th>';

    // Supplier headers
    suppliers.forEach(([code, name], idx) => {
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<th colspan="2" style="text-align:center;border-bottom:1px solid var(--bg-border);background:${bg}">${name}</th>`;
    });

    // Extra columns
    if (hasTenkanIn) html += '<th rowspan="2" style="text-align:center;background:rgba(6,182,212,0.1);border-bottom:1px solid var(--bg-border)">📥 店間入</th>';
    if (hasTenkanOut) html += '<th rowspan="2" style="text-align:center;background:rgba(239,68,68,0.08);border-bottom:1px solid var(--bg-border)">📤 店間出</th>';
    if (hasSanchoku) html += '<th colspan="2" style="text-align:center;background:rgba(163,230,53,0.08);border-bottom:1px solid var(--bg-border)">🥬 産直</th>';
    if (hasHana) html += '<th colspan="2" style="text-align:center;background:rgba(244,114,182,0.08);border-bottom:1px solid var(--bg-border)">🌸 花</th>';
    if (hasConsumables) html += '<th rowspan="2" style="text-align:center;background:rgba(249,115,22,0.08);border-bottom:1px solid var(--bg-border)">🧾 消耗品</th>';

    // Total header
    html += '<th colspan="2" style="text-align:center;border-bottom:1px solid var(--bg-border);background:var(--primary-blue);color:white">合計</th>';
    html += '</tr>';

    // --- Header row 2: Sub-columns ---
    html += '<tr>';
    suppliers.forEach(([code, name], idx) => {
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<th style="text-align:right;font-size:11px;padding:6px 10px;background:${bg}">原価</th>`;
      html += `<th style="text-align:right;font-size:11px;padding:6px 10px;background:${bg}">売価</th>`;
    });
    // TenkanIn/Out are single columns (rowspan=2), no sub-header
    if (hasSanchoku) {
      html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:rgba(163,230,53,0.06)">原価</th>';
      html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:rgba(163,230,53,0.06)">売価</th>';
    }
    if (hasHana) {
      html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:rgba(244,114,182,0.06)">原価</th>';
      html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:rgba(244,114,182,0.06)">売価</th>';
    }
    // Consumables is single column (rowspan=2)
    html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:var(--primary-blue);color:white">原価</th>';
    html += '<th style="text-align:right;font-size:11px;padding:6px 10px;background:var(--primary-blue);color:white">売価</th>';
    html += '</tr></thead>';

    // --- Data rows ---
    html += '<tbody>';

    // Accumulators for totals
    const supplierTotals = new Map();
    suppliers.forEach(([code]) => supplierTotals.set(code, { cost: 0, amount: 0 }));
    let totalTenkanInSum = 0, totalTenkanOutSum = 0;
    let totalSanchokuAmount = 0, totalHanaAmount = 0;
    let totalConsumablesSum = 0;
    let grandTotalCost = 0, grandTotalAmount = 0;

    const fmtNum = (v) => v ? Math.round(v).toLocaleString() : '';

    dates.forEach(date => {
      const d = new Date(date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      let rowCost = 0, rowAmount = 0;

      html += '<tr>';
      html += `<td class="pivot-cell-dim pivot-cell-sticky">${dateStr}</td>`;

      // Supplier columns
      suppliers.forEach(([code], idx) => {
        const key = `${date}::${code}`;
        const val = shiireMap.get(key) || { cost: 0, amount: 0 };
        rowCost += val.cost;
        rowAmount += val.amount;
        const st = supplierTotals.get(code);
        st.cost += val.cost;
        st.amount += val.amount;
        const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.03)' : 'rgba(16,185,129,0.03)';
        html += `<td class="pivot-cell-value" style="background:${bg}">${fmtNum(val.cost)}</td>`;
        html += `<td class="pivot-cell-value" style="background:${bg}">${fmtNum(val.amount)}</td>`;
      });

      // TenkanIn column
      if (hasTenkanIn) {
        const v = tenkanInMap.get(date) || 0;
        totalTenkanInSum += v;
        rowCost += v; // adds to cost
        html += `<td class="pivot-cell-value" style="background:rgba(6,182,212,0.03)">${fmtNum(v)}</td>`;
      }

      // TenkanOut column
      if (hasTenkanOut) {
        const v = tenkanOutMap.get(date) || 0;
        totalTenkanOutSum += v;
        rowCost -= v; // subtracts from cost
        html += `<td class="pivot-cell-value" style="background:rgba(239,68,68,0.03);color:var(--danger-red)">${v ? '-' + fmtNum(v) : ''}</td>`;
      }

      // Sanchoku columns
      if (hasSanchoku) {
        const sAmount = sanchokuMap.get(date) || 0;
        const sCost = sAmount * sanchokuRate;
        totalSanchokuAmount += sAmount;
        rowCost += sCost;
        rowAmount += sAmount;
        html += `<td class="pivot-cell-value" style="background:rgba(163,230,53,0.03)">${fmtNum(sCost)}</td>`;
        html += `<td class="pivot-cell-value" style="background:rgba(163,230,53,0.03)">${fmtNum(sAmount)}</td>`;
      }

      // Hana columns
      if (hasHana) {
        const hAmount = hanaMap.get(date) || 0;
        const hCost = hAmount * hanaRate;
        totalHanaAmount += hAmount;
        rowCost += hCost;
        rowAmount += hAmount;
        html += `<td class="pivot-cell-value" style="background:rgba(244,114,182,0.03)">${fmtNum(hCost)}</td>`;
        html += `<td class="pivot-cell-value" style="background:rgba(244,114,182,0.03)">${fmtNum(hAmount)}</td>`;
      }

      // Consumables column
      if (hasConsumables) {
        const cCost = consumablesMap.get(date) || 0;
        totalConsumablesSum += cCost;
        html += `<td class="pivot-cell-value" style="background:rgba(249,115,22,0.03)">${fmtNum(cCost)}</td>`;
      }

      grandTotalCost += rowCost;
      grandTotalAmount += rowAmount;

      // Row total
      html += `<td class="pivot-cell-value" style="font-weight:600;color:var(--color-amber)">${fmtNum(rowCost)}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:600;color:var(--color-amber)">${fmtNum(rowAmount)}</td>`;
      html += '</tr>';
    });

    // === Total row ===
    html += '<tr class="pivot-row-total">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:var(--bg-hover);font-weight:700">合計</td>';

    suppliers.forEach(([code], idx) => {
      const st = supplierTotals.get(code);
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.08)' : 'rgba(16,185,129,0.08)';
      html += `<td class="pivot-cell-value" style="font-weight:700;background:${bg}">${fmtNum(st.cost)}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:700;background:${bg}">${fmtNum(st.amount)}</td>`;
    });

    if (hasTenkanIn) html += `<td class="pivot-cell-value" style="font-weight:700;background:rgba(6,182,212,0.06)">${fmtNum(totalTenkanInSum)}</td>`;
    if (hasTenkanOut) html += `<td class="pivot-cell-value" style="font-weight:700;background:rgba(239,68,68,0.06);color:var(--danger-red)">-${fmtNum(totalTenkanOutSum)}</td>`;
    if (hasSanchoku) {
      html += `<td class="pivot-cell-value" style="font-weight:700;background:rgba(163,230,53,0.06)">${fmtNum(totalSanchokuAmount * sanchokuRate)}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:700;background:rgba(163,230,53,0.06)">${fmtNum(totalSanchokuAmount)}</td>`;
    }
    if (hasHana) {
      html += `<td class="pivot-cell-value" style="font-weight:700;background:rgba(244,114,182,0.06)">${fmtNum(totalHanaAmount * hanaRate)}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:700;background:rgba(244,114,182,0.06)">${fmtNum(totalHanaAmount)}</td>`;
    }
    if (hasConsumables) html += `<td class="pivot-cell-value" style="font-weight:700;background:rgba(249,115,22,0.06)">${fmtNum(totalConsumablesSum)}</td>`;

    html += `<td class="pivot-cell-value" style="font-weight:700;color:var(--color-amber)">${fmtNum(grandTotalCost)}</td>`;
    html += `<td class="pivot-cell-value" style="font-weight:700;color:var(--color-amber)">${fmtNum(grandTotalAmount)}</td>`;
    html += '</tr>';

    // === Cost ratio row (原価率) ===
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
    // Extra columns get merged cells for rate display
    const extraSingleCols = (hasTenkanIn ? 1 : 0) + (hasTenkanOut ? 1 : 0) + (hasConsumables ? 1 : 0);
    const extraDoubleCols = (hasSanchoku ? 2 : 0) + (hasHana ? 2 : 0);
    const extraColSpan = extraSingleCols + extraDoubleCols;
    if (extraColSpan > 0) {
      html += `<td class="pivot-cell-value" colspan="${extraColSpan}" style="text-align:center;color:var(--text-tertiary)">-</td>`;
    }
    const totalRate = grandTotalAmount > 0 ? ((grandTotalCost / grandTotalAmount) * 100).toFixed(1) : '-';
    html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;font-weight:700;color:var(--color-amber)">${totalRate}%</td>`;
    html += '</tr>';

    // === Gross profit rate BEFORE consumables (粗利率 算入前) ===
    // Uses inventory: COGS = 期首在庫 + 原価合計 - 期末在庫
    const costBeforeConsumables = hasInventory
      ? (openingInventory + grandTotalCost - closingInventory)
      : grandTotalCost;
    html += '<tr class="pivot-row-rate">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:rgba(16,185,129,0.08);font-weight:700">粗利率(算入前)</td>';
    suppliers.forEach(([code], idx) => {
      const st = supplierTotals.get(code);
      const rate = st.amount > 0 ? (((st.amount - st.cost) / st.amount) * 100).toFixed(1) : '-';
      const rateNum = st.amount > 0 ? ((st.amount - st.cost) / st.amount) * 100 : 0;
      const color = rateNum >= 30 ? 'var(--success-green)' : rateNum >= 15 ? 'var(--warning-yellow)' : 'var(--danger-red)';
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;color:${color};font-weight:700;background:${bg}">${rate}%</td>`;
    });
    if (extraColSpan > 0) {
      html += `<td class="pivot-cell-value" colspan="${extraColSpan}" style="text-align:center;color:var(--text-tertiary)">-</td>`;
    }
    const profitRateBefore = grandTotalAmount > 0 ? (((grandTotalAmount - costBeforeConsumables) / grandTotalAmount) * 100).toFixed(1) : '-';
    const profitColorBefore = parseFloat(profitRateBefore) >= 25 ? 'var(--success-green)' : parseFloat(profitRateBefore) >= 15 ? 'var(--warning-yellow)' : 'var(--danger-red)';
    html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;font-weight:700;color:${profitColorBefore}">${profitRateBefore}%</td>`;
    html += '</tr>';

    // === Gross profit rate AFTER consumables (粗利率 算入後) ===
    const costAfterConsumables = costBeforeConsumables + totalConsumablesSum;
    html += '<tr class="pivot-row-rate" style="background:rgba(16,185,129,0.12)">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:rgba(16,185,129,0.12);font-weight:700">粗利率(算入後)</td>';
    suppliers.forEach(([code], idx) => {
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;color:var(--text-tertiary);background:${bg}">-</td>`;
    });
    if (extraColSpan > 0) {
      html += `<td class="pivot-cell-value" colspan="${extraColSpan}" style="text-align:center;color:var(--text-tertiary)">-</td>`;
    }
    const profitRateAfter = grandTotalAmount > 0 ? (((grandTotalAmount - costAfterConsumables) / grandTotalAmount) * 100).toFixed(1) : '-';
    const profitColorAfter = parseFloat(profitRateAfter) >= 25 ? 'var(--success-green)' : parseFloat(profitRateAfter) >= 15 ? 'var(--warning-yellow)' : 'var(--danger-red)';
    html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;font-weight:700;font-size:14px;color:${profitColorAfter}">${profitRateAfter}%</td>`;
    html += '</tr>';

    // === Inventory info row (期首/期末在庫) if settings exist ===
    if (hasInventory) {
      html += '<tr style="background:rgba(6,182,212,0.08)">';
      const totalColCount = suppliers.length * 2 + extraColSpan + 2; // +2 for 合計
      html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:rgba(6,182,212,0.08);font-weight:700">在庫情報</td>';
      html += `<td class="pivot-cell-value" colspan="${totalColCount}" style="text-align:left;font-size:12px;padding:8px 12px">`;
      html += `📦 期首在庫: <strong>${Math.round(openingInventory).toLocaleString()}</strong>円`;
      html += ` ｜ 📦 期末在庫: <strong>${Math.round(closingInventory).toLocaleString()}</strong>円`;
      html += ` ｜ 差額(在庫増減): <strong>${Math.round(openingInventory - closingInventory).toLocaleString()}</strong>円`;
      html += '</td></tr>';
    }

    html += '</tbody></table></div>';
    return html;
  }

  /**
   * Render store-based pivot table (日付×店舗 with 原価/売価)
   * @private
   */
  _renderStorePivotHTML(data) {
    const hanaRate = this._getHanaRate();
    const sanchokuRate = this._getSanchokuRate();

    // Collect unique stores from all data
    const storeSet = new Set();
    data.forEach(item => storeSet.add(item.store));
    this.state.data.tenkanIn.forEach(item => storeSet.add(item.store));
    this.state.data.tenkanOut.forEach(item => storeSet.add(item.store));
    this.state.data.sanchoku.forEach(item => storeSet.add(item.store));
    this.state.data.hana.forEach(item => storeSet.add(item.store));
    this.state.data.consumables.forEach(item => storeSet.add(item.store));
    const stores = Array.from(storeSet).sort();

    // Collect unique NORMALIZED dates
    const dateSet = new Set();
    [data, this.state.data.tenkanIn, this.state.data.tenkanOut,
     this.state.data.sanchoku, this.state.data.hana, this.state.data.consumables
    ].forEach(arr => arr.forEach(item => dateSet.add(this._normalizeDate(item.date))));
    const dates = Array.from(dateSet).sort((a, b) => a - b);

    // Build data maps: "normalizedDate::store" -> { cost, amount }
    const buildMap = (arr, getCost, getAmount) => {
      const map = new Map();
      arr.forEach(item => {
        const nd = this._normalizeDate(item.date);
        const key = `${nd}::${item.store}`;
        if (!map.has(key)) map.set(key, { cost: 0, amount: 0 });
        const e = map.get(key);
        e.cost += getCost(item);
        e.amount += getAmount(item);
      });
      return map;
    };

    const shiireMap = buildMap(data, i => i.cost || 0, i => i.amount || 0);
    const tenkanInMap = buildMap(this.state.data.tenkanIn, i => i.amount || 0, () => 0);
    const tenkanOutMap = buildMap(this.state.data.tenkanOut, i => -(i.amount || 0), () => 0);
    const sanchokuMap = buildMap(this.state.data.sanchoku, i => (i.amount || i.cost || 0) * sanchokuRate, i => i.amount || i.cost || 0);
    const hanaMap = buildMap(this.state.data.hana, i => (i.amount || i.cost || 0) * hanaRate, i => i.amount || i.cost || 0);
    const consumablesMap = buildMap(this.state.data.consumables, i => i.cost || 0, () => 0);

    // Store settings
    const storeSettingsMap = this._getStoreSettings();

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
    stores.forEach(s => storeTotals.set(s, { cost: 0, amount: 0, consumables: 0 }));
    let grandCost = 0, grandAmount = 0, grandConsumables = 0;
    const fmtNum = (v) => v ? Math.round(v).toLocaleString() : '';

    dates.forEach(date => {
      const d = new Date(date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      let rowCost = 0, rowAmount = 0;

      html += '<tr>';
      html += `<td class="pivot-cell-dim pivot-cell-sticky">${dateStr}</td>`;

      stores.forEach((store, idx) => {
        const key = `${date}::${store}`;
        const shiire = shiireMap.get(key) || { cost: 0, amount: 0 };
        const tIn = tenkanInMap.get(key) || { cost: 0, amount: 0 };
        const tOut = tenkanOutMap.get(key) || { cost: 0, amount: 0 };
        const san = sanchokuMap.get(key) || { cost: 0, amount: 0 };
        const han = hanaMap.get(key) || { cost: 0, amount: 0 };
        const con = consumablesMap.get(key) || { cost: 0, amount: 0 };

        const totalCost = shiire.cost + tIn.cost + tOut.cost + san.cost + han.cost;
        const totalAmount = shiire.amount + san.amount + han.amount;

        rowCost += totalCost;
        rowAmount += totalAmount;
        const st = storeTotals.get(store);
        st.cost += totalCost;
        st.amount += totalAmount;
        st.consumables += con.cost;

        const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.03)' : 'rgba(16,185,129,0.03)';
        html += `<td class="pivot-cell-value" style="background:${bg}">${fmtNum(totalCost)}</td>`;
        html += `<td class="pivot-cell-value" style="background:${bg}">${fmtNum(totalAmount)}</td>`;
      });

      grandCost += rowCost;
      grandAmount += rowAmount;
      html += `<td class="pivot-cell-value" style="font-weight:600;color:var(--color-amber)">${fmtNum(rowCost)}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:600;color:var(--color-amber)">${fmtNum(rowAmount)}</td>`;
      html += '</tr>';
    });

    // Total row
    html += '<tr class="pivot-row-total">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:var(--bg-hover);font-weight:700">合計</td>';
    stores.forEach((store, idx) => {
      const st = storeTotals.get(store);
      grandConsumables += st.consumables;
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.08)' : 'rgba(16,185,129,0.08)';
      html += `<td class="pivot-cell-value" style="font-weight:700;background:${bg}">${fmtNum(st.cost)}</td>`;
      html += `<td class="pivot-cell-value" style="font-weight:700;background:${bg}">${fmtNum(st.amount)}</td>`;
    });
    html += `<td class="pivot-cell-value" style="font-weight:700;color:var(--color-amber)">${fmtNum(grandCost)}</td>`;
    html += `<td class="pivot-cell-value" style="font-weight:700;color:var(--color-amber)">${fmtNum(grandAmount)}</td>`;
    html += '</tr>';

    // Profit rate before consumables (with inventory)
    html += '<tr class="pivot-row-rate">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:rgba(16,185,129,0.08);font-weight:700">粗利率(算入前)</td>';
    stores.forEach((store, idx) => {
      const st = storeTotals.get(store);
      const ss = storeSettingsMap.get(store);
      let costWithInventory = st.cost;
      if (ss && (ss.openingInventory > 0 || ss.closingInventory > 0)) {
        costWithInventory = ss.openingInventory + st.cost - ss.closingInventory;
      }
      const rate = st.amount > 0 ? (((st.amount - costWithInventory) / st.amount) * 100).toFixed(1) : '-';
      const rateNum = st.amount > 0 ? ((st.amount - costWithInventory) / st.amount) * 100 : 0;
      const color = rateNum >= 25 ? 'var(--success-green)' : rateNum >= 15 ? 'var(--warning-yellow)' : 'var(--danger-red)';
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;color:${color};font-weight:700;background:${bg}">${rate}%</td>`;
    });
    // Grand profit before with inventory
    let grandOpeningInv = 0, grandClosingInv = 0;
    stores.forEach(store => {
      const ss = storeSettingsMap.get(store);
      if (ss) { grandOpeningInv += ss.openingInventory; grandClosingInv += ss.closingInventory; }
    });
    const grandCostWithInv = (grandOpeningInv > 0 || grandClosingInv > 0)
      ? (grandOpeningInv + grandCost - grandClosingInv) : grandCost;
    const profitBefore = grandAmount > 0 ? (((grandAmount - grandCostWithInv) / grandAmount) * 100).toFixed(1) : '-';
    html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;font-weight:700;color:var(--color-amber)">${profitBefore}%</td>`;
    html += '</tr>';

    // Profit rate after consumables (with inventory)
    html += '<tr class="pivot-row-rate" style="background:rgba(16,185,129,0.12)">';
    html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:rgba(16,185,129,0.12);font-weight:700">粗利率(算入後)</td>';
    stores.forEach((store, idx) => {
      const st = storeTotals.get(store);
      const ss = storeSettingsMap.get(store);
      let costWithInventory = st.cost;
      if (ss && (ss.openingInventory > 0 || ss.closingInventory > 0)) {
        costWithInventory = ss.openingInventory + st.cost - ss.closingInventory;
      }
      const totalWithCon = costWithInventory + st.consumables;
      const rate = st.amount > 0 ? (((st.amount - totalWithCon) / st.amount) * 100).toFixed(1) : '-';
      const rateNum = st.amount > 0 ? ((st.amount - totalWithCon) / st.amount) * 100 : 0;
      const color = rateNum >= 25 ? 'var(--success-green)' : rateNum >= 15 ? 'var(--warning-yellow)' : 'var(--danger-red)';
      const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.06)' : 'rgba(16,185,129,0.06)';
      html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;color:${color};font-weight:700;background:${bg}">${rate}%</td>`;
    });
    const profitAfter = grandAmount > 0 ? (((grandAmount - grandCostWithInv - grandConsumables) / grandAmount) * 100).toFixed(1) : '-';
    html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;font-weight:700;font-size:14px;color:var(--color-amber)">${profitAfter}%</td>`;
    html += '</tr>';

    // Inventory info row per store
    if (grandOpeningInv > 0 || grandClosingInv > 0) {
      html += '<tr style="background:rgba(6,182,212,0.08)">';
      html += '<td class="pivot-cell-dim pivot-cell-sticky" style="background:rgba(6,182,212,0.08);font-weight:700">在庫情報</td>';
      stores.forEach((store, idx) => {
        const ss = storeSettingsMap.get(store);
        const bg = idx % 2 === 0 ? 'rgba(79,70,229,0.03)' : 'rgba(16,185,129,0.03)';
        if (ss && (ss.openingInventory > 0 || ss.closingInventory > 0)) {
          html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;font-size:10px;background:${bg}">首:${fmtNum(ss.openingInventory)} / 末:${fmtNum(ss.closingInventory)}</td>`;
        } else {
          html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;background:${bg}">-</td>`;
        }
      });
      html += `<td class="pivot-cell-value" colspan="2" style="text-align:center;font-size:11px">首:${fmtNum(grandOpeningInv)} / 末:${fmtNum(grandClosingInv)}</td>`;
      html += '</tr>';
    }

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

    // Aggregate by normalized date
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
   * Render inventory chart using 機首在庫 + cumulative purchases - cumulative sales cost
   * @private
   */
  _renderInventoryChart() {
    const { shiire, uriage } = this.state.data;

    if (shiire.length === 0 && uriage.length === 0) return;

    // Calculate daily inventory estimation with 機首在庫
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

    const budgetTotal = this.state.data.budget.reduce((sum, item) => sum + (item.sales || 0), 0);
    const achievement = budgetTotal > 0 ? Math.min((metrics.totalSales / budgetTotal) * 100, 150) : 0;
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
          <span>${budgetTotal.toLocaleString('ja-JP')}円</span>
        </div>
        <div class="budget-row">
          <span>実績:</span>
          <span>${metrics.totalSales.toLocaleString('ja-JP')}円</span>
        </div>
      </div>
    `;
  }

  /**
   * 仕入データから全体の原価率を算出
   * @private
   * @returns {number} 原価率 (0-1)
   */
  _getOverallCostRatio() {
    const { shiire, sanchoku, hana } = this.state.data;
    const selectedStores = this.state.selectedStores;
    const filterByStore = (item) => {
      if (selectedStores.includes('all')) return true;
      return selectedStores.includes(item.store);
    };

    const hanaRate = this._getHanaRate();
    const sanchokuRate = this._getSanchokuRate();

    const filteredShiire = shiire.filter(filterByStore);
    const totalShiireCost = filteredShiire.reduce((sum, i) => sum + (i.cost || 0), 0);
    const totalShiireAmount = filteredShiire.reduce((sum, i) => sum + (i.amount || 0), 0);

    const filteredSanchoku = sanchoku.filter(filterByStore);
    const totalSanchokuAmount = filteredSanchoku.reduce((sum, i) => sum + (i.amount || i.cost || 0), 0);

    const filteredHana = hana.filter(filterByStore);
    const totalHanaAmount = filteredHana.reduce((sum, i) => sum + (i.amount || i.cost || 0), 0);

    const totalSellingPrice = totalShiireAmount + totalSanchokuAmount + totalHanaAmount;
    const totalCost = totalShiireCost + totalSanchokuAmount * sanchokuRate + totalHanaAmount * hanaRate;

    return totalSellingPrice > 0 ? totalCost / totalSellingPrice : 0.74;
  }

  /**
   * Aggregate data by normalized date
   * @private
   */
  _aggregateByDate(data) {
    const grouped = new Map();

    data.forEach(item => {
      const nd = this._normalizeDate(item.date);
      const dateLabel = new Date(nd).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

      if (!grouped.has(nd)) {
        grouped.set(nd, { nd, date: dateLabel, sales: 0, cost: 0, profit: 0 });
      }

      const agg = grouped.get(nd);
      agg.sales += item.sales || 0;
      agg.cost += item.cost || 0;
      agg.profit += item.profit || 0;
    });

    const result = Array.from(grouped.values()).sort((a, b) => a.nd - b.nd);

    // 粗利が全て0の場合（売上・売変統合インポート時）、原価率から推定
    const totalProfit = result.reduce((sum, d) => sum + d.profit, 0);
    if (totalProfit === 0) {
      const costRatio = this._getOverallCostRatio();
      result.forEach(agg => {
        if (agg.sales > 0) {
          agg.profit = Math.round(agg.sales * (1 - costRatio));
        }
      });
    }

    return result;
  }

  /**
   * Calculate daily inventory using 機首在庫 as starting point
   * Inventory = 期首在庫 + cumulative(仕入原価 + 店間入 - 店間出 + 産直原価 + 花原価) - cumulative(売上原価)
   * @private
   */
  _calculateDailyInventory() {
    const { shiire, uriage, tenkanIn, tenkanOut, sanchoku, hana } = this.state.data;

    const selectedStores = this.state.selectedStores;
    const filterByStore = (item) => {
      if (selectedStores.includes('all')) return true;
      return selectedStores.includes(item.store);
    };

    // Get opening inventory from settings
    const storeSettings = this._getStoreSettings();
    let openingInventory = 0;
    if (selectedStores.includes('all')) {
      storeSettings.forEach(s => { openingInventory += s.openingInventory; });
    } else {
      selectedStores.forEach(store => {
        const s = storeSettings.get(store);
        if (s) openingInventory += s.openingInventory;
      });
    }

    const hanaRate = this._getHanaRate();
    const sanchokuRate = this._getSanchokuRate();

    // 原価率を算出（仕入データの原価/売価比率）
    const costRatio = this._getOverallCostRatio();

    // Collect all normalized dates
    const dateSet = new Set();
    [shiire, uriage, tenkanIn, tenkanOut, sanchoku, hana].forEach(arr =>
      arr.filter(filterByStore).forEach(item => dateSet.add(this._normalizeDate(item.date)))
    );
    const sortedDates = Array.from(dateSet).sort((a, b) => a - b);

    let inventory = openingInventory;
    const result = [];

    sortedDates.forEach(nd => {
      const dateLabel = new Date(nd).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

      // Daily purchases (adds to inventory)
      const dayShiire = shiire.filter(i => filterByStore(i) && this._normalizeDate(i.date) === nd)
        .reduce((sum, i) => sum + (i.cost || 0), 0);
      const dayTenkanIn = tenkanIn.filter(i => filterByStore(i) && this._normalizeDate(i.date) === nd)
        .reduce((sum, i) => sum + (i.amount || 0), 0);
      const dayTenkanOut = tenkanOut.filter(i => filterByStore(i) && this._normalizeDate(i.date) === nd)
        .reduce((sum, i) => sum + (i.amount || 0), 0);
      const daySanchoku = sanchoku.filter(i => filterByStore(i) && this._normalizeDate(i.date) === nd)
        .reduce((sum, i) => sum + ((i.amount || i.cost || 0) * sanchokuRate), 0);
      const dayHana = hana.filter(i => filterByStore(i) && this._normalizeDate(i.date) === nd)
        .reduce((sum, i) => sum + ((i.amount || i.cost || 0) * hanaRate), 0);

      // 日次推定売上原価 = 日次売上 × 原価率
      // (uriage.cost は売上・売変統合インポート時に0になるため、原価率から推定)
      const dayUriageSales = uriage.filter(i => filterByStore(i) && this._normalizeDate(i.date) === nd)
        .reduce((sum, i) => sum + (i.sales || 0), 0);
      const dayEstimatedCOGS = dayUriageSales * costRatio;

      inventory += dayShiire + dayTenkanIn - dayTenkanOut + daySanchoku + dayHana - dayEstimatedCOGS;

      result.push({ date: dateLabel, inventory });
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
        try { chart.destroy(); } catch (e) { /* ignore */ }
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
