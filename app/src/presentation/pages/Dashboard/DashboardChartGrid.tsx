/**
 * DashboardChartGrid — チャートウィジェットを half/full レイアウトに配置するコンポーネント。
 * DashboardPage.tsx から分離した描画専用ロジック。
 */
import { memo, type ReactNode } from 'react'
import type { WidgetDef } from '@/presentation/components/widgets'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import { ChartErrorBoundary } from '@/presentation/components/common/feedback'
import { LazyWidget } from './LazyWidget'
import { ChartRow, FullChartRow } from './DashboardPage.styles'

interface Props {
  readonly chartWidgets: readonly WidgetDef[]
  readonly ctx: UnifiedWidgetContext
  /** KPI ウィジェット数（D&D インデックスのオフセット） */
  readonly flatIdxStart: number
  /** ウィジェット1つ分をラップして返す（edit / normal 切替は親が制御） */
  readonly renderWidget: (widget: WidgetDef, flatIndex: number, content: ReactNode) => ReactNode
}

export const DashboardChartGrid = memo(function DashboardChartGrid({
  chartWidgets,
  ctx,
  flatIdxStart,
  renderWidget,
}: Props) {
  const elements: ReactNode[] = []
  let halfBuffer: WidgetDef[] = []
  let idx = flatIdxStart

  const flushHalves = () => {
    if (halfBuffer.length === 0) return
    if (halfBuffer.length === 2) {
      const idx1 = idx++
      const idx2 = idx++
      elements.push(
        <ChartRow key={`half-${halfBuffer[0].id}`}>
          {renderWidget(
            halfBuffer[0],
            idx1,
            <ChartErrorBoundary>
              <LazyWidget>{halfBuffer[0].render(ctx)}</LazyWidget>
            </ChartErrorBoundary>,
          )}
          {renderWidget(
            halfBuffer[1],
            idx2,
            <ChartErrorBoundary>
              <LazyWidget>{halfBuffer[1].render(ctx)}</LazyWidget>
            </ChartErrorBoundary>,
          )}
        </ChartRow>,
      )
    } else {
      const idx1 = idx++
      elements.push(
        <ChartRow key={`half-${halfBuffer[0].id}`}>
          {renderWidget(
            halfBuffer[0],
            idx1,
            <ChartErrorBoundary>
              <LazyWidget>{halfBuffer[0].render(ctx)}</LazyWidget>
            </ChartErrorBoundary>,
          )}
        </ChartRow>,
      )
    }
    halfBuffer = []
  }

  for (const w of chartWidgets) {
    if (w.size === 'full') {
      flushHalves()
      const i = idx++
      elements.push(
        <FullChartRow key={w.id}>
          {renderWidget(
            w,
            i,
            <ChartErrorBoundary>
              <LazyWidget>{w.render(ctx)}</LazyWidget>
            </ChartErrorBoundary>,
          )}
        </FullChartRow>,
      )
    } else {
      halfBuffer.push(w)
      if (halfBuffer.length === 2) flushHalves()
    }
  }
  flushHalves()

  return <>{elements}</>
})
