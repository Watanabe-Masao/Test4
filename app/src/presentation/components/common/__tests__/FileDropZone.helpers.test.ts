/**
 * FileDropZone — pure file filter helpers
 *
 * 検証対象:
 * - ACCEPT_EXTENSIONS: 許容拡張子リスト
 * - isAcceptedFile: ファイル名の拡張子判定（大文字小文字非依存）
 * - filterAcceptedFiles: FileList から許容拡張子のみ抽出
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { ACCEPT_EXTENSIONS, isAcceptedFile, filterAcceptedFiles } from '../FileDropZone'

describe('ACCEPT_EXTENSIONS', () => {
  it('Excel と CSV の 3 拡張子を含む', () => {
    expect(ACCEPT_EXTENSIONS).toEqual(['.xlsx', '.xls', '.csv'])
  })
})

describe('isAcceptedFile', () => {
  it('.xlsx / .xls / .csv を受け入れる', () => {
    expect(isAcceptedFile('report.xlsx')).toBe(true)
    expect(isAcceptedFile('legacy.xls')).toBe(true)
    expect(isAcceptedFile('export.csv')).toBe(true)
  })

  it('大文字拡張子も受け入れる', () => {
    expect(isAcceptedFile('REPORT.XLSX')).toBe(true)
    expect(isAcceptedFile('legacy.XLS')).toBe(true)
    expect(isAcceptedFile('Export.CSV')).toBe(true)
  })

  it('非対応拡張子は拒否', () => {
    expect(isAcceptedFile('doc.pdf')).toBe(false)
    expect(isAcceptedFile('image.png')).toBe(false)
    expect(isAcceptedFile('archive.zip')).toBe(false)
  })

  it('拡張子なしは拒否', () => {
    expect(isAcceptedFile('README')).toBe(false)
    expect(isAcceptedFile('')).toBe(false)
  })

  it('似たような suffix だが拡張子部分が一致しなければ拒否', () => {
    expect(isAcceptedFile('notxlsx')).toBe(false)
    expect(isAcceptedFile('filecsv')).toBe(false)
  })

  it('ディレクトリパスを含んでもファイル名末尾で判定', () => {
    expect(isAcceptedFile('dir/subdir/report.xlsx')).toBe(true)
    expect(isAcceptedFile('path/to/ignored.log')).toBe(false)
  })
})

describe('filterAcceptedFiles', () => {
  // jsdom の File を使えるか注意 — 最小限の FileList モックを使う
  function mkFileList(names: readonly string[]): FileList {
    const files = names.map((n) => new File([''], n))
    const list = files as unknown as FileList & { item: (i: number) => File | null }
    Object.defineProperty(list, 'length', { value: files.length })
    ;(list as unknown as { item: (i: number) => File | null }).item = (i) => files[i] ?? null
    return list
  }

  it('許容拡張子だけを残す', () => {
    const list = mkFileList(['a.xlsx', 'b.pdf', 'c.csv', 'd.txt', 'e.xls'])
    const result = filterAcceptedFiles(list)
    expect(result.map((f) => f.name)).toEqual(['a.xlsx', 'c.csv', 'e.xls'])
  })

  it('全部不許可なら空配列', () => {
    expect(filterAcceptedFiles(mkFileList(['a.pdf', 'b.png']))).toEqual([])
  })

  it('全部許容なら全件返す', () => {
    const result = filterAcceptedFiles(mkFileList(['a.xlsx', 'b.csv']))
    expect(result).toHaveLength(2)
  })

  it('空入力で空配列', () => {
    expect(filterAcceptedFiles(mkFileList([]))).toEqual([])
  })
})
