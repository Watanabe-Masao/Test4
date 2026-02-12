/**
 * @file レポートジェネレーター
 * @description 各種レポートの生成と出力
 */

import { calculator } from './calculationEngine.js';
import { query, Search } from './queryBuilder.js';
import { aggregate } from './aggregator.js';

/**
 * レポート形式
 */
export const REPORT_FORMAT = {
  JSON: 'json',
  CSV: 'csv',
  TABLE: 'table',
  CHART: 'chart'
};

/**
 * レポートタイプ
 */
export const REPORT_TYPE = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  STORE: 'store',
  SUPPLIER: 'supplier',
  CATEGORY: 'category',
  CUSTOM: 'custom'
};

/**
 * レポートジェネレータークラス
 */
export class ReportGenerator {
  constructor() {
    this.reports = new Map();
  }

  /**
   * 日次レポートを生成
   * @param {Date|number} date - 対象日
   * @param {string[]} stores - 店舗IDの配列（省略時は全店舗）
   * @returns {Promise<Object>} レポート
   */
  async generateDailyReport(date, stores = null) {
    const reportDate = date instanceof Date ? date : new Date(date);

    if (stores && stores.length > 0) {
      // 複数店舗のレポート
      const storeReports = await Promise.all(
        stores.map(storeId => calculator.calculateDailyProfit(reportDate, storeId))
      );

      return {
        type: REPORT_TYPE.DAILY,
        date: reportDate.getTime(),
        stores: storeReports,
        summary: this._summarizeStoreReports(storeReports)
      };
    } else {
      // 全店舗のレポート
      const profit = await calculator.calculateDailyProfit(reportDate);

      return {
        type: REPORT_TYPE.DAILY,
        date: reportDate.getTime(),
        data: profit
      };
    }
  }

  /**
   * 週次レポートを生成
   * @param {Date} startDate - 週の開始日
   * @returns {Promise<Object>} レポート
   */
  async generateWeeklyReport(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const dailyReports = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const daily = await calculator.calculateDailyProfit(currentDate);
      dailyReports.push(daily);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      type: REPORT_TYPE.WEEKLY,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      dailyData: dailyReports,
      summary: this._summarizeDailyReports(dailyReports),
      trend: calculator.analyzeTrend(dailyReports)
    };
  }

  /**
   * 月次レポートを生成
   * @param {number} year - 年
   * @param {number} month - 月（1-12）
   * @param {string} storeId - 店舗ID（省略時は全店舗）
   * @returns {Promise<Object>} レポート
   */
  async generateMonthlyReport(year, month, storeId = null) {
    const monthlyProfit = await calculator.calculateMonthlyProfit(year, month, storeId);

    // 週ごとの集計
    const weeks = this._groupByWeek(monthlyProfit.dailyData);

    return {
      type: REPORT_TYPE.MONTHLY,
      year,
      month,
      store: storeId,
      data: monthlyProfit,
      weeks,
      trend: calculator.analyzeTrend(monthlyProfit.dailyData)
    };
  }

  /**
   * 店舗別レポートを生成
   * @param {Date|number} startDate - 開始日
   * @param {Date|number} endDate - 終了日
   * @returns {Promise<Object>} レポート
   */
  async generateStoreReport(startDate, endDate) {
    const stores = await calculator.calculateProfitByStore(startDate, endDate);

    // 配列に変換してソート
    const storeArray = Object.values(stores).sort((a, b) => b.sales - a.sales);

    // 全体サマリー
    const summary = {
      totalSales: storeArray.reduce((sum, s) => sum + s.sales, 0),
      totalCost: storeArray.reduce((sum, s) => sum + s.cost, 0),
      totalProfit: storeArray.reduce((sum, s) => sum + s.profit, 0),
      avgProfitRate: 0,
      storeCount: storeArray.length
    };

    summary.avgProfitRate = summary.totalSales > 0
      ? (summary.totalProfit / summary.totalSales) * 100
      : 0;

    return {
      type: REPORT_TYPE.STORE,
      startDate: startDate instanceof Date ? startDate.getTime() : startDate,
      endDate: endDate instanceof Date ? endDate.getTime() : endDate,
      stores: storeArray,
      summary
    };
  }

  /**
   * 仕入先別レポートを生成
   * @param {Date|number} startDate - 開始日
   * @param {Date|number} endDate - 終了日
   * @param {string} storeId - 店舗ID（省略時は全店舗）
   * @returns {Promise<Object>} レポート
   */
  async generateSupplierReport(startDate, endDate, storeId = null) {
    const suppliers = await calculator.calculateProfitBySupplier(startDate, endDate, storeId);

    // 全体サマリー
    const summary = {
      totalCost: suppliers.reduce((sum, s) => sum + s.cost, 0),
      totalAmount: suppliers.reduce((sum, s) => sum + s.amount, 0),
      supplierCount: suppliers.length,
      recordCount: suppliers.reduce((sum, s) => sum + s.recordCount, 0)
    };

    // トップ10
    const top10 = suppliers.slice(0, 10);

    return {
      type: REPORT_TYPE.SUPPLIER,
      startDate: startDate instanceof Date ? startDate.getTime() : startDate,
      endDate: endDate instanceof Date ? endDate.getTime() : endDate,
      store: storeId,
      suppliers,
      top10,
      summary
    };
  }

  /**
   * カテゴリ別レポートを生成
   * @param {Date|number} startDate - 開始日
   * @param {Date|number} endDate - 終了日
   * @param {string} storeId - 店舗ID（省略時は全店舗）
   * @returns {Promise<Object>} レポート
   */
  async generateCategoryReport(startDate, endDate, storeId = null) {
    const categories = await calculator.calculateProfitByCategory(startDate, endDate, storeId);

    return {
      type: REPORT_TYPE.CATEGORY,
      startDate: startDate instanceof Date ? startDate.getTime() : startDate,
      endDate: endDate instanceof Date ? endDate.getTime() : endDate,
      store: storeId,
      data: categories
    };
  }

  /**
   * カスタムレポートを生成
   * @param {Object} config - レポート設定
   * @returns {Promise<Object>} レポート
   */
  async generateCustomReport(config) {
    const {
      dataType,
      dateRange,
      filters = {},
      groupBy = [],
      aggregations = {},
      sortBy = null,
      limit = null
    } = config;

    // クエリを構築
    let q = query(dataType);

    // 日付範囲
    if (dateRange) {
      q = q.whereDateBetween('date', dateRange.start, dateRange.end);
    }

    // フィルター
    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        q = q.whereIn(field, value);
      } else {
        q = q.whereEquals(field, value);
      }
    });

    // ソート
    if (sortBy) {
      q = q.orderBy(sortBy.field, sortBy.order);
    }

    // リミット
    if (limit) {
      q = q.limit(limit);
    }

    // 集計
    let results;
    if (groupBy.length > 0) {
      const agg = aggregate(q);
      results = await agg.groupBy(groupBy, aggregations);
    } else {
      results = await q.execute();
    }

    return {
      type: REPORT_TYPE.CUSTOM,
      config,
      data: results,
      count: results.length
    };
  }

  /**
   * レポートをフォーマット
   * @param {Object} report - レポートデータ
   * @param {string} format - 出力形式
   * @returns {string|Object} フォーマット済みレポート
   */
  formatReport(report, format = REPORT_FORMAT.JSON) {
    switch (format) {
      case REPORT_FORMAT.JSON:
        return JSON.stringify(report, null, 2);

      case REPORT_FORMAT.CSV:
        return this._toCSV(report);

      case REPORT_FORMAT.TABLE:
        return this._toTable(report);

      case REPORT_FORMAT.CHART:
        return this._toChartData(report);

      default:
        return report;
    }
  }

  /**
   * レポートを保存
   * @param {string} name - レポート名
   * @param {Object} report - レポートデータ
   */
  saveReport(name, report) {
    this.reports.set(name, {
      ...report,
      savedAt: Date.now()
    });
  }

  /**
   * 保存されたレポートを取得
   * @param {string} name - レポート名
   * @returns {Object|null}
   */
  getReport(name) {
    return this.reports.get(name) || null;
  }

  /**
   * 保存されたレポート一覧を取得
   * @returns {Array}
   */
  listReports() {
    return Array.from(this.reports.entries()).map(([name, report]) => ({
      name,
      type: report.type,
      savedAt: report.savedAt
    }));
  }

  /**
   * レポートを削除
   * @param {string} name - レポート名
   */
  deleteReport(name) {
    this.reports.delete(name);
  }

  /**
   * 店舗レポートをサマリー
   * @private
   */
  _summarizeStoreReports(storeReports) {
    return {
      totalSales: storeReports.reduce((sum, r) => sum + r.sales, 0),
      totalCost: storeReports.reduce((sum, r) => sum + r.cost.adjusted, 0),
      totalProfit: storeReports.reduce((sum, r) => sum + r.profit.actual, 0),
      avgProfitRate: 0,
      storeCount: storeReports.length
    };
  }

  /**
   * 日次レポートをサマリー
   * @private
   */
  _summarizeDailyReports(dailyReports) {
    const summary = {
      totalSales: dailyReports.reduce((sum, r) => sum + r.sales, 0),
      totalCost: dailyReports.reduce((sum, r) => sum + r.cost.adjusted, 0),
      totalProfit: dailyReports.reduce((sum, r) => sum + r.profit.actual, 0),
      avgProfitRate: 0,
      days: dailyReports.length
    };

    summary.avgProfitRate = summary.totalSales > 0
      ? (summary.totalProfit / summary.totalSales) * 100
      : 0;

    return summary;
  }

  /**
   * 週ごとにグループ化
   * @private
   */
  _groupByWeek(dailyData) {
    const weeks = [];
    let currentWeek = [];

    dailyData.forEach((daily, index) => {
      const date = new Date(daily.date);
      const dayOfWeek = date.getDay();

      currentWeek.push(daily);

      // 日曜日または最後の日
      if (dayOfWeek === 0 || index === dailyData.length - 1) {
        weeks.push({
          startDate: currentWeek[0].date,
          endDate: currentWeek[currentWeek.length - 1].date,
          days: currentWeek.length,
          summary: this._summarizeDailyReports(currentWeek)
        });
        currentWeek = [];
      }
    });

    return weeks;
  }

  /**
   * CSV形式に変換
   * @private
   */
  _toCSV(report) {
    // 簡易実装（データ構造に応じて拡張）
    const data = report.data || report.stores || report.suppliers || [];

    if (data.length === 0) {
      return '';
    }

    // ヘッダー
    const keys = Object.keys(data[0]);
    let csv = keys.join(',') + '\n';

    // データ行
    data.forEach(record => {
      const row = keys.map(key => {
        const value = record[key];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      });
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  /**
   * テーブル形式に変換
   * @private
   */
  _toTable(report) {
    // ASCII テーブル形式（簡易）
    const data = report.data || report.stores || report.suppliers || [];

    if (data.length === 0) {
      return 'No data';
    }

    const keys = Object.keys(data[0]);
    let table = '| ' + keys.join(' | ') + ' |\n';
    table += '| ' + keys.map(() => '---').join(' | ') + ' |\n';

    data.forEach(record => {
      const row = keys.map(key => record[key]);
      table += '| ' + row.join(' | ') + ' |\n';
    });

    return table;
  }

  /**
   * チャートデータに変換
   * @private
   */
  _toChartData(report) {
    // グラフライブラリ用のデータ形式
    const data = report.data || report.dailyData || [];

    return {
      labels: data.map(d => new Date(d.date).toLocaleDateString('ja-JP')),
      datasets: [
        {
          label: '売上',
          data: data.map(d => d.sales)
        },
        {
          label: '粗利',
          data: data.map(d => d.profit?.actual || d.profit)
        }
      ]
    };
  }
}

/**
 * シングルトンインスタンス
 */
export const reportGenerator = new ReportGenerator();
