/**
 * @file データベーステストモジュール
 * @description IndexedDBの基本機能をテスト
 */

import { dbInstance, initDatabase } from './db.js';
import { DataRepository } from './repository.js';
import { DATA_TYPE_MAP } from './schema.js';

/**
 * テストデータ生成
 */
function generateTestData(count = 10) {
  const data = [];
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    data.push({
      date: date.getTime(),
      store: `0${(i % 3) + 1}`,
      supplier: `テスト仕入先${(i % 5) + 1}`,
      category: 'market',
      cost: Math.floor(Math.random() * 100000) + 10000,
      amount: Math.floor(Math.random() * 100) + 1,
      itemName: `テスト商品${i + 1}`
    });
  }

  return data;
}

/**
 * テスト実行クラス
 */
export class DatabaseTest {
  constructor() {
    this.results = [];
  }

  /**
   * テストを実行
   */
  async runAll() {
    console.log('🧪 Starting Database Tests...\n');

    try {
      await this.testDatabaseOpen();
      await this.testAdd();
      await this.testBulkAdd();
      await this.testGet();
      await this.testGetAll();
      await this.testQuery();
      await this.testGetByIndex();
      await this.testUpdate();
      await this.testDelete();
      await this.testCount();
      await this.testClear();
      await this.testDatabaseInfo();

      console.log('\n✅ All tests passed!');
      this.printSummary();
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      throw error;
    }
  }

  /**
   * テスト: データベース初期化
   */
  async testDatabaseOpen() {
    console.log('Test 1: Database Open');

    await initDatabase();

    if (dbInstance.isConnected()) {
      console.log('  ✅ Database opened successfully');
      this.results.push({ name: 'Database Open', status: 'PASS' });
    } else {
      throw new Error('Database not connected');
    }
  }

  /**
   * テスト: データ追加
   */
  async testAdd() {
    console.log('\nTest 2: Add Single Record');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const testData = {
      date: Date.now(),
      store: '01',
      supplier: 'テスト仕入先',
      cost: 50000
    };

    const id = await repo.add(testData);
    console.log(`  ✅ Record added with ID: ${id}`);
    this.results.push({ name: 'Add Single Record', status: 'PASS', data: { id } });
  }

  /**
   * テスト: 一括追加
   */
  async testBulkAdd() {
    console.log('\nTest 3: Bulk Add Records');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const testData = generateTestData(5);

    const ids = await repo.addBulk(testData);
    console.log(`  ✅ ${ids.length} records added`);
    this.results.push({ name: 'Bulk Add Records', status: 'PASS', data: { count: ids.length } });
  }

  /**
   * テスト: データ取得
   */
  async testGet() {
    console.log('\nTest 4: Get Single Record');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const first = await repo.first();

    if (first) {
      const record = await repo.get(first.id);
      console.log(`  ✅ Record retrieved: ID=${record.id}`);
      this.results.push({ name: 'Get Single Record', status: 'PASS' });
    } else {
      throw new Error('No records found');
    }
  }

  /**
   * テスト: 全データ取得
   */
  async testGetAll() {
    console.log('\nTest 5: Get All Records');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const records = await repo.getAll();

    console.log(`  ✅ Retrieved ${records.length} records`);
    this.results.push({ name: 'Get All Records', status: 'PASS', data: { count: records.length } });
  }

  /**
   * テスト: クエリ検索
   */
  async testQuery() {
    console.log('\nTest 6: Query Records');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const results = await repo.query({ store: '01' });

    console.log(`  ✅ Query returned ${results.length} records`);
    this.results.push({ name: 'Query Records', status: 'PASS', data: { count: results.length } });
  }

  /**
   * テスト: インデックス検索
   */
  async testGetByIndex() {
    console.log('\nTest 7: Get By Index');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const results = await repo.getByIndex('store', '01');

    console.log(`  ✅ Index search returned ${results.length} records`);
    this.results.push({ name: 'Get By Index', status: 'PASS', data: { count: results.length } });
  }

  /**
   * テスト: データ更新
   */
  async testUpdate() {
    console.log('\nTest 8: Update Record');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const first = await repo.first();

    if (first) {
      await repo.update(first.id, { cost: 99999 });
      const updated = await repo.get(first.id);

      if (updated.cost === 99999 && updated.version === 2) {
        console.log(`  ✅ Record updated: cost=${updated.cost}, version=${updated.version}`);
        this.results.push({ name: 'Update Record', status: 'PASS' });
      } else {
        throw new Error('Update failed');
      }
    } else {
      throw new Error('No records found');
    }
  }

  /**
   * テスト: データ削除
   */
  async testDelete() {
    console.log('\nTest 9: Delete Record');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const first = await repo.first();

    if (first) {
      const beforeCount = await repo.count();
      await repo.delete(first.id);
      const afterCount = await repo.count();

      if (afterCount === beforeCount - 1) {
        console.log(`  ✅ Record deleted: ${beforeCount} → ${afterCount}`);
        this.results.push({ name: 'Delete Record', status: 'PASS' });
      } else {
        throw new Error('Delete failed');
      }
    } else {
      throw new Error('No records found');
    }
  }

  /**
   * テスト: 件数取得
   */
  async testCount() {
    console.log('\nTest 10: Count Records');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const count = await repo.count();

    console.log(`  ✅ Record count: ${count}`);
    this.results.push({ name: 'Count Records', status: 'PASS', data: { count } });
  }

  /**
   * テスト: データクリア
   */
  async testClear() {
    console.log('\nTest 11: Clear All Records');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    await repo.clear();
    const count = await repo.count();

    if (count === 0) {
      console.log(`  ✅ All records cleared`);
      this.results.push({ name: 'Clear All Records', status: 'PASS' });
    } else {
      throw new Error(`Clear failed: ${count} records remain`);
    }
  }

  /**
   * テスト: データベース情報取得
   */
  async testDatabaseInfo() {
    console.log('\nTest 12: Get Database Info');

    const info = await dbInstance.getInfo();
    console.log(`  ✅ Database: ${info.name} v${info.version}`);
    console.log(`  ✅ Stores: ${info.stores.length}`);

    info.stores.forEach(store => {
      console.log(`    - ${store.name}: ${store.recordCount} records`);
    });

    this.results.push({ name: 'Get Database Info', status: 'PASS', data: info });
  }

  /**
   * テスト結果サマリーを表示
   */
  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const total = this.results.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);

    if (passed === total) {
      console.log('\n🎉 All tests passed successfully!');
    }
  }
}

/**
 * パフォーマンステスト
 */
export class PerformanceTest {
  /**
   * 大量データの追加テスト
   */
  async testBulkInsertPerformance(count = 1000) {
    console.log(`\n⚡ Performance Test: Bulk Insert ${count} records`);

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);
    const testData = generateTestData(count);

    const startTime = performance.now();
    await repo.addBulk(testData);
    const endTime = performance.now();

    const duration = (endTime - startTime).toFixed(2);
    const perRecord = (duration / count).toFixed(4);

    console.log(`  ✅ Inserted ${count} records in ${duration}ms`);
    console.log(`  ⏱️ Average: ${perRecord}ms per record`);

    return { count, duration, perRecord };
  }

  /**
   * クエリパフォーマンステスト
   */
  async testQueryPerformance() {
    console.log('\n⚡ Performance Test: Query');

    const repo = new DataRepository(DATA_TYPE_MAP.shiire);

    const startTime = performance.now();
    const results = await repo.query({ store: '01' });
    const endTime = performance.now();

    const duration = (endTime - startTime).toFixed(2);

    console.log(`  ✅ Query returned ${results.length} records in ${duration}ms`);

    return { count: results.length, duration };
  }
}

/**
 * テストをブラウザコンソールから実行できるようにグローバルに公開
 */
if (typeof window !== 'undefined') {
  window.DatabaseTest = DatabaseTest;
  window.PerformanceTest = PerformanceTest;
  window.runDatabaseTest = async function() {
    const test = new DatabaseTest();
    await test.runAll();
  };
  window.runPerformanceTest = async function(count = 1000) {
    const test = new PerformanceTest();
    await test.testBulkInsertPerformance(count);
    await test.testQueryPerformance();
  };
}
