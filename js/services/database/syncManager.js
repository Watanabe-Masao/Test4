/**
 * @file データ同期マネージャー
 * @description IndexedDBとExcelファイル間のデータ同期を管理
 */

import { DataRepository } from './repository.js';
import { DATA_TYPE_MAP, OPERATIONS } from './schema.js';

/**
 * マージモード
 */
export const MERGE_MODE = {
  REPLACE: 'replace',      // 既存データを完全に置き換え
  APPEND: 'append',        // 新規データのみ追加
  SMART: 'smart',          // スマートマージ（重複を検出して更新）
  SKIP: 'skip'            // 既存データを保持、新規のみ追加
};

/**
 * データ同期マネージャークラス
 */
export class SyncManager {
  constructor() {
    this.repositories = {};
    this.lastSync = {};
    this.syncInProgress = false;
  }

  /**
   * リポジトリを取得（キャッシュ機能付き）
   * @param {string} dataType - データタイプ
   * @returns {DataRepository}
   */
  getRepository(dataType) {
    const storeName = DATA_TYPE_MAP[dataType];
    if (!storeName) {
      throw new Error(`Unknown data type: ${dataType}`);
    }

    if (!this.repositories[storeName]) {
      this.repositories[storeName] = new DataRepository(storeName);
    }

    return this.repositories[storeName];
  }

  /**
   * データをインポート
   * @param {string} dataType - データタイプ（shiire, uriage など）
   * @param {Array} data - インポートするデータ配列
   * @param {string} mode - マージモード
   * @param {Function} progressCallback - 進捗コールバック(current, total)
   * @returns {Promise<Object>} インポート結果
   */
  async importData(dataType, data, mode = MERGE_MODE.SMART, progressCallback = null) {
    if (this.syncInProgress) {
      throw new Error('Sync operation already in progress');
    }

    this.syncInProgress = true;

    try {
      const repo = this.getRepository(dataType);
      const startTime = performance.now();

      console.log(`📥 Importing ${data.length} records to ${dataType} (mode: ${mode})`);

      let result;
      switch (mode) {
        case MERGE_MODE.REPLACE:
          result = await this._importReplace(repo, data, progressCallback);
          break;
        case MERGE_MODE.APPEND:
          result = await this._importAppend(repo, data, progressCallback);
          break;
        case MERGE_MODE.SMART:
          result = await this._importSmart(repo, data, progressCallback);
          break;
        case MERGE_MODE.SKIP:
          result = await this._importSkip(repo, data, progressCallback);
          break;
        default:
          throw new Error(`Unknown merge mode: ${mode}`);
      }

      const duration = performance.now() - startTime;
      const summary = {
        dataType,
        mode,
        duration: Math.round(duration),
        timestamp: Date.now(),
        ...result
      };

      // 最終同期情報を記録
      this.lastSync[dataType] = summary;

      console.log(`✅ Import completed in ${summary.duration}ms:`, {
        added: summary.added,
        updated: summary.updated,
        skipped: summary.skipped,
        errors: summary.errors
      });

      return summary;

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * REPLACEモード: 既存データを削除して新規追加
   * @private
   */
  async _importReplace(repo, data, progressCallback) {
    // 既存データをクリア
    await repo.clear();

    // 新規データを追加
    const added = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const id = await repo.add(data[i]);
        added.push(id);

        if (progressCallback) {
          progressCallback(i + 1, data.length);
        }
      } catch (error) {
        errors.push({ index: i, data: data[i], error: error.message });
      }
    }

    return {
      added: added.length,
      updated: 0,
      skipped: 0,
      errors: errors.length,
      errorDetails: errors
    };
  }

  /**
   * APPENDモード: 既存データを保持して追加
   * @private
   */
  async _importAppend(repo, data, progressCallback) {
    const added = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      try {
        const id = await repo.add(data[i]);
        added.push(id);

        if (progressCallback) {
          progressCallback(i + 1, data.length);
        }
      } catch (error) {
        errors.push({ index: i, data: data[i], error: error.message });
      }
    }

    return {
      added: added.length,
      updated: 0,
      skipped: 0,
      errors: errors.length,
      errorDetails: errors
    };
  }

  /**
   * SMARTモード: 重複を検出して更新、新規は追加
   * @private
   */
  async _importSmart(repo, data, progressCallback) {
    const existing = await repo.getAll();
    const added = [];
    const updated = [];
    const skipped = [];
    const errors = [];

    // 既存データのマップを作成（高速検索用）
    const existingMap = new Map();
    existing.forEach(record => {
      // 重複判定キーを生成（date, store, supplierなど）
      const key = this._generateDuplicateKey(record);
      if (!existingMap.has(key)) {
        existingMap.set(key, []);
      }
      existingMap.get(key).push(record);
    });

    for (let i = 0; i < data.length; i++) {
      try {
        const newRecord = data[i];
        const key = this._generateDuplicateKey(newRecord);
        const duplicates = existingMap.get(key);

        if (duplicates && duplicates.length > 0) {
          // 重複が見つかった場合、最も類似したレコードを更新
          const bestMatch = this._findBestMatch(newRecord, duplicates);

          if (this._shouldUpdate(bestMatch, newRecord)) {
            await repo.update(bestMatch.id, newRecord);
            updated.push(bestMatch.id);
          } else {
            skipped.push({ reason: 'no_changes', record: newRecord });
          }
        } else {
          // 新規レコードとして追加
          const id = await repo.add(newRecord);
          added.push(id);

          // マップに追加（後続の重複チェック用）
          if (!existingMap.has(key)) {
            existingMap.set(key, []);
          }
          existingMap.get(key).push({ ...newRecord, id });
        }

        if (progressCallback) {
          progressCallback(i + 1, data.length);
        }
      } catch (error) {
        errors.push({ index: i, data: data[i], error: error.message });
      }
    }

    return {
      added: added.length,
      updated: updated.length,
      skipped: skipped.length,
      errors: errors.length,
      errorDetails: errors
    };
  }

  /**
   * SKIPモード: 既存データは保持、新規のみ追加
   * @private
   */
  async _importSkip(repo, data, progressCallback) {
    const existing = await repo.getAll();
    const added = [];
    const skipped = [];
    const errors = [];

    // 既存データのキーセットを作成
    const existingKeys = new Set();
    existing.forEach(record => {
      existingKeys.add(this._generateDuplicateKey(record));
    });

    for (let i = 0; i < data.length; i++) {
      try {
        const newRecord = data[i];
        const key = this._generateDuplicateKey(newRecord);

        if (existingKeys.has(key)) {
          skipped.push({ reason: 'duplicate', record: newRecord });
        } else {
          const id = await repo.add(newRecord);
          added.push(id);
          existingKeys.add(key);
        }

        if (progressCallback) {
          progressCallback(i + 1, data.length);
        }
      } catch (error) {
        errors.push({ index: i, data: data[i], error: error.message });
      }
    }

    return {
      added: added.length,
      updated: 0,
      skipped: skipped.length,
      errors: errors.length,
      errorDetails: errors
    };
  }

  /**
   * 重複判定キーを生成
   * @private
   * @param {Object} record - レコード
   * @returns {string} 重複判定キー
   */
  _generateDuplicateKey(record) {
    // 日付、店舗、仕入先/カテゴリで判定
    const parts = [
      record.date || '',
      record.store || '',
      record.supplier || record.category || ''
    ];
    return parts.join('|');
  }

  /**
   * 最も類似したレコードを見つける
   * @private
   */
  _findBestMatch(newRecord, candidates) {
    if (candidates.length === 1) {
      return candidates[0];
    }

    // 複数の候補がある場合、最も類似度の高いものを選択
    let bestMatch = candidates[0];
    let bestScore = this._calculateSimilarity(newRecord, candidates[0]);

    for (let i = 1; i < candidates.length; i++) {
      const score = this._calculateSimilarity(newRecord, candidates[i]);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidates[i];
      }
    }

    return bestMatch;
  }

  /**
   * レコード間の類似度を計算
   * @private
   */
  _calculateSimilarity(record1, record2) {
    let score = 0;
    const fields = ['cost', 'amount', 'itemName', 'category', 'supplier'];

    fields.forEach(field => {
      if (record1[field] === record2[field]) {
        score++;
      }
    });

    return score;
  }

  /**
   * 更新が必要かどうか判定
   * @private
   */
  _shouldUpdate(existing, newRecord) {
    // 重要なフィールドが変更されているかチェック
    const importantFields = ['cost', 'amount', 'itemName'];

    for (const field of importantFields) {
      if (newRecord[field] !== undefined && existing[field] !== newRecord[field]) {
        return true;
      }
    }

    return false;
  }

  /**
   * データをエクスポート
   * @param {string} dataType - データタイプ
   * @param {Object} options - エクスポートオプション
   * @returns {Promise<Array>} エクスポートされたデータ
   */
  async exportData(dataType, options = {}) {
    const repo = this.getRepository(dataType);

    console.log(`📤 Exporting ${dataType}...`);

    let data;

    if (options.filter) {
      // フィルター条件がある場合
      data = await repo.query(options.filter);
    } else if (options.dateRange) {
      // 日付範囲が指定されている場合
      data = await repo.getByDateRange(options.dateRange.start, options.dateRange.end);
    } else {
      // 全データ取得
      data = await repo.getAll();
    }

    // メタデータフィールドを除外
    const cleaned = data.map(record => {
      const { id, createdAt, updatedAt, version, ...cleanRecord } = record;
      return cleanRecord;
    });

    console.log(`✅ Exported ${cleaned.length} records from ${dataType}`);

    return cleaned;
  }

  /**
   * 差分を検出
   * @param {string} dataType - データタイプ
   * @param {Array} newData - 新しいデータ
   * @returns {Promise<Object>} 差分情報
   */
  async detectDiff(dataType, newData) {
    const repo = this.getRepository(dataType);
    const existing = await repo.getAll();

    console.log(`🔍 Detecting differences for ${dataType}...`);

    // 既存データのマップを作成
    const existingMap = new Map();
    existing.forEach(record => {
      const key = this._generateDuplicateKey(record);
      if (!existingMap.has(key)) {
        existingMap.set(key, []);
      }
      existingMap.get(key).push(record);
    });

    const diff = {
      toAdd: [],      // 新規追加されるレコード
      toUpdate: [],   // 更新されるレコード
      unchanged: [],  // 変更なし
      conflicts: []   // 衝突（複数の候補）
    };

    for (const newRecord of newData) {
      const key = this._generateDuplicateKey(newRecord);
      const duplicates = existingMap.get(key);

      if (!duplicates || duplicates.length === 0) {
        diff.toAdd.push(newRecord);
      } else if (duplicates.length === 1) {
        if (this._shouldUpdate(duplicates[0], newRecord)) {
          diff.toUpdate.push({
            existing: duplicates[0],
            new: newRecord
          });
        } else {
          diff.unchanged.push(newRecord);
        }
      } else {
        // 複数の候補がある場合は衝突
        diff.conflicts.push({
          new: newRecord,
          candidates: duplicates
        });
      }
    }

    console.log(`✅ Diff detected:`, {
      toAdd: diff.toAdd.length,
      toUpdate: diff.toUpdate.length,
      unchanged: diff.unchanged.length,
      conflicts: diff.conflicts.length
    });

    return diff;
  }

  /**
   * 最終同期情報を取得
   * @param {string} dataType - データタイプ
   * @returns {Object|null} 同期情報
   */
  getLastSync(dataType) {
    return this.lastSync[dataType] || null;
  }

  /**
   * すべてのデータタイプの同期状態を取得
   * @returns {Object} 同期状態
   */
  getAllSyncStatus() {
    return { ...this.lastSync };
  }

  /**
   * 同期情報をクリア
   * @param {string} dataType - データタイプ（省略時は全て）
   */
  clearSyncStatus(dataType = null) {
    if (dataType) {
      delete this.lastSync[dataType];
    } else {
      this.lastSync = {};
    }
  }

  /**
   * 同期が進行中かチェック
   * @returns {boolean}
   */
  isSyncInProgress() {
    return this.syncInProgress;
  }
}

/**
 * シングルトンインスタンス
 */
export const syncManager = new SyncManager();
