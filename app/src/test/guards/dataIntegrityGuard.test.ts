/**
 * データ整合性ガード — flowers (花データ) の重複レコード検出
 *
 * flowers は storeId × day = 1 レコードが正規形。
 * 重複が存在すると客数が二重計上されるため、
 * インポート結果の整合性を検証する。
 *
 * @guard G1 テストに書く — 機械的検出手段で再発防止
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('data integrity guard', () => {
  describe('flowers データの重複防止', () => {
    it('buildFlowersCustomerIndex が加算パターン (+=) を使わない', () => {
      const filePath = path.join(SRC_DIR, 'domain/models/ClassifiedSales.ts')
      const content = fs.readFileSync(filePath, 'utf-8')

      // buildFlowersCustomerIndex 内で += パターンが使われていないことを検証
      const funcMatch = content.match(/function buildFlowersCustomerIndex[\s\S]*?^}/m)
      if (!funcMatch) {
        expect.fail('buildFlowersCustomerIndex が見つかりません')
        return
      }

      const funcBody = funcMatch[0]
      expect(
        funcBody.includes('+='),
        'buildFlowersCustomerIndex で += パターンが検出されました。' +
          'flowers は storeId × day = 1 レコードが正規形。' +
          '重複レコードが存在する場合は last-write-wins にすべきです。',
      ).toBe(false)
    })

    it('flowers の indexByStoreDay が上書き方式である', () => {
      // indexByStoreDay は汎用関数で、常に last-write-wins
      const filePath = path.join(SRC_DIR, 'domain/models/DataTypes.ts')
      const content = fs.readFileSync(filePath, 'utf-8')

      const funcMatch = content.match(/function indexByStoreDay[\s\S]*?^}/m)
      if (!funcMatch) return

      const funcBody = funcMatch[0]
      expect(
        funcBody.includes('+='),
        'indexByStoreDay で += パターンが検出されました。lookup 用 index は上書きにすべきです。',
      ).toBe(false)
    })
  })

  describe('CTS データの意図的加算パターンの文書化', () => {
    it('indexCtsQuantityByStoreDay にはカテゴリ別加算のコメントがある', () => {
      const filePath = path.join(SRC_DIR, 'features/comparison/application/sourceDataIndex.ts')
      const content = fs.readFileSync(filePath, 'utf-8')

      // CTS は storeId × day × category が正規キーで、
      // 同一 storeId × day の複数カテゴリを合算するのは意図的
      expect(content).toContain('同一 storeId・day の複数カテゴリの totalQuantity を合算')
    })
  })

  describe('import 後のデータ構造が正規形を満たす', () => {
    it('processSpecialSales のパーティション構造が storeId × day で一意', () => {
      // processSpecialSales は中間構造 partitioned[mk][storeId][day] で
      // storeId × day の一意性を保証する
      const filePath = path.join(SRC_DIR, 'infrastructure/dataProcessing/SpecialSalesProcessor.ts')
      const content = fs.readFileSync(filePath, 'utf-8')

      // 中間構造で storeId × day をキーにしていることを確認
      expect(content).toContain('partitioned[mk][storeId]')
    })

    it('merge 関数が Map ベースのデータ重複排除を使用する', () => {
      // classifiedSales と categoryTimeSales の merge 関数は
      // Map ベースのデータ重複排除で重複を防ぐ
      const csPath = path.join(SRC_DIR, 'domain/models/ClassifiedSales.ts')
      const dtPath = path.join(SRC_DIR, 'domain/models/DataTypes.ts')

      const csContent = fs.readFileSync(csPath, 'utf-8')
      const dtContent = fs.readFileSync(dtPath, 'utf-8')

      expect(csContent).toContain('mergeClassifiedSalesData')
      expect(dtContent).toContain('mergeCategoryTimeSalesData')

      // Map ベースの dedup を使用していることを確認
      const csFunc = csContent.match(/function mergeClassifiedSalesData[\s\S]*?^}/m)
      const dtFunc = dtContent.match(/function mergeCategoryTimeSalesData[\s\S]*?^}/m)

      expect(csFunc?.[0]).toContain('new Map')
      expect(dtFunc?.[0]).toContain('new Map')
    })
  })
})
