/**
 * @file キャッシュマネージャー
 * @description 計算結果のキャッシング管理
 */

import { DataRepository } from './repository.js';
import { CACHE_TTL } from './schema.js';

/**
 * キャッシュマネージャークラス
 */
export class CacheManager {
  constructor() {
    this.cacheRepo = new DataRepository('cache');
    this.memoryCache = new Map(); // メモリキャッシュ
  }

  /**
   * キャッシュを取得
   * @param {string} key - キャッシュキー
   * @returns {Promise<*>} キャッシュデータ（存在しない場合はnull）
   */
  async get(key) {
    // メモリキャッシュをチェック
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (!this._isExpired(cached)) {
        console.log(`✅ Memory cache hit: ${key}`);
        return cached.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // IndexedDBキャッシュをチェック
    try {
      const results = await this.cacheRepo.query({ key });

      if (results.length > 0) {
        const cached = results[0];

        if (!this._isExpired(cached)) {
          console.log(`✅ IndexedDB cache hit: ${key}`);

          // メモリキャッシュに追加
          this.memoryCache.set(key, cached);

          return cached.data;
        } else {
          // 期限切れなので削除
          await this.cacheRepo.delete(cached.id);
        }
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  /**
   * キャッシュを設定
   * @param {string} key - キャッシュキー
   * @param {*} data - キャッシュするデータ
   * @param {number} ttl - TTL（ミリ秒、省略時はデフォルト）
   * @returns {Promise<void>}
   */
  async set(key, data, ttl = CACHE_TTL.CALCULATION) {
    const cached = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      type: this._getCacheType(key)
    };

    // メモリキャッシュに追加
    this.memoryCache.set(key, cached);

    // IndexedDBに保存
    try {
      // 既存のキャッシュを削除
      const existing = await this.cacheRepo.query({ key });
      if (existing.length > 0) {
        await this.cacheRepo.delete(existing[0].id);
      }

      // 新しいキャッシュを追加
      await this.cacheRepo.add(cached);
      console.log(`✅ Cache set: ${key}`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * キャッシュを削除
   * @param {string} key - キャッシュキー
   * @returns {Promise<void>}
   */
  async delete(key) {
    // メモリキャッシュから削除
    this.memoryCache.delete(key);

    // IndexedDBから削除
    try {
      const results = await this.cacheRepo.query({ key });
      if (results.length > 0) {
        await this.cacheRepo.delete(results[0].id);
      }
      console.log(`🗑️ Cache deleted: ${key}`);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * パターンに一致するキャッシュを削除
   * @param {string|RegExp} pattern - パターン
   * @returns {Promise<number>} 削除件数
   */
  async deletePattern(pattern) {
    let count = 0;

    // メモリキャッシュから削除
    for (const [key] of this.memoryCache.entries()) {
      if (this._matchPattern(key, pattern)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    // IndexedDBから削除
    try {
      const allCache = await this.cacheRepo.getAll();
      for (const cached of allCache) {
        if (this._matchPattern(cached.key, pattern)) {
          await this.cacheRepo.delete(cached.id);
          count++;
        }
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }

    console.log(`🗑️ Deleted ${count} cache entries matching pattern`);
    return count;
  }

  /**
   * 全キャッシュをクリア
   * @returns {Promise<void>}
   */
  async clear() {
    // メモリキャッシュをクリア
    this.memoryCache.clear();

    // IndexedDBをクリア
    try {
      await this.cacheRepo.clear();
      console.log('🗑️ All cache cleared');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * 期限切れキャッシュを削除
   * @returns {Promise<number>} 削除件数
   */
  async cleanExpired() {
    let count = 0;

    // メモリキャッシュをクリーン
    for (const [key, cached] of this.memoryCache.entries()) {
      if (this._isExpired(cached)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    // IndexedDBをクリーン
    try {
      const allCache = await this.cacheRepo.getAll();
      for (const cached of allCache) {
        if (this._isExpired(cached)) {
          await this.cacheRepo.delete(cached.id);
          count++;
        }
      }
    } catch (error) {
      console.error('Cache clean error:', error);
    }

    console.log(`🗑️ Cleaned ${count} expired cache entries`);
    return count;
  }

  /**
   * キャッシュ統計を取得
   * @returns {Promise<Object>} 統計情報
   */
  async getStats() {
    try {
      const allCache = await this.cacheRepo.getAll();

      const stats = {
        total: allCache.length,
        memory: this.memoryCache.size,
        byType: {},
        expired: 0
      };

      allCache.forEach(cached => {
        // タイプ別カウント
        const type = cached.type || 'unknown';
        if (!stats.byType[type]) {
          stats.byType[type] = 0;
        }
        stats.byType[type]++;

        // 期限切れカウント
        if (this._isExpired(cached)) {
          stats.expired++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Cache stats error:', error);
      return { total: 0, memory: this.memoryCache.size, byType: {}, expired: 0 };
    }
  }

  /**
   * キャッシュ付き関数実行
   * @param {string} key - キャッシュキー
   * @param {Function} fn - 実行する関数
   * @param {number} ttl - TTL
   * @returns {Promise<*>} 関数の実行結果
   */
  async wrap(key, fn, ttl = CACHE_TTL.CALCULATION) {
    // キャッシュをチェック
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // 関数を実行
    console.log(`⚙️ Computing: ${key}`);
    const result = await fn();

    // キャッシュに保存
    await this.set(key, result, ttl);

    return result;
  }

  /**
   * キャッシュキーを生成
   * @param {string} prefix - プレフィックス
   * @param {...*} args - 引数
   * @returns {string} キャッシュキー
   */
  generateKey(prefix, ...args) {
    const parts = [prefix, ...args.map(arg => {
      if (arg instanceof Date) {
        return arg.getTime();
      }
      if (typeof arg === 'object') {
        return JSON.stringify(arg);
      }
      return String(arg);
    })];

    return parts.join(':');
  }

  /**
   * 期限切れかチェック
   * @private
   */
  _isExpired(cached) {
    const now = Date.now();
    const age = now - cached.timestamp;
    return age > cached.ttl;
  }

  /**
   * パターンマッチ
   * @private
   */
  _matchPattern(key, pattern) {
    if (pattern instanceof RegExp) {
      return pattern.test(key);
    }
    return key.includes(pattern);
  }

  /**
   * キャッシュタイプを取得
   * @private
   */
  _getCacheType(key) {
    if (key.startsWith('calc:')) return 'calculation';
    if (key.startsWith('query:')) return 'query';
    if (key.startsWith('report:')) return 'report';
    return 'other';
  }
}

/**
 * シングルトンインスタンス
 */
export const cacheManager = new CacheManager();

/**
 * 自動クリーンアップを開始
 * @param {number} interval - クリーンアップ間隔（ミリ秒）
 */
export function startAutoCleanup(interval = 60 * 60 * 1000) { // 1時間ごと
  setInterval(async () => {
    console.log('🧹 Starting automatic cache cleanup...');
    await cacheManager.cleanExpired();
  }, interval);
}
