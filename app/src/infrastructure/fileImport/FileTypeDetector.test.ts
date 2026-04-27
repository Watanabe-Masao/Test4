/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { detectFileType, getDataTypeName } from './FileTypeDetector'

describe('detectFileType', () => {
  // ファイル名パターンでの判定
  it('仕入: ファイル名', () => {
    const result = detectFileType('仕入データ.xlsx', [])
    expect(result.type).toBe('purchase')
    expect(result.confidence).toBe('filename')
  })

  it('売上売変: ファイル名（classifiedSalesとして判定）', () => {
    const result = detectFileType('1_売上売変.xlsx', [])
    expect(result.type).toBe('classifiedSales')
    expect(result.confidence).toBe('filename')
  })

  it('分類別売上: ファイル名', () => {
    const result = detectFileType('分類別売上データ.csv', [])
    expect(result.type).toBe('classifiedSales')
    expect(result.confidence).toBe('filename')
  })

  it('初期設定: ファイル名', () => {
    const result = detectFileType('初期設定.csv', [])
    expect(result.type).toBe('initialSettings')
  })

  it('予算: ファイル名', () => {
    const result = detectFileType('予算データ.xlsx', [])
    expect(result.type).toBe('budget')
  })

  it('売上予算: classifiedSalesではなくbudgetとして判定', () => {
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

  it('分類別売上: ヘッダーに「グループ名称」がある場合', () => {
    const result = detectFileType('data.xlsx', [['', '', '', 'グループ名称']])
    expect(result.type).toBe('classifiedSales')
    expect(result.confidence).toBe('header')
  })

  it('初期設定: ヘッダー', () => {
    const result = detectFileType('data.xlsx', [['店舗コード', '期首在庫', '期末在庫']])
    expect(result.type).toBe('initialSettings')
  })

  it('予算: ヘッダー（予算パターン）', () => {
    const result = detectFileType('data.xlsx', [
      ['', '', '', '0001:A'],
      ['月日', '', '', '売上予算'],
    ])
    expect(result.type).toBe('budget')
  })

  it('予算: ヘッダー（売上予算は budget であり classifiedSales ではない）', () => {
    const result = detectFileType('data.xlsx', [
      ['', '', '', '0001:A'],
      ['月日', '', '', '売上予算'],
    ])
    expect(result.type).not.toBe('classifiedSales')
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

  // プレフィックスとキーワードが矛盾する場合、キーワードを優先
  it('5_店間出: プレフィックス(5_=店間入)よりキーワード(店間出)を優先', () => {
    const result = detectFileType('5_店間出.xlsx', [])
    expect(result.type).toBe('interStoreOut')
    expect(result.confidence).toBe('filename')
  })

  it('6_店間入: プレフィックス(6_=仕入)よりキーワード(店間入)を優先', () => {
    const result = detectFileType('6_店間入.xlsx', [])
    expect(result.type).toBe('interStoreIn')
    expect(result.confidence).toBe('filename')
  })

  it('7_仕入: プレフィックス(7_)よりキーワード(仕入)を優先', () => {
    const result = detectFileType('7_仕入.xlsx', [])
    expect(result.type).toBe('purchase')
    expect(result.confidence).toBe('filename')
  })

  it('売上納品_花: 売上ではなく花として判定', () => {
    const result = detectFileType('3_売上納品_花.xlsx', [])
    expect(result.type).toBe('flowers')
    expect(result.confidence).toBe('filename')
  })

  it('売上納品_産直: 売上ではなく産直として判定', () => {
    const result = detectFileType('3_売上納品_産直.xlsx', [])
    expect(result.type).toBe('directProduce')
    expect(result.confidence).toBe('filename')
  })

  // キーワードなしの場合、プレフィックスにフォールバック
  it('プレフィックスのみでキーワードなし: フォールバック判定', () => {
    const result = detectFileType('5_data.xlsx', [])
    expect(result.type).toBe('interStoreIn')
    expect(result.confidence).toBe('filename')
  })

  // ドット区切りプレフィックス: 分類別時間帯売上
  it('7.分類別時間帯売上: categoryTimeSalesとして判定', () => {
    const result = detectFileType('7.分類別時間帯売上.xlsx', [])
    expect(result.type).toBe('categoryTimeSales')
    expect(result.confidence).toBe('filename')
  })

  it('8.分類別時間帯売上: categoryTimeSalesとして判定', () => {
    const result = detectFileType('8.分類別時間帯売上.csv', [])
    expect(result.type).toBe('categoryTimeSales')
    expect(result.confidence).toBe('filename')
  })

  // ドット区切りプレフィックス: 分類別売上はclassifiedSalesであること
  it('1.分類別売上: classifiedSalesとして判定（categoryTimeSalesにならない）', () => {
    const result = detectFileType('1.分類別売上.xlsx', [])
    expect(result.type).toBe('classifiedSales')
    expect(result.confidence).toBe('filename')
  })

  // 消耗品のドット区切りパターン
  it('8.消耗品: consumablesとして判定', () => {
    const result = detectFileType('8.消耗品データ.xlsx', [])
    expect(result.type).toBe('consumables')
    expect(result.confidence).toBe('filename')
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

  it('英語ファイル名: uriage_baihen', () => {
    const result = detectFileType('uriage_baihen_data.csv', [])
    expect(result.type).toBe('classifiedSales')
  })
})

describe('getDataTypeName', () => {
  it('仕入の表示名', () => {
    expect(getDataTypeName('purchase')).toBe('仕入')
  })

  it('分類別売上の表示名', () => {
    expect(getDataTypeName('classifiedSales')).toBe('分類別売上')
  })

  it('花の表示名', () => {
    expect(getDataTypeName('flowers')).toBe('売上納品_花')
  })
})
