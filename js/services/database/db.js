/**
 * @file IndexedDB データベース管理
 * @description データベースの初期化、接続管理、トランザクション処理
 */

import { DB_NAME, DB_VERSION, STORES } from './schema.js';

/**
 * IndexedDB データベース管理クラス
 */
export class Database {
  constructor() {
    /**
     * データベース接続
     * @type {IDBDatabase|null}
     */
    this.db = null;

    /**
     * 初期化状態
     * @type {boolean}
     */
    this.isInitialized = false;

    /**
     * 初期化Promise（複数回の初期化を防ぐ）
     * @type {Promise|null}
     */
    this.initPromise = null;
  }

  /**
   * データベースを開く
   * @returns {Promise<IDBDatabase>} データベース接続
   */
  async open() {
    // 既に初期化中の場合は、そのPromiseを返す
    if (this.initPromise) {
      return this.initPromise;
    }

    // 既に初期化済みの場合は、既存の接続を返す
    if (this.isInitialized && this.db) {
      return Promise.resolve(this.db);
    }

    this.initPromise = new Promise((resolve, reject) => {
      // IndexedDBのサポート確認
      if (!window.indexedDB) {
        reject(new Error('このブラウザはIndexedDBをサポートしていません'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      /**
       * エラーハンドラー
       */
      request.onerror = () => {
        console.error('Database open error:', request.error);
        reject(new Error(`データベースを開けませんでした: ${request.error}`));
      };

      /**
       * 成功ハンドラー
       */
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;

        // データベースが予期せず閉じられた場合
        this.db.onclose = () => {
          console.warn('Database connection closed unexpectedly');
          this.isInitialized = false;
          this.db = null;
        };

        // エラーハンドラー（接続後のエラー）
        this.db.onerror = (event) => {
          console.error('Database error:', event.target.error);
        };

        console.log(`✅ Database opened: ${DB_NAME} v${DB_VERSION}`);
        resolve(this.db);
      };

      /**
       * データベースのアップグレード（バージョン変更時）
       */
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;

        console.log(`🔄 Upgrading database from v${oldVersion} to v${newVersion}`);

        // 各ストアを作成
        Object.values(STORES).forEach(storeConfig => {
          try {
            // ストアが既に存在する場合はスキップ
            if (db.objectStoreNames.contains(storeConfig.name)) {
              console.log(`  ✓ Store already exists: ${storeConfig.name}`);
              return;
            }

            // オブジェクトストアを作成
            const store = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
              autoIncrement: storeConfig.autoIncrement
            });

            // インデックスを作成
            storeConfig.indexes.forEach(index => {
              store.createIndex(index.name, index.keyPath, {
                unique: index.unique
              });
            });

            console.log(`  ✅ Created store: ${storeConfig.name} with ${storeConfig.indexes.length} indexes`);
          } catch (error) {
            console.error(`  ❌ Failed to create store ${storeConfig.name}:`, error);
          }
        });

        console.log('✅ Database upgrade completed');
      };

      /**
       * データベースのブロック（他のタブで古いバージョンが開いている場合）
       */
      request.onblocked = () => {
        console.warn('Database upgrade blocked by another tab');
        reject(new Error('データベースのアップグレードが他のタブによってブロックされています。他のタブを閉じてください。'));
      };
    });

    return this.initPromise;
  }

  /**
   * トランザクションを開始
   * @param {string|string[]} storeNames - ストア名（複数可）
   * @param {string} mode - トランザクションモード ('readonly' | 'readwrite')
   * @returns {IDBTransaction} トランザクション
   * @throws {Error} データベースが初期化されていない場合
   */
  transaction(storeNames, mode = 'readonly') {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database is not initialized. Call open() first.');
    }

    // ストア名を配列に正規化
    const stores = Array.isArray(storeNames) ? storeNames : [storeNames];

    // ストアの存在確認
    stores.forEach(storeName => {
      if (!this.db.objectStoreNames.contains(storeName)) {
        throw new Error(`Store '${storeName}' does not exist in database`);
      }
    });

    return this.db.transaction(stores, mode);
  }

  /**
   * データベースを閉じる
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      this.initPromise = null;
      console.log('🔒 Database closed');
    }
  }

  /**
   * データベースを削除
   * @returns {Promise<void>}
   */
  static async delete() {
    return new Promise((resolve, reject) => {
      // 接続を閉じる
      if (dbInstance.db) {
        dbInstance.close();
      }

      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => {
        console.log('🗑️ Database deleted successfully');
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete database: ${request.error}`));
      };

      request.onblocked = () => {
        console.warn('Database deletion blocked by another tab');
      };
    });
  }

  /**
   * すべてのストアのデータをクリア
   * @returns {Promise<void>}
   */
  async clearAll() {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database is not initialized');
    }

    const storeNames = Array.from(this.db.objectStoreNames);
    const tx = this.transaction(storeNames, 'readwrite');

    const promises = storeNames.map(storeName => {
      return new Promise((resolve, reject) => {
        const store = tx.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log('🗑️ All stores cleared');
  }

  /**
   * データベース情報を取得
   * @returns {Promise<Object>} データベース情報
   */
  async getInfo() {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database is not initialized');
    }

    const storeNames = Array.from(this.db.objectStoreNames);
    const info = {
      name: this.db.name,
      version: this.db.version,
      stores: []
    };

    // 各ストアの情報を取得
    for (const storeName of storeNames) {
      const tx = this.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);

      const count = await new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      info.stores.push({
        name: storeName,
        keyPath: store.keyPath,
        autoIncrement: store.autoIncrement,
        indexNames: Array.from(store.indexNames),
        recordCount: count
      });
    }

    return info;
  }

  /**
   * データベースのストレージ使用量を取得（概算）
   * @returns {Promise<Object>} ストレージ情報
   */
  async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usagePercent: (estimate.usage / estimate.quota * 100).toFixed(2),
        usageMB: (estimate.usage / (1024 * 1024)).toFixed(2),
        quotaMB: (estimate.quota / (1024 * 1024)).toFixed(2)
      };
    }
    return null;
  }

  /**
   * 接続状態を確認
   * @returns {boolean} 接続中かどうか
   */
  isConnected() {
    return this.isInitialized && this.db !== null;
  }
}

/**
 * シングルトンインスタンス
 * @type {Database}
 */
export const dbInstance = new Database();

/**
 * データベースを初期化（エクスポート用のヘルパー関数）
 * @returns {Promise<IDBDatabase>}
 */
export async function initDatabase() {
  return await dbInstance.open();
}

/**
 * データベース接続を取得（エクスポート用のヘルパー関数）
 * @returns {Database}
 */
export function getDatabase() {
  return dbInstance;
}
