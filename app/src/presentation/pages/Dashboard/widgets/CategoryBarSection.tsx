/**
 * CategoryBarSection - 積み上げバーチャートセクション
 *
 * CategoryDrilldown から抽出した renderBarSection を独立コンポーネント化。
 * 予算・実績・前年・前週の積み上げバーと凡例を描画する。
 */
import type { BarSectionData, DrillItem } from './useDrilldownData'
import type { DrilldownData } from './useDrilldownData'
import { calculateAchievementRate } from '@/domain/calculations/utils'
import {
  StackedBarSection,
  StackBarTitle,
  StackRow,
  StackLabel,
  StackTrack,
  StackSegment,
  SegLabel,
  StackTotal,
  ActiveBadge,
  LegendRow,
  LegendItem,
  LegendDot,
} from './DayDetailModal.styles'
import { palette } from '@/presentation/theme/tokens'

export interface CategoryBarSectionProps {
  readonly sec: BarSectionData
  readonly d: DrilldownData
}

export function CategoryBarSection({ sec, d }: CategoryBarSectionProps) {
  const { title, barItems, budgetVal, actualVal, pyVal, prefix, period, wowBarItems, wowPyVal } =
    sec
  const isActualActive = d.compare === period && d.effectiveSource === 'actual'
  const isPrevActive = d.compare === period && d.effectiveSource === 'prev'
  const isWoWActive = d.compare === period && d.effectiveSource === 'wow'
  const bActualTotal = d.isAmountMode
    ? barItems.reduce((s, it) => s + it.amount, 0)
    : barItems.reduce((s, it) => s + it.quantity, 0)
  const bPrevTotal = d.isAmountMode
    ? barItems.reduce((s, it) => s + (it.prevAmount ?? 0), 0)
    : barItems.reduce((s, it) => s + (it.prevQuantity ?? 0), 0)
  const bWoWTotal = wowBarItems
    ? d.isAmountMode
      ? wowBarItems.reduce((s, it) => s + (it.prevAmount ?? 0), 0)
      : wowBarItems.reduce((s, it) => s + (it.prevQuantity ?? 0), 0)
    : 0
  // 分類別データが無いが実績（DailyRecord）がある場合のフォールバック表示
  const showActualFallback = bActualTotal === 0 && actualVal > 0 && d.isAmountMode
  const effectiveActual = showActualFallback ? actualVal : bActualTotal
  const maxBar = d.isAmountMode
    ? Math.max(budgetVal, effectiveActual, bPrevTotal, bWoWTotal, 1)
    : Math.max(bActualTotal, bPrevTotal, bWoWTotal, 1)

  const tooltipFn = (
    it: DrillItem,
    val: number,
    total: number,
    isPrev: boolean,
    compLabel: string,
  ) => {
    const pct = d.formatPercent(calculateAchievementRate(val, total), 2)
    const prevVal = d.isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
    const curVal = d.isAmountMode ? it.amount : it.quantity
    const diff = isPrev ? undefined : curVal - prevVal
    const yoy =
      isPrev ? undefined
      : prevVal > 0 ? d.formatPercent(calculateAchievementRate(curVal, prevVal), 2)
      : undefined
    const rowLabel = isPrev ? compLabel : '実績'
    return (
      <>
        <div
          style={{
            fontWeight: 600,
            marginBottom: 2,
            borderBottom: '1px solid rgba(128,128,128,0.3)',
            paddingBottom: 2,
          }}
        >
          {rowLabel} - {it.name}
        </div>
        <div>販売構成比: {pct}</div>
        <div>
          販売金額: {d.fmtSen(d.isAmountMode ? val : isPrev ? (it.prevAmount ?? 0) : it.amount)}
        </div>
        {!d.isAmountMode && <div>数量: {val.toLocaleString()}点</div>}
        {!isPrev && diff != null && (
          <div>
            {compLabel}差: {diff >= 0 ? '+' : ''}
            {d.isAmountMode ? d.fmtSen(diff) : `${diff.toLocaleString()}点`}
          </div>
        )}
        {!isPrev && yoy && (
          <div>
            {compLabel}比: {yoy}
          </div>
        )}
        {isPrev && curVal > 0 && (
          <div>実績: {d.isAmountMode ? d.fmtSen(curVal) : `${curVal.toLocaleString()}点`}</div>
        )}
        {d.canDrill && (
          <div style={{ fontSize: '0.42rem', opacity: 0.6, marginTop: 2 }}>
            ダブルクリックでドリルダウン
          </div>
        )}
      </>
    )
  }

  return (
    <StackedBarSection>
      <StackBarTitle>{title}</StackBarTitle>
      {budgetVal > 0 && d.isAmountMode && (
        <StackRow $active={false} style={{ cursor: 'default' }}>
          <StackLabel>予算</StackLabel>
          <StackTrack>
            <StackSegment
              $flex={budgetVal / maxBar}
              $color={palette.slate}
              style={{ opacity: 0.7 }}
            />
          </StackTrack>
          <StackTotal>{d.fmtSen(budgetVal)}</StackTotal>
        </StackRow>
      )}
      <StackRow $active={isActualActive} onClick={() => d.handleRowSelect(period, 'actual')}>
        <StackLabel>実績</StackLabel>
        <StackTrack>
          {showActualFallback ? (
            <StackSegment
              $flex={actualVal / maxBar}
              $color={palette.slate}
              style={{ opacity: 0.6 }}
            >
              <SegLabel>分類未取込</SegLabel>
            </StackSegment>
          ) : (
            barItems.map((it) => {
              const val = d.isAmountMode ? it.amount : it.quantity
              if (val <= 0) return null
              const pct = bActualTotal > 0 ? (val / bActualTotal) * 100 : 0
              const segKey = `${prefix}a-${it.code}`
              return (
                <StackSegment
                  key={it.code}
                  $flex={val / maxBar}
                  $color={it.color}
                  onMouseEnter={(e) => {
                    d.setHoveredSeg(segKey)
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    d.setSegTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      content: tooltipFn(it, val, bActualTotal, false, '前年'),
                    })
                  }}
                  onMouseLeave={() => {
                    d.setHoveredSeg(null)
                    d.setSegTooltip(null)
                  }}
                  onDoubleClick={() => d.canDrill && d.handleDrill(it)}
                  style={{ cursor: d.canDrill ? 'pointer' : 'default' }}
                >
                  {pct >= 10 && (
                    <SegLabel>
                      {it.name} {pct.toFixed(2)}%
                    </SegLabel>
                  )}
                </StackSegment>
              )
            })
          )}
        </StackTrack>
        <StackTotal>
          {showActualFallback
            ? d.fmtSen(actualVal)
            : d.isAmountMode
              ? d.fmtSen(bActualTotal)
              : d.fmtVal(bActualTotal)}
        </StackTotal>
        {isActualActive && <ActiveBadge>▼ 詳細</ActiveBadge>}
      </StackRow>
      {d.hasPrevYear && pyVal > 0 && (
        <StackRow $active={isPrevActive} onClick={() => d.handleRowSelect(period, 'prev')}>
          <StackLabel>前年</StackLabel>
          <StackTrack>
            {barItems.map((it) => {
              const val = d.isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
              if (val <= 0) return null
              const pct = bPrevTotal > 0 ? (val / bPrevTotal) * 100 : 0
              const segKey = `${prefix}p-${it.code}`
              return (
                <StackSegment
                  key={it.code}
                  $flex={val / maxBar}
                  $color={it.color}
                  style={{ opacity: 0.5, cursor: d.canDrill ? 'pointer' : 'default' }}
                  onMouseEnter={(e) => {
                    d.setHoveredSeg(segKey)
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    d.setSegTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      content: tooltipFn(it, val, bPrevTotal, true, '前年'),
                    })
                  }}
                  onMouseLeave={() => {
                    d.setHoveredSeg(null)
                    d.setSegTooltip(null)
                  }}
                  onDoubleClick={() => d.canDrill && d.handleDrill(it)}
                >
                  {pct >= 10 && (
                    <SegLabel>
                      {it.name} {pct.toFixed(2)}%
                    </SegLabel>
                  )}
                </StackSegment>
              )
            })}
          </StackTrack>
          <StackTotal>{d.isAmountMode ? d.fmtSen(bPrevTotal) : d.fmtVal(bPrevTotal)}</StackTotal>
          {isPrevActive && <ActiveBadge>▼ 詳細</ActiveBadge>}
        </StackRow>
      )}
      {wowBarItems && (wowPyVal ?? 0) > 0 && (
        <StackRow $active={isWoWActive} onClick={() => d.handleRowSelect(period, 'wow')}>
          <StackLabel>前週</StackLabel>
          <StackTrack>
            {wowBarItems.map((it) => {
              const val = d.isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
              if (val <= 0) return null
              const pct = bWoWTotal > 0 ? (val / bWoWTotal) * 100 : 0
              const segKey = `${prefix}w-${it.code}`
              return (
                <StackSegment
                  key={it.code}
                  $flex={val / maxBar}
                  $color={it.color}
                  style={{ opacity: 0.5, cursor: d.canDrill ? 'pointer' : 'default' }}
                  onMouseEnter={(e) => {
                    d.setHoveredSeg(segKey)
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    d.setSegTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      content: tooltipFn(it, val, bWoWTotal, true, '前週'),
                    })
                  }}
                  onMouseLeave={() => {
                    d.setHoveredSeg(null)
                    d.setSegTooltip(null)
                  }}
                  onDoubleClick={() => d.canDrill && d.handleDrill(it)}
                >
                  {pct >= 10 && (
                    <SegLabel>
                      {it.name} {pct.toFixed(2)}%
                    </SegLabel>
                  )}
                </StackSegment>
              )
            })}
          </StackTrack>
          <StackTotal>{d.isAmountMode ? d.fmtSen(bWoWTotal) : d.fmtVal(bWoWTotal)}</StackTotal>
          {isWoWActive && <ActiveBadge>▼ 詳細</ActiveBadge>}
        </StackRow>
      )}
      <LegendRow>
        {barItems
          .filter((it) => it.amount > 0 || it.quantity > 0)
          .map((it) => (
            <LegendItem
              key={it.code}
              $clickable={d.canDrill}
              onClick={() => d.canDrill && d.handleDrill(it)}
            >
              <LegendDot $color={it.color} />
              <span>{it.name}</span>
            </LegendItem>
          ))}
      </LegendRow>
    </StackedBarSection>
  )
}
