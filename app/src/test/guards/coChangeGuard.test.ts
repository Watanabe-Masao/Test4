/**
 * Co-Change ガード — 変更の影響範囲を一括検出し、修正方法をまとめて案内する
 *
 * 全チェックを回してから hints をまとめて出力する（1個ずつ止めない）。
 * severity: warn / fixNow: 'now' — CI テスト自体が落ちるので二重ブロックは不要。
 * 検出したらまとめて即修正。
 *
 * @guard G1 テストに書く
 * @guard D3 不変条件はテストで守る
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, rel } from '../guardTestHelpers'

// ─── ヘルパー ────────────────────────────────────────────

function hint(problem: string, fix: string): string {
  return `  - ${problem}\n    → ${fix}`
}

// ─── 全 co-change チェックを1テストに集約 ────────────────

describe('co-change: 変更の影響範囲チェック', () => {
  it('全 co-change 関係がまとめて整合しているか', () => {
    const hints: string[] = []

    // ── 1. バリデーション severity ↔ テスト ──

    const integrityFile = path.join(SRC_DIR, 'application/usecases/import/importDataIntegrity.ts')
    const importTestFile = path.join(
      SRC_DIR,
      'application/usecases/import/__tests__/FileImportService.test.ts',
    )
    if (fs.existsSync(integrityFile) && fs.existsSync(importTestFile)) {
      const srcContent = fs.readFileSync(integrityFile, 'utf-8')
      const testContent = fs.readFileSync(importTestFile, 'utf-8')

      const staleWarning = (
        testContent.match(/level\s*===\s*'warning'\s*&&\s*m\.message\.includes\('重複/g) ?? []
      ).length
      if (staleWarning > 0) {
        hints.push(
          hint(
            `テストが warning で重複を探しているがソースは error に昇格済み（${staleWarning}件）`,
            `${rel(importTestFile)} の 'warning' を 'error' に置換`,
          ),
        )
      }

      const srcErrors = (srcContent.match(/level:\s*'error'/g) ?? []).length
      const testErrors = (
        testContent.match(/level\s*===\s*'error'\s*&&\s*m\.message\.includes/g) ?? []
      ).length
      if (srcErrors > 0 && testErrors === 0) {
        hints.push(
          hint(
            `ソースに ${srcErrors} 件の error レベルがあるがテストに error アサーションがない`,
            `${rel(importTestFile)} に error レベルのテストケースを追加`,
          ),
        )
      }
    }

    // ── 2. readModel parse 方式 ↔ パスガード ──

    const PARSE_PAIRS = [
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

    for (const { src, guard, model } of PARSE_PAIRS) {
      const srcPath = path.join(SRC_DIR, src)
      const guardPath = path.join(SRC_DIR, guard)
      if (!fs.existsSync(srcPath) || !fs.existsSync(guardPath)) continue

      const srcContent = fs.readFileSync(srcPath, 'utf-8')
      const guardContent = fs.readFileSync(guardPath, 'utf-8')

      const srcUsesSafe = srcContent.includes(`${model}.safeParse`)
      const guardMentionsModel = guardContent.includes(`${model}.`)

      if (!guardMentionsModel && (srcContent.includes(`${model}.parse(`) || srcUsesSafe)) {
        hints.push(
          hint(
            `${rel(guardPath)} に ${model} の parse 検証がない`,
            `expect(content).toContain('${model}.${srcUsesSafe ? 'safeParse' : 'parse'}') を追加。不要なら PARSE_PAIRS から除外してコメントで理由を残す`,
          ),
        )
        continue
      }
      if (!guardMentionsModel) continue

      const guardExpectsSafe = guardContent.includes(`${model}.safeParse`)
      if (srcUsesSafe && !guardExpectsSafe) {
        hints.push(
          hint(
            `${rel(srcPath)} は .safeParse() だが ${rel(guardPath)} は .parse を期待`,
            `${rel(guardPath)} の toContain('${model}.parse') を toContain('${model}.safeParse') に変更`,
          ),
        )
      }
      if (!srcUsesSafe && guardExpectsSafe) {
        hints.push(
          hint(
            `${rel(srcPath)} は .parse() だが ${rel(guardPath)} は .safeParse を期待`,
            `${rel(guardPath)} の toContain('${model}.safeParse') を toContain('${model}.parse') に変更`,
          ),
        )
      }
    }

    // ── 3. guard/allowlist 変更 → docs:generate ──

    const guardsDir = path.join(SRC_DIR, 'test/guards')
    const structureFile = path.resolve(SRC_DIR, '../../references/02-status/project-structure.md')
    if (fs.existsSync(guardsDir) && fs.existsSync(structureFile)) {
      const guardFiles = fs
        .readdirSync(guardsDir)
        .filter((f) => f.endsWith('.test.ts'))
        .sort()
      const structureContent = fs.readFileSync(structureFile, 'utf-8')
      const missing = guardFiles.filter(
        (f) => !structureContent.includes(f.replace('.test.ts', '')),
      )
      if (missing.length > 0) {
        hints.push(
          hint(
            `ガードファイル ${missing.length} 件が project-structure.md に未反映: ${missing.join(', ')}`,
            'cd app && npm run docs:generate && git add references/',
          ),
        )
      }
    }

    // ── まとめて出力 ──

    expect(
      hints,
      hints.length > 0
        ? [
            '',
            `⚠️ co-change 不整合 ${hints.length} 件:`,
            '',
            ...hints,
            '',
            'CI で弾かれる前に上記を修正してください。',
          ].join('\n')
        : '',
    ).toEqual([])
  })
})
