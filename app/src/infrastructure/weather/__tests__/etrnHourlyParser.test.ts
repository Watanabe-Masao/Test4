/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { parseHourlyTable } from '../etrnHourlyParser'

/** JSDOM 互換の Document を生成するヘルパー */
function createDoc(html: string): Document {
  const parser = new DOMParser()
  return parser.parseFromString(html, 'text/html')
}

/** s1（気象台）相当の時間別テーブル HTML を生成する */
function buildS1Html(rows: string[]): string {
  return `
    <table id="tablefix1">
      <tr>
        <th rowspan="2">時</th>
        <th colspan="2">気圧(hPa)</th>
        <th rowspan="2">降水量(mm)</th>
        <th rowspan="2">気温(℃)</th>
        <th rowspan="2">露点温度(℃)</th>
        <th rowspan="2">蒸気圧(hPa)</th>
        <th rowspan="2">湿度(%)</th>
        <th colspan="2">風</th>
        <th rowspan="2">日照時間(h)</th>
        <th rowspan="2">全天日射量</th>
        <th colspan="2">雪(cm)</th>
        <th rowspan="2">天気</th>
        <th rowspan="2">雲量</th>
        <th rowspan="2">視程(km)</th>
      </tr>
      <tr>
        <th>現地</th>
        <th>海面</th>
        <th>風速(m/s)</th>
        <th>風向</th>
        <th>降雪</th>
        <th>積雪</th>
      </tr>
      ${rows.join('\n')}
    </table>
  `
}

/** a1（AMeDAS）相当の時間別テーブル HTML を生成する */
function buildA1Html(rows: string[]): string {
  return `
    <table id="tablefix1">
      <tr>
        <th rowspan="2">時</th>
        <th rowspan="2">降水量(mm)</th>
        <th rowspan="2">気温(℃)</th>
        <th colspan="2">風</th>
        <th rowspan="2">日照時間(h)</th>
        <th rowspan="2">積雪深(cm)</th>
      </tr>
      <tr>
        <th>風速(m/s)</th>
        <th>風向</th>
      </tr>
      ${rows.join('\n')}
    </table>
  `
}

describe('etrnHourlyParser', () => {
  describe('parseHourlyTable — s1 (気象台)', () => {
    it('時間別データを正しくパースする', () => {
      const rows = [
        // 時, 気圧現地, 気圧海面, 降水量, 気温, 露点, 蒸気圧, 湿度, 風速, 風向, 日照, 日射, 降雪, 積雪, 天気, 雲量, 視程
        '<tr><td>1</td><td>1010.0</td><td>1013.0</td><td>0.0</td><td>5.2</td><td>1.0</td><td>6.6</td><td>72</td><td>2.3</td><td>北</td><td>0.0</td><td>0.0</td><td>--</td><td>--</td><td>曇</td><td>10</td><td>20.0</td></tr>',
        '<tr><td>2</td><td>1009.5</td><td>1012.5</td><td>1.5</td><td>4.8</td><td>2.0</td><td>7.1</td><td>80</td><td>3.1</td><td>北北東</td><td>0.0</td><td>0.0</td><td>--</td><td>--</td><td>雨</td><td>10</td><td>10.0</td></tr>',
        '<tr><td>13</td><td>1008.0</td><td>1011.0</td><td>0.0</td><td>12.3</td><td>3.0</td><td>7.6</td><td>45</td><td>4.5</td><td>南</td><td>0.8</td><td>2.1</td><td>--</td><td>--</td><td>晴</td><td>2</td><td>30.0</td></tr>',
      ]

      const result = parseHourlyTable(createDoc(buildS1Html(rows)), '2025-01-15')

      expect(result).toHaveLength(3)

      // 時=1 → hour=1
      expect(result[0]).toEqual({
        dateKey: '2025-01-15',
        hour: 1,
        temperature: 5.2,
        humidity: 72,
        precipitation: 0.0,
        windSpeed: 2.3 * 3.6, // m/s → km/h
        weatherCode: 3, // 曇り（日照0, 降水0）
        sunshineDuration: 0, // 0h → 0s
      })

      // 時=2 → hour=2（降水あり）
      expect(result[1].hour).toBe(2)
      expect(result[1].precipitation).toBe(1.5)
      expect(result[1].weatherCode).toBe(61) // 雨（降水>=1mm, 気温>1℃）

      // 時=13 → hour=13（日照あり）
      expect(result[2].hour).toBe(13)
      expect(result[2].temperature).toBe(12.3)
      expect(result[2].sunshineDuration).toBe(0.8 * 3600) // 0.8h → 2880s
      expect(result[2].weatherCode).toBe(0) // 晴れ（日照>=0.5h）
    })

    it('時=24 は除外される（翌日0時のデータ）', () => {
      const rows = [
        '<tr><td>23</td><td>1010</td><td>1013</td><td>0.0</td><td>3.0</td><td>1.0</td><td>6.0</td><td>70</td><td>1.0</td><td>北</td><td>0.0</td><td>0.0</td><td>--</td><td>--</td><td>曇</td><td>10</td><td>20</td></tr>',
        '<tr><td>24</td><td>1010</td><td>1013</td><td>0.0</td><td>2.5</td><td>0.5</td><td>5.5</td><td>68</td><td>0.8</td><td>北</td><td>0.0</td><td>0.0</td><td>--</td><td>--</td><td>曇</td><td>10</td><td>20</td></tr>',
      ]

      const result = parseHourlyTable(createDoc(buildS1Html(rows)), '2025-01-15')

      expect(result).toHaveLength(1)
      expect(result[0].hour).toBe(23) // 時=23 → hour=23
    })
  })

  describe('parseHourlyTable — a1 (AMeDAS)', () => {
    it('AMeDAS タイプのテーブルを正しくパースする', () => {
      const rows = [
        // 時, 降水量, 気温, 風速, 風向, 日照, 積雪
        '<tr><td>1</td><td>0.0</td><td>3.5</td><td>1.8</td><td>北西</td><td>0.0</td><td>--</td></tr>',
        '<tr><td>12</td><td>0.0</td><td>15.2</td><td>3.2</td><td>南東</td><td>1.0</td><td>--</td></tr>',
      ]

      const result = parseHourlyTable(createDoc(buildA1Html(rows)), '2025-07-20')

      expect(result).toHaveLength(2)

      expect(result[0]).toEqual({
        dateKey: '2025-07-20',
        hour: 1,
        temperature: 3.5,
        humidity: 0, // AMeDAS a1 には湿度列がない
        precipitation: 0.0,
        windSpeed: 1.8 * 3.6,
        weatherCode: 3,
        sunshineDuration: 0,
      })

      expect(result[1].hour).toBe(12) // 時=12 → hour=12
      expect(result[1].temperature).toBe(15.2)
      expect(result[1].sunshineDuration).toBe(3600) // 1.0h → 3600s
    })
  })

  describe('parseHourlyTable — エッジケース', () => {
    it('テーブルが存在しない場合は空配列を返す', () => {
      const doc = createDoc('<html><body><p>No table here</p></body></html>')
      expect(parseHourlyTable(doc, '2025-01-01')).toEqual([])
    })

    it('欠測値は 0 として扱う', () => {
      const rows = [
        '<tr><td>5</td><td>1010</td><td>1013</td><td>--</td><td>///</td><td>×</td><td>…</td><td></td><td>2.0</td><td>北</td><td>--</td><td>0.0</td><td>--</td><td>--</td><td>曇</td><td>10</td><td>20</td></tr>',
      ]

      const result = parseHourlyTable(createDoc(buildS1Html(rows)), '2025-01-01')

      expect(result).toHaveLength(1)
      expect(result[0].precipitation).toBe(0)
      expect(result[0].temperature).toBe(0)
      expect(result[0].humidity).toBe(0)
    })

    it('品質フラグ付きの値を正しく読み取る', () => {
      const rows = [
        '<tr><td>10</td><td>1010</td><td>1013</td><td>2.5 )</td><td>8.3 ]</td><td>3.0</td><td>7.0</td><td>55 )</td><td>3.0</td><td>西</td><td>0.5</td><td>1.0</td><td>--</td><td>--</td><td>晴</td><td>3</td><td>25</td></tr>',
      ]

      const result = parseHourlyTable(createDoc(buildS1Html(rows)), '2025-01-01')

      expect(result).toHaveLength(1)
      expect(result[0].precipitation).toBe(2.5)
      expect(result[0].temperature).toBe(8.3)
      expect(result[0].humidity).toBe(55)
    })

    it('降雪時は雪の天気コードを返す', () => {
      const rows = [
        '<tr><td>3</td><td>1010</td><td>1013</td><td>3.0</td><td>-2.0</td><td>-5.0</td><td>4.0</td><td>80</td><td>2.0</td><td>北</td><td>0.0</td><td>0.0</td><td>5</td><td>10</td><td>雪</td><td>10</td><td>5</td></tr>',
      ]

      const result = parseHourlyTable(createDoc(buildS1Html(rows)), '2025-01-01')

      expect(result).toHaveLength(1)
      // 降水 3mm + 気温 -2℃ → 雪コード 71
      expect(result[0].weatherCode).toBe(71)
    })
  })
})
