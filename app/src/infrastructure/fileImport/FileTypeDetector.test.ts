import { describe, it, expect } from 'vitest'
import { detectFileType, getDataTypeName } from './FileTypeDetector'

describe('detectFileType', () => {
  // ファイル名パターンでの判定
  it('仕入: ファイル名', () => {
    const result = detectFileType('仕入データ.xlsx', [])
    expect(result.type).toBe('purchase')
    expect(result.confidence).toBe('filename')
  })

  it('売上売変: ファイル名（salesDiscountとして判定）', () => {
    const result = detectFileType('1_売上売変.xlsx', [])
    expect(result.type).toBe('salesDiscount')
    expect(result.confidence).toBe('filename')
  })

  it('売上: ファイル名（売変を含まない場合）', () => {
    const result = detectFileType('売上データ.csv', [])
    expect(result.type).toBe('sales')
    expect(result.confidence).toBe('filename')
  })

  it('売変: ファイル名（売上を含まない場合）', () => {
    const result = detectFileType('売変.xlsx', [])
    expect(result.type).toBe('discount')
  })

  it('初期設定: ファイル名', () => {
    const result = detectFileType('初期設定.csv', [])
    expect(result.type).toBe('initialSettings')
  })

  it('予算: ファイル名', () => {
    const result = detectFileType('予算データ.xlsx', [])
    expect(result.type).toBe('budget')
  })

  it('売上予算: salesではなくbudgetとして判定', () => {
    const result = detectFileType('0_売上予算.xlsx', [])
    expect(result.type).toBe('budget')
    expect(result.confidence).toBe('filename')
  })

  it('店間入: ファイル名', () => {
    const result = detectFileType('店間入.xlsx', [])
    expect(result.type).toBe('interStoreIn')
  })

  it('店間出: ファイル名', () => {
    const result = detectFileType('店間出.csv', [])
    expect(result.type).toBe('interStoreOut')
  })

  it('花: ファイル名 (ヘッダーと同一でもファイル名優先)', () => {
    const result = detectFileType('花データ.xlsx', [['', '', '', '販売金額']])
    expect(result.type).toBe('flowers')
    expect(result.confidence).toBe('filename')
  })

  it('産直: ファイル名', () => {
    const result = detectFileType('産直データ.csv', [])
    expect(result.type).toBe('directProduce')
  })

  it('消耗品: ファイル名', () => {
    const result = detectFileType('01_消耗品.xlsx', [])
    expect(result.type).toBe('consumables')
  })

  // ヘッダーパターンでの判定
  it('仕入: ヘッダー', () => {
    const result = detectFileType('data.xlsx', [['', '', '', '取引先コード']])
    expect(result.type).toBe('purchase')
    expect(result.confidence).toBe('header')
  })

  it('売上: ヘッダーに「売上」がある場合', () => {
    const result = detectFileType('data.xlsx', [['', '', '', '売上']])
    expect(result.type).toBe('sales')
    expect(result.confidence).toBe('header')
  })

  it('売変: ヘッダー', () => {
    const result = detectFileType('data.xlsx', [['', '売変合計']])
    expect(result.type).toBe('discount')
  })

  it('初期設定: ヘッダー', () => {
    const result = detectFileType('data.xlsx', [['店舗コード', '期首在庫', '期末在庫']])
    expect(result.type).toBe('initialSettings')
  })

  it('予算: ヘッダー（予算パターン）', () => {
    const result = detectFileType('data.xlsx', [['', '', '', '0001:A'], ['月日', '', '', '売上予算']])
    expect(result.type).toBe('budget')
  })

  it('予算: ヘッダー（売上予算は budget であり sales ではない）', () => {
    const result = detectFileType('data.xlsx', [['', '', '', '0001:A'], ['月日', '', '', '売上予算']])
    expect(result.type).not.toBe('sales')
  })

  it('店間入: ヘッダー（店コードIN）', () => {
    const result = detectFileType('data.xlsx', [['店コードIN', '日付']])
    expect(result.type).toBe('interStoreIn')
  })

  it('店間入: ヘッダー（店舗コードIN でも判定可）', () => {
    const result = detectFileType('data.xlsx', [['店舗コードIN', '日付']])
    expect(result.type).toBe('interStoreIn')
  })

  it('店間出: ヘッダー（店コードOUT）', () => {
    const result = detectFileType('data.xlsx', [['店コードOUT', '日付']])
    expect(result.type).toBe('interStoreOut')
  })

  // 判定不能
  it('不明なファイル', () => {
    const result = detectFileType('unknown.txt', [['foo', 'bar']])
    expect(result.type).toBeNull()
    expect(result.confidence).toBe('none')
  })

  // 英語ファイル名
  it('英語ファイル名: shiire', () => {
    const result = detectFileType('shiire_202602.xlsx', [])
    expect(result.type).toBe('purchase')
  })

  it('英語ファイル名: uriage', () => {
    const result = detectFileType('uriage_data.csv', [])
    expect(result.type).toBe('sales')
  })
})

describe('getDataTypeName', () => {
  it('仕入の表示名', () => {
    expect(getDataTypeName('purchase')).toBe('仕入')
  })

  it('売上の表示名', () => {
    expect(getDataTypeName('sales')).toBe('売上')
  })

  it('花の表示名', () => {
    expect(getDataTypeName('flowers')).toBe('花')
  })
})
