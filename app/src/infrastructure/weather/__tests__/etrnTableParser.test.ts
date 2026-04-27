/**
 * Tests for etrnTableParser.ts — pure HTML table parser
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { parseDailyTable } from '../etrnTableParser'

function buildDoc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function minimalTable(rowsHtml: string, headerHtml?: string): string {
  const header =
    headerHtml ??
    `<tr>
      <th rowspan="2">日</th>
      <th colspan="1">降水量合計(mm)</th>
      <th colspan="1">気温平均(℃)</th>
      <th colspan="1">気温最高(℃)</th>
      <th colspan="1">気温最低(℃)</th>
      <th colspan="1">風速最大(m/s)</th>
      <th colspan="1">日照時間(h)</th>
      <th colspan="1">湿度平均(%)</th>
      <th colspan="1">天気概況昼</th>
      <th colspan="1">天気概況夜</th>
    </tr>
    <tr>
      <th>mm</th><th>℃</th><th>℃</th><th>℃</th><th>m/s</th><th>h</th><th>%</th><th>昼</th><th>夜</th>
    </tr>`
  return `<html><body><table id="tablefix1">${header}${rowsHtml}</table></body></html>`
}

describe('parseDailyTable', () => {
  it('returns empty array when no matching table exists', () => {
    const doc = buildDoc('<html><body><p>no table</p></body></html>')
    const results = parseDailyTable(doc, 2025, 5)
    expect(results).toEqual([])
  })

  it('parses a simple daily row with detected column positions', () => {
    const html = minimalTable(
      `<tr>
        <td>1</td>
        <td>10.5</td>
        <td>15.2</td>
        <td>20.1</td>
        <td>10.3</td>
        <td>5.0</td>
        <td>7.5</td>
        <td>65</td>
        <td>晴</td>
        <td>曇</td>
      </tr>`,
    )
    const doc = buildDoc(html)
    const results = parseDailyTable(doc, 2025, 5)

    expect(results.length).toBe(1)
    const row = results[0]
    expect(row.dateKey).toBe('2025-05-01')
    expect(row.precipitationTotal).toBe(10.5)
    expect(row.temperatureAvg).toBe(15.2)
    expect(row.temperatureMax).toBe(20.1)
    expect(row.temperatureMin).toBe(10.3)
    // wind: m/s → km/h = 5.0 * 3.6
    expect(row.windSpeedMax).toBeCloseTo(18.0, 5)
    expect(row.sunshineTotalHours).toBe(7.5)
    expect(row.humidityAvg).toBe(65)
    // weather text present → 晴 → WMO 0
    expect(row.dominantWeatherCode).toBe(0)
    expect(row.weatherTextDay).toBe('晴')
    expect(row.weatherTextNight).toBe('曇')
  })

  it('skips rows with too few cells', () => {
    const html = minimalTable(
      `<tr><td>1</td><td>1.0</td><td>2.0</td></tr>`, // only 3 cells
    )
    const doc = buildDoc(html)
    expect(parseDailyTable(doc, 2025, 5)).toEqual([])
  })

  it('skips rows with non-numeric day', () => {
    const html = minimalTable(
      `<tr>
        <td>---</td>
        <td>1.0</td><td>2.0</td><td>3.0</td><td>4.0</td><td>1.0</td><td>1.0</td><td>50</td><td>晴</td><td>曇</td>
      </tr>`,
    )
    const doc = buildDoc(html)
    expect(parseDailyTable(doc, 2025, 5)).toEqual([])
  })

  it('skips rows where all observation values are zero', () => {
    const html = minimalTable(
      `<tr>
        <td>2</td>
        <td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td></td><td></td>
      </tr>`,
    )
    const doc = buildDoc(html)
    expect(parseDailyTable(doc, 2025, 5)).toEqual([])
  })

  it('parses --- missing cells as 0', () => {
    const html = minimalTable(
      `<tr>
        <td>3</td>
        <td>5.0</td><td>--</td><td>///</td><td>×</td><td>…</td><td>2.0</td><td>--</td><td></td><td></td>
      </tr>`,
    )
    const doc = buildDoc(html)
    const results = parseDailyTable(doc, 2025, 5)
    expect(results.length).toBe(1)
    expect(results[0].precipitationTotal).toBe(5.0)
    expect(results[0].temperatureAvg).toBe(0)
    expect(results[0].temperatureMax).toBe(0)
    expect(results[0].temperatureMin).toBe(0)
    expect(results[0].sunshineTotalHours).toBe(2.0)
    expect(results[0].humidityAvg).toBe(0)
  })

  it('strips quality flags from numeric cells', () => {
    const html = minimalTable(
      `<tr>
        <td>4</td>
        <td>12.3 )</td><td>15.0 ]</td><td>20.0</td><td>10.0</td><td>3.0</td><td>4.0</td><td>50</td><td>雨</td><td>雨</td>
      </tr>`,
    )
    const doc = buildDoc(html)
    const results = parseDailyTable(doc, 2025, 5)
    expect(results.length).toBe(1)
    expect(results[0].precipitationTotal).toBe(12.3)
    expect(results[0].temperatureAvg).toBe(15.0)
    // 雨 → WMO 61
    expect(results[0].dominantWeatherCode).toBe(61)
  })

  it('maps various weather texts to WMO codes', () => {
    const testCases: ReadonlyArray<{ day: string; expected: number }> = [
      { day: '雷雨', expected: 95 },
      { day: '大雪', expected: 75 },
      { day: '大雨', expected: 65 },
      { day: 'みぞれ', expected: 68 },
      { day: '霧', expected: 45 },
      { day: '雪', expected: 71 },
      { day: '薄曇', expected: 2 },
      { day: '曇後雪', expected: 71 },
      { day: '曇後雨', expected: 3 },
      { day: '曇', expected: 3 },
      { day: '晴後雨', expected: 2 },
      { day: '晴後曇', expected: 2 },
      { day: '晴', expected: 0 },
      { day: '快晴', expected: 0 },
    ]
    for (let i = 0; i < testCases.length; i++) {
      const { day, expected } = testCases[i]
      const html = minimalTable(
        `<tr>
          <td>${i + 1}</td>
          <td>0.1</td><td>15</td><td>20</td><td>10</td><td>3</td><td>4</td><td>60</td><td>${day}</td><td></td>
        </tr>`,
      )
      const doc = buildDoc(html)
      const results = parseDailyTable(doc, 2025, 5)
      expect(results.length, `for day='${day}'`).toBe(1)
      expect(results[0].dominantWeatherCode, `for day='${day}'`).toBe(expected)
    }
  })

  it('falls back to summary-derived weather code when text is missing', () => {
    const html = minimalTable(
      `<tr>
        <td>5</td>
        <td>15</td><td>10</td><td>12</td><td>8</td><td>3</td><td>0.5</td><td>80</td><td></td><td></td>
      </tr>`,
    )
    const doc = buildDoc(html)
    const results = parseDailyTable(doc, 2025, 5)
    expect(results.length).toBe(1)
    // precip=15 >= 10, tempAvg=10 (not snow) → 65 (heavy rain)
    expect(results[0].dominantWeatherCode).toBe(65)
  })

  it('derives snow code when temperature < 1 with precipitation', () => {
    const html = minimalTable(
      `<tr>
        <td>6</td>
        <td>2</td><td>0.5</td><td>1</td><td>-1</td><td>1</td><td>0</td><td>80</td><td></td><td></td>
      </tr>`,
    )
    const doc = buildDoc(html)
    const results = parseDailyTable(doc, 2025, 5)
    expect(results.length).toBe(1)
    // precip=2 >= 1, isSnow → 71
    expect(results[0].dominantWeatherCode).toBe(71)
  })

  it('derives clear sky when sunshine is high with no precip', () => {
    const html = minimalTable(
      `<tr>
        <td>7</td>
        <td>0</td><td>20</td><td>25</td><td>15</td><td>2</td><td>8</td><td>50</td><td></td><td></td>
      </tr>`,
    )
    const doc = buildDoc(html)
    const results = parseDailyTable(doc, 2025, 5)
    expect(results.length).toBe(1)
    // sunshine >=6 → 0
    expect(results[0].dominantWeatherCode).toBe(0)
  })

  it('uses fallback column map when header rows are missing', () => {
    // Table with no header rows — should trigger fallbackColumnMap
    // fallback indices: precipTotal=1, tempAvg=4, tempMax=5, tempMin=6, windSpeedMax=8, sunshineHours=12
    const html = `<html><body><table id="tablefix1">
      <tr>
        <td>1</td>
        <td>5.0</td><td>0</td><td>0</td><td>15</td><td>18</td><td>12</td><td>0</td><td>2.5</td><td>0</td><td>0</td><td>0</td><td>6</td>
      </tr>
    </table></body></html>`
    const doc = buildDoc(html)
    const results = parseDailyTable(doc, 2025, 5)
    expect(results.length).toBe(1)
    expect(results[0].precipitationTotal).toBe(5.0)
    expect(results[0].temperatureAvg).toBe(15)
    expect(results[0].temperatureMax).toBe(18)
    expect(results[0].temperatureMin).toBe(12)
    expect(results[0].windSpeedMax).toBeCloseTo(2.5 * 3.6, 5)
    expect(results[0].sunshineTotalHours).toBe(6)
  })

  it('dateKey is zero-padded to YYYY-MM-DD', () => {
    const html = minimalTable(
      `<tr>
        <td>9</td>
        <td>1</td><td>10</td><td>12</td><td>8</td><td>2</td><td>3</td><td>60</td><td>晴</td><td></td>
      </tr>`,
    )
    const doc = buildDoc(html)
    const results = parseDailyTable(doc, 2025, 3)
    expect(results[0].dateKey).toBe('2025-03-09')
  })

  it('supports table with class="data2_s" fallback selector', () => {
    const html = `<html><body><table class="data2_s">
      <tr>
        <th rowspan="2">日</th>
        <th colspan="1">降水量合計</th>
        <th colspan="1">気温平均</th>
        <th colspan="1">気温最高</th>
        <th colspan="1">気温最低</th>
        <th colspan="1">風速最大</th>
        <th colspan="1">日照</th>
        <th colspan="1">湿度平均</th>
        <th colspan="1">天気概況昼</th>
        <th colspan="1">天気概況夜</th>
      </tr>
      <tr><th>mm</th><th>℃</th><th>℃</th><th>℃</th><th>m/s</th><th>h</th><th>%</th><th>昼</th><th>夜</th></tr>
      <tr>
        <td>1</td>
        <td>2.0</td><td>15</td><td>20</td><td>10</td><td>3</td><td>5</td><td>60</td><td>晴</td><td>晴</td>
      </tr>
    </table></body></html>`
    const doc = buildDoc(html)
    const results = parseDailyTable(doc, 2026, 1)
    expect(results.length).toBe(1)
    expect(results[0].dateKey).toBe('2026-01-01')
  })
})
