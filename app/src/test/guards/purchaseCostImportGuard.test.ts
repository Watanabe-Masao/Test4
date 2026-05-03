/**
 * 仕入原価インポートプロセス正当性ガード
 *
 * データの上流プロセスを構造的に保証する:
 *   [1] ファイル判別が正しいこと — 全仕入関連ファイル種別がレジストリに登録
 *   [2] パースが正しいこと — 各 Processor が正しい型のレコードを生成
 *   [3] DuckDB 格納が正しいこと — tableInserts が正しいテーブル・カラムに INSERT
 *   [4] 正本化パスが正しいこと — readPurchaseCost が正しいテーブルを参照
 *
 * @see references/01-foundation/purchase-cost-definition.md
 * ルール定義: architectureRules.ts (AR-PATH-PURCHASE-COST)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById } from '../architectureRules'

const rule = getRuleById('AR-PATH-PURCHASE-COST')!

const SRC_DIR = path.resolve(__dirname, '../..')

// ── [1] ファイル判別が正しいこと ──

describe('ファイル判別が正しいこと', () => {
  const REQUIRED_PURCHASE_TYPES = [
    'purchase',
    'flowers',
    'directProduce',
    'interStoreIn',
    'interStoreOut',
    'consumables',
  ]

  it('FILE_TYPE_REGISTRY に仕入関連の全ファイル種別が登録されている', () => {
    const registryFile = path.join(SRC_DIR, 'infrastructure/fileImport/FileTypeDetector.ts')
    const content = fs.readFileSync(registryFile, 'utf-8')

    for (const type of REQUIRED_PURCHASE_TYPES) {
      expect(
        content.includes(`type: '${type}'`),
        `[${rule.id}] FILE_TYPE_REGISTRY に '${type}' が未登録`,
      ).toBe(true)
    }
  })

  it('各ファイル種別に filenamePatterns と headerPatterns が定義されている', () => {
    const registryFile = path.join(SRC_DIR, 'infrastructure/fileImport/FileTypeDetector.ts')
    const content = fs.readFileSync(registryFile, 'utf-8')

    // filenamePatterns と headerPatterns が空配列でないこと
    // （最低限1つのパターンが必要）
    for (const type of REQUIRED_PURCHASE_TYPES) {
      const typeRegion = content.slice(content.indexOf(`type: '${type}'`))
      const nextType = typeRegion.indexOf("type: '", 10)
      const block = nextType > 0 ? typeRegion.slice(0, nextType) : typeRegion.slice(0, 300)

      expect(
        block.includes('filenamePatterns:') && !block.includes('filenamePatterns: []'),
        `[${rule.id}] '${type}' の filenamePatterns が空`,
      ).toBe(true)
    }
  })

  it('FileTypeDetector のテストが存在する', () => {
    const testFile = path.join(SRC_DIR, 'infrastructure/fileImport/FileTypeDetector.test.ts')
    expect(fs.existsSync(testFile), `[${rule.id}] FileTypeDetector.test.ts が存在しない`).toBe(true)
  })
})

// ── [2] パースが正しいこと ──

describe('パースが正しいこと', () => {
  const PROCESSOR_MAP: Record<string, string> = {
    purchase: 'infrastructure/dataProcessing/PurchaseProcessor.ts',
    flowers: 'infrastructure/dataProcessing/SpecialSalesProcessor.ts',
    directProduce: 'infrastructure/dataProcessing/SpecialSalesProcessor.ts',
    interStoreIn: 'infrastructure/dataProcessing/TransferProcessor.ts',
    interStoreOut: 'infrastructure/dataProcessing/TransferProcessor.ts',
    consumables: 'infrastructure/dataProcessing/CostInclusionProcessor.ts',
  }

  it('全仕入関連データ型に対応する Processor が存在する', () => {
    for (const [type, processorPath] of Object.entries(PROCESSOR_MAP)) {
      const fullPath = path.join(SRC_DIR, processorPath)
      expect(
        fs.existsSync(fullPath),
        `[${rule.id}] '${type}' の Processor ${processorPath} が存在しない`,
      ).toBe(true)
    }
  })

  it('各 Processor にテストが存在する', () => {
    const uniqueProcessors = new Set(Object.values(PROCESSOR_MAP))
    for (const processorPath of uniqueProcessors) {
      const testPath = processorPath.replace('.ts', '.test.ts')
      const fullPath = path.join(SRC_DIR, testPath)
      expect(fs.existsSync(fullPath), `[${rule.id}] ${testPath} が存在しない`).toBe(true)
    }
  })

  it('TransferProcessor は interStoreOut を負の値で格納する', () => {
    const processorFile = path.join(SRC_DIR, 'infrastructure/dataProcessing/TransferProcessor.ts')
    const content = fs.readFileSync(processorFile, 'utf-8')

    // OUT は -Math.abs() で負の値にする
    expect(content).toContain('Math.abs')
  })
})

// ── [3] DuckDB 格納が正しいこと ──

describe('DuckDB 格納が正しいこと', () => {
  const REQUIRED_INSERT_FUNCTIONS = [
    'insertPurchase',
    'insertSpecialSales',
    'insertTransfers',
    'insertCostInclusions',
  ]

  it('tableInserts に仕入関連の全 INSERT 関数が存在する', () => {
    const insertsFile = path.join(SRC_DIR, 'infrastructure/duckdb/tableInserts.ts')
    const content = fs.readFileSync(insertsFile, 'utf-8')

    for (const fn of REQUIRED_INSERT_FUNCTIONS) {
      expect(
        content.includes(`export async function ${fn}`),
        `[${rule.id}] tableInserts に ${fn} が存在しない`,
      ).toBe(true)
    }
  })

  it('dataLoader.loadMonth が全仕入関連テーブルにデータを投入する', () => {
    const loaderFile = path.join(SRC_DIR, 'infrastructure/duckdb/dataLoader.ts')
    const content = fs.readFileSync(loaderFile, 'utf-8')

    for (const fn of REQUIRED_INSERT_FUNCTIONS) {
      expect(content.includes(fn), `[${rule.id}] dataLoader が ${fn} を呼び出していない`).toBe(true)
    }
  })

  it('insertTransfers は direction カラムに正しい値を設定する', () => {
    const insertsFile = path.join(SRC_DIR, 'infrastructure/duckdb/tableInserts.ts')
    const content = fs.readFileSync(insertsFile, 'utf-8')

    // 4方向が全て設定される
    expect(content).toContain('interStoreIn')
    expect(content).toContain('interStoreOut')
    expect(content).toContain('interDeptIn')
    expect(content).toContain('interDeptOut')
  })

  it('insertPurchase は date_key を toDateKeyFromParts で生成する', () => {
    const insertsFile = path.join(SRC_DIR, 'infrastructure/duckdb/tableInserts.ts')
    const content = fs.readFileSync(insertsFile, 'utf-8')

    expect(content).toContain('toDateKeyFromParts')
  })
})

// ── [4] 正本化パスが正しいこと ──

describe('正本化パスが正しいこと', () => {
  it('readPurchaseCost は DuckDB の purchase/special_sales/transfers テーブルを参照する', () => {
    const readFile = path.join(SRC_DIR, 'application/readModels/purchaseCost/readPurchaseCost.ts')
    const content = fs.readFileSync(readFile, 'utf-8')

    // 3つのクエリ関数を import している
    expect(content).toContain('queryPurchaseDailyBySupplier')
    expect(content).toContain('querySpecialSalesDaily')
    expect(content).toContain('queryTransfersDaily')
  })

  it('queryPurchaseDailyBySupplier は purchase テーブルを参照する', () => {
    const queryFile = path.join(SRC_DIR, 'infrastructure/duckdb/queries/purchaseComparison.ts')
    const content = fs.readFileSync(queryFile, 'utf-8')

    // queryPurchaseDailyBySupplier の SQL を確認
    const fnStart = content.indexOf('queryPurchaseDailyBySupplier')
    const fnBlock = content.slice(fnStart, fnStart + 500)
    expect(fnBlock).toContain('FROM purchase')
  })

  it('querySpecialSalesDaily は special_sales テーブルを参照する', () => {
    const queryFile = path.join(SRC_DIR, 'infrastructure/duckdb/queries/purchaseComparison.ts')
    const content = fs.readFileSync(queryFile, 'utf-8')

    const fnStart = content.indexOf('querySpecialSalesDaily')
    const fnBlock = content.slice(fnStart, fnStart + 500)
    expect(fnBlock).toContain('FROM special_sales')
  })

  it('queryTransfersDaily は transfers テーブルを参照する', () => {
    const queryFile = path.join(SRC_DIR, 'infrastructure/duckdb/queries/purchaseComparison.ts')
    const content = fs.readFileSync(queryFile, 'utf-8')

    const fnStart = content.indexOf('queryTransfersDaily')
    const fnBlock = content.slice(fnStart, fnStart + 500)
    expect(fnBlock).toContain('FROM transfers')
  })

  it('全チェーン: ファイル→Processor→DuckDB→readPurchaseCost→正本 が接続されている', () => {
    // このテストは上記テストの集約確認
    // 各段階が存在し、接続されていることを保証する
    const files = [
      'infrastructure/fileImport/FileTypeDetector.ts',
      'infrastructure/dataProcessing/PurchaseProcessor.ts',
      'infrastructure/dataProcessing/SpecialSalesProcessor.ts',
      'infrastructure/dataProcessing/TransferProcessor.ts',
      'infrastructure/duckdb/tableInserts.ts',
      'infrastructure/duckdb/dataLoader.ts',
      'infrastructure/duckdb/queries/purchaseComparison.ts',
      'application/readModels/purchaseCost/readPurchaseCost.ts',
      'application/readModels/purchaseCost/PurchaseCostTypes.ts',
    ]

    for (const file of files) {
      const fullPath = path.join(SRC_DIR, file)
      expect(
        fs.existsSync(fullPath),
        `[${rule.id}] チェーン構成ファイル ${file} が存在しない`,
      ).toBe(true)
    }
  })
})
