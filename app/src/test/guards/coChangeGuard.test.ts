/**
 * Co-Change ガード — 変更の影響範囲を検出し、修正方法を案内する
 *
 * 「ここ、直さないと CI で弾かれるからパッと直しといて」を自動化する。
 * gate ではなく warn — CI テスト自体が落ちるので二重ブロックは不要。
 * fixNow: 'now' — 検出したら即修正。
 *
 * @guard G1 テストに書く
 * @guard D3 不変条件はテストで守る
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, rel } from '../guardTestHelpers'

// ─── ヘルパー: 修正案内付きメッセージ ────────────────────

function fixHint(problem: string, fix: string): string {
  return `⚠️ ${problem}\n   → 修正: ${fix}`
}

// ─── バリデーション severity とテストの整合性 ─────────────

describe('co-change: バリデーション severity ↔ テスト', () => {
  const integrityFile = path.join(SRC_DIR, 'application/usecases/import/importDataIntegrity.ts')
  const testFile = path.join(
    SRC_DIR,
    'application/usecases/import/__tests__/FileImportService.test.ts',
  )

  it('severity を変えたらテストも追従しているか', () => {
    if (!fs.existsSync(integrityFile) || !fs.existsSync(testFile)) return

    const srcContent = fs.readFileSync(integrityFile, 'utf-8')
    const testContent = fs.readFileSync(testFile, 'utf-8')

    const hints: string[] = []

    // 旧 severity でテストが残っている
    const staleWarning = (
      testContent.match(/level\s*===\s*'warning'\s*&&\s*m\.message\.includes\('重複/g) ?? []
    ).length
    if (staleWarning > 0) {
      hints.push(
        fixHint(
          `テストが warning で重複を探しているが、ソースは error に昇格済み（${staleWarning}件）`,
          `${rel(testFile)} の 'warning' を 'error' に置換して npx vitest run で確認`,
        ),
      )
    }

    // ソースに error があるのにテストに error アサーションがない
    const srcErrors = (srcContent.match(/level:\s*'error'/g) ?? []).length
    const testErrors = (
      testContent.match(/level\s*===\s*'error'\s*&&\s*m\.message\.includes/g) ?? []
    ).length
    if (srcErrors > 0 && testErrors === 0) {
      hints.push(
        fixHint(
          `ソースに ${srcErrors} 件の error レベルがあるがテストに error アサーションがない`,
          `${rel(testFile)} に error レベルのテストケースを追加`,
        ),
      )
    }

    expect(hints, hints.join('\n\n')).toEqual([])
  })
})

// ─── readModel parse 方式とパスガードの整合性 ─────────────

describe('co-change: readModel parse 方式 ↔ パスガード', () => {
  const PAIRS = [
    {
      src: 'application/readModels/salesFact/readSalesFact.ts',
      guard: 'test/guards/salesFactPathGuard.test.ts',
      model: 'SalesFactReadModel',
    },
    {
      src: 'application/readModels/discountFact/readDiscountFact.ts',
      guard: 'test/guards/discountFactPathGuard.test.ts',
      model: 'DiscountFactReadModel',
    },
    {
      src: 'application/readModels/purchaseCost/readPurchaseCost.ts',
      guard: 'test/guards/purchaseCostPathGuard.test.ts',
      model: 'PurchaseCostReadModel',
    },
    {
      src: 'application/readModels/customerFact/readCustomerFact.ts',
      guard: 'test/guards/customerFactPathGuard.test.ts',
      model: 'CustomerFactReadModel',
    },
  ]

  it('parse メソッド変更がパスガードに反映されているか', () => {
    const hints: string[] = []

    for (const { src, guard, model } of PAIRS) {
      const srcPath = path.join(SRC_DIR, src)
      const guardPath = path.join(SRC_DIR, guard)
      if (!fs.existsSync(srcPath) || !fs.existsSync(guardPath)) continue

      const srcContent = fs.readFileSync(srcPath, 'utf-8')
      const guardContent = fs.readFileSync(guardPath, 'utf-8')

      const srcUsesSafe = srcContent.includes(`${model}.safeParse`)
      const guardExpectsSafe = guardContent.includes(`${model}.safeParse`)
      const guardMentionsModel = guardContent.includes(`${model}.`)

      // ガードがそもそもこのモデルの parse をチェックしていない場合はスキップ
      if (!guardMentionsModel) continue

      if (srcUsesSafe && !guardExpectsSafe) {
        hints.push(
          fixHint(
            `${rel(srcPath)} は .safeParse() だが ${rel(guardPath)} は .parse を期待`,
            `${rel(guardPath)} の toContain('${model}.parse') を toContain('${model}.safeParse') に変更`,
          ),
        )
      }
      if (!srcUsesSafe && guardExpectsSafe) {
        hints.push(
          fixHint(
            `${rel(srcPath)} は .parse() だが ${rel(guardPath)} は .safeParse を期待`,
            `${rel(guardPath)} の toContain('${model}.safeParse') を toContain('${model}.parse') に変更`,
          ),
        )
      }
    }

    expect(hints, hints.join('\n\n')).toEqual([])
  })
})

// ─── docs:generate 忘れ（よくあるやつ） ──────────────────

describe('co-change: guard/allowlist 変更 → docs:generate', () => {
  it('ガードファイル一覧が project-structure.md に反映されているか', () => {
    const guardsDir = path.join(SRC_DIR, 'test/guards')
    const structureFile = path.resolve(SRC_DIR, '../../references/02-status/project-structure.md')
    if (!fs.existsSync(guardsDir) || !fs.existsSync(structureFile)) return

    const guardFiles = fs
      .readdirSync(guardsDir)
      .filter((f) => f.endsWith('.test.ts'))
      .sort()
    const structureContent = fs.readFileSync(structureFile, 'utf-8')

    const missing = guardFiles.filter((f) => !structureContent.includes(f.replace('.test.ts', '')))

    if (missing.length > 0) {
      const hint = fixHint(
        `ガードファイル ${missing.length} 件が project-structure.md に未反映`,
        'cd app && npm run docs:generate && git add references/',
      )
      expect(missing, hint).toEqual([])
    }
  })
})
