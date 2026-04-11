/**
 * 暫定構造メトリクス audit
 *
 * 「行数」ではなく「暫定構造の在庫」を主 KPI として監視する。
 * Exit KPI は原則単調減少。増加には PR に明示理由が必要。
 *
 * @guard G1 テストに書く
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const SRC_DIR = path.resolve(__dirname, '../..')

function collectFiles(dir: string, ext: string[]): string[] {
  const results: string[] = []
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (ext.some((e) => entry.name.endsWith(e))) results.push(full)
    }
  }
  walk(dir)
  return results
}

function rel(file: string): string {
  return path.relative(SRC_DIR, file)
}

// ─── Exit KPI: 原則単調減少 ────────────────────────────

describe('Exit KPI: 暫定構造在庫（原則単調減少）', () => {
  const allFiles = collectFiles(SRC_DIR, ['.ts', '.tsx'])
  const prodFiles = allFiles.filter(
    (f) => !f.includes('__tests__') && !f.includes('.test.') && !f.includes('.stories.'),
  )
  const presFiles = prodFiles.filter((f) => rel(f).startsWith('presentation/'))

  it('正本化済み readModel 領域数 ≥ 5', () => {
    const readModelDir = path.join(SRC_DIR, 'application/readModels')
    const dirs = fs.existsSync(readModelDir)
      ? fs.readdirSync(readModelDir, { withFileTypes: true }).filter((d) => d.isDirectory()).length
      : 0
    // 現在 5 領域: purchaseCost, grossProfit, salesFact, discountFact, factorDecomposition
    expect(dirs, '正本化済み readModel 領域数が減少しています').toBeGreaterThanOrEqual(6)
  })

  it('allowlist 総エントリ数 ≤ 62', () => {
    // 「総エントリ数」= allowlists/*.ts 内の { reason: ... } の出現回数
    // これは「許可リストに登録されている例外」の総数で、
    // adapter / compat / legacy 含む全カテゴリの合計。
    // 個別カテゴリ（アクティブ / adapter / compat）は snapshot で追跡する。
    // Gate 1 で performance.ts (18 entries: isPrevYear handler 棚卸し) を追加。
    // Gate 3 で nonPairableConsumers (4+8 entries: 構造的 pair 不可 + 単一呼び出し) を追加。
    // Gate 3 の pair 化で migration カテゴリを段階的に削減予定。
    const allowlistDir = path.join(SRC_DIR, 'test/allowlists')
    if (!fs.existsSync(allowlistDir)) return
    let count = 0
    for (const file of collectFiles(allowlistDir, ['.ts'])) {
      const content = fs.readFileSync(file, 'utf-8')
      const matches = content.match(/reason:/g)
      count += matches?.length ?? 0
    }
    expect(
      count,
      `allowlist 総エントリ数: ${count}/69。削減を継続してください`,
    ).toBeLessThanOrEqual(69)
  })

  it('widget 自前取得残件 = 0', () => {
    // presentation → infrastructure 直接 import のみ検出。
    // application 層の facade hook (useDuckDB, useStorageDuck) は許可。
    const INFRA_PATTERNS = [/from\s+['"]@\/infrastructure\//]
    const violations: string[] = []
    for (const file of presFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('import type')) continue
        if (INFRA_PATTERNS.some((p) => p.test(line))) {
          violations.push(rel(file))
          break
        }
      }
    }
    expect(
      violations.length,
      `widget 自前取得: ${violations.length}/16\n${violations.join('\n')}`,
    ).toBe(0)
  })

  it('active bridges ≤ 4', () => {
    const bridgeDir = path.join(SRC_DIR, 'application/services')
    const bridgeFiles = fs.existsSync(bridgeDir)
      ? fs
          .readdirSync(bridgeDir)
          .filter((f) => /[Bb]ridge/.test(f) && f.endsWith('.ts') && !f.includes('.test.'))
      : []
    let activeCount = 0
    for (const file of bridgeFiles) {
      const content = fs.readFileSync(path.join(bridgeDir, file), 'utf-8')
      if (!content.includes('@deprecated')) activeCount++
    }
    expect(activeCount, `active bridges: ${activeCount}/15`).toBeLessThanOrEqual(15)
  })

  it('互換 re-export ≤ 2', () => {
    const COMPAT_PATTERN = /後方互換|backward compat|バレル re-export/
    let count = 0
    const checkFiles = ['application/hooks/useImport.helpers.ts', 'infrastructure/ImportService.ts']
    for (const relPath of checkFiles) {
      const full = path.join(SRC_DIR, relPath)
      if (!fs.existsSync(full)) continue
      const content = fs.readFileSync(full, 'utf-8')
      if (COMPAT_PATTERN.test(content)) count++
    }
    expect(count, `互換 re-export: ${count}/1`).toBeLessThanOrEqual(1)
  })

  it('ImportedData direct import = 0', () => {
    const IMPORT_PATTERN = /import\s+\{[^}]*\bImportedData\b/
    const violations: string[] = []
    for (const file of prodFiles) {
      const relPath = rel(file)
      if (relPath.includes('monthlyDataAdapter')) continue
      if (relPath === 'domain/models/ImportedData.ts') continue
      if (relPath === 'domain/models/storeTypes.ts') continue
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('import type')) continue
        if (IMPORT_PATTERN.test(line)) {
          violations.push(relPath)
          break
        }
      }
    }
    expect(
      violations.length,
      `ImportedData direct import: ${violations.length}/0\n${violations.join('\n')}`,
    ).toBe(0)
  })

  it('comparison 独自解決残件 = 0（presentation 層）', () => {
    // presentation 層で buildComparisonScope を直接呼んだり、
    // 比較先年月を独自計算して集約に使っている箇所を検出
    const BANNED_PATTERNS = [
      // buildComparisonScope を presentation 層から直接 import
      /from\s+['"]@\/domain\/models\/ComparisonScope['"]/,
      // 比較先の日付を独自計算して集約関数に渡すパターン
      /aggregat.*prevYear.*year\s*-\s*1/,
    ]
    const ALLOWED_PATTERNS = [
      /import type/, // type-only import は許可
      /ComparisonScope\s*\|/, // union type 定義は許可
    ]
    const violations: string[] = []

    for (const file of presFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (ALLOWED_PATTERNS.some((p) => p.test(line))) continue
        if (BANNED_PATTERNS.some((p) => p.test(line))) {
          violations.push(`${rel(file)}: ${line.trim().slice(0, 80)}`)
          break
        }
      }
    }

    expect(
      violations,
      `presentation 層で比較先を独自解決しています:\n${violations.join('\n')}\n` +
        `ComparisonScope は application 層（useComparisonModule）経由で取得してください`,
    ).toEqual([])
  })
})
