/**
 * @file クエリビルダー
 * @description 柔軟で強力な検索クエリシステム
 */

import { DataRepository } from './repository.js';
import { DATA_TYPE_MAP } from './schema.js';

/**
 * 比較演算子
 */
export const OPERATORS = {
  EQ: 'eq',           // 等しい (=)
  NE: 'ne',           // 等しくない (!=)
  GT: 'gt',           // より大きい (>)
  GTE: 'gte',         // 以上 (>=)
  LT: 'lt',           // より小さい (<)
  LTE: 'lte',         // 以下 (<=)
  IN: 'in',           // 含まれる
  NIN: 'nin',         // 含まれない
  LIKE: 'like',       // 部分一致
  BETWEEN: 'between', // 範囲内
  EXISTS: 'exists',   // フィールドが存在
  REGEX: 'regex'      // 正規表現
};

/**
 * 論理演算子
 */
export const LOGICAL = {
  AND: 'and',
  OR: 'or',
  NOT: 'not'
};

/**
 * ソート順
 */
export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc'
};

/**
 * クエリビルダークラス
 * 柔軟で直感的なクエリ構築を提供
 */
export class QueryBuilder {
  constructor(dataType) {
    this.dataType = dataType;
    this.repo = new DataRepository(DATA_TYPE_MAP[dataType]);
    this.conditions = [];
    this.sortFields = [];
    this.limitValue = null;
    this.offsetValue = 0;
    this.groupByFields = [];
  }

  /**
   * WHERE条件を追加
   * @param {string} field - フィールド名
   * @param {string} operator - 演算子
   * @param {*} value - 値
   * @returns {QueryBuilder} チェーン可能
   */
  where(field, operator, value) {
    this.conditions.push({
      type: LOGICAL.AND,
      field,
      operator,
      value
    });
    return this;
  }

  /**
   * OR条件を追加
   * @param {string} field - フィールド名
   * @param {string} operator - 演算子
   * @param {*} value - 値
   * @returns {QueryBuilder}
   */
  orWhere(field, operator, value) {
    this.conditions.push({
      type: LOGICAL.OR,
      field,
      operator,
      value
    });
    return this;
  }

  /**
   * 複数のOR条件をグループ化
   * @param {Function} callback - クエリビルダーのコールバック
   * @returns {QueryBuilder}
   */
  orWhereGroup(callback) {
    const subQuery = new QueryBuilder(this.dataType);
    callback(subQuery);
    this.conditions.push({
      type: LOGICAL.OR,
      group: subQuery.conditions
    });
    return this;
  }

  /**
   * 等しい (=)
   */
  whereEquals(field, value) {
    return this.where(field, OPERATORS.EQ, value);
  }

  /**
   * 等しくない (!=)
   */
  whereNotEquals(field, value) {
    return this.where(field, OPERATORS.NE, value);
  }

  /**
   * より大きい (>)
   */
  whereGreaterThan(field, value) {
    return this.where(field, OPERATORS.GT, value);
  }

  /**
   * 以上 (>=)
   */
  whereGreaterThanOrEqual(field, value) {
    return this.where(field, OPERATORS.GTE, value);
  }

  /**
   * より小さい (<)
   */
  whereLessThan(field, value) {
    return this.where(field, OPERATORS.LT, value);
  }

  /**
   * 以下 (<=)
   */
  whereLessThanOrEqual(field, value) {
    return this.where(field, OPERATORS.LTE, value);
  }

  /**
   * 範囲内
   * @param {string} field - フィールド名
   * @param {*} min - 最小値
   * @param {*} max - 最大値
   */
  whereBetween(field, min, max) {
    return this.where(field, OPERATORS.BETWEEN, [min, max]);
  }

  /**
   * 配列に含まれる
   * @param {string} field - フィールド名
   * @param {Array} values - 値の配列
   */
  whereIn(field, values) {
    return this.where(field, OPERATORS.IN, values);
  }

  /**
   * 配列に含まれない
   */
  whereNotIn(field, values) {
    return this.where(field, OPERATORS.NIN, values);
  }

  /**
   * 部分一致（LIKE）
   * @param {string} field - フィールド名
   * @param {string} pattern - パターン（%をワイルドカードとして使用）
   */
  whereLike(field, pattern) {
    return this.where(field, OPERATORS.LIKE, pattern);
  }

  /**
   * 正規表現マッチ
   */
  whereRegex(field, regex) {
    return this.where(field, OPERATORS.REGEX, regex);
  }

  /**
   * フィールドが存在
   */
  whereExists(field) {
    return this.where(field, OPERATORS.EXISTS, true);
  }

  /**
   * フィールドが存在しない
   */
  whereNotExists(field) {
    return this.where(field, OPERATORS.EXISTS, false);
  }

  /**
   * 日付範囲（便利メソッド）
   * @param {string} field - フィールド名
   * @param {Date|number} startDate - 開始日
   * @param {Date|number} endDate - 終了日
   */
  whereDateBetween(field, startDate, endDate) {
    const start = startDate instanceof Date ? startDate.getTime() : startDate;
    const end = endDate instanceof Date ? endDate.getTime() : endDate;
    return this.whereBetween(field, start, end);
  }

  /**
   * 今日のデータ
   */
  whereToday(field = 'date') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.whereBetween(field, today.getTime(), tomorrow.getTime());
  }

  /**
   * 今週のデータ
   */
  whereThisWeek(field = 'date') {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return this.whereBetween(field, startOfWeek.getTime(), endOfWeek.getTime());
  }

  /**
   * 今月のデータ
   */
  whereThisMonth(field = 'date') {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    return this.whereBetween(field, startOfMonth.getTime(), endOfMonth.getTime());
  }

  /**
   * カスタム条件関数
   * @param {Function} fn - 条件関数 (record) => boolean
   */
  whereCustom(fn) {
    this.conditions.push({
      type: LOGICAL.AND,
      custom: fn
    });
    return this;
  }

  /**
   * ソート順を追加
   * @param {string} field - フィールド名
   * @param {string} order - ソート順 ('asc' | 'desc')
   */
  orderBy(field, order = SORT_ORDER.ASC) {
    this.sortFields.push({ field, order });
    return this;
  }

  /**
   * 昇順ソート
   */
  orderByAsc(field) {
    return this.orderBy(field, SORT_ORDER.ASC);
  }

  /**
   * 降順ソート
   */
  orderByDesc(field) {
    return this.orderBy(field, SORT_ORDER.DESC);
  }

  /**
   * 取得件数を制限
   * @param {number} limit - 最大件数
   */
  limit(limit) {
    this.limitValue = limit;
    return this;
  }

  /**
   * オフセットを設定
   * @param {number} offset - スキップする件数
   */
  offset(offset) {
    this.offsetValue = offset;
    return this;
  }

  /**
   * ページネーション
   * @param {number} page - ページ番号（1から）
   * @param {number} perPage - ページあたりの件数
   */
  paginate(page, perPage = 20) {
    this.limitValue = perPage;
    this.offsetValue = (page - 1) * perPage;
    return this;
  }

  /**
   * グループ化
   * @param {string|string[]} fields - グループ化するフィールド
   */
  groupBy(...fields) {
    this.groupByFields = fields.flat();
    return this;
  }

  /**
   * クエリを実行
   * @returns {Promise<Array>} 検索結果
   */
  async execute() {
    // 全データを取得
    let results = await this.repo.getAll();

    // 条件フィルタリング
    results = this._applyConditions(results);

    // ソート
    results = this._applySort(results);

    // グループ化
    if (this.groupByFields.length > 0) {
      results = this._applyGroupBy(results);
    }

    // オフセット
    if (this.offsetValue > 0) {
      results = results.slice(this.offsetValue);
    }

    // リミット
    if (this.limitValue !== null) {
      results = results.slice(0, this.limitValue);
    }

    return results;
  }

  /**
   * 件数を取得
   * @returns {Promise<number>}
   */
  async count() {
    let results = await this.repo.getAll();
    results = this._applyConditions(results);
    return results.length;
  }

  /**
   * 最初の1件を取得
   * @returns {Promise<Object|null>}
   */
  async first() {
    this.limitValue = 1;
    const results = await this.execute();
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 存在チェック
   * @returns {Promise<boolean>}
   */
  async exists() {
    const count = await this.count();
    return count > 0;
  }

  /**
   * 条件を適用
   * @private
   */
  _applyConditions(records) {
    if (this.conditions.length === 0) {
      return records;
    }

    return records.filter(record => {
      return this._evaluateConditions(record, this.conditions);
    });
  }

  /**
   * 条件を評価
   * @private
   */
  _evaluateConditions(record, conditions) {
    let result = true;
    let lastLogical = LOGICAL.AND;

    for (const condition of conditions) {
      let conditionResult;

      if (condition.group) {
        // グループ条件
        conditionResult = this._evaluateConditions(record, condition.group);
      } else if (condition.custom) {
        // カスタム条件
        conditionResult = condition.custom(record);
      } else {
        // 通常の条件
        conditionResult = this._evaluateCondition(record, condition);
      }

      // 論理演算子を適用
      if (lastLogical === LOGICAL.AND) {
        result = result && conditionResult;
      } else if (lastLogical === LOGICAL.OR) {
        result = result || conditionResult;
      }

      lastLogical = condition.type;
    }

    return result;
  }

  /**
   * 単一条件を評価
   * @private
   */
  _evaluateCondition(record, condition) {
    const { field, operator, value } = condition;
    const fieldValue = record[field];

    switch (operator) {
      case OPERATORS.EQ:
        return fieldValue === value;

      case OPERATORS.NE:
        return fieldValue !== value;

      case OPERATORS.GT:
        return fieldValue > value;

      case OPERATORS.GTE:
        return fieldValue >= value;

      case OPERATORS.LT:
        return fieldValue < value;

      case OPERATORS.LTE:
        return fieldValue <= value;

      case OPERATORS.IN:
        return Array.isArray(value) && value.includes(fieldValue);

      case OPERATORS.NIN:
        return Array.isArray(value) && !value.includes(fieldValue);

      case OPERATORS.LIKE:
        if (typeof fieldValue !== 'string') return false;
        const pattern = value.replace(/%/g, '.*');
        const regex = new RegExp(`^${pattern}$`, 'i');
        return regex.test(fieldValue);

      case OPERATORS.BETWEEN:
        return fieldValue >= value[0] && fieldValue <= value[1];

      case OPERATORS.EXISTS:
        return value ? (fieldValue !== undefined && fieldValue !== null) :
                      (fieldValue === undefined || fieldValue === null);

      case OPERATORS.REGEX:
        if (typeof fieldValue !== 'string') return false;
        const re = value instanceof RegExp ? value : new RegExp(value);
        return re.test(fieldValue);

      default:
        return false;
    }
  }

  /**
   * ソートを適用
   * @private
   */
  _applySort(records) {
    if (this.sortFields.length === 0) {
      return records;
    }

    return records.sort((a, b) => {
      for (const { field, order } of this.sortFields) {
        const aVal = a[field];
        const bVal = b[field];

        if (aVal === bVal) continue;

        const comparison = aVal > bVal ? 1 : -1;
        return order === SORT_ORDER.ASC ? comparison : -comparison;
      }
      return 0;
    });
  }

  /**
   * グループ化を適用
   * @private
   */
  _applyGroupBy(records) {
    const groups = {};

    records.forEach(record => {
      // グループキーを生成
      const key = this.groupByFields
        .map(field => record[field])
        .join('|');

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(record);
    });

    // グループごとに配列として返す
    return Object.values(groups);
  }

  /**
   * クエリをリセット
   */
  reset() {
    this.conditions = [];
    this.sortFields = [];
    this.limitValue = null;
    this.offsetValue = 0;
    this.groupByFields = [];
    return this;
  }

  /**
   * クエリのコピーを作成
   * @returns {QueryBuilder}
   */
  clone() {
    const cloned = new QueryBuilder(this.dataType);
    cloned.conditions = JSON.parse(JSON.stringify(this.conditions));
    cloned.sortFields = [...this.sortFields];
    cloned.limitValue = this.limitValue;
    cloned.offsetValue = this.offsetValue;
    cloned.groupByFields = [...this.groupByFields];
    return cloned;
  }
}

/**
 * クエリビルダーを作成（ファクトリー関数）
 * @param {string} dataType - データタイプ
 * @returns {QueryBuilder}
 */
export function query(dataType) {
  return new QueryBuilder(dataType);
}

/**
 * 便利な検索ヘルパー
 */
export const Search = {
  /**
   * 店舗別検索
   */
  byStore(dataType, storeId) {
    return query(dataType).whereEquals('store', storeId);
  },

  /**
   * 仕入先別検索
   */
  bySupplier(dataType, supplierCode) {
    return query(dataType).whereEquals('supplier', supplierCode);
  },

  /**
   * 日付範囲検索
   */
  byDateRange(dataType, startDate, endDate) {
    return query(dataType).whereDateBetween('date', startDate, endDate);
  },

  /**
   * 今日のデータ
   */
  today(dataType) {
    return query(dataType).whereToday();
  },

  /**
   * 今週のデータ
   */
  thisWeek(dataType) {
    return query(dataType).whereThisWeek();
  },

  /**
   * 今月のデータ
   */
  thisMonth(dataType) {
    return query(dataType).whereThisMonth();
  },

  /**
   * 金額範囲検索
   */
  byCostRange(dataType, minCost, maxCost) {
    return query(dataType).whereBetween('cost', minCost, maxCost);
  },

  /**
   * 複数店舗検索
   */
  byStores(dataType, storeIds) {
    return query(dataType).whereIn('store', storeIds);
  },

  /**
   * カテゴリ別検索
   */
  byCategory(dataType, category) {
    return query(dataType).whereEquals('category', category);
  }
};
