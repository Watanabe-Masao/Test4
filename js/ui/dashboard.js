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
          ${this._createAnalysisSection()}
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
          <div class="export-dropdown">
            <button class="btn btn-primary" id="export-btn">
              📤 エクスポート ▼
            </button>
            <div class="export-menu" id="export-menu">
              <button onclick="dashboard.exportReport('json')">JSON形式</button>
              <button onclick="dashboard.exportReport('csv')">CSV形式</button>
            </div>
          </div>
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
   * 分析セクションを作成
   * @private
   */
  _createAnalysisSection() {
    // 月次ビューでデータがある場合のみ表示
    if (this.currentView !== 'monthly' || !this.data || !this.data.dailyData) {
      return '';
    }

    const dailyData = this.data.dailyData;
    const currentDate = new Date();
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const elapsedDays = dailyData.length;

    // 予算データ（仮）- 実際は設定から取得すべき
    const monthlyBudget = this.data.sales * 1.1; // 現在の売上の110%を仮の予算とする

    // 週次予測を計算
    const weeklyForecast = calculator.calculateWeeklyForecast(dailyData, 7);

    // 必要日商を計算
    const requiredDailySales = calculator.calculateRequiredDailySales(
      this.data.sales,
      monthlyBudget,
      elapsedDays,
      daysInMonth
    );

    return `
      <div class="analysis-section">
        <h2 class="section-title">📊 分析・予測</h2>
        <div class="analysis-cards">
          ${this._createBudgetComparisonCard(requiredDailySales, monthlyBudget)}
          ${this._createForecastCard(weeklyForecast)}
          ${this._createRequiredDailySalesCard(requiredDailySales)}
        </div>
      </div>
    `;
  }

  /**
   * 予算比較カードを作成
   * @private
   */
  _createBudgetComparisonCard(requiredData, budget) {
    const achievement = requiredData.currentAchievement * 100;
    const isOnTrack = achievement >= 70; // 70%以上なら順調とする
    const statusIcon = isOnTrack ? '✅' : '⚠️';
    const statusClass = isOnTrack ? 'on-track' : 'behind';

    return `
      <div class="analysis-card budget-comparison ${statusClass}">
        <div class="card-header">
          <h3>${statusIcon} 予算達成率</h3>
        </div>
        <div class="card-body">
          <div class="large-metric">
            <span class="metric-value">${formatPercent(achievement)}</span>
            <span class="metric-label">達成率</span>
          </div>
          <div class="metric-details">
            <div class="detail-row">
              <span class="detail-label">実績売上</span>
              <span class="detail-value">${formatNumber(requiredData.currentAchievement * budget)}円</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">目標予算</span>
              <span class="detail-value">${formatNumber(budget)}円</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">残り予算</span>
              <span class="detail-value">${formatNumber(requiredData.remainingBudget)}円</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 予測カードを作成
   * @private
   */
  _createForecastCard(forecast) {
    if (!forecast) return '';

    const trendDirection = forecast.trend > 0 ? '📈' : forecast.trend < 0 ? '📉' : '➡️';
    const trendText = forecast.trend > 0 ? '上昇傾向' : forecast.trend < 0 ? '下降傾向' : '横ばい';

    return `
      <div class="analysis-card forecast">
        <div class="card-header">
          <h3>${trendDirection} 週次売上予測</h3>
        </div>
        <div class="card-body">
          <div class="large-metric">
            <span class="metric-value">${formatNumber(forecast.avgDailySales)}円</span>
            <span class="metric-label">平均日販</span>
          </div>
          <div class="metric-details">
            <div class="detail-row">
              <span class="detail-label">トレンド</span>
              <span class="detail-value">${trendText}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">7日間予測</span>
              <span class="detail-value">${formatNumber(forecast.totalForecast)}円</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">傾き</span>
              <span class="detail-value">${formatNumber(forecast.trend)}円/日</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 必要日商カードを作成
   * @private
   */
  _createRequiredDailySalesCard(requiredData) {
    const currentAvgDaily = requiredData.currentAchievement > 0
      ? (requiredData.currentAchievement * (requiredData.remainingBudget + (requiredData.projectedSales - requiredData.remainingBudget))) / (requiredData.remainingDays + (31 - requiredData.remainingDays))
      : 0;

    const diffPercent = currentAvgDaily > 0
      ? ((requiredData.requiredDailySales - currentAvgDaily) / currentAvgDaily) * 100
      : 0;

    const needsIncrease = diffPercent > 0;

    return `
      <div class="analysis-card required-sales ${needsIncrease ? 'needs-increase' : 'on-pace'}">
        <div class="card-header">
          <h3>🎯 必要日商</h3>
        </div>
        <div class="card-body">
          <div class="large-metric">
            <span class="metric-value">${formatNumber(requiredData.requiredDailySales)}円</span>
            <span class="metric-label">残り期間の必要日販</span>
          </div>
          <div class="metric-details">
            <div class="detail-row">
              <span class="detail-label">残り日数</span>
              <span class="detail-value">${requiredData.remainingDays}日</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">予測達成率</span>
              <span class="detail-value">${formatPercent(requiredData.projectedAchievement * 100)}</span>
            </div>
            ${needsIncrease ? `
            <div class="detail-row alert">
              <span class="detail-label">⚠️ 必要増加率</span>
              <span class="detail-value">+${formatPercent(diffPercent)}</span>
            </div>
            ` : `
            <div class="detail-row success">
              <span class="detail-label">✅ 現状維持で達成可能</span>
            </div>
            `}
          </div>
        </div>
      </div>
    `;
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

    // エクスポートドロップダウン
    const exportBtn = document.getElementById('export-btn');
    const exportMenu = document.getElementById('export-menu');

    if (exportBtn && exportMenu) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('show');
      });

      // メニュー外クリックで閉じる
      document.addEventListener('click', () => {
        exportMenu.classList.remove('show');
      });

      exportMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.remove('show');
      });
    }
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
  async exportReport(format = 'json') {
    try {
      // エクスポート用の完全なレポートデータを作成
      const fullReport = {
        period: this._formatCurrentPeriod(),
        viewType: this.currentView,
        store: this.selectedStore || '全店舗',
        generatedAt: new Date().toISOString(),
        summary: {
          sales: this.data.sales || 0,
          cost: this.data.cost?.adjusted || this.data.cost?.original || 0,
          profit: this.data.profit?.actual || this.data.profit || 0,
          profitRate: this.data.profit?.rate || 0
        },
        estimated: this.data.estimated || null,
        analysis: this._getAnalysisData(),
        dailyData: this.data.dailyData || [],
        estimatedInventoryTrend: this.data.estimatedInventoryTrend || []
      };

      let reportContent, mimeType, extension;

      switch (format) {
        case 'csv':
          reportContent = this._generateCSVReport(fullReport);
          mimeType = 'text/csv';
          extension = 'csv';
          break;

        case 'json':
        default:
          reportContent = JSON.stringify(fullReport, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;
      }

      const blob = new Blob([reportContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${this._formatCurrentPeriod()}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    }
  }

  /**
   * 分析データを取得
   * @private
   */
  _getAnalysisData() {
    if (this.currentView !== 'monthly' || !this.data.dailyData) {
      return null;
    }

    const dailyData = this.data.dailyData;
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const elapsedDays = dailyData.length;
    const monthlyBudget = this.data.sales * 1.1;

    const weeklyForecast = calculator.calculateWeeklyForecast(dailyData, 7);
    const requiredDailySales = calculator.calculateRequiredDailySales(
      this.data.sales,
      monthlyBudget,
      elapsedDays,
      daysInMonth
    );

    return {
      weeklyForecast,
      requiredDailySales,
      budget: monthlyBudget
    };
  }

  /**
   * CSVレポートを生成
   * @private
   */
  _generateCSVReport(report) {
    let csv = '';

    // ヘッダー情報
    csv += `粗利ダッシュボードレポート\n`;
    csv += `期間,${report.period}\n`;
    csv += `ビュー,${report.viewType}\n`;
    csv += `店舗,${report.store}\n`;
    csv += `生成日時,${new Date(report.generatedAt).toLocaleString('ja-JP')}\n`;
    csv += `\n`;

    // サマリー
    csv += `サマリー\n`;
    csv += `項目,金額\n`;
    csv += `売上,${report.summary.sales}\n`;
    csv += `原価,${report.summary.cost}\n`;
    csv += `粗利,${report.summary.profit}\n`;
    csv += `粗利率,${report.summary.profitRate}%\n`;
    csv += `\n`;

    // 推定計算（月次のみ）
    if (report.estimated) {
      csv += `推定計算\n`;
      csv += `項目,値\n`;
      csv += `推定期末在庫,${report.estimated.estimatedInvEnd}\n`;
      csv += `推定粗利率,${(report.estimated.estimatedGrossRate * 100).toFixed(2)}%\n`;
      csv += `売変率,${(report.estimated.baihenRateSales * 100).toFixed(2)}%\n`;
      csv += `原価値引率,${(report.estimated.baihenRateCost * 100).toFixed(2)}%\n`;
      csv += `値引損失,${report.estimated.baihenLossCost}\n`;
      csv += `推定粗利,${report.estimated.estimatedGrossProfit}\n`;
      csv += `\n`;
    }

    // 分析データ（月次のみ）
    if (report.analysis) {
      csv += `分析・予測\n`;
      csv += `項目,値\n`;
      csv += `予算達成率,${(report.analysis.requiredDailySales.currentAchievement * 100).toFixed(2)}%\n`;
      csv += `残り予算,${report.analysis.requiredDailySales.remainingBudget}\n`;
      csv += `必要日販,${report.analysis.requiredDailySales.requiredDailySales}\n`;
      csv += `平均日販,${report.analysis.weeklyForecast.avgDailySales}\n`;
      csv += `7日間予測,${report.analysis.weeklyForecast.totalForecast}\n`;
      csv += `\n`;
    }

    // 日別データ
    if (report.dailyData && report.dailyData.length > 0) {
      csv += `日別データ\n`;
      csv += `日付,売上,原価,粗利,粗利率\n`;
      report.dailyData.forEach(day => {
        const date = new Date(day.date).toLocaleDateString('ja-JP');
        csv += `${date},${day.sales || 0},${day.cost?.adjusted || 0},${day.profit?.actual || 0},${day.profit?.rate || 0}%\n`;
      });
      csv += `\n`;
    }

    // 推定在庫推移
    if (report.estimatedInventoryTrend && report.estimatedInventoryTrend.length > 0) {
      csv += `推定在庫推移\n`;
      csv += `日付,推定在庫,推定売上原価\n`;
      report.estimatedInventoryTrend.forEach(item => {
        const date = new Date(item.date).toLocaleDateString('ja-JP');
        csv += `${date},${item.estimatedInventory},${item.estimatedCogs}\n`;
      });
    }

    return csv;
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
