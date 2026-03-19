import { describe, it, expect } from 'vitest'
import { parseViewPointArgs } from '../jmaEtrnClient'

describe('parseViewPointArgs', () => {
  it('気象台(s1)の viewPoint 呼び出しを正しくパースする', () => {
    const onclick =
      "viewPoint('s1','47893','高知','コウチ','33','34','133','33','0.5','1','1','1','1','1','1','2024','12','31','','','','','')"
    const result = parseViewPointArgs(onclick)
    expect(result).toEqual({
      stationType: 's1',
      blockNo: '47893',
      stationName: '高知',
    })
  })

  it('AMeDAS(a1)の viewPoint 呼び出しを正しくパースする', () => {
    const onclick =
      "viewPoint('a1','1519','本山','モトヤマ','33','45','133','35','256.0','1','1','1','0','0','0','2024','12','31','','','','','')"
    const result = parseViewPointArgs(onclick)
    expect(result).toEqual({
      stationType: 'a1',
      blockNo: '1519',
      stationName: '本山',
    })
  })

  it('5桁の block_no を正しく処理する', () => {
    const onclick = "viewPoint('s1','47662','東京','トウキョウ','35','41','139','45','25.2')"
    const result = parseViewPointArgs(onclick)
    expect(result).toEqual({
      stationType: 's1',
      blockNo: '47662',
      stationName: '東京',
    })
  })

  it('viewPoint 以外の onclick 文字列には null を返す', () => {
    expect(parseViewPointArgs("alert('hello')")).toBeNull()
    expect(parseViewPointArgs('')).toBeNull()
  })

  it('引数が3つ未満の場合は null を返す', () => {
    expect(parseViewPointArgs("viewPoint('s1','47893')")).toBeNull()
  })

  it('stationType が s1/a1 以外の場合は null を返す', () => {
    const onclick = "viewPoint('b2','47893','高知')"
    expect(parseViewPointArgs(onclick)).toBeNull()
  })

  it('block_no が数値でない場合は null を返す', () => {
    const onclick = "viewPoint('s1','abc','高知')"
    expect(parseViewPointArgs(onclick)).toBeNull()
  })

  it('stationName の前後空白を除去する', () => {
    const onclick = "viewPoint('s1','47893',' 高知 ')"
    const result = parseViewPointArgs(onclick)
    expect(result?.stationName).toBe('高知')
  })
})
