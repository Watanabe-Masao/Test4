/**
 * ETRN 日別データ HTML テーブルパーサー
 *
 * 気象庁 ETRN の daily_a1.php / daily_s1.php が返す HTML テーブルを
 * パースし、DailyWeatherSummary に変換する純粋関数群。
 *
 * テーブル構造:
 *   - id="tablefix1" or class="data2_s"
 *   - ヘッダー行（2-4行、マルチレベル rowspan/colspan）
 *   - データ行（日ごと1行）
 *
 * ヘッダーのカラム配置は観測所によって異なるため、
 * ヘッダーテキストからカラム位置を動的に検出する。
 */
import type { DailyWeatherSummary } from '@/domain/models/record'

/** ヘッダーグリッド解析の最大列数 */
const MAX_GRID_COLS = 30

/** テーブルの列マッピング */
interface ColumnMap {
  precipTotal?: number
  tempAvg?: number
  tempMax?: number
  tempMin?: number
  windSpeedMax?: number
  sunshineHours?: number
  humidityAvg?: number
  weatherTextDay?: number // 天気概況（昼）
  weatherTextNight?: number // 天気概況（夜）
}

/**
 * ETRN の日別データテーブルをパースする。
 */
export function parseDailyTable(doc: Document, year: number, month: number): DailyWeatherSummary[] {
  const table = doc.querySelector('#tablefix1') ?? doc.querySelector('table.data2_s')
  if (!table) return []

  const columns = detectColumnPositions(table)
  const rows = table.querySelectorAll('tr')
  const results: DailyWeatherSummary[] = []

  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    if (cells.length < 5) continue

    const dayText = cells[0]?.textContent?.trim() ?? ''
    const day = parseInt(dayText, 10)
    if (isNaN(day) || day < 1 || day > 31) continue

    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const precipTotal = readCell(cells, columns.precipTotal)
    const tempAvg = readCell(cells, columns.tempAvg)
    const tempMax = readCell(cells, columns.tempMax)
    const tempMin = readCell(cells, columns.tempMin)
    const windSpeedMax = readCell(cells, columns.windSpeedMax)
    const sunshineHours = readCell(cells, columns.sunshineHours)
    const humidityAvg = readCell(cells, columns.humidityAvg)

    if (tempMax === 0 && tempMin === 0 && precipTotal === 0 && tempAvg === 0) continue

    const weatherTextDay = readTextCell(cells, columns.weatherTextDay)
    const weatherTextNight = readTextCell(cells, columns.weatherTextNight)

    // 天気概況テキストがある場合はそこから天気コードを導出（より正確）
    // a1 観測所は天気概況も日照データもないため、降水なしの晴れ/曇り判定が不可能 → null
    const hasSunshineData = columns.sunshineHours != null
    const weatherCode = weatherTextDay
      ? weatherCodeFromText(weatherTextDay, weatherTextNight)
      : hasSunshineData || precipTotal > 0
        ? deriveDailyWeatherCodeFromSummary(precipTotal, sunshineHours, tempAvg)
        : null

    results.push({
      dateKey,
      temperatureAvg: tempAvg,
      temperatureMax: tempMax,
      temperatureMin: tempMin,
      precipitationTotal: precipTotal,
      humidityAvg,
      windSpeedMax: windSpeedMax * 3.6, // m/s → km/h
      dominantWeatherCode: weatherCode,
      sunshineTotalHours: sunshineHours,
      weatherTextDay: weatherTextDay || undefined,
      weatherTextNight: weatherTextNight || undefined,
    })
  }

  return results
}

// ─── Column Detection ───────────────────────────────

function detectColumnPositions(table: Element): ColumnMap {
  const rows = Array.from(table.querySelectorAll('tr'))
  const headerRows = rows.filter((r) => r.querySelector('th'))

  if (headerRows.length === 0) return fallbackColumnMap()

  const grid = buildHeaderGrid(headerRows)
  const columnLabels = mergeColumnLabels(grid)

  const map: ColumnMap = {}
  for (let i = 1; i < columnLabels.length; i++) {
    const label = columnLabels[i]

    if (map.precipTotal == null && /降水/.test(label) && /合計/.test(label)) {
      map.precipTotal = i
    }
    if (map.tempAvg == null && /気温/.test(label) && /平均/.test(label)) {
      map.tempAvg = i
    }
    if (map.tempMax == null && /気温/.test(label) && /最高/.test(label)) {
      map.tempMax = i
    }
    if (map.tempMin == null && /気温/.test(label) && /最低/.test(label)) {
      map.tempMin = i
    }
    if (
      map.windSpeedMax == null &&
      /風速/.test(label) &&
      /最大/.test(label) &&
      !/瞬間/.test(label)
    ) {
      map.windSpeedMax = i
    }
    if (map.sunshineHours == null && /日照/.test(label)) {
      map.sunshineHours = i
    }
    if (map.humidityAvg == null && /湿度/.test(label) && /平均/.test(label)) {
      map.humidityAvg = i
    }
    // 天気概況は「昼(06:00-18:00)」「夜(18:00-翌06:00)」の2カラム
    if (map.weatherTextDay == null && /天気概況/.test(label) && /昼/.test(label)) {
      map.weatherTextDay = i
    }
    if (map.weatherTextNight == null && /天気概況/.test(label) && /夜/.test(label)) {
      map.weatherTextNight = i
    }
  }

  if (map.tempAvg == null && map.tempMax == null) {
    return fallbackColumnMap()
  }

  return map
}

/** マルチレベルヘッダーの rowspan/colspan を解決し、2D グリッドに展開する。 */
function buildHeaderGrid(headerRows: Element[]): string[][] {
  const maxRows = headerRows.length
  const grid: string[][] = Array.from({ length: maxRows }, () => Array(MAX_GRID_COLS).fill(''))
  const filled: boolean[][] = Array.from({ length: maxRows }, () =>
    Array(MAX_GRID_COLS).fill(false),
  )

  for (let r = 0; r < maxRows; r++) {
    const cells = headerRows[r].querySelectorAll('th')
    let col = 0

    for (const cell of cells) {
      while (col < MAX_GRID_COLS && filled[r][col]) col++
      if (col >= MAX_GRID_COLS) break

      const text = (cell.textContent ?? '').trim().replace(/\s+/g, '')
      const colspan = parseInt(cell.getAttribute('colspan') ?? '1', 10)
      const rowspan = parseInt(cell.getAttribute('rowspan') ?? '1', 10)

      for (let dr = 0; dr < rowspan && r + dr < maxRows; dr++) {
        for (let dc = 0; dc < colspan && col + dc < MAX_GRID_COLS; dc++) {
          grid[r + dr][col + dc] = text
          filled[r + dr][col + dc] = true
        }
      }

      col += colspan
    }
  }

  return grid
}

/** ヘッダーグリッドの各カラムを縦方向に結合し、カラムラベルを生成する。 */
function mergeColumnLabels(grid: string[][]): string[] {
  if (grid.length === 0) return []
  const numCols = Math.max(...grid.map((r) => r.length))
  const labels: string[] = []

  for (let c = 0; c < numCols; c++) {
    const parts: string[] = []
    for (const row of grid) {
      const text = row[c] ?? ''
      if (text && !parts.includes(text)) {
        parts.push(text)
      }
    }
    labels[c] = parts.join(' ')
  }

  return labels
}

/** ヘッダー解析失敗時のフォールバック（daily_a1 の一般的配置） */
function fallbackColumnMap(): ColumnMap {
  return {
    precipTotal: 1,
    tempAvg: 4,
    tempMax: 5,
    tempMin: 6,
    windSpeedMax: 8,
    sunshineHours: 12,
  }
}

// ─── Cell Value Parser ──────────────────────────────

function readCell(cells: NodeListOf<Element>, colIndex: number | undefined): number {
  if (colIndex == null) return 0
  const cell = cells[colIndex]
  if (!cell) return 0
  return parseEtrnValue(cell)
}

/** テキストセルの値を読む（天気概況用） */
function readTextCell(cells: NodeListOf<Element>, colIndex: number | undefined): string {
  if (colIndex == null) return ''
  const cell = cells[colIndex]
  if (!cell) return ''
  const text = (cell.textContent ?? '').trim()
  if (text === '--' || text === '///' || text === '×' || text === '…') return ''
  return text
}

/**
 * ETRN テーブルセルから数値を抽出する。
 *
 * 処理対象:
 *   - 通常の数値: "12.3"
 *   - 品質フラグ付き: "12.3 )" "12.3 ]"
 *   - 欠測: "--", "///", "×", "…", ""
 */
function parseEtrnValue(cell: Element): number {
  const text = (cell.textContent ?? '').trim()
  if (!text || text === '--' || text === '///' || text === '×' || text === '…') return 0

  const cleaned = text.replace(/[)\]＊*#&×…]/g, '').trim()
  const num = parseFloat(cleaned)
  return Number.isFinite(num) ? num : 0
}

// ─── Weather Text → WMO Code Mapping ────────────────

/**
 * 気象庁 ETRN 天気概況テキストから WMO 互換天気コードを導出する。
 *
 * 昼の天気を優先し、昼が不明な場合は夜を使用する。
 * テキストの先頭語（主たる天気）で判定する。
 *
 * 気象庁天気概況の構造:
 *   主天気 [修飾語 副天気]
 *   修飾語: 後(のち), 一時, 時々
 *   例: "晴後曇", "曇一時雨", "雨時々曇", "晴後一時雨", "大雨"
 */

/** 天気テキストのキーワードから代表天気コードへの優先マッチ */
const WEATHER_TEXT_PATTERNS: readonly { readonly pattern: RegExp; readonly code: number }[] = [
  // 雷 — WMO 95 (thunderstorm)
  { pattern: /雷/, code: 95 },
  // 大雪 — WMO 75 (heavy snow)
  { pattern: /大雪/, code: 75 },
  // 暴風雪・ふぶき — WMO 75
  { pattern: /暴風雪|ふぶき|吹雪/, code: 75 },
  // 大雨 — WMO 65 (heavy rain)
  { pattern: /大雨/, code: 65 },
  // みぞれ — WMO 68 (rain and snow mixed)
  { pattern: /みぞれ/, code: 68 },
  // 霧 — WMO 45
  { pattern: /霧/, code: 45 },
  // 雪が主語 — WMO 71 (snow)
  { pattern: /^雪/, code: 71 },
  // 雨が主語 — WMO 61 (rain)
  { pattern: /^雨/, code: 61 },
  // 薄曇 — WMO 2 (partly cloudy — 薄い雲)
  { pattern: /薄曇/, code: 2 },
  // 曇が主語 — 副天気で細分化
  { pattern: /^曇.*雪/, code: 71 }, // 曇後雪, 曇一時雪, 曇時々雪
  { pattern: /^曇.*雨/, code: 3 }, // 曇後雨 → overcast (主天気は曇)
  { pattern: /^曇/, code: 3 }, // 曇 — WMO 3 (overcast)
  // 晴が主語 — 副天気で細分化
  { pattern: /^晴.*雨/, code: 2 }, // 晴後雨, 晴一時雨 → partly cloudy
  { pattern: /^晴.*雪/, code: 2 }, // 晴後雪, 晴一時雪
  { pattern: /^晴.*曇/, code: 2 }, // 晴後曇, 晴時々曇 → partly cloudy
  { pattern: /^晴/, code: 0 }, // 晴 — WMO 0 (clear sky)
  // 快晴 — WMO 0
  { pattern: /快晴/, code: 0 },
]

function weatherCodeFromText(dayText: string, nightText: string): number {
  const text = dayText || nightText
  if (!text) return 3 // fallback: overcast
  for (const { pattern, code } of WEATHER_TEXT_PATTERNS) {
    if (pattern.test(text)) return code
  }
  return 3 // unknown → overcast
}

// ─── Weather Code Derivation (fallback) ─────────────

/** 日別の降水量・日照時間・気温から WMO 互換天気コードを導出する（天気概況がない場合のフォールバック）。 */
function deriveDailyWeatherCodeFromSummary(
  precipMm: number,
  sunshineHours: number,
  tempAvg: number,
): number {
  const isSnow = tempAvg < 1

  if (precipMm >= 10) return isSnow ? 75 : 65
  if (precipMm >= 1) return isSnow ? 71 : 61
  if (precipMm > 0) return isSnow ? 71 : 51

  if (sunshineHours >= 6) return 0
  if (sunshineHours >= 3) return 2
  return 3
}
