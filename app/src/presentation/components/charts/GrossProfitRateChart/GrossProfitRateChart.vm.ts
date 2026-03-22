/**
 * GrossProfitRateChart ViewModel
 *
 * WriteModel（StoreResult.daily）→ 描画データ変換。
 * Recharts に渡すデータ構造と閾値判定ロジックを分離する。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import type { DailyRecord } from '@/domain/models/record'
import { calculateGrossProfitRate } from '@/domain/calculations/utils'

// ─── 出力型 ──────────────────────────────────────────

export interface GrossProfitRateDataPoint {
  readonly day: number
  readonly rate: number
  readonly hasSales: boolean
}

export interface GrossProfitRateViewModel {
  readonly data: readonly GrossProfitRateDataPoint[]
  readonly yMax: number
}

// ─── ViewModel 構築 ──────────────────────────────────

/**
 * daily Map から累計ベースの粗利率推移データを構築する。
 *
 * @param daily 日別レコード
 * @param daysInMonth 当月日数
 * @param rangeStart 表示開始日
 * @param rangeEnd 表示終了日
 */
export function buildGrossProfitRateViewModel(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  rangeStart: number,
  rangeEnd: number,
): GrossProfitRateViewModel {
  const allData: GrossProfitRateDataPoint[] = []
  let cumSales = 0
  let cumCost = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      cumSales += rec.sales
      cumCost += rec.totalCost
    }
    const rate = calculateGrossProfitRate(cumSales - cumCost, cumSales)
    allData.push({
      day: d,
      rate,
      hasSales: rec ? rec.sales > 0 : false,
    })
  }

  const data = allData.filter((d) => d.day >= rangeStart && d.day <= rangeEnd)

  // Y軸上限をデータの最大値に基づいて動的に決定（最低0.5、0.1刻みで切り上げ）
  const maxRate = Math.max(...data.filter((d) => d.hasSales).map((d) => d.rate), 0)
  const yMax = Math.max(0.5, Math.ceil(maxRate * 10) / 10)

  return { data, yMax }
}

/**
 * バー色を閾値に基づいて決定する。
 */
export function getBarColor(
  rate: number,
  targetRate: number,
  warningRate: number,
  colors: { success: string; warning: string; danger: string },
): string {
  if (rate >= targetRate) return colors.success
  if (rate >= warningRate) return colors.warning
  return colors.danger
}
