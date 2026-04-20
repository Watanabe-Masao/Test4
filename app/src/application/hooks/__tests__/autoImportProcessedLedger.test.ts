/**
 * autoImportProcessedLedger — pure helper tests
 *
 * 検証対象（純粋関数のみ）:
 * - fileFingerprint: name + size + lastModified を pipe 区切りで連結
 * - collectSuccessFilenames: ImportSummary から成功ファイル名を抽出
 *
 * loadProcessedFingerprints / saveProcessedFingerprints は localStorage 副作用が
 * あるため対象外（uiPersistenceAdapter の test で間接カバー）。
 */
import { describe, it, expect } from 'vitest'
import { fileFingerprint, collectSuccessFilenames } from '../autoImportProcessedLedger'
import type { ImportSummary } from '@/domain/models/ImportResult'

describe('fileFingerprint', () => {
  it('name | size | lastModified を pipe 連結', () => {
    expect(fileFingerprint('a.xlsx', 1024, 1700000000000)).toBe('a.xlsx|1024|1700000000000')
  })

  it('size=0 / lastModified=0 でも生成可能', () => {
    expect(fileFingerprint('empty.csv', 0, 0)).toBe('empty.csv|0|0')
  })

  it('日本語ファイル名も保持', () => {
    expect(fileFingerprint('売上_2026-03.xlsx', 5000, 1700000000000)).toBe(
      '売上_2026-03.xlsx|5000|1700000000000',
    )
  })

  it('決定的（同入力で同出力）', () => {
    expect(fileFingerprint('a', 1, 2)).toBe(fileFingerprint('a', 1, 2))
  })
})

describe('collectSuccessFilenames', () => {
  function file(name: string): File {
    return new File([''], name)
  }
  function summary(
    results: { filename: string; ok: boolean }[],
    successCount: number,
  ): ImportSummary {
    return { results, successCount, failureCount: results.length - successCount } as ImportSummary
  }

  it('summary=undefined（void）は全 submitted を success 扱い（互換動作）', () => {
    const result = collectSuccessFilenames(undefined, [file('a.csv'), file('b.xlsx')])
    expect(result).toEqual(new Set(['a.csv', 'b.xlsx']))
  })

  it('空 summary（results=[] / successCount=0）は空集合（再試行可能）', () => {
    const result = collectSuccessFilenames(summary([], 0), [file('x.csv')])
    expect(result.size).toBe(0)
  })

  it('成功 filename だけを集める', () => {
    const result = collectSuccessFilenames(
      summary(
        [
          { filename: 'a.csv', ok: true },
          { filename: 'b.csv', ok: false },
          { filename: 'c.csv', ok: true },
        ],
        2,
      ),
      [],
    )
    expect(result).toEqual(new Set(['a.csv', 'c.csv']))
  })

  it('全失敗（ok=false 揃い）で空集合', () => {
    const result = collectSuccessFilenames(summary([{ filename: 'a.csv', ok: false }], 0), [
      file('a.csv'),
    ])
    // results.length=1 / successCount=0 → 空 summary 扱いではなく成功なしの集合
    // 実装上、results.length>0 のときは for-loop 経由で集める
    expect(result.size).toBe(0)
  })

  it('全成功で全 filename を返す', () => {
    const result = collectSuccessFilenames(
      summary(
        [
          { filename: 'a.csv', ok: true },
          { filename: 'b.csv', ok: true },
        ],
        2,
      ),
      [],
    )
    expect(result).toEqual(new Set(['a.csv', 'b.csv']))
  })

  it('submitted は summary なしの場合のみ参照される', () => {
    // summary あり時は submittedFiles を見ない
    const result = collectSuccessFilenames(summary([{ filename: 'real.csv', ok: true }], 1), [
      file('different.csv'),
    ])
    expect(result).toEqual(new Set(['real.csv']))
  })
})
