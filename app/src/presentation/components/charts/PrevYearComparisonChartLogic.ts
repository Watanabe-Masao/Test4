/**
 * PrevYearComparisonChart — 純粋ロジック層
 *
 * 当期 daily + 前年 daily から日別累計売上の比較データを構築する。
 * React 非依存。副作用なし。
 *
 * unify-period-analysis Phase 5 閉じ込み: `PrevYearComparisonChart.tsx`
 * 内に inline 定義されていた `buildCumulativeData` を本ファイルに抽出した。
 * 返り値は `ChartRenderModel<ComparisonPoint>` 共通契約 + chart 固有
 * `extras` 拡張の形に揃えている。
 *
 * @responsibility R:calculation
 */
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import type { ChartRenderModel } from './chartRenderModel'

/**
 * 1 日分の累計売上 point.
 *
 * `prevYearCum` は前年データがない日では null になる。
 */
export interface ComparisonPoint {
  readonly day: number
  /** 当期の当日までの累計売上 */
  readonly currentCum: number
  /** 前年同日までの累計売上 (データがない場合は null) */
  readonly prevYearCum: number | null
}

/**
 * PrevYearComparisonChart の ChartRenderModel (拡張版).
 *
 * 共通契約の `summary` に加え、`extras.prevTotal` を chart 固有で持つ:
 * - `summary.primary`: 当期の最新確定日時点の累計 (`latestCurrentCum`)
 * - `summary.secondary`: 前年の同日時点までの累計 (`prevCumAtLatest`)
 * - `summary.delta`: `latestCurrentCum − prevCumAtLatest` (yoy 差分)
 * - `summary.ratio`: `latestCurrentCum / prevCumAtLatest` (yoy 比率)
 * - `extras.prevTotal`: 前年同月全体の累計 (月末まで)
 */
export interface PrevYearComparisonRenderModel extends ChartRenderModel<ComparisonPoint> {
  readonly extras: {
    readonly prevTotal: number
  }
}

/**
 * 当期 daily + 前年 daily から日別累計比較データを構築する。
 */
export function buildCumulativeData(
  currentDaily: ReadonlyMap<number, { sales: number }>,
  prevYearDaily: ReadonlyMap<string, { sales: number }>,
  year: number,
  month: number,
  daysInMonth: number,
): PrevYearComparisonRenderModel {
  let currentCum = 0
  let prevCum = 0
  const points: ComparisonPoint[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    currentCum += currentDaily.get(d)?.sales ?? 0
    prevCum += prevYearDaily.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
    points.push({ day: d, currentCum, prevYearCum: prevCum > 0 ? prevCum : null })
  }

  // 最新データ日 = 当期で売上が最後に入っている日
  const latestDay =
    [...currentDaily.keys()]
      .filter((d) => (currentDaily.get(d)?.sales ?? 0) > 0)
      .sort((a, b) => b - a)[0] ?? 0

  // 前年の最新データ日時点での累計 (cap 反映)
  let prevCumAtLatest = 0
  for (let d = 1; d <= latestDay; d++) {
    prevCumAtLatest += prevYearDaily.get(toDateKeyFromParts(year, month, d))?.sales ?? 0
  }

  const latestCurrentCum =
    latestDay > 0 ? (points.find((d) => d.day === latestDay)?.currentCum ?? 0) : 0
  const yoyRatio = prevCumAtLatest > 0 ? latestCurrentCum / prevCumAtLatest : 0
  const yoyDiff = latestCurrentCum - prevCumAtLatest

  return {
    points,
    summary: {
      primary: latestCurrentCum,
      secondary: prevCumAtLatest,
      delta: yoyDiff,
      ratio: yoyRatio,
    },
    flags: { hasComparison: prevCum > 0 },
    extras: { prevTotal: prevCum },
  }
}
