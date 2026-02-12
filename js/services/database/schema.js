/**
 * @file IndexedDB スキーマ定義
 * @description データベース構造とストア定義
 */

/**
 * データベース名
 */
export const DB_NAME = 'ShiireArariDB';

/**
 * データベースバージョン
 */
export const DB_VERSION = 1;

/**
 * オブジェクトストアの定義
 */
export const STORES = {
  /**
   * 仕入データストア
   * - 仕入先ごとの仕入情報を保存
   * - 日付、店舗、仕入先でインデックス化
   */
  SHIIRE: {
    name: 'shiire',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'supplier', keyPath: 'supplier', unique: false },
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'category', keyPath: 'category', unique: false },
      { name: 'composite_date_store', keyPath: ['date', 'store'], unique: false },
      { name: 'composite_date_supplier', keyPath: ['date', 'supplier'], unique: false },
      { name: 'composite_full', keyPath: ['date', 'store', 'supplier'], unique: false }
    ]
  },

  /**
   * 売上データストア
   * - 店舗別の売上情報を保存
   * - 日付、店舗、カテゴリでインデックス化
   */
  URIAGE: {
    name: 'uriage',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'category', keyPath: 'category', unique: false },
      { name: 'composite_date_store', keyPath: ['date', 'store'], unique: false }
    ]
  },

  /**
   * 売変データストア
   * - 売価変更情報を保存
   */
  BAIHEN: {
    name: 'baihen',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'composite_date_store', keyPath: ['date', 'store'], unique: false }
    ]
  },

  /**
   * 消耗品データストア
   * - 消耗品費の情報を保存
   */
  CONSUMABLES: {
    name: 'consumables',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'composite_date_store', keyPath: ['date', 'store'], unique: false }
    ]
  },

  /**
   * 店間入データストア
   */
  TENKAN_IN: {
    name: 'tenkan_in',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'composite_date_store', keyPath: ['date', 'store'], unique: false }
    ]
  },

  /**
   * 店間出データストア
   */
  TENKAN_OUT: {
    name: 'tenkan_out',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'composite_date_store', keyPath: ['date', 'store'], unique: false }
    ]
  },

  /**
   * 産直データストア
   */
  SANCHOKU: {
    name: 'sanchoku',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'composite_date_store', keyPath: ['date', 'store'], unique: false }
    ]
  },

  /**
   * 花データストア
   */
  HANA: {
    name: 'hana',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'composite_date_store', keyPath: ['date', 'store'], unique: false }
    ]
  },

  /**
   * 予算データストア
   */
  BUDGET: {
    name: 'budget',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'date', keyPath: 'date', unique: false },
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'composite_date_store', keyPath: ['date', 'store'], unique: false }
    ]
  },

  /**
   * 初期設定データストア
   * - 店舗ごとの初期設定（在庫、予算など）
   */
  SETTINGS: {
    name: 'settings',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'store', keyPath: 'store', unique: false },
      { name: 'settingKey', keyPath: 'settingKey', unique: false }
    ]
  },

  /**
   * データ履歴ストア
   * - すべてのデータ操作の履歴を記録
   * - バージョン管理とタイムトラベル機能のため
   */
  HISTORY: {
    name: 'history',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'dataType', keyPath: 'dataType', unique: false },
      { name: 'operation', keyPath: 'operation', unique: false },
      { name: 'composite_type_time', keyPath: ['dataType', 'timestamp'], unique: false }
    ]
  },

  /**
   * ワークスペースストア
   * - ユーザーの作業環境設定を保存
   * - フィルター、表示設定、目標値など
   */
  WORKSPACES: {
    name: 'workspaces',
    keyPath: 'id',
    autoIncrement: true,
    indexes: [
      { name: 'name', keyPath: 'name', unique: true },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
      { name: 'updatedAt', keyPath: 'updatedAt', unique: false }
    ]
  },

  /**
   * メタデータストア
   * - アプリケーション全体のメタ情報
   * - 最終同期時刻、データバージョンなど
   */
  METADATA: {
    name: 'metadata',
    keyPath: 'key',
    indexes: [
      { name: 'category', keyPath: 'category', unique: false }
    ]
  },

  /**
   * 計算結果キャッシュストア
   * - 重い計算結果をキャッシュ
   * - パフォーマンス最適化のため
   */
  CACHE: {
    name: 'cache',
    keyPath: 'key',
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp', unique: false },
      { name: 'type', keyPath: 'type', unique: false }
    ]
  }
};

/**
 * データタイプとストア名のマッピング
 */
export const DATA_TYPE_MAP = {
  shiire: 'shiire',
  uriage: 'uriage',
  baihen: 'baihen',
  consumables: 'consumables',
  tenkanIn: 'tenkan_in',
  tenkanOut: 'tenkan_out',
  sanchoku: 'sanchoku',
  hana: 'hana',
  budget: 'budget',
  settings: 'settings'
};

/**
 * ストア名からデータタイプへの逆マッピング
 */
export const STORE_TO_TYPE_MAP = Object.fromEntries(
  Object.entries(DATA_TYPE_MAP).map(([key, value]) => [value, key])
);

/**
 * 操作タイプの定義
 */
export const OPERATIONS = {
  ADD: 'add',
  UPDATE: 'update',
  DELETE: 'delete',
  BULK_ADD: 'bulk_add',
  BULK_UPDATE: 'bulk_update',
  BULK_DELETE: 'bulk_delete',
  CLEAR: 'clear',
  IMPORT: 'import',
  EXPORT: 'export'
};

/**
 * データ保持期限（ミリ秒）
 */
export const RETENTION_PERIODS = {
  HISTORY: 90 * 24 * 60 * 60 * 1000,      // 90日
  CACHE: 7 * 24 * 60 * 60 * 1000,         // 7日
  WORKSPACE: 365 * 24 * 60 * 60 * 1000    // 1年
};

/**
 * キャッシュのTTL（ミリ秒）
 */
export const CACHE_TTL = {
  CALCULATION: 30 * 60 * 1000,  // 30分
  QUERY: 5 * 60 * 1000,         // 5分
  REPORT: 60 * 60 * 1000        // 1時間
};
