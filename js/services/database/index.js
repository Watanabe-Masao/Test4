/**
 * @file データベースモジュール エクスポート
 * @description データベース関連の全モジュールを一括エクスポート
 */

// スキーマ定義
export {
  DB_NAME,
  DB_VERSION,
  STORES,
  DATA_TYPE_MAP,
  STORE_TO_TYPE_MAP,
  OPERATIONS,
  RETENTION_PERIODS,
  CACHE_TTL
} from './schema.js';

// データベースクラス
export {
  Database,
  dbInstance,
  initDatabase,
  getDatabase
} from './db.js';

// リポジトリクラス
export {
  DataRepository
} from './repository.js';

// 同期マネージャー
export {
  SyncManager,
  syncManager,
  MERGE_MODE
} from './syncManager.js';

// DataLoader統合
export {
  importToIndexedDB,
  importMultipleToIndexedDB,
  getConverterForType
} from './dataLoaderIntegration.js';

// クエリビルダー
export {
  QueryBuilder,
  query,
  Search,
  OPERATORS,
  LOGICAL,
  SORT_ORDER
} from './queryBuilder.js';

// 計算エンジン
export {
  CalculationEngine,
  calculator
} from './calculationEngine.js';

// 集計機能
export {
  Aggregator,
  aggregate,
  AGGREGATE_FUNCTIONS
} from './aggregator.js';

// レポート生成
export {
  ReportGenerator,
  reportGenerator,
  REPORT_FORMAT,
  REPORT_TYPE
} from './reportGenerator.js';

// テストモジュール
export {
  DatabaseTest,
  PerformanceTest
} from './test.js';

/**
 * データベースクイックスタート
 * すべての必要な初期化を一度に実行
 */
export async function quickStart() {
  const { dbInstance, initDatabase } = await import('./db.js');
  const { DataRepository } = await import('./repository.js');

  // データベースを初期化
  await initDatabase();

  // 各データタイプのリポジトリを作成
  const repositories = {
    shiire: new DataRepository('shiire'),
    uriage: new DataRepository('uriage'),
    baihen: new DataRepository('baihen'),
    consumables: new DataRepository('consumables'),
    tenkanIn: new DataRepository('tenkan_in'),
    tenkanOut: new DataRepository('tenkan_out'),
    sanchoku: new DataRepository('sanchoku'),
    hana: new DataRepository('hana'),
    budget: new DataRepository('budget'),
    settings: new DataRepository('settings'),
    history: new DataRepository('history'),
    workspaces: new DataRepository('workspaces'),
    metadata: new DataRepository('metadata'),
    cache: new DataRepository('cache')
  };

  console.log('✅ Database initialized with repositories:', Object.keys(repositories));

  return {
    db: dbInstance,
    repositories
  };
}

/**
 * データベース情報を表示（デバッグ用）
 */
export async function showDatabaseInfo() {
  const { dbInstance } = await import('./db.js');

  if (!dbInstance.isConnected()) {
    console.log('❌ Database is not connected');
    return;
  }

  const info = await dbInstance.getInfo();
  const storage = await dbInstance.getStorageEstimate();

  console.log('📊 Database Information');
  console.log('='.repeat(50));
  console.log(`Name: ${info.name}`);
  console.log(`Version: ${info.version}`);
  console.log(`\nStores (${info.stores.length}):`);

  info.stores.forEach(store => {
    console.log(`  📁 ${store.name}`);
    console.log(`     Records: ${store.recordCount}`);
    console.log(`     Indexes: ${store.indexNames.join(', ')}`);
  });

  if (storage) {
    console.log(`\n💾 Storage:`);
    console.log(`   Used: ${storage.usageMB} MB (${storage.usagePercent}%)`);
    console.log(`   Quota: ${storage.quotaMB} MB`);
  }

  return info;
}
