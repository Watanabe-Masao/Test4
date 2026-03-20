/**
 * ETRN 時間別データ HTML テーブルパーサー
 *
 * 気象庁 ETRN の hourly_a1.php / hourly_s1.php が返す HTML テーブルを
 * パースし、HourlyWeatherRecord に変換する純粋関数群。
 *
 * テーブル構造:
 *   - id="tablefix1" or class="data2_s"
 *   - ヘッダー行（2-3行、マルチレベル rowspan/colspan）
 *   - データ行（時ごと1行、時=1-24。24時は翌日0時）
 *
 * ヘッダーのカラム配置は観測所タイプ（s1/a1）によって異なるため、
 * ヘッダーテキストからカラム位置を動的に検出する。
 *
 * @see etrnTableParser.ts — 日別データパーサー（姉妹モジュール）
 */
import type { HourlyWeatherRecord } from '@/domain/models/record'

/** ヘッダーグリッド解析の最大列数 */
const MAX_GRID_COLS = 30

/** テーブルの列マッピング */
interface HourlyColumnMap {
  precipitation?: number
  temperature?: number
  humidity?: number
  windSpeed?: number
  sunshineDuration?: number
}

/**
 * ETRN の時間別データテーブルをパースする。
 *
 * @param doc パース済み Document
 * @param dateKey 対象日 (YYYY-MM-DD)
 * @returns 0-23時の HourlyWeatherRecord 配列
 */
export function parseHourlyTable(doc: Document, dateKey: string): HourlyWeatherRecord[] {
  const table = doc.querySelector('#tablefix1') ?? doc.querySelector('table.data2_s')
  if (!table) return []

  const columns = detectHourlyColumnPositions(table)
  const rows = table.querySelectorAll('tr')
  const results: HourlyWeatherRecord[] = []

  for (const row of rows) {
    const cells = row.querySelectorAll('td')
    if (cells.length < 3) continue

    const hourText = cells[0]?.textContent?.trim() ?? ''
    const rawHour = parseInt(hourText, 10)
    if (isNaN(rawHour) || rawHour < 1 || rawHour > 24) continue

    // ETRN は 1-24 表記。24時は翌日0時なので除外
    if (rawHour === 24) continue
    const hour = rawHour // ETRN 1時 = 01:00 の観測値。そのまま使用

    const precipitation = readCell(cells, columns.precipitation)
    const temperature = readCell(cells, columns.temperature)
    const humidity = readCell(cells, columns.humidity)
    const windSpeedMs = readCell(cells, columns.windSpeed)
    const sunshineDuration = readCell(cells, columns.sunshineDuration)

    results.push({
      dateKey,
      hour,
      temperature,
      humidity,
      precipitation,
      windSpeed: windSpeedMs * 3.6, // m/s → km/h（日別パーサーと統一）
      weatherCode: deriveHourlyWeatherCode(precipitation, sunshineDuration, temperature),
      sunshineDuration: sunshineDuration * 3600, // hours → seconds
    })
  }

  return results
}

// ─── Column Detection ───────────────────────────────

function detectHourlyColumnPositions(table: Element): HourlyColumnMap {
  const rows = Array.from(table.querySelectorAll('tr'))
  const headerRows = rows.filter((r) => r.querySelector('th'))

  if (headerRows.length === 0) return fallbackHourlyColumnMap()

  const grid = buildHeaderGrid(headerRows)
  const columnLabels = mergeColumnLabels(grid)

  const map: HourlyColumnMap = {}
  for (let i = 1; i < columnLabels.length; i++) {
    const label = columnLabels[i]

    if (map.precipitation == null && /降水量/.test(label)) {
      map.precipitation = i
    }
    if (map.temperature == null && /気温/.test(label) && !/露点/.test(label)) {
      map.temperature = i
    }
    if (map.humidity == null && /湿度/.test(label)) {
      map.humidity = i
    }
    if (map.windSpeed == null && /風速/.test(label) && !/最大/.test(label) && !/瞬間/.test(label)) {
      map.windSpeed = i
    }
    if (map.sunshineDuration == null && /日照/.test(label)) {
      map.sunshineDuration = i
    }
  }

  if (map.temperature == null && map.precipitation == null) {
    return fallbackHourlyColumnMap()
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

/** ヘッダー解析失敗時のフォールバック（hourly_a1 の一般的配置） */
function fallbackHourlyColumnMap(): HourlyColumnMap {
  return {
    precipitation: 1,
    temperature: 2,
    windSpeed: 3,
    sunshineDuration: 6,
  }
}

// ─── Cell Value Parser ──────────────────────────────

function readCell(cells: NodeListOf<Element>, colIndex: number | undefined): number {
  if (colIndex == null) return 0
  const cell = cells[colIndex]
  if (!cell) return 0
  return parseEtrnValue(cell)
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

// ─── Weather Code Derivation ────────────────────────

/** 時間別の降水量・日照時間・気温から WMO 互換天気コードを導出する。 */
function deriveHourlyWeatherCode(
  precipMm: number,
  sunshineHours: number,
  temperature: number,
): number {
  const isSnow = temperature < 1

  if (precipMm >= 5) return isSnow ? 75 : 65 // 強い雨/雪
  if (precipMm >= 1) return isSnow ? 71 : 61 // 雨/雪
  if (precipMm > 0) return isSnow ? 71 : 51 // 弱い雨/雪

  if (sunshineHours >= 0.5) return 0 // 晴れ（1時間中30分以上日照）
  if (sunshineHours > 0) return 2 // 晴れ時々曇り
  return 3 // 曇り
}
