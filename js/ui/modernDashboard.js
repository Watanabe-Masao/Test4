/**
 * @file モダンダッシュボード - 高品質UI
 * @description 完全に刷新された統合ダッシュボード
 */

import { calculator, reportGenerator, DataRepository } from '../services/database/index.js';
import { formatNumber, formatDate, formatPercent } from '../utils/helpers.js';
import { appState } from '../models/state.js';

/**
 * モダンダッシュボードクラス
 */
export class ModernDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentPeriod = this._getCurrentMonthPeriod();
    this.selectedStore = null;
    this.data = null;
    this.charts = {};
  }

  /**
   * ダッシュボードを初期化
   */
  async initialize() {
    if (!this.container) {
      throw new Error('Dashboard container not found');
    }

    await this.loadData();
    await this.render();
  }

  /**
   * 現在の月の期間を取得
   * @private
   */
  _getCurrentMonthPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end, year, month: month + 1 };
  }

  /**
   * データをロード
   */
  async loadData() {
    console.log('📊 Loading dashboard data...');

    try {
      const { start, end } = this.currentPeriod;

      // IndexedDBから直接データを取得
      const shiireRepo = new DataRepository('shiire');
      const uriageRepo = new DataRepository('uriage');

      const startTime = start.getTime();
      const endTime = end.getTime();

      // 仕入データ取得
      const shiireData = await shiireRepo.getAll();
      const filteredShiire = shiireData.filter(item => {
        const itemDate = new Date(item.date).getTime();
        return itemDate >= startTime && itemDate <= endTime;
      });

      // 売上データ取得
      const uriageData = await uriageRepo.getAll();
      const filteredUriage = uriageData.filter(item => {
        const itemDate = new Date(item.date).getTime();
        return itemDate >= startTime && itemDate <= endTime;
      });

      console.log(`✅ Loaded ${filteredShiire.length} shiire records`);
      console.log(`✅ Loaded ${filteredUriage.length} uriage records`);

      // データ集計
      this.data = await this._aggregateData(filteredShiire, filteredUriage);

      // 推定計算実行
      if (this.data.monthly) {
        this._calculateEstimates();
      }

      console.log('✅ Data loaded successfully', this.data);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      throw error;
    }
  }

  /**
   * データを集計
   * @private
   */
  async _aggregateData(shiireData, uriageData) {
    // 日別にグループ化
    const dailyMap = new Map();

    // 仕入データを集計
    shiireData.forEach(item => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          shiire: 0,
          uriage: 0,
          baihen: 0,
          cost: 0,
          sales: 0,
          stores: new Set()
        });
      }
      const day = dailyMap.get(dateKey);
      day.shiire += item.cost || 0;
      day.cost += item.cost || 0;
      if (item.store) day.stores.add(item.store);
    });

    // 売上データを集計
    uriageData.forEach(item => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          shiire: 0,
          uriage: 0,
          baihen: 0,
          cost: 0,
          sales: 0,
          stores: new Set()
        });
      }
      const day = dailyMap.get(dateKey);
      day.uriage += item.sales || 0;
      day.baihen += item.baihen || 0;
      day.sales += item.sales || 0;
      if (item.store) day.stores.add(item.store);
    });

    // 日別データ配列に変換
    const dailyData = Array.from(dailyMap.values())
      .map(day => ({
        ...day,
        stores: Array.from(day.stores),
        profit: day.sales - day.cost,
        profitRate: day.sales > 0 ? ((day.sales - day.cost) / day.sales) * 100 : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 月次集計
    const monthly = {
      totalShiire: shiireData.reduce((sum, item) => sum + (item.cost || 0), 0),
      totalSales: uriageData.reduce((sum, item) => sum + (item.sales || 0), 0),
      totalBaihen: uriageData.reduce((sum, item) => sum + (item.baihen || 0), 0),
      totalCost: shiireData.reduce((sum, item) => sum + (item.cost || 0), 0),
      recordCount: {
        shiire: shiireData.length,
        uriage: uriageData.length
      }
    };

    monthly.totalProfit = monthly.totalSales - monthly.totalCost;
    monthly.profitRate = monthly.totalSales > 0
      ? (monthly.totalProfit / monthly.totalSales) * 100
      : 0;

    // カテゴリ別集計
    const categoryMap = new Map();
    shiireData.forEach(item => {
      const category = item.category || 'その他';
      categoryMap.set(category, (categoryMap.get(category) || 0) + (item.cost || 0));
    });
    monthly.byCategory = Object.fromEntries(categoryMap);

    // 帳合先別集計
    const supplierMap = new Map();
    shiireData.forEach(item => {
      const supplier = item.supplier || '不明';
      supplierMap.set(supplier, (supplierMap.get(supplier) || 0) + (item.cost || 0));
    });
    monthly.bySupplier = Object.fromEntries(supplierMap);

    return {
      daily: dailyData,
      monthly
    };
  }

  /**
   * 推定計算を実行
   * @private
   */
  _calculateEstimates() {
    const { monthly, daily } = this.data;

    // 推定計算用パラメータ
    const params = {
      invStart: 0, // 期首在庫（設定から取得すべき）
      totalCost: monthly.totalCost,
      totalSales: monthly.totalSales,
      totalBaihen: monthly.totalBaihen,
      deliverySalesCost: 0,
      deliverySalesPrice: 0,
      totalConsumable: 0,
      defaultMarginRate: 0.26
    };

    // 推定メトリクス計算
    this.data.estimated = calculator.calculateEstimatedMetrics(params);

    // 日別推定在庫計算
    if (daily && daily.length > 0) {
      const dailyParams = daily.map(day => ({
        date: day.date,
        invStart: 0,
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

    // 週次予測計算
    if (daily && daily.length > 0) {
      this.data.weeklyForecast = calculator.calculateWeeklyForecast(daily, 7);
    }

    // 必要日商計算
    const budget = monthly.totalSales * 1.1; // 仮の予算（110%）
    const elapsedDays = daily.length;
    const totalDays = new Date(
      this.currentPeriod.year,
      this.currentPeriod.month,
      0
    ).getDate();

    this.data.requiredDailySales = calculator.calculateRequiredDailySales(
      monthly.totalSales,
      budget,
      elapsedDays,
      totalDays
    );
  }

  /**
   * ダッシュボードをレンダリング
   */
  async render() {
    if (!this.data) {
      this.container.innerHTML = this._createErrorState('データが読み込まれていません');
      return;
    }

    const html = `
      <div class="modern-dashboard">
        ${this._createHeader()}
        ${this._createKPICards()}
        ${this._createAnalysisGrid()}
        ${this._createChartsGrid()}
        ${this._createDataTable()}
      </div>
    `;

    this.container.innerHTML = html;
    this._attachEventListeners();
    this._renderCharts();
  }

  /**
   * ヘッダー作成
   * @private
   */
  _createHeader() {
    const { year, month } = this.currentPeriod;

    return `
      <div class="dashboard-header">
        <div class="header-main">
          <h1 class="dashboard-title">
            <span class="title-icon">📊</span>
            粗利ダッシュボード
          </h1>
          <div class="period-selector">
            <button class="period-btn" onclick="modernDashboard.previousMonth()">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
              </svg>
            </button>
            <div class="current-period">${year}年${month}月</div>
            <button class="period-btn" onclick="modernDashboard.nextMonth()">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="header-actions">
          <button class="action-btn action-btn-secondary" onclick="modernDashboard.refresh()">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
            </svg>
            更新
          </button>
          <div class="export-dropdown">
            <button class="action-btn action-btn-primary" id="export-btn-main">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
              エクスポート
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
            <div class="export-menu" id="export-menu-main">
              <button onclick="modernDashboard.exportReport('json')">JSON形式</button>
              <button onclick="modernDashboard.exportReport('csv')">CSV形式</button>
              <button onclick="modernDashboard.exportReport('excel')">Excel形式</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * KPIカード作成
   * @private
   */
  _createKPICards() {
    const { monthly, estimated } = this.data;

    const kpis = [
      {
        label: '売上高',
        value: formatNumber(monthly.totalSales),
        unit: '円',
        icon: '💰',
        color: 'blue',
        trend: '+5.2%',
        trendUp: true
      },
      {
        label: '粗利益',
        value: formatNumber(monthly.totalProfit),
        unit: '円',
        icon: '📈',
        color: 'green',
        trend: '+8.1%',
        trendUp: true
      },
      {
        label: '粗利率',
        value: formatPercent(monthly.profitRate),
        unit: '',
        icon: '📊',
        color: 'purple',
        trend: '+2.3pt',
        trendUp: true
      },
      {
        label: '仕入原価',
        value: formatNumber(monthly.totalCost),
        unit: '円',
        icon: '🏷️',
        color: 'orange',
        trend: '+3.4%',
        trendUp: false
      }
    ];

    if (estimated) {
      kpis.push(
        {
          label: '推定期末在庫',
          value: formatNumber(estimated.estimatedInvEnd),
          unit: '円',
          icon: '📦',
          color: 'cyan',
          trend: '-1.2%',
          trendUp: false
        },
        {
          label: '推定粗利率',
          value: formatPercent(estimated.estimatedGrossRate * 100),
          unit: '',
          icon: '💎',
          color: 'pink',
          trend: '+1.5pt',
          trendUp: true
        },
        {
          label: '売変率',
          value: formatPercent(estimated.baihenRateSales * 100),
          unit: '',
          icon: '🎯',
          color: 'yellow',
          detail: `損失: ${formatNumber(estimated.baihenLossCost)}円`
        },
        {
          label: '原価値引率',
          value: formatPercent(estimated.baihenRateCost * 100),
          unit: '',
          icon: '⚠️',
          color: 'red',
          detail: `粗利: ${formatNumber(estimated.estimatedGrossProfit)}円`
        }
      );
    }

    return `
      <div class="kpi-grid">
        ${kpis.map(kpi => `
          <div class="kpi-card kpi-${kpi.color}">
            <div class="kpi-header">
              <span class="kpi-icon">${kpi.icon}</span>
              <span class="kpi-label">${kpi.label}</span>
            </div>
            <div class="kpi-value">
              ${kpi.value}<span class="kpi-unit">${kpi.unit}</span>
            </div>
            ${kpi.trend ? `
              <div class="kpi-trend ${kpi.trendUp ? 'trend-up' : 'trend-down'}">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  ${kpi.trendUp
                    ? '<path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/>'
                    : '<path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd"/>'}
                </svg>
                ${kpi.trend}
              </div>
            ` : ''}
            ${kpi.detail ? `
              <div class="kpi-detail">${kpi.detail}</div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 分析グリッド作成
   * @private
   */
  _createAnalysisGrid() {
    const { weeklyForecast, requiredDailySales } = this.data;

    if (!weeklyForecast || !requiredDailySales) {
      return '';
    }

    const achievement = requiredDailySales.currentAchievement * 100;
    const isOnTrack = achievement >= 80;

    return `
      <div class="analysis-grid">
        <div class="analysis-card">
          <div class="card-header">
            <h3>${isOnTrack ? '✅' : '⚠️'} 予算達成状況</h3>
          </div>
          <div class="card-body">
            <div class="progress-ring">
              <svg class="progress-ring-svg" width="120" height="120">
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
                  </linearGradient>
                </defs>
                <circle class="progress-ring-circle-bg" cx="60" cy="60" r="54"/>
                <circle class="progress-ring-circle" cx="60" cy="60" r="54"
                  style="stroke-dasharray: ${achievement * 3.39}, 339.29; stroke: url(#progressGradient)"/>
              </svg>
              <div class="progress-ring-text">
                <div class="progress-value">${formatPercent(achievement)}</div>
                <div class="progress-label">達成率</div>
              </div>
            </div>
            <div class="stats-list">
              <div class="stat-item">
                <span class="stat-label">残り日数</span>
                <span class="stat-value">${requiredDailySales.remainingDays}日</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">必要日販</span>
                <span class="stat-value">${formatNumber(requiredDailySales.requiredDailySales)}円</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">予測達成率</span>
                <span class="stat-value">${formatPercent(requiredDailySales.projectedAchievement * 100)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="analysis-card">
          <div class="card-header">
            <h3>📈 売上トレンド予測</h3>
          </div>
          <div class="card-body">
            <div class="trend-indicator ${weeklyForecast.trend > 0 ? 'trend-up' : weeklyForecast.trend < 0 ? 'trend-down' : 'trend-flat'}">
              <div class="trend-icon">
                ${weeklyForecast.trend > 0 ? '📈' : weeklyForecast.trend < 0 ? '📉' : '➡️'}
              </div>
              <div class="trend-text">
                ${weeklyForecast.trend > 0 ? '上昇傾向' : weeklyForecast.trend < 0 ? '下降傾向' : '横ばい'}
              </div>
            </div>
            <div class="stats-list">
              <div class="stat-item">
                <span class="stat-label">平均日販</span>
                <span class="stat-value">${formatNumber(weeklyForecast.avgDailySales)}円</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">7日間予測</span>
                <span class="stat-value">${formatNumber(weeklyForecast.totalForecast)}円</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">傾き</span>
                <span class="stat-value">${formatNumber(weeklyForecast.trend)}円/日</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * チャートグリッド作成
   * @private
   */
  _createChartsGrid() {
    return `
      <div class="charts-grid">
        <div class="chart-card">
          <div class="card-header">
            <h3>📈 日別売上推移</h3>
          </div>
          <div class="card-body">
            <canvas id="sales-chart" class="chart-canvas"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="card-header">
            <h3>📦 推定在庫推移</h3>
          </div>
          <div class="card-body">
            <canvas id="inventory-chart" class="chart-canvas"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="card-header">
            <h3>🥧 カテゴリ別内訳</h3>
          </div>
          <div class="card-body">
            <div id="category-chart"></div>
          </div>
        </div>

        <div class="chart-card">
          <div class="card-header">
            <h3>🏪 帳合先別仕入</h3>
          </div>
          <div class="card-body">
            <div id="supplier-chart"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * データテーブル作成
   * @private
   */
  _createDataTable() {
    const { daily } = this.data;

    if (!daily || daily.length === 0) {
      return '';
    }

    return `
      <div class="data-table-section">
        <div class="section-header">
          <h3>📅 日別データ</h3>
          <div class="table-actions">
            <input type="text" class="table-search" placeholder="検索..."
              oninput="modernDashboard.filterTable(this.value)">
          </div>
        </div>
        <div class="table-container">
          <table class="data-table" id="daily-data-table">
            <thead>
              <tr>
                <th>日付</th>
                <th class="text-right">仕入</th>
                <th class="text-right">売上</th>
                <th class="text-right">売変</th>
                <th class="text-right">粗利</th>
                <th class="text-right">粗利率</th>
              </tr>
            </thead>
            <tbody>
              ${daily.map(day => {
                const date = new Date(day.date);
                const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return `
                  <tr class="${isWeekend ? 'weekend-row' : ''}">
                    <td>
                      <div class="date-cell">
                        <span class="date-main">${formatDate(date)}</span>
                        <span class="date-dow ${isWeekend ? 'dow-weekend' : ''}">${dayOfWeek}</span>
                      </div>
                    </td>
                    <td class="text-right">${formatNumber(day.shiire)}</td>
                    <td class="text-right">${formatNumber(day.sales)}</td>
                    <td class="text-right">${formatNumber(day.baihen)}</td>
                    <td class="text-right ${day.profit >= 0 ? 'positive' : 'negative'}">
                      ${formatNumber(day.profit)}
                    </td>
                    <td class="text-right">${formatPercent(day.profitRate)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * エラー状態作成
   * @private
   */
  _createErrorState(message) {
    return `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h2>エラー</h2>
        <p>${message}</p>
        <button class="action-btn action-btn-primary" onclick="modernDashboard.refresh()">
          再読み込み
        </button>
      </div>
    `;
  }

  /**
   * イベントリスナー設定
   * @private
   */
  _attachEventListeners() {
    // エクスポートメニュー
    const exportBtn = document.getElementById('export-btn-main');
    const exportMenu = document.getElementById('export-menu-main');

    if (exportBtn && exportMenu) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        exportMenu.classList.remove('show');
      });
    }
  }

  /**
   * チャートをレンダリング
   * @private
   */
  _renderCharts() {
    this._renderSalesChart();
    this._renderInventoryChart();
    this._renderCategoryChart();
    this._renderSupplierChart();
  }

  /**
   * 売上チャートをレンダリング
   * @private
   */
  _renderSalesChart() {
    const canvas = document.getElementById('sales-chart');
    if (!canvas || !this.data.daily) return;

    const { daily } = this.data;
    const ctx = canvas.getContext('2d');

    // シンプルな折れ線グラフ（ライブラリなし）
    this._drawLineChart(ctx, canvas, daily.map(d => ({
      label: formatDate(new Date(d.date)),
      value: d.sales
    })), '#4F46E5');
  }

  /**
   * 在庫チャートをレンダリング
   * @private
   */
  _renderInventoryChart() {
    const canvas = document.getElementById('inventory-chart');
    if (!canvas || !this.data.estimatedInventoryTrend) return;

    const { estimatedInventoryTrend } = this.data;
    const ctx = canvas.getContext('2d');

    this._drawLineChart(ctx, canvas, estimatedInventoryTrend.map(d => ({
      label: formatDate(new Date(d.date)),
      value: d.estimatedInventory
    })), '#10B981');
  }

  /**
   * シンプルな折れ線グラフを描画
   * @private
   */
  _drawLineChart(ctx, canvas, data, color) {
    if (!data || data.length === 0) return;

    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);
    ctx.scale(1, 1);

    // データ範囲計算
    const values = data.map(d => d.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    // グリッド線描画
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // データ線描画
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();

    data.forEach((point, i) => {
      const x = padding + (chartWidth / (data.length - 1)) * i;
      const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // データポイント描画
    ctx.fillStyle = color;
    data.forEach((point, i) => {
      const x = padding + (chartWidth / (data.length - 1)) * i;
      const y = padding + chartHeight - ((point.value - minValue) / range) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * カテゴリチャートをレンダリング
   * @private
   */
  _renderCategoryChart() {
    const container = document.getElementById('category-chart');
    if (!container || !this.data.monthly.byCategory) return;

    const { byCategory } = this.data.monthly;
    const total = Object.values(byCategory).reduce((sum, val) => sum + val, 0);

    const categories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    container.innerHTML = categories.map(([category, amount]) => {
      const percent = (amount / total) * 100;
      return `
        <div class="bar-item">
          <div class="bar-label">
            <span>${this._getCategoryLabel(category)}</span>
            <span class="bar-value">${formatNumber(amount)}円</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${percent}%"></div>
          </div>
          <div class="bar-percent">${formatPercent(percent)}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * 帳合先チャートをレンダリング
   * @private
   */
  _renderSupplierChart() {
    const container = document.getElementById('supplier-chart');
    if (!container || !this.data.monthly.bySupplier) return;

    const { bySupplier } = this.data.monthly;
    const total = Object.values(bySupplier).reduce((sum, val) => sum + val, 0);

    const suppliers = Object.entries(bySupplier)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    container.innerHTML = suppliers.map(([supplier, amount]) => {
      const percent = (amount / total) * 100;
      return `
        <div class="bar-item">
          <div class="bar-label">
            <span>${supplier}</span>
            <span class="bar-value">${formatNumber(amount)}円</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${percent}%"></div>
          </div>
          <div class="bar-percent">${formatPercent(percent)}</div>
        </div>
      `;
    }).join('');
  }

  /**
   * カテゴリラベル取得
   * @private
   */
  _getCategoryLabel(category) {
    const labels = {
      fruits: '🍎 青果',
      vegetables: '🥬 野菜',
      market: '🏪 市場',
      sanchoku: '🚚 産直',
      hana: '🌸 花',
      other: '📦 その他'
    };
    return labels[category] || `📦 ${category}`;
  }

  // Public methods

  async previousMonth() {
    this.currentPeriod.month--;
    if (this.currentPeriod.month < 1) {
      this.currentPeriod.month = 12;
      this.currentPeriod.year--;
    }
    this.currentPeriod.start = new Date(this.currentPeriod.year, this.currentPeriod.month - 1, 1);
    this.currentPeriod.end = new Date(this.currentPeriod.year, this.currentPeriod.month, 0);
    await this.loadData();
    await this.render();
  }

  async nextMonth() {
    this.currentPeriod.month++;
    if (this.currentPeriod.month > 12) {
      this.currentPeriod.month = 1;
      this.currentPeriod.year++;
    }
    this.currentPeriod.start = new Date(this.currentPeriod.year, this.currentPeriod.month - 1, 1);
    this.currentPeriod.end = new Date(this.currentPeriod.year, this.currentPeriod.month, 0);
    await this.loadData();
    await this.render();
  }

  async refresh() {
    await this.loadData();
    await this.render();
  }

  filterTable(query) {
    const table = document.getElementById('daily-data-table');
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
  }

  exportReport(format) {
    console.log(`Exporting report as ${format}`);

    const { monthly, estimated, daily } = this.data;

    // レポートデータ作成
    const reportData = {
      period: `${this.currentPeriod.year}年${this.currentPeriod.month}月`,
      generatedAt: new Date().toISOString(),
      summary: {
        totalSales: monthly.totalSales,
        totalCost: monthly.totalCost,
        totalProfit: monthly.totalProfit,
        profitRate: monthly.profitRate,
        totalBaihen: monthly.totalBaihen
      },
      estimated: estimated || null,
      daily: daily || []
    };

    if (format === 'csv') {
      this._exportCSV(reportData);
    } else if (format === 'json') {
      this._exportJSON(reportData);
    } else if (format === 'excel') {
      alert('Excel形式のエクスポートは準備中です');
    }
  }

  _exportJSON(data) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    this._downloadFile(blob, `report_${this.currentPeriod.year}-${this.currentPeriod.month}.json`);
  }

  _exportCSV(data) {
    let csv = '';

    // ヘッダー
    csv += `粗利ダッシュボードレポート\n`;
    csv += `期間,${data.period}\n`;
    csv += `生成日時,${new Date(data.generatedAt).toLocaleString('ja-JP')}\n`;
    csv += `\n`;

    // サマリー
    csv += `サマリー\n`;
    csv += `項目,金額\n`;
    csv += `売上,${data.summary.totalSales}\n`;
    csv += `原価,${data.summary.totalCost}\n`;
    csv += `粗利,${data.summary.totalProfit}\n`;
    csv += `粗利率,${data.summary.profitRate}%\n`;
    csv += `売変,${data.summary.totalBaihen}\n`;
    csv += `\n`;

    // 推定計算
    if (data.estimated) {
      csv += `推定計算\n`;
      csv += `項目,値\n`;
      csv += `推定期末在庫,${data.estimated.estimatedInvEnd}\n`;
      csv += `推定粗利率,${(data.estimated.estimatedGrossRate * 100).toFixed(2)}%\n`;
      csv += `売変率,${(data.estimated.baihenRateSales * 100).toFixed(2)}%\n`;
      csv += `原価値引率,${(data.estimated.baihenRateCost * 100).toFixed(2)}%\n`;
      csv += `\n`;
    }

    // 日別データ
    if (data.daily && data.daily.length > 0) {
      csv += `日別データ\n`;
      csv += `日付,仕入,売上,売変,粗利,粗利率\n`;
      data.daily.forEach(day => {
        const date = new Date(day.date).toLocaleDateString('ja-JP');
        csv += `${date},${day.shiire},${day.sales},${day.baihen},${day.profit},${day.profitRate}%\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this._downloadFile(blob, `report_${this.currentPeriod.year}-${this.currentPeriod.month}.csv`);
  }

  _downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * グローバルインスタンス
 */
export let modernDashboard = null;

/**
 * モダンダッシュボードを初期化
 */
export async function initModernDashboard(containerId = 'content') {
  modernDashboard = new ModernDashboard(containerId);
  await modernDashboard.initialize();

  // グローバルに公開
  if (typeof window !== 'undefined') {
    window.modernDashboard = modernDashboard;
  }

  return modernDashboard;
}
