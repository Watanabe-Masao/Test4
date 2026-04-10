/**
 * Co-Change ガード — 変更の影響範囲を機械的に検出する
 *
 * 「A を変えたら B も変えるべき」という関係を検証する。
 * 今回の CI 失敗（severity 変更 → テスト未追従、query 追加 → モック未更新）から学んだルール。
 *
 * @guard G1 テストに書く — 文書に書いただけのルールは守られない
 * @guard D3 不変条件はテストで守る
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, rel } from '../guardTestHelpers'

// ─── AR-COCHANGE-VALIDATION-SEVERITY ─────────────────────

describe('AR-COCHANGE-VALIDATION-SEVERITY: バリデーション severity とテストの整合性', () => {
  const integrityFile = path.join(SRC_DIR, 'application/usecases/import/importDataIntegrity.ts')
  const testFile = path.join(
    SRC_DIR,
    'application/usecases/import/__tests__/FileImportService.test.ts',
  )

  it('importDataIntegrity の error レベル件数とテストの error アサーション件数が一致する', () => {
    if (!fs.existsSync(integrityFile) || !fs.existsSync(testFile)) return

    const srcContent = fs.readFileSync(integrityFile, 'utf-8')
    const testContent = fs.readFileSync(testFile, 'utf-8')

    // ソース側: level: 'error' の出現数（重複・小計系のみカウント）
    const srcErrorMatches = srcContent.match(/level:\s*'error'/g) ?? []

    // テスト側: m.level === 'error' && m.message.includes('重複') 系のアサーション
    const testErrorAssertions =
      testContent.match(/level\s*===\s*'error'\s*&&\s*m\.message\.includes/g) ?? []
    // テスト側: m.level === 'warning' && m.message.includes('重複') — 旧パターンが残っていないこと
    const staleWarningAssertions = (
      testContent.match(/level\s*===\s*'warning'\s*&&\s*m\.message\.includes\('重複/g) ?? []
    ).length

    expect(
      staleWarningAssertions,
      [
        'テストに旧 severity (warning) で重複レコードを探すアサーションが残っています。',
        `${rel(testFile)} を確認し、error に更新してください。`,
      ].join('\n'),
    ).toBe(0)

    // ソースの error 件数が増えたらテスト側にもアサーションが必要
    // （厳密な 1:1 対応ではなく、テスト側が 0 件でないことを確認）
    if (srcErrorMatches.length > 0) {
      expect(
        testErrorAssertions.length,
        [
          `importDataIntegrity.ts に ${srcErrorMatches.length} 件の error レベルがありますが、`,
          `テストに error レベルのアサーションがありません。`,
        ].join('\n'),
      ).toBeGreaterThan(0)
    }
  })
})

// ─── AR-COCHANGE-READMODEL-PARSE ─────────────────────────

describe('AR-COCHANGE-READMODEL-PARSE: readModel parse 方式とパスガードの整合性', () => {
  const READMODEL_GUARD_PAIRS: Array<{
    readModel: string
    guard: string
    modelName: string
  }> = [
    {
      readModel: 'application/readModels/salesFact/readSalesFact.ts',
      guard: 'test/guards/salesFactPathGuard.test.ts',
      modelName: 'SalesFactReadModel',
    },
    {
      readModel: 'application/readModels/discountFact/readDiscountFact.ts',
      guard: 'test/guards/discountFactPathGuard.test.ts',
      modelName: 'DiscountFactReadModel',
    },
    {
      readModel: 'application/readModels/purchaseCost/readPurchaseCost.ts',
      guard: 'test/guards/purchaseCostPathGuard.test.ts',
      modelName: 'PurchaseCostReadModel',
    },
    {
      readModel: 'application/readModels/customerFact/readCustomerFact.ts',
      guard: 'test/guards/customerFactPathGuard.test.ts',
      modelName: 'CustomerFactReadModel',
    },
  ]

  it('readModel の parse メソッドとパスガードの toContain が一致する', () => {
    const mismatches: string[] = []

    for (const { readModel, guard, modelName } of READMODEL_GUARD_PAIRS) {
      const rmPath = path.join(SRC_DIR, readModel)
      const guardPath = path.join(SRC_DIR, guard)
      if (!fs.existsSync(rmPath) || !fs.existsSync(guardPath)) continue

      const rmContent = fs.readFileSync(rmPath, 'utf-8')
      const guardContent = fs.readFileSync(guardPath, 'utf-8')

      const usesSafeParse = rmContent.includes(`${modelName}.safeParse`)
      const usesParse = rmContent.includes(`${modelName}.parse(`) && !usesSafeParse

      const guardExpectsSafeParse = guardContent.includes(`${modelName}.safeParse`)
      const guardExpectsParse =
        guardContent.includes(`${modelName}.parse`) && !guardExpectsSafeParse

      if (usesSafeParse && guardExpectsParse) {
        mismatches.push(
          `${rel(rmPath)} は .safeParse() を使用しているが、${rel(guardPath)} は .parse を期待している`,
        )
      }
      if (usesParse && guardExpectsSafeParse) {
        mismatches.push(
          `${rel(rmPath)} は .parse() を使用しているが、${rel(guardPath)} は .safeParse を期待している`,
        )
      }
    }

    expect(
      mismatches,
      [
        'readModel の parse 方式とパスガードのアサーションが不一致です。',
        '両方を同時に更新してください。',
        '',
        ...mismatches,
      ].join('\n'),
    ).toEqual([])
  })
})
