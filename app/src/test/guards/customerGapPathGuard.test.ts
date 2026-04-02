/**
 * 客数GAP 正本ガード
 *
 * calculateCustomerGap が唯一の客数GAP計算経路。
 * 独自計算や旧 helper 経由を禁止する。
 *
 * @see references/01-principles/customer-gap-definition.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('客数GAP 正本ガード', () => {
  it('calculateCustomerGap が domain/calculations に存在する', () => {
    const file = path.join(SRC_DIR, 'domain/calculations/customerGap.ts')
    expect(fs.existsSync(file), 'customerGap.ts が存在しない').toBe(true)
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function calculateCustomerGap')
  })

  it('客数GAP の独自計算が presentation 層にない', () => {
    // customerGap は (prevCustomers - currentCustomers) * transactionValue 系の計算。
    // presentation 層で独自に客数差を使って売上 impact を計算するパターンを検出。
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const GAP_INLINE_PATTERN =
      /customerGap.*=.*prevYear.*customer|客数.*gap.*=.*\(.*-.*\).*\*/i
    const violations: string[] = []

    for (const file of presFiles) {
      if (file.includes('__tests__') || file.includes('.test.')) continue
      if (file.includes('customerGap')) continue
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('//')) continue
        if (GAP_INLINE_PATTERN.test(line)) {
          violations.push(`${path.relative(SRC_DIR, file)}: ${line.trim().slice(0, 80)}`)
        }
      }
    }

    expect(
      violations,
      `客数GAP の独自計算が検出されました:\n${violations.join('\n')}\n` +
        `calculateCustomerGap を使用してください`,
    ).toEqual([])
  })
})
