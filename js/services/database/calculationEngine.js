/**
 * @file 計算エンジン
 * @description 粗利計算とビジネスロジック
 */

import { query, Search } from './queryBuilder.js';
import { DataRepository } from './repository.js';
import { DATA_TYPE_MAP } from './schema.js';

/**
 * 計算エンジンクラス
 */
export class CalculationEngine {
  constructor() {
    this.repos = {};
  }

  /**
   * リポジトリを取得（キャッシュ付き）
   * @private
   */
  _getRepo(dataType) {
    const storeName = DATA_TYPE_MAP[dataType];
    if (!this.repos[storeName]) {
      this.repos[storeName] = new DataRepository(storeName);
    }
    return this.repos[storeName];
  }

  /**
   * 日次粗利を計算
   * @param {Date|number} date - 対象日
   * @param {string} storeId - 店舗ID（省略時は全店舗）
   * @returns {Promise<Object>} 計算結果
   */
  async calculateDailyProfit(date, storeId = null) {
    const targetDate = date instanceof Date ? date.getTime() : date;
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // クエリを構築
    let shiireQuery = query('shiire')
      .whereDateBetween('date', startOfDay.getTime(), endOfDay.getTime());

    let uriageQuery = query('uriage')
      .whereDateBetween('date', startOfDay.getTime(), endOfDay.getTime());

    if (storeId) {
      shiireQuery = shiireQuery.whereEquals('store', storeId);
      uriageQuery = uriageQuery.whereEquals('store', storeId);
    }

    // データ取得
    const [shiireData, uriageData, baihenData, consumablesData, tenkanInData, tenkanOutData, sanchokuData, hanaData] = await Promise.all([
      shiireQuery.execute(),
      uriageQuery.execute(),
      this._getDataForDate('baihen', startOfDay, endOfDay, storeId),
      this._getDataForDate('consumables', startOfDay, endOfDay, storeId),
      this._getDataForDate('tenkanIn', startOfDay, endOfDay, storeId),
      this._getDataForDate('tenkanOut', startOfDay, endOfDay, storeId),
      this._getDataForDate('sanchoku', startOfDay, endOfDay, storeId),
      this._getDataForDate('hana', startOfDay, endOfDay, storeId)
    ]);

    // 仕入合計
    const totalShiire = this._sumField(shiireData, 'cost');

    // カテゴリ別仕入
    const shiireByCategory = this._groupAndSum(shiireData, 'category', 'cost');

    // 売変
    const totalBaihen = this._sumField(baihenData, 'amount');

    // 消耗品
    const totalConsumables = this._sumField(consumablesData, 'cost');

    // 店間
    const totalTenkanIn = this._sumField(tenkanInData, 'amount');
    const totalTenkanOut = this._sumField(tenkanOutData, 'amount');

    // 産直・花
    const totalSanchoku = this._sumField(sanchokuData, 'cost');
    const totalHana = this._sumField(hanaData, 'cost');

    // 売上
    const totalSales = this._sumField(uriageData, 'sales');
    const totalCost = this._sumField(uriageData, 'cost');
    const totalProfit = this._sumField(uriageData, 'profit');

    // 調整後仕入原価
    const adjustedCost = totalShiire + totalBaihen - totalTenkanIn + totalTenkanOut + totalSanchoku + totalHana;

    // 実質粗利
    const actualProfit = totalSales - adjustedCost - totalConsumables;

    // 粗利率
    const profitRate = totalSales > 0 ? (actualProfit / totalSales) * 100 : 0;

    return {
      date: targetDate,
      store: storeId,
      sales: totalSales,
      shiire: {
        total: totalShiire,
        byCategory: shiireByCategory
      },
      adjustments: {
        baihen: totalBaihen,
        consumables: totalConsumables,
        tenkanIn: totalTenkanIn,
        tenkanOut: totalTenkanOut,
        sanchoku: totalSanchoku,
        hana: totalHana
      },
      cost: {
        original: totalCost,
        adjusted: adjustedCost
      },
      profit: {
        original: totalProfit,
        actual: actualProfit,
        rate: profitRate
      },
      recordCounts: {
        shiire: shiireData.length,
        uriage: uriageData.length,
        baihen: baihenData.length,
        consumables: consumablesData.length
      }
    };
  }

  /**
   * 月次粗利を計算
   * @param {number} year - 年
   * @param {number} month - 月（1-12）
   * @param {string} storeId - 店舗ID（省略時は全店舗）
   * @returns {Promise<Object>} 計算結果
   */
  async calculateMonthlyProfit(year, month, storeId = null) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    // 日次データを集計
    const dailyResults = [];
    const currentDate = new Date(startOfMonth);

    while (currentDate <= endOfMonth) {
      const dailyProfit = await this.calculateDailyProfit(currentDate, storeId);
      dailyResults.push(dailyProfit);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 月次合計
    const monthlyTotals = {
      year,
      month,
      store: storeId,
      sales: 0,
      shiire: { total: 0, byCategory: {} },
      adjustments: {
        baihen: 0,
        consumables: 0,
        tenkanIn: 0,
        tenkanOut: 0,
        sanchoku: 0,
        hana: 0
      },
      cost: { original: 0, adjusted: 0 },
      profit: { original: 0, actual: 0, rate: 0 },
      dailyData: dailyResults
    };

    dailyResults.forEach(daily => {
      monthlyTotals.sales += daily.sales;
      monthlyTotals.shiire.total += daily.shiire.total;

      // カテゴリ別集計
      Object.entries(daily.shiire.byCategory).forEach(([category, amount]) => {
        if (!monthlyTotals.shiire.byCategory[category]) {
          monthlyTotals.shiire.byCategory[category] = 0;
        }
        monthlyTotals.shiire.byCategory[category] += amount;
      });

      // 調整項目
      Object.keys(monthlyTotals.adjustments).forEach(key => {
        monthlyTotals.adjustments[key] += daily.adjustments[key];
      });

      // 原価・粗利
      monthlyTotals.cost.original += daily.cost.original;
      monthlyTotals.cost.adjusted += daily.cost.adjusted;
      monthlyTotals.profit.original += daily.profit.original;
      monthlyTotals.profit.actual += daily.profit.actual;
    });

    // 粗利率を計算
    monthlyTotals.profit.rate = monthlyTotals.sales > 0
      ? (monthlyTotals.profit.actual / monthlyTotals.sales) * 100
      : 0;

    return monthlyTotals;
  }

  /**
   * 店舗別粗利を計算
   * @param {Date|number} startDate - 開始日
   * @param {Date|number} endDate - 終了日
   * @returns {Promise<Object>} 店舗別計算結果
   */
  async calculateProfitByStore(startDate, endDate) {
    const start = startDate instanceof Date ? startDate.getTime() : startDate;
    const end = endDate instanceof Date ? endDate.getTime() : endDate;

    // 全店舗のデータを取得
    const shiireData = await query('shiire')
      .whereDateBetween('date', start, end)
      .execute();

    const uriageData = await query('uriage')
      .whereDateBetween('date', start, end)
      .execute();

    // 店舗ごとにグループ化
    const stores = new Set([
      ...shiireData.map(d => d.store),
      ...uriageData.map(d => d.store)
    ]);

    const results = {};

    for (const storeId of stores) {
      const storeShiire = shiireData.filter(d => d.store === storeId);
      const storeUriage = uriageData.filter(d => d.store === storeId);

      const totalSales = this._sumField(storeUriage, 'sales');
      const totalCost = this._sumField(storeShiire, 'cost');
      const actualProfit = totalSales - totalCost;
      const profitRate = totalSales > 0 ? (actualProfit / totalSales) * 100 : 0;

      results[storeId] = {
        store: storeId,
        sales: totalSales,
        cost: totalCost,
        profit: actualProfit,
        profitRate,
        recordCount: {
          shiire: storeShiire.length,
          uriage: storeUriage.length
        }
      };
    }

    return results;
  }

  /**
   * 仕入先別粗利を計算
   * @param {Date|number} startDate - 開始日
   * @param {Date|number} endDate - 終了日
   * @param {string} storeId - 店舗ID（省略時は全店舗）
   * @returns {Promise<Array>} 仕入先別計算結果
   */
  async calculateProfitBySupplier(startDate, endDate, storeId = null) {
    const start = startDate instanceof Date ? startDate.getTime() : startDate;
    const end = endDate instanceof Date ? endDate.getTime() : endDate;

    let shiireQuery = query('shiire').whereDateBetween('date', start, end);

    if (storeId) {
      shiireQuery = shiireQuery.whereEquals('store', storeId);
    }

    const shiireData = await shiireQuery.execute();

    // 仕入先ごとにグループ化
    const supplierMap = {};

    shiireData.forEach(record => {
      const supplier = record.supplier;

      if (!supplierMap[supplier]) {
        supplierMap[supplier] = {
          supplier,
          supplierName: record.supplierName || supplier,
          category: record.category,
          cost: 0,
          amount: 0,
          recordCount: 0,
          stores: new Set()
        };
      }

      supplierMap[supplier].cost += record.cost || 0;
      supplierMap[supplier].amount += record.amount || 0;
      supplierMap[supplier].recordCount++;
      supplierMap[supplier].stores.add(record.store);
    });

    // 配列に変換してソート
    const results = Object.values(supplierMap)
      .map(item => ({
        ...item,
        stores: Array.from(item.stores)
      }))
      .sort((a, b) => b.cost - a.cost);

    return results;
  }

  /**
   * カテゴリ別粗利を計算
   * @param {Date|number} startDate - 開始日
   * @param {Date|number} endDate - 終了日
   * @param {string} storeId - 店舗ID（省略時は全店舗）
   * @returns {Promise<Object>} カテゴリ別計算結果
   */
  async calculateProfitByCategory(startDate, endDate, storeId = null) {
    const start = startDate instanceof Date ? startDate.getTime() : startDate;
    const end = endDate instanceof Date ? endDate.getTime() : endDate;

    let shiireQuery = query('shiire').whereDateBetween('date', start, end);

    if (storeId) {
      shiireQuery = shiireQuery.whereEquals('store', storeId);
    }

    const shiireData = await shiireQuery.execute();

    // カテゴリ別に集計
    const categoryMap = this._groupAndSum(shiireData, 'category', 'cost');

    // パーセンテージを計算
    const total = Object.values(categoryMap).reduce((sum, val) => sum + val, 0);

    const results = Object.entries(categoryMap).map(([category, cost]) => ({
      category,
      cost,
      percentage: total > 0 ? (cost / total) * 100 : 0
    })).sort((a, b) => b.cost - a.cost);

    return {
      total,
      categories: results
    };
  }

  /**
   * 予算比較
   * @param {Object} actualData - 実績データ
   * @param {Object} budgetData - 予算データ
   * @returns {Object} 比較結果
   */
  compareToBudget(actualData, budgetData) {
    const salesDiff = actualData.sales - (budgetData.sales || 0);
    const profitDiff = actualData.profit.actual - (budgetData.profit || 0);

    const salesAchievement = budgetData.sales > 0
      ? (actualData.sales / budgetData.sales) * 100
      : 0;

    const profitAchievement = budgetData.profit > 0
      ? (actualData.profit.actual / budgetData.profit) * 100
      : 0;

    return {
      sales: {
        actual: actualData.sales,
        budget: budgetData.sales || 0,
        diff: salesDiff,
        achievement: salesAchievement
      },
      profit: {
        actual: actualData.profit.actual,
        budget: budgetData.profit || 0,
        diff: profitDiff,
        achievement: profitAchievement
      },
      profitRate: {
        actual: actualData.profit.rate,
        budget: budgetData.profitRate || 0,
        diff: actualData.profit.rate - (budgetData.profitRate || 0)
      }
    };
  }

  /**
   * トレンド分析
   * @param {Array} dailyData - 日次データの配列
   * @returns {Object} トレンド分析結果
   */
  analyzeTrend(dailyData) {
    if (dailyData.length === 0) {
      return null;
    }

    const sales = dailyData.map(d => d.sales);
    const profits = dailyData.map(d => d.profit.actual);
    const profitRates = dailyData.map(d => d.profit.rate);

    return {
      sales: {
        avg: this._average(sales),
        min: Math.min(...sales),
        max: Math.max(...sales),
        trend: this._calculateTrend(sales)
      },
      profit: {
        avg: this._average(profits),
        min: Math.min(...profits),
        max: Math.max(...profits),
        trend: this._calculateTrend(profits)
      },
      profitRate: {
        avg: this._average(profitRates),
        min: Math.min(...profitRates),
        max: Math.max(...profitRates),
        trend: this._calculateTrend(profitRates)
      }
    };
  }

  /**
   * 日付範囲のデータを取得（ヘルパー）
   * @private
   */
  async _getDataForDate(dataType, startDate, endDate, storeId) {
    let q = query(dataType).whereDateBetween('date', startDate.getTime(), endDate.getTime());

    if (storeId) {
      q = q.whereEquals('store', storeId);
    }

    return await q.execute();
  }

  /**
   * フィールドの合計を計算
   * @private
   */
  _sumField(data, field) {
    return data.reduce((sum, record) => sum + (record[field] || 0), 0);
  }

  /**
   * グループ化して合計
   * @private
   */
  _groupAndSum(data, groupField, sumField) {
    const groups = {};

    data.forEach(record => {
      const key = record[groupField] || 'other';
      if (!groups[key]) {
        groups[key] = 0;
      }
      groups[key] += record[sumField] || 0;
    });

    return groups;
  }

  /**
   * 平均を計算
   * @private
   */
  _average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * トレンドを計算（単純な線形回帰）
   * @private
   */
  _calculateTrend(values) {
    const n = values.length;
    if (n < 2) return 0;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    // 傾き = (n * ΣXY - ΣX * ΣY) / (n * ΣX² - (ΣX)²)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return slope;
  }

  // ========== 推定計算ロジック（参考HTML準拠） ==========

  /**
   * 推定在庫・推定粗利を計算（値引を考慮した高度な計算）
   * @param {Object} params - 計算パラメータ
   * @param {number} params.invStart - 期首在庫
   * @param {number} params.totalCost - 総仕入高
   * @param {number} params.totalSales - 総売上高
   * @param {number} params.totalBaihen - 値引額合計
   * @param {number} params.deliverySalesCost - 売上納品原価（花・産直）
   * @param {number} params.deliverySalesPrice - 売上納品売価（花・産直）
   * @param {number} params.totalConsumable - 消耗品合計
   * @param {number} params.defaultMarginRate - デフォルト値入率
   * @returns {Object} 推定計算結果
   */
  calculateEstimatedMetrics(params) {
    const {
      invStart = 0,
      totalCost = 0,
      totalSales = 0,
      totalBaihen = 0,
      deliverySalesCost = 0,
      deliverySalesPrice = 0,
      totalConsumable = 0,
      defaultMarginRate = 0.26
    } = params;

    // === Step 1: 基本計算 ===

    // コア売上（花・産直を除いた売上）
    const coreSales = totalSales - deliverySalesPrice;

    // コア仕入（花・産直・消耗品を除いた仕入）
    const coreCost = totalCost - deliverySalesCost - totalConsumable;

    // コア売価（仕入ファイルの売価）
    const corePrice = totalCost - deliverySalesCost - totalConsumable; // 簡易実装

    // === Step 2: 売変率（売価ベース）===

    // グロス売上 = ネット売上 + 値引額
    const totalGrossSales = totalSales + totalBaihen;

    // 売変率（売価ベース）d = 値引額 / (売上 + 値引額)
    const baihenRateSales = totalGrossSales > 0 ? totalBaihen / totalGrossSales : 0;

    // === Step 3: コア値入率（売価ベース）===

    // コア値入率 m = (売価 - 原価) / 売価
    const coreMarginRate = corePrice > 0
      ? (corePrice - coreCost) / corePrice
      : defaultMarginRate;

    // === Step 4: 推定売上原価の計算 ===

    // コアグロス売上 = コアネット売上 / (1 - d)
    const coreGrossSales = (1 - baihenRateSales) > 0
      ? coreSales / (1 - baihenRateSales)
      : coreSales;

    // コア推定売上原価 = コアグロス売上 × (1 - m)
    const coreEstCogs = coreGrossSales * (1 - coreMarginRate);

    // 売上納品の売上原価（原価をそのまま使用）
    const deliveryEstCogs = deliverySalesCost;

    // 消耗品の売上原価
    const consumableEstCogs = totalConsumable;

    // 推定売上原価合計
    const estimatedCogs = coreEstCogs + deliveryEstCogs + consumableEstCogs;

    // === Step 5: 推定期末在庫 ===

    // 推定期末在庫 = BI + P - COGS_est
    const estimatedInvEnd = invStart + totalCost - estimatedCogs;

    // === Step 6: 推定粗利 ===

    // 推定粗利 = 売上 - 推定売上原価
    const estimatedGrossProfit = totalSales - estimatedCogs;

    // 推定粗利率
    const estimatedGrossRate = totalSales > 0 ? estimatedGrossProfit / totalSales : 0;

    // === Step 7: 推定粗利率（コア）===

    // 推定粗利率（コア）= (m - d) / (1 - d)
    const estimatedCoreGrossRate = (1 - baihenRateSales) > 0
      ? (coreMarginRate - baihenRateSales) / (1 - baihenRateSales)
      : coreMarginRate;

    // === Step 8: 原価値引率 ===

    // 原価値引率 = d / (1 - m + d)
    const baihenRateCost = (1 - coreMarginRate + baihenRateSales) > 0
      ? baihenRateSales / (1 - coreMarginRate + baihenRateSales)
      : 0;

    // === Step 9: 値引による原価損失 ===

    // 値引原価損失 = (1 - m) × ネット売上 × d / (1 - d)
    const baihenLossCost = (1 - coreMarginRate) * coreSales * baihenRateSales / (1 - baihenRateSales || 1);

    // === Step 10: 値引なし理論在庫 ===

    // 理論売上原価（値引なし）= ネット売上 × (1 - m) + 売上納品 + 消耗品
    const theoryCogs = coreSales * (1 - coreMarginRate) + deliveryEstCogs + consumableEstCogs;

    // 理論期末在庫 = BI + P - 理論COGS
    const theoryInvEnd = invStart + totalCost - theoryCogs;

    // 値引が在庫に与える影響
    const baihenImpact = theoryInvEnd - estimatedInvEnd;

    return {
      // 基本データ
      coreSales,
      coreCost,
      corePrice,
      totalGrossSales,

      // 売変率
      baihenRateSales,
      baihenRateCost,
      baihenLossCost,
      baihenImpact,

      // 値入率
      coreMarginRate,
      deliveryMarginRate: deliverySalesPrice > 0
        ? (deliverySalesPrice - deliverySalesCost) / deliverySalesPrice
        : 0,

      // 推定売上原価
      coreEstCogs,
      deliveryEstCogs,
      consumableEstCogs,
      estimatedCogs,

      // 推定在庫
      estimatedInvEnd,
      theoryInvEnd,

      // 推定粗利
      estimatedGrossProfit,
      estimatedGrossRate,
      estimatedCoreGrossRate
    };
  }

  /**
   * 日別推定在庫を計算
   * @param {Array} dailyData - 日別データ配列
   * @param {number} invStart - 期首在庫
   * @param {number} defaultMarginRate - デフォルト値入率
   * @param {number} baihenRateSales - 売変率
   * @returns {Array} 日別推定在庫データ
   */
  calculateDailyEstimatedInventory(dailyData, invStart, defaultMarginRate = 0.26, baihenRateSales = 0) {
    let runningInv = invStart;
    const result = [];

    dailyData.forEach(dayData => {
      const daySales = dayData.sales || 0;
      const dayCost = dayData.cost || 0;

      // 日次グロス売上
      const dayGrossSales = (1 - baihenRateSales) > 0
        ? daySales / (1 - baihenRateSales)
        : daySales;

      // 日次推定売上原価
      const dayEstCogs = dayGrossSales * (1 - defaultMarginRate);

      // 推定在庫 = 前日在庫 + 当日仕入 - 当日売上原価
      runningInv = runningInv + dayCost - dayEstCogs;

      result.push({
        day: dayData.day,
        inv: runningInv,
        sales: daySales,
        cost: dayCost,
        estCogs: dayEstCogs,
        grossSales: dayGrossSales
      });
    });

    return result;
  }

  /**
   * 週間予測を計算
   * @param {Array} dailyData - 日別データ配列（過去データ）
   * @param {number} daysToPredict - 予測日数
   * @returns {Object} 週間予測結果
   */
  calculateWeeklyForecast(dailyData, daysToPredict = 7) {
    if (dailyData.length === 0) {
      return null;
    }

    // 平均日販
    const avgDailySales = this._average(dailyData.map(d => d.sales || 0));

    // トレンド（傾き）
    const salesTrend = this._calculateTrend(dailyData.map(d => d.sales || 0));

    // 予測売上
    const forecastedSales = [];
    for (let i = 0; i < daysToPredict; i++) {
      const forecastValue = avgDailySales + salesTrend * (dailyData.length + i);
      forecastedSales.push(Math.max(0, forecastValue)); // 負の値を防ぐ
    }

    return {
      avgDailySales,
      trend: salesTrend,
      forecastedSales,
      totalForecast: forecastedSales.reduce((sum, v) => sum + v, 0)
    };
  }

  /**
   * 予算達成に必要な日販を計算
   * @param {number} totalSales - 現在の総売上
   * @param {number} budget - 目標予算
   * @param {number} elapsedDays - 経過日数
   * @param {number} totalDays - 総日数（通常31日）
   * @returns {Object} 必要日販情報
   */
  calculateRequiredDailySales(totalSales, budget, elapsedDays, totalDays = 31) {
    const remainingBudget = Math.max(0, budget - totalSales);
    const remainingDays = Math.max(1, totalDays - elapsedDays);
    const requiredDailySales = remainingBudget / remainingDays;

    const currentAchievement = budget > 0 ? totalSales / budget : 0;
    const projectedSales = totalSales + (requiredDailySales * remainingDays);
    const projectedAchievement = budget > 0 ? projectedSales / budget : 0;

    return {
      remainingBudget,
      remainingDays,
      requiredDailySales,
      currentAchievement,
      projectedSales,
      projectedAchievement
    };
  }
}

/**
 * シングルトンインスタンス
 */
export const calculator = new CalculationEngine();
