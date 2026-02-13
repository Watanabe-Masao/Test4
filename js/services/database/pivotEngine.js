/**
 * @file Pivot Engine
 * @description Multi-dimensional pivot table calculation engine
 * @version 1.0.0
 */

import { aggregate, AGGREGATE_FUNCTIONS } from './aggregator.js';

/**
 * Pivot configuration
 * @typedef {Object} PivotConfig
 * @property {string[]} rows - Row dimension fields
 * @property {string[]} columns - Column dimension fields
 * @property {string} valueField - Field to aggregate
 * @property {string} aggFunc - Aggregation function (sum, avg, count, min, max)
 * @property {boolean} showSubtotals - Show subtotal rows/columns
 * @property {boolean} showGrandTotal - Show grand total
 * @property {Function} rowFormatter - Custom row label formatter
 * @property {Function} colFormatter - Custom column label formatter
 */

/**
 * Pivot result structure
 * @typedef {Object} PivotResult
 * @property {Array} headers - Column headers
 * @property {Array} rows - Data rows
 * @property {Object} metadata - Metadata about the pivot
 * @property {Object} grandTotal - Grand total values
 */

/**
 * Pivot Engine Class
 * Transforms flat data into multi-dimensional pivot tables
 */
export class PivotEngine {
  constructor() {
    this.cache = new Map();
    this.cacheEnabled = true;
  }

  /**
   * Create a pivot table from data
   * @param {Array} data - Source data array
   * @param {PivotConfig} config - Pivot configuration
   * @returns {PivotResult} Pivot table result
   */
  createPivot(data, config) {
    if (!data || data.length === 0) {
      return this._emptyResult();
    }

    // Generate cache key
    const cacheKey = this._generateCacheKey(data, config);
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Validate configuration
    this._validateConfig(config);

    // Build pivot structure
    const result = this._buildPivot(data, config);

    // Cache result
    if (this.cacheEnabled) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Build the pivot table structure
   * @private
   */
  _buildPivot(data, config) {
    const {
      rows: rowFields,
      columns: colFields,
      valueField,
      aggFunc = 'sum',
      showSubtotals = true,
      showGrandTotal = true,
      rowFormatter = (v) => v,
      colFormatter = (v) => v
    } = config;

    // Step 1: Extract unique row and column values
    const rowValues = this._extractUniqueValues(data, rowFields);
    const colValues = this._extractUniqueValues(data, colFields);

    // Step 2: Create aggregation groups
    const aggregatedData = this._aggregateData(data, rowFields, colFields, valueField, aggFunc);

    // Step 3: Build header structure
    const headers = this._buildHeaders(colValues, colFields, colFormatter, showGrandTotal);

    // Step 4: Build data rows
    const rows = this._buildRows(
      rowValues,
      colValues,
      aggregatedData,
      rowFields,
      colFields,
      rowFormatter,
      showSubtotals,
      showGrandTotal
    );

    // Step 5: Calculate grand total
    const grandTotal = showGrandTotal
      ? this._calculateGrandTotal(data, valueField, aggFunc)
      : null;

    return {
      headers,
      rows,
      metadata: {
        rowCount: rows.length,
        colCount: headers.length,
        dataPoints: data.length,
        aggFunc,
        rowFields,
        colFields,
        valueField
      },
      grandTotal
    };
  }

  /**
   * Extract unique values for dimensions
   * @private
   */
  _extractUniqueValues(data, fields) {
    if (!fields || fields.length === 0) return [[]];

    const uniqueSets = fields.map(() => new Set());

    data.forEach(row => {
      fields.forEach((field, index) => {
        const value = this._getNestedValue(row, field);
        if (value !== undefined && value !== null) {
          uniqueSets[index].add(value);
        }
      });
    });

    // Convert sets to sorted arrays
    const uniqueArrays = uniqueSets.map(set =>
      Array.from(set).sort((a, b) => {
        // Smart sorting: numbers before strings, then lexicographic
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        if (typeof a === 'number') return -1;
        if (typeof b === 'number') return 1;
        return String(a).localeCompare(String(b));
      })
    );

    // Generate all combinations
    return this._cartesianProduct(uniqueArrays);
  }

  /**
   * Cartesian product of arrays
   * @private
   */
  _cartesianProduct(arrays) {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map(v => [v]);

    const result = [];
    const [first, ...rest] = arrays;
    const restProduct = this._cartesianProduct(rest);

    first.forEach(value => {
      restProduct.forEach(combination => {
        result.push([value, ...combination]);
      });
    });

    return result;
  }

  /**
   * Aggregate data by row and column dimensions
   * @private
   */
  _aggregateData(data, rowFields, colFields, valueField, aggFunc) {
    const aggregated = new Map();

    data.forEach(row => {
      // Build row key
      const rowKey = rowFields
        .map(field => this._getNestedValue(row, field))
        .join('|');

      // Build column key
      const colKey = colFields
        .map(field => this._getNestedValue(row, field))
        .join('|');

      // Build combined key
      const key = `${rowKey}::${colKey}`;

      // Initialize or update aggregation
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          values: [],
          count: 0
        });
      }

      const agg = aggregated.get(key);
      const value = this._getNestedValue(row, valueField);

      if (value !== undefined && value !== null && !isNaN(value)) {
        agg.values.push(Number(value));
        agg.count++;
      }
    });

    // Apply aggregation function
    const result = new Map();
    aggregated.forEach((agg, key) => {
      result.set(key, this._applyAggFunction(agg.values, aggFunc));
    });

    return result;
  }

  /**
   * Apply aggregation function to values
   * @private
   */
  _applyAggFunction(values, aggFunc) {
    if (!values || values.length === 0) return 0;

    switch (aggFunc) {
      case 'sum':
        return values.reduce((sum, v) => sum + v, 0);
      case 'avg':
        return values.reduce((sum, v) => sum + v, 0) / values.length;
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'median':
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      default:
        return values.reduce((sum, v) => sum + v, 0);
    }
  }

  /**
   * Build header structure
   * @private
   */
  _buildHeaders(colValues, colFields, colFormatter, showGrandTotal) {
    const headers = [];

    // Add row dimension headers
    colFields.forEach((field, index) => {
      headers.push({
        label: field,
        type: 'dimension',
        level: index,
        field
      });
    });

    // Add value column headers
    colValues.forEach(colValue => {
      const label = colValue.map(colFormatter).join(' / ');
      headers.push({
        label,
        type: 'value',
        colValue,
        key: colValue.join('|')
      });
    });

    // Add grand total header
    if (showGrandTotal) {
      headers.push({
        label: '総計',
        type: 'grandTotal'
      });
    }

    return headers;
  }

  /**
   * Build data rows
   * @private
   */
  _buildRows(
    rowValues,
    colValues,
    aggregatedData,
    rowFields,
    colFields,
    rowFormatter,
    showSubtotals,
    showGrandTotal
  ) {
    const rows = [];

    rowValues.forEach((rowValue, rowIndex) => {
      const row = {
        type: 'data',
        rowValue,
        key: rowValue.join('|'),
        cells: []
      };

      // Add dimension cells
      rowValue.forEach((value, index) => {
        row.cells.push({
          type: 'dimension',
          value: rowFormatter(value),
          rawValue: value,
          level: index
        });
      });

      // Add value cells
      let rowTotal = 0;
      colValues.forEach(colValue => {
        const rowKey = rowValue.join('|');
        const colKey = colValue.join('|');
        const key = `${rowKey}::${colKey}`;

        const value = aggregatedData.get(key) || 0;
        rowTotal += value;

        row.cells.push({
          type: 'value',
          value,
          formatted: this._formatNumber(value),
          rowValue,
          colValue
        });
      });

      // Add row total cell
      if (showGrandTotal) {
        row.cells.push({
          type: 'total',
          value: rowTotal,
          formatted: this._formatNumber(rowTotal)
        });
      }

      rows.push(row);

      // Add subtotal rows if configured
      if (showSubtotals && rowFields.length > 1 && this._isSubtotalRow(rowValue, rowIndex, rowValues)) {
        rows.push(this._createSubtotalRow(rowValue, colValues, aggregatedData, colFields, rowFields));
      }
    });

    return rows;
  }

  /**
   * Check if subtotal row should be added
   * @private
   */
  _isSubtotalRow(currentRow, currentIndex, allRows) {
    if (currentIndex === allRows.length - 1) return true;

    const nextRow = allRows[currentIndex + 1];
    // Check if first-level dimension changes
    return currentRow[0] !== nextRow[0];
  }

  /**
   * Create subtotal row
   * @private
   */
  _createSubtotalRow(rowValue, colValues, aggregatedData, colFields, rowFields) {
    const subtotalRow = {
      type: 'subtotal',
      rowValue: [rowValue[0]],
      key: `subtotal-${rowValue[0]}`,
      cells: []
    };

    // Add dimension cell with subtotal label
    subtotalRow.cells.push({
      type: 'dimension',
      value: `${rowValue[0]} 小計`,
      rawValue: rowValue[0],
      level: 0,
      isSubtotal: true
    });

    // Add empty cells for additional dimensions
    for (let i = 1; i < rowFields.length; i++) {
      subtotalRow.cells.push({
        type: 'dimension',
        value: '',
        rawValue: null,
        level: i
      });
    }

    // Calculate subtotals for each column
    let subtotalTotal = 0;
    colValues.forEach(colValue => {
      const colKey = colValue.join('|');
      let subtotal = 0;

      // Sum all matching rows
      const prefix = rowValue[0];
      aggregatedData.forEach((value, key) => {
        const [rowKey, keyColKey] = key.split('::');
        if (rowKey.startsWith(prefix) && keyColKey === colKey) {
          subtotal += value;
        }
      });

      subtotalTotal += subtotal;

      subtotalRow.cells.push({
        type: 'value',
        value: subtotal,
        formatted: this._formatNumber(subtotal),
        isSubtotal: true
      });
    });

    // Add subtotal grand total
    subtotalRow.cells.push({
      type: 'total',
      value: subtotalTotal,
      formatted: this._formatNumber(subtotalTotal),
      isSubtotal: true
    });

    return subtotalRow;
  }

  /**
   * Calculate grand total
   * @private
   */
  _calculateGrandTotal(data, valueField, aggFunc) {
    const values = data
      .map(row => this._getNestedValue(row, valueField))
      .filter(v => v !== undefined && v !== null && !isNaN(v))
      .map(Number);

    return this._applyAggFunction(values, aggFunc);
  }

  /**
   * Get nested object value by path
   * @private
   */
  _getNestedValue(obj, path) {
    if (!path) return undefined;

    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    return value;
  }

  /**
   * Format number for display
   * @private
   */
  _formatNumber(value) {
    if (value === 0) return '0';
    if (!value) return '-';
    return Math.round(value).toLocaleString('ja-JP');
  }

  /**
   * Validate pivot configuration
   * @private
   */
  _validateConfig(config) {
    if (!config.rows && !config.columns) {
      throw new Error('At least one of rows or columns must be specified');
    }
    if (!config.valueField) {
      throw new Error('valueField is required');
    }
  }

  /**
   * Generate cache key
   * @private
   */
  _generateCacheKey(data, config) {
    const dataHash = data.length + data[0]?.date + data[data.length - 1]?.date;
    const configHash = JSON.stringify({
      rows: config.rows,
      columns: config.columns,
      valueField: config.valueField,
      aggFunc: config.aggFunc
    });
    return `${dataHash}::${configHash}`;
  }

  /**
   * Empty result structure
   * @private
   */
  _emptyResult() {
    return {
      headers: [],
      rows: [],
      metadata: {
        rowCount: 0,
        colCount: 0,
        dataPoints: 0
      },
      grandTotal: 0
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Export pivot to CSV format
   * @param {PivotResult} pivotResult - Pivot result to export
   * @returns {string} CSV string
   */
  exportToCSV(pivotResult) {
    const lines = [];

    // Header row
    const headerLine = pivotResult.headers.map(h => `"${h.label}"`).join(',');
    lines.push(headerLine);

    // Data rows
    pivotResult.rows.forEach(row => {
      const line = row.cells
        .map(cell => {
          if (cell.type === 'dimension') {
            return `"${cell.value}"`;
          } else {
            return cell.value;
          }
        })
        .join(',');
      lines.push(line);
    });

    return lines.join('\n');
  }

  /**
   * Transform pivot for chart display
   * @param {PivotResult} pivotResult - Pivot result
   * @returns {Object} Chart data structure
   */
  toChartData(pivotResult) {
    const labels = [];
    const datasets = [];

    // Extract labels from rows
    pivotResult.rows.forEach(row => {
      if (row.type === 'data') {
        labels.push(row.cells[0].value);
      }
    });

    // Extract datasets from columns
    const valueHeaders = pivotResult.headers.filter(h => h.type === 'value');
    valueHeaders.forEach(header => {
      const data = pivotResult.rows
        .filter(row => row.type === 'data')
        .map(row => {
          const cell = row.cells.find(
            c => c.type === 'value' && c.colValue?.join('|') === header.key
          );
          return cell ? cell.value : 0;
        });

      datasets.push({
        label: header.label,
        data
      });
    });

    return { labels, datasets };
  }
}

/**
 * Singleton instance
 */
export const pivotEngine = new PivotEngine();

/**
 * Quick pivot creation function
 * @param {Array} data - Source data
 * @param {PivotConfig} config - Pivot configuration
 * @returns {PivotResult} Pivot result
 */
export function createPivot(data, config) {
  return pivotEngine.createPivot(data, config);
}
