/**
 * readModel 安全配布ガード — silent failure パターンの再発防止
 *
 * readModels の消費で `?? 0` や直接プロパティアクセスによる
 * silent degradation を防ぐ。ReadModelSlice の status チェックを
 * 経由しない unsafe アクセスを検出する。
 *
 * @guard G2 エラー伝播 — エラーは握り潰さず伝播させる
 * @guard G3 警告黙殺禁止 — 状態を無視してデータだけ取らない
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'

const PRESENTATION_DIR = path.join(SRC_DIR, 'presentation')
const APPLICATION_DIR = path.join(SRC_DIR, 'application')

/**
 * readModels の unsafe アクセスパターンを検出する。
 *
 * 禁止パターン:
 *   readModels?.customerFact?.grandTotalCustomers
 *   readModels?.salesFact?.daily
 *   readModels?.purchaseCost?.purchase
 *   readModels?.discountFact?.daily
 *
 * これらは ReadModelSlice の status チェックを経由せず、
 * loading/error/idle を silent に潰す。
 *
 * 許可パターン:
 *   readModels?.customerFact?.status === 'ready'
 *   readModels?.customerFact  (slice 自体の参照は OK)
 *   readModels?.anyLoading
 *   readModels?.allReady
 */
const UNSAFE_READMODEL_PATTERN =
  /readModels\??\.\w+Fact\??\.(?!status|data\b)(?:grand|daily|hourly|meta|purchase|deliver|inter|movement|total)/

describe('readModel 安全配布ガード', () => {
  it('readModels への直接データアクセスがないこと（status チェック必須）', () => {
    const dirs = [PRESENTATION_DIR, APPLICATION_DIR]
    const violations: string[] = []

    for (const dir of dirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        // テストファイルとスタイルファイルは除外
        if (file.includes('.test.') || file.includes('.styles.')) continue
        // orchestrator 自体は除外（定義側）
        if (file.includes('useWidgetDataOrchestrator.ts')) continue

        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          // コメント行は除外
          if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue

          if (UNSAFE_READMODEL_PATTERN.test(line)) {
            violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      [
        'readModels への直接データアクセスを検出。',
        'ReadModelSlice の status === "ready" チェックを経由してからデータにアクセスしてください。',
        '',
        '禁止: readModels?.customerFact?.grandTotalCustomers',
        '許可: cf?.status === "ready" ? cf.data.grandTotalCustomers : fallback',
        '',
        ...violations,
      ].join('\n'),
    ).toEqual([])
  })

  it('readModels?.[model] ?? 0 パターンがないこと', () => {
    const dirs = [PRESENTATION_DIR, APPLICATION_DIR]
    const violations: string[] = []
    // ?? 0 で readModel のデータを潰すパターン
    const nullishZeroPattern = /readModels\??\.\w+(?:Fact|Cost)\??\.\w+\s*\?\?\s*0/

    for (const dir of dirs) {
      const files = collectTsFiles(dir)
      for (const file of files) {
        if (file.includes('.test.') || file.includes('.styles.')) continue
        if (file.includes('useWidgetDataOrchestrator.ts')) continue

        const content = fs.readFileSync(file, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue

          if (nullishZeroPattern.test(line)) {
            violations.push(`${rel(file)}:${i + 1}: ${line.trim()}`)
          }
        }
      }
    }

    expect(
      violations,
      [
        'readModels の ?? 0 パターンを検出。',
        'loading/error/idle と「値が0」を区別できないため禁止。',
        'ReadModelSlice の status チェックを経由してください。',
        '',
        ...violations,
      ].join('\n'),
    ).toEqual([])
  })
})
