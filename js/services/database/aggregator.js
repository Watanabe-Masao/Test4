/**
 * @file データ集計機能
 * @description 高度な集計・グルーピング・統計処理
 */

import { QueryBuilder } from './queryBuilder.js';

/**
 * 集計関数
 */
export const AGGREGATE_FUNCTIONS = {
  SUM: 'sum',
  AVG: 'avg',
  MIN: 'min',
  MAX: 'max',
  COUNT: 'count',
  FIRST: 'first',
  LAST: 'last',
  DISTINCT: 'distinct'
};

/**
 * Aggregatorクラス
 * データの集計・統計処理を提供
 */
export class Aggregator {
  constructor(dataOrQuery) {
    if (dataOrQuery instanceof QueryBuilder) {
      this.query = dataOrQuery;
      this.data = null;
    } else if (Array.isArray(dataOrQuery)) {
      this.data = dataOrQuery;
      this.query = null;
    } else {
      throw new Error('Invalid input: must be Array or QueryBuilder');
    }
  }

  /**
   * データを取得
   * @private
   */
  async _getData() {
    if (this.data) {
      return this.data;
    }
    if (this.query) {
      return await this.query.execute();
    }
    return [];
  }

  /**
   * 合計
   * @param {string} field - フィールド名
   * @returns {Promise<number>}
   */
  async sum(field) {
    const data = await this._getData();
    return data.reduce((sum, record) => sum + (record[field] || 0), 0);
  }

  /**
   * 平均
   * @param {string} field - フィールド名
   * @returns {Promise<number>}
   */
  async avg(field) {
    const data = await this._getData();
    if (data.length === 0) return 0;

    const sum = data.reduce((total, record) => total + (record[field] || 0), 0);
    return sum / data.length;
  }

  /**
   * 最小値
   * @param {string} field - フィールド名
   * @returns {Promise<number>}
   */
  async min(field) {
    const data = await this._getData();
    if (data.length === 0) return null;

    return Math.min(...data.map(record => record[field] || 0));
  }

  /**
   * 最大値
   * @param {string} field - フィールド名
   * @returns {Promise<number>}
   */
  async max(field) {
    const data = await this._getData();
    if (data.length === 0) return null;

    return Math.max(...data.map(record => record[field] || 0));
  }

  /**
   * 件数
   * @returns {Promise<number>}
   */
  async count() {
    const data = await this._getData();
    return data.length;
  }

  /**
   * ユニーク件数
   * @param {string} field - フィールド名
   * @returns {Promise<number>}
   */
  async countDistinct(field) {
    const data = await this._getData();
    const unique = new Set(data.map(record => record[field]));
    return unique.size;
  }

  /**
   * グループ化して集計
   * @param {string|string[]} groupFields - グループ化するフィールド
   * @param {Object} aggregations - 集計設定 { fieldName: { func: 'sum', field: 'cost' } }
   * @returns {Promise<Array>}
   */
  async groupBy(groupFields, aggregations = {}) {
    const data = await this._getData();
    const fields = Array.isArray(groupFields) ? groupFields : [groupFields];

    // グループごとにデータを分類
    const groups = {};

    data.forEach(record => {
      // グループキーを生成
      const key = fields.map(f => record[f]).join('|');

      if (!groups[key]) {
        groups[key] = {
          _key: key,
          _records: [],
          _count: 0
        };

        // グループキーのフィールドを追加
        fields.forEach(f => {
          groups[key][f] = record[f];
        });
      }

      groups[key]._records.push(record);
      groups[key]._count++;
    });

    // 集計を実行
    const results = Object.values(groups).map(group => {
      const result = {};

      // グループキーフィールドをコピー
      fields.forEach(f => {
        result[f] = group[f];
      });

      // 各集計を実行
      Object.entries(aggregations).forEach(([name, config]) => {
        result[name] = this._executeAggregation(group._records, config);
      });

      // デフォルトでcountを追加
      if (!aggregations.count) {
        result.count = group._count;
      }

      return result;
    });

    return results;
  }

  /**
   * 集計関数を実行
   * @private
   */
  _executeAggregation(records, config) {
    const { func, field } = config;

    switch (func) {
      case AGGREGATE_FUNCTIONS.SUM:
        return records.reduce((sum, r) => sum + (r[field] || 0), 0);

      case AGGREGATE_FUNCTIONS.AVG:
        if (records.length === 0) return 0;
        const sum = records.reduce((total, r) => total + (r[field] || 0), 0);
        return sum / records.length;

      case AGGREGATE_FUNCTIONS.MIN:
        return Math.min(...records.map(r => r[field] || 0));

      case AGGREGATE_FUNCTIONS.MAX:
        return Math.max(...records.map(r => r[field] || 0));

      case AGGREGATE_FUNCTIONS.COUNT:
        return records.length;

      case AGGREGATE_FUNCTIONS.FIRST:
        return records.length > 0 ? records[0][field] : null;

      case AGGREGATE_FUNCTIONS.LAST:
        return records.length > 0 ? records[records.length - 1][field] : null;

      case AGGREGATE_FUNCTIONS.DISTINCT:
        const unique = new Set(records.map(r => r[field]));
        return unique.size;

      default:
        return null;
    }
  }

  /**
   * ピボットテーブル
   * @param {string} rowField - 行フィールド
   * @param {string} colField - 列フィールド
   * @param {string} valueField - 値フィールド
   * @param {string} aggFunc - 集計関数
   * @returns {Promise<Object>} ピボットテーブル
   */
  async pivot(rowField, colField, valueField, aggFunc = AGGREGATE_FUNCTIONS.SUM) {
    const data = await this._getData();

    const pivot = {};
    const columns = new Set();

    // データを集計
    data.forEach(record => {
      const row = record[rowField];
      const col = record[colField];
      const value = record[valueField] || 0;

      columns.add(col);

      if (!pivot[row]) {
        pivot[row] = {};
      }

      if (!pivot[row][col]) {
        pivot[row][col] = [];
      }

      pivot[row][col].push(value);
    });

    // 集計関数を適用
    const result = {
      rows: [],
      columns: Array.from(columns).sort()
    };

    Object.entries(pivot).forEach(([row, cols]) => {
      const rowData = { [rowField]: row };

      result.columns.forEach(col => {
        const values = cols[col] || [];
        rowData[col] = this._applyAggFunc(values, aggFunc);
      });

      result.rows.push(rowData);
    });

    return result;
  }

  /**
   * 集計関数を適用
   * @private
   */
  _applyAggFunc(values, func) {
    if (values.length === 0) return 0;

    switch (func) {
      case AGGREGATE_FUNCTIONS.SUM:
        return values.reduce((sum, v) => sum + v, 0);

      case AGGREGATE_FUNCTIONS.AVG:
        return values.reduce((sum, v) => sum + v, 0) / values.length;

      case AGGREGATE_FUNCTIONS.MIN:
        return Math.min(...values);

      case AGGREGATE_FUNCTIONS.MAX:
        return Math.max(...values);

      case AGGREGATE_FUNCTIONS.COUNT:
        return values.length;

      default:
        return 0;
    }
  }

  /**
   * 統計情報を計算
   * @param {string} field - フィールド名
   * @returns {Promise<Object>} 統計情報
   */
  async stats(field) {
    const data = await this._getData();
    const values = data.map(record => record[field] || 0).filter(v => typeof v === 'number');

    if (values.length === 0) {
      return null;
    }

    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((total, v) => total + v, 0);
    const mean = sum / values.length;

    // 分散と標準偏差
    const variance = values.reduce((total, v) => total + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // 中央値
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // 四分位数
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];

    return {
      count: values.length,
      sum,
      mean,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      variance,
      stdDev,
      q1,
      q3,
      range: sorted[sorted.length - 1] - sorted[0]
    };
  }

  /**
   * パーセンタイル
   * @param {string} field - フィールド名
   * @param {number} percentile - パーセンタイル（0-100）
   * @returns {Promise<number>}
   */
  async percentile(field, percentile) {
    const data = await this._getData();
    const values = data.map(record => record[field] || 0).sort((a, b) => a - b);

    if (values.length === 0) return null;

    const index = Math.floor((percentile / 100) * values.length);
    return values[index];
  }

  /**
   * ヒストグラム
   * @param {string} field - フィールド名
   * @param {number} bins - ビン数
   * @returns {Promise<Array>}
   */
  async histogram(field, bins = 10) {
    const data = await this._getData();
    const values = data.map(record => record[field] || 0).filter(v => typeof v === 'number');

    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;

    const histogram = Array(bins).fill(0).map((_, i) => ({
      start: min + i * binWidth,
      end: min + (i + 1) * binWidth,
      count: 0
    }));

    values.forEach(value => {
      let binIndex = Math.floor((value - min) / binWidth);
      if (binIndex >= bins) binIndex = bins - 1;
      if (binIndex < 0) binIndex = 0;
      histogram[binIndex].count++;
    });

    return histogram;
  }

  /**
   * 累積和
   * @param {string} field - フィールド名
   * @param {string} sortField - ソートフィールド
   * @returns {Promise<Array>}
   */
  async cumulativeSum(field, sortField = null) {
    let data = await this._getData();

    // ソート
    if (sortField) {
      data = data.sort((a, b) => a[sortField] - b[sortField]);
    }

    let cumSum = 0;
    return data.map(record => {
      cumSum += record[field] || 0;
      return {
        ...record,
        cumulativeSum: cumSum
      };
    });
  }

  /**
   * 移動平均
   * @param {string} field - フィールド名
   * @param {number} window - ウィンドウサイズ
   * @param {string} sortField - ソートフィールド
   * @returns {Promise<Array>}
   */
  async movingAverage(field, window = 7, sortField = null) {
    let data = await this._getData();

    // ソート
    if (sortField) {
      data = data.sort((a, b) => a[sortField] - b[sortField]);
    }

    return data.map((record, index) => {
      const start = Math.max(0, index - window + 1);
      const windowData = data.slice(start, index + 1);
      const sum = windowData.reduce((total, r) => total + (r[field] || 0), 0);
      const avg = sum / windowData.length;

      return {
        ...record,
        movingAverage: avg
      };
    });
  }

  /**
   * ランキング
   * @param {string} field - フィールド名
   * @param {string} order - ソート順 ('asc' | 'desc')
   * @returns {Promise<Array>}
   */
  async rank(field, order = 'desc') {
    let data = await this._getData();

    // ソート
    data = data.sort((a, b) => {
      return order === 'asc'
        ? a[field] - b[field]
        : b[field] - a[field];
    });

    // ランクを付与
    return data.map((record, index) => ({
      ...record,
      rank: index + 1
    }));
  }

  /**
   * トップN
   * @param {number} n - 上位N件
   * @param {string} field - フィールド名
   * @returns {Promise<Array>}
   */
  async top(n, field) {
    const ranked = await this.rank(field, 'desc');
    return ranked.slice(0, n);
  }

  /**
   * ボトムN
   * @param {number} n - 下位N件
   * @param {string} field - フィールド名
   * @returns {Promise<Array>}
   */
  async bottom(n, field) {
    const ranked = await this.rank(field, 'asc');
    return ranked.slice(0, n);
  }
}

/**
 * Aggregatorを作成（ファクトリー関数）
 * @param {Array|QueryBuilder} dataOrQuery - データまたはクエリ
 * @returns {Aggregator}
 */
export function aggregate(dataOrQuery) {
  return new Aggregator(dataOrQuery);
}
