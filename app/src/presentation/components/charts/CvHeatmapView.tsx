/**
 * CVヒートマップビュー — CvTimeSeriesChart のサブコンポーネント
 * @responsibility R:chart-view
 */
import type { useChartTheme } from './chartTheme'
import { formatDateKey } from './ChartParts'
import { cvToColor } from './CvTimeSeriesChart.vm'
import {
  HeatmapGrid,
  HeatmapTable,
  HeatmapTh,
  HeatmapRowHeader,
  HeatmapCell,
} from './CvTimeSeriesChart.styles'

interface Props {
  readonly topCodes: readonly string[]
  readonly categoryNames: ReadonlyMap<string, string>
  readonly dateKeys: readonly string[]
  readonly cvMap: ReadonlyMap<string, ReadonlyMap<string, number>>
  readonly maxCv: number
  readonly ct: ReturnType<typeof useChartTheme>
}

export function CvHeatmapView({ topCodes, categoryNames, dateKeys, cvMap, maxCv, ct }: Props) {
  return (
    <HeatmapGrid>
      <HeatmapTable>
        <thead>
          <tr>
            <HeatmapTh style={{ textAlign: 'left' }}>カテゴリ</HeatmapTh>
            {dateKeys.map((dk) => (
              <HeatmapTh key={dk}>{formatDateKey(dk)}</HeatmapTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {topCodes.map((code) => {
            const codeMap = cvMap.get(code)
            return (
              <tr key={code}>
                <HeatmapRowHeader title={categoryNames.get(code) ?? code}>
                  {categoryNames.get(code) ?? code}
                </HeatmapRowHeader>
                {dateKeys.map((dk) => {
                  const cv = codeMap?.get(dk)
                  if (cv == null) {
                    return (
                      <HeatmapCell key={dk} $bg="transparent" $textColor={ct.textMuted}>
                        -
                      </HeatmapCell>
                    )
                  }
                  const { bg, text } = cvToColor(cv, maxCv)
                  return (
                    <HeatmapCell key={dk} $bg={bg} $textColor={text}>
                      {cv.toFixed(2)}
                    </HeatmapCell>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </HeatmapTable>
    </HeatmapGrid>
  )
}
