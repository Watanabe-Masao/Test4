/**
 * 天気-売上 相関分析 Hook
 *
 * 日別天気サマリと日別売上データのペアワイズ相関を計算する。
 * 既存の correlation.ts の純粋関数を再利用。
 */
import { useMemo } from 'react'
import type { DailyWeatherSummary } from '@/domain/models/record'
import {
  pearsonCorrelation,
  correlationMatrix,
  detectDivergence,
  normalizeMinMax,
  type CorrelationResult,
  type CorrelationMatrixCell,
  type DivergencePoint,
  type NormalizedSeries,
} from '@/domain/calculations/algorithms/correlation'

// presentation 層が domain/calculations を直接 import しないよう application 経由で re-export
export { normalizeMinMax }
export type { CorrelationResult }

/** 日別売上・客数データ（相関分析用の最小構造） */
export interface DailySalesForCorrelation {
  readonly dateKey: string
  readonly sales: number
  readonly customers: number
}

/** 相関分析結果 */
export interface WeatherCorrelationResult {
  /** 売上 × 平均気温の相関 */
  readonly salesVsTemperature: CorrelationResult
  /** 売上 × 降水量の相関 */
  readonly salesVsPrecipitation: CorrelationResult
  /** 客数 × 平均気温の相関 */
  readonly customersVsTemperature: CorrelationResult
  /** 客数 × 降水量の相関 */
  readonly customersVsPrecipitation: CorrelationResult
  /** 全指標ペアの相関マトリクス */
  readonly matrix: readonly CorrelationMatrixCell[]
  /** 売上-気温の乖離検出 */
  readonly salesTempDivergence: readonly DivergencePoint[]
  /** 正規化された系列（重ね描き用） */
  readonly normalized: {
    readonly sales: NormalizedSeries
    readonly temperature: NormalizedSeries
    readonly precipitation: NormalizedSeries
    readonly customers: NormalizedSeries
  }
  /** 分析に使用したデータ点数 */
  readonly dataPoints: number
}

/**
 * 天気データと売上データの相関を分析する。
 *
 * @param weatherDaily 日別天気サマリ
 * @param salesDaily 日別売上データ
 * @returns 相関分析結果（メモ化済み）
 */
export function useWeatherCorrelation(
  weatherDaily: readonly DailyWeatherSummary[],
  salesDaily: readonly DailySalesForCorrelation[],
): WeatherCorrelationResult | null {
  return useMemo(() => {
    if (weatherDaily.length === 0 || salesDaily.length === 0) return null

    // dateKey で突合（両方にデータがある日のみ）
    const weatherMap = new Map(weatherDaily.map((w) => [w.dateKey, w]))
    const paired: {
      sales: number
      customers: number
      temperature: number
      precipitation: number
      humidity: number
    }[] = []

    for (const s of salesDaily) {
      const w = weatherMap.get(s.dateKey)
      if (w) {
        paired.push({
          sales: s.sales,
          customers: s.customers,
          temperature: w.temperatureAvg,
          precipitation: w.precipitationTotal,
          humidity: w.humidityAvg,
        })
      }
    }

    if (paired.length < 2) return null

    const salesArr = paired.map((p) => p.sales)
    const custArr = paired.map((p) => p.customers)
    const tempArr = paired.map((p) => p.temperature)
    const precipArr = paired.map((p) => p.precipitation)
    const humidityArr = paired.map((p) => p.humidity)

    return {
      salesVsTemperature: pearsonCorrelation(salesArr, tempArr),
      salesVsPrecipitation: pearsonCorrelation(salesArr, precipArr),
      customersVsTemperature: pearsonCorrelation(custArr, tempArr),
      customersVsPrecipitation: pearsonCorrelation(custArr, precipArr),
      matrix: correlationMatrix([
        { name: '売上', values: salesArr },
        { name: '客数', values: custArr },
        { name: '気温', values: tempArr },
        { name: '降水量', values: precipArr },
        { name: '湿度', values: humidityArr },
      ]),
      salesTempDivergence: detectDivergence(salesArr, tempArr),
      normalized: {
        sales: normalizeMinMax(salesArr),
        temperature: normalizeMinMax(tempArr),
        precipitation: normalizeMinMax(precipArr),
        customers: normalizeMinMax(custArr),
      },
      dataPoints: paired.length,
    }
  }, [weatherDaily, salesDaily])
}
