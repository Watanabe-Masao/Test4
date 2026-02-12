/**
 * @file データリポジトリ - CRUD操作
 * @description IndexedDBストアに対する基本的なCRUD操作を提供
 */

import { dbInstance } from './db.js';
import { OPERATIONS } from './schema.js';

/**
 * データリポジトリクラス
 * 特定のストアに対するCRUD操作を提供
 */
export class DataRepository {
  /**
   * @param {string} storeName - 対象のストア名
   */
  constructor(storeName) {
    this.storeName = storeName;
    this.enableHistory = true; // 履歴記録を有効化
  }

  /**
   * データを追加（CREATE）
   * @param {Object} data - 追加するデータ
   * @returns {Promise<number>} 追加されたデータのID
   */
  async add(data) {
    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);

    // タイムスタンプとバージョンを追加
    const record = {
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };

    return new Promise((resolve, reject) => {
      const request = store.add(record);

      request.onsuccess = () => {
        const id = request.result;
        if (this.enableHistory) {
          this._logHistory(OPERATIONS.ADD, { id, data: record });
        }
        resolve(id);
      };

      request.onerror = () => {
        reject(new Error(`Failed to add record: ${request.error}`));
      };
    });
  }

  /**
   * 複数データを一括追加
   * @param {Array} dataArray - データの配列
   * @returns {Promise<Array<number>>} 追加されたIDの配列
   */
  async addBulk(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return [];
    }

    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);
    const ids = [];
    const timestamp = Date.now();

    for (const data of dataArray) {
      const record = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
        version: 1
      };

      const id = await new Promise((resolve, reject) => {
        const request = store.add(record);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to add record: ${request.error}`));
      });

      ids.push(id);
    }

    if (this.enableHistory) {
      this._logHistory(OPERATIONS.BULK_ADD, { count: dataArray.length, ids });
    }

    return ids;
  }

  /**
   * データを取得（READ）
   * @param {number} id - データID
   * @returns {Promise<Object|undefined>} データ（見つからない場合はundefined）
   */
  async get(id) {
    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readonly');
    const store = tx.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get record: ${request.error}`));
    });
  }

  /**
   * 全データを取得
   * @returns {Promise<Array>} 全データ
   */
  async getAll() {
    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readonly');
    const store = tx.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get all records: ${request.error}`));
    });
  }

  /**
   * 条件に一致するデータを検索
   * @param {Object} query - 検索条件（キー: 値 または キー: 関数）
   * @returns {Promise<Array>} 検索結果
   * @example
   * // 単純な条件
   * await repo.query({ store: '01', date: '2024-01-15' });
   *
   * // 関数による条件
   * await repo.query({ cost: (cost) => cost > 100000 });
   */
  async query(query) {
    const allData = await this.getAll();

    return allData.filter(record => {
      return Object.entries(query).every(([key, value]) => {
        if (typeof value === 'function') {
          return value(record[key]);
        }
        return record[key] === value;
      });
    });
  }

  /**
   * インデックスを使用した検索
   * @param {string} indexName - インデックス名
   * @param {*} value - 検索値
   * @returns {Promise<Array>} 検索結果
   */
  async getByIndex(indexName, value) {
    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readonly');
    const store = tx.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      try {
        const index = store.index(indexName);
        const request = index.getAll(value);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error(`Failed to get by index: ${request.error}`));
      } catch (error) {
        reject(new Error(`Index '${indexName}' not found: ${error.message}`));
      }
    });
  }

  /**
   * 期間で検索
   * @param {Date|number} startDate - 開始日（DateオブジェクトまたはUnix timestamp）
   * @param {Date|number} endDate - 終了日（DateオブジェクトまたはUnix timestamp）
   * @returns {Promise<Array>} 検索結果
   */
  async getByDateRange(startDate, endDate) {
    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readonly');
    const store = tx.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      try {
        const index = store.index('date');
        const start = startDate instanceof Date ? startDate.getTime() : startDate;
        const end = endDate instanceof Date ? endDate.getTime() : endDate;

        const range = IDBKeyRange.bound(start, end);
        const request = index.getAll(range);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error(`Failed to get by date range: ${request.error}`));
      } catch (error) {
        reject(new Error(`Date index not found: ${error.message}`));
      }
    });
  }

  /**
   * データを更新（UPDATE）
   * @param {number} id - データID
   * @param {Object} updates - 更新内容
   * @returns {Promise<void>}
   */
  async update(id, updates) {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Record with id ${id} not found`);
    }

    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
      version: (existing.version || 1) + 1
    };

    // createdAtは保持
    updated.createdAt = existing.createdAt;

    return new Promise((resolve, reject) => {
      const request = store.put(updated);

      request.onsuccess = () => {
        if (this.enableHistory) {
          this._logHistory(OPERATIONS.UPDATE, { id, updates, oldVersion: existing.version });
        }
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to update record: ${request.error}`));
      };
    });
  }

  /**
   * 条件に一致するデータを一括更新
   * @param {Object} query - 検索条件
   * @param {Object} updates - 更新内容
   * @returns {Promise<number>} 更新件数
   */
  async updateMany(query, updates) {
    const records = await this.query(query);

    if (records.length === 0) {
      return 0;
    }

    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);
    const timestamp = Date.now();

    let count = 0;
    for (const record of records) {
      const updated = {
        ...record,
        ...updates,
        updatedAt: timestamp,
        version: (record.version || 1) + 1
      };

      // createdAtは保持
      updated.createdAt = record.createdAt;

      await new Promise((resolve, reject) => {
        const request = store.put(updated);
        request.onsuccess = () => {
          count++;
          resolve();
        };
        request.onerror = () => reject(new Error(`Failed to update record: ${request.error}`));
      });
    }

    if (this.enableHistory) {
      this._logHistory(OPERATIONS.BULK_UPDATE, { count, query, updates });
    }

    return count;
  }

  /**
   * データを削除（DELETE）
   * @param {number} id - データID
   * @returns {Promise<void>}
   */
  async delete(id) {
    // 削除前に存在確認
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Record with id ${id} not found`);
    }

    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onsuccess = () => {
        if (this.enableHistory) {
          this._logHistory(OPERATIONS.DELETE, { id, deletedData: existing });
        }
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete record: ${request.error}`));
      };
    });
  }

  /**
   * 条件に一致するデータを一括削除
   * @param {Object} query - 検索条件
   * @returns {Promise<number>} 削除件数
   */
  async deleteMany(query) {
    const records = await this.query(query);

    if (records.length === 0) {
      return 0;
    }

    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);

    let count = 0;
    for (const record of records) {
      await new Promise((resolve, reject) => {
        const request = store.delete(record.id);
        request.onsuccess = () => {
          count++;
          resolve();
        };
        request.onerror = () => reject(new Error(`Failed to delete record: ${request.error}`));
      });
    }

    if (this.enableHistory) {
      this._logHistory(OPERATIONS.BULK_DELETE, { count, query });
    }

    return count;
  }

  /**
   * 全データを削除
   * @returns {Promise<void>}
   */
  async clear() {
    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readwrite');
    const store = tx.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        if (this.enableHistory) {
          this._logHistory(OPERATIONS.CLEAR, {});
        }
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${request.error}`));
      };
    });
  }

  /**
   * データ件数を取得
   * @returns {Promise<number>}
   */
  async count() {
    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readonly');
    const store = tx.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to count records: ${request.error}`));
    });
  }

  /**
   * 条件に一致するデータの件数を取得
   * @param {Object} query - 検索条件
   * @returns {Promise<number>}
   */
  async countWhere(query) {
    const records = await this.query(query);
    return records.length;
  }

  /**
   * データが存在するか確認
   * @param {number} id - データID
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const record = await this.get(id);
    return record !== undefined;
  }

  /**
   * 最初のレコードを取得
   * @returns {Promise<Object|undefined>}
   */
  async first() {
    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readonly');
    const store = tx.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        resolve(cursor ? cursor.value : undefined);
      };

      request.onerror = () => reject(new Error(`Failed to get first record: ${request.error}`));
    });
  }

  /**
   * 最後のレコードを取得
   * @returns {Promise<Object|undefined>}
   */
  async last() {
    await this._ensureConnection();

    const tx = dbInstance.transaction([this.storeName], 'readonly');
    const store = tx.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        resolve(cursor ? cursor.value : undefined);
      };

      request.onerror = () => reject(new Error(`Failed to get last record: ${request.error}`));
    });
  }

  /**
   * データベース接続を確認し、必要に応じて開く
   * @private
   */
  async _ensureConnection() {
    if (!dbInstance.isConnected()) {
      await dbInstance.open();
    }
  }

  /**
   * 操作履歴をログ
   * @private
   * @param {string} operation - 操作タイプ
   * @param {Object} data - 操作データ
   */
  _logHistory(operation, data) {
    // 履歴ストア自体の操作は記録しない（無限ループ防止）
    if (this.storeName === 'history') {
      return;
    }

    try {
      // 非同期で履歴を記録（メイン処理をブロックしない）
      const historyRepo = new DataRepository('history');
      historyRepo.enableHistory = false; // 履歴の履歴は記録しない

      historyRepo.add({
        timestamp: Date.now(),
        dataType: this.storeName,
        operation,
        data
      }).catch(err => {
        console.warn('Failed to log history:', err);
      });
    } catch (error) {
      console.warn('Failed to create history log:', error);
    }
  }

  /**
   * 履歴記録の有効/無効を設定
   * @param {boolean} enabled
   */
  setHistoryEnabled(enabled) {
    this.enableHistory = enabled;
  }
}
