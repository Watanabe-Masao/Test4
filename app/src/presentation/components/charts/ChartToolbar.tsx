/**
 * ChartToolbar — 統一ツールバーコンテナ
 *
 * SegmentedControl、Chip群、Slider 等を水平配置する。
 * ChartCard の toolbar prop に渡して使用。
 * @responsibility R:unclassified
 */
import type { ReactNode } from 'react'
import { ToolbarRow, ToolbarGroup, ToolbarLabel } from './ChartToolbar.styles'

export { ToolbarGroup, ToolbarLabel }

export function ChartToolbar({ children }: { children: ReactNode }) {
  return <ToolbarRow>{children}</ToolbarRow>
}
