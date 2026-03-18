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
import type { DailyWeatherSummary } from '@/domain/models'

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
}

/**
 * ETRN の日別データテーブルをパースする。
 */
export function parseDailyTable(
  doc: Document,
  year: number,
  month: number,
): DailyWeatherSummary[] {
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

    results.push({
      dateKey,
      temperatureAvg: tempAvg,
      temperatureMax: tempMax,
      temperatureMin: tempMin,
      precipitationTotal: precipTotal,
      humidityAvg,
      windSpeedMax: windSpeedMax * 3.6, // m/s → km/h
      dominantWeatherCode: deriveDailyWeatherCodeFromSummary(precipTotal, sunshineHours, tempAvg),
      sunshineTotalHours: sunshineHours,
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
  }

  if (map.tempAvg == null && map.tempMax == null) {
    return fallbackColumnMap()
  }

  return map
}

/** マルチレベルヘッダーの rowspan/colspan を解決し、2D グリッドに展開する。 */
function buildHeaderGrid(headerRows: Element[]): string[][] {
  const maxRows = headerRows.length
  const grid: string[][] = Array.from({ length: maxRows }, () =>
    Array(MAX_GRID_COLS).fill(''),
  )
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

/** 日別の降水量・日照時間・気温から WMO 互換天気コードを導出する。 */
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
