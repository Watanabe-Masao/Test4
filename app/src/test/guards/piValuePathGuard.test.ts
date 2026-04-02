/**
 * PI値 正本ガード
 *
 * calculateQuantityPI / calculateAmountPI が唯一の PI 値計算経路。
 * 独自計算や旧 helper 経由を禁止する。
 *
 * @see references/01-principles/pi-value-definition.md
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles } from '../guardTestHelpers'

const SRC_DIR = path.resolve(__dirname, '../..')

describe('PI値 正本ガード', () => {
  it('calculateQuantityPI / calculateAmountPI が domain/calculations に存在する', () => {
    const file = path.join(SRC_DIR, 'domain/calculations/piValue.ts')
    expect(fs.existsSync(file), 'piValue.ts が存在しない').toBe(true)
    const content = fs.readFileSync(file, 'utf-8')
    expect(content).toContain('export function calculateQuantityPI')
    expect(content).toContain('export function calculateAmountPI')
  })

  it('PI 値の独自計算（sales / customers 的なインライン割り算）が presentation 層にない', () => {
    // PI 値は sales / customers / quantity の組み合わせで計算されるが、
    // その計算は calculateQuantityPI / calculateAmountPI に閉じる。
    // presentation 層で独自に PI を計算するパターンを検出。
    const presFiles = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    const PI_INLINE_PATTERN = /\bPI\b.*=.*\/.*customers|piValue.*=.*sales.*\//i
    const violations: string[] = []

    for (const file of presFiles) {
      if (file.includes('__tests__') || file.includes('.test.')) continue
      if (file.includes('piValue')) continue // 正本ファイル自身は除外
      const content = fs.readFileSync(file, 'utf-8')
      for (const line of content.split('\n')) {
        if (line.trimStart().startsWith('//')) continue
        if (PI_INLINE_PATTERN.test(line)) {
          violations.push(`${path.relative(SRC_DIR, file)}: ${line.trim().slice(0, 80)}`)
        }
      }
    }

    expect(
      violations,
      `PI 値の独自計算が検出されました:\n${violations.join('\n')}\n` +
        `calculateQuantityPI / calculateAmountPI を使用してください`,
    ).toEqual([])
  })
})
