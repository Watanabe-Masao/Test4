/**
 * カテゴリ別売上ドリルダウン（CategoryDrilldown）
 *
 * DayDetailModal の「売上分析」タブで表示する
 * 分類別ドリルダウンテーブル・ツリーマップ・積み上げバーチャートを提供する。
 *
 * 前年・前週の比較データは切り替えではなく同時表示する。
 * 累計セクションは前年のみ（前週比は特性が異なるため不要）。
 *
 * データ計算・状態管理は useDrilldownData フックに委譲し、
 * 本コンポーネントは描画のみを担う。
 */
import { Fragment } from 'react'
import { createPortal } from 'react-dom'
import { palette } from '@/presentation/theme/tokens'
import { DetailSectionTitle } from '../DashboardPage.styles'
import {
  useDrilldownData,
  type CategoryDrilldownProps,
  type BarSectionData,
  type DrillItem,
  type SortKey,
} from './useDrilldownData'
import {
  DrillSection,
  DrillBreadcrumb,
  BcItem,
  BcSep,
  BcReset,
  DrillTreemap,
  TreeBlock,
  TreeLabel,
  TreePct,
  DrillTable,
  DTh,
  DTr,
  DTd,
  DTdName,
  DTdAmt,
  AmtWrap,
  AmtTrack,
  AmtFill,
  AmtVal,
  DrillArrow,
  YoYVal,
  SummaryRow,
  SumItem,
  SumLabel,
  SumValue,
  ToggleBar,
  ToggleGroup,
  ToggleBtn,
  ToggleLabel,
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
  SegmentTooltip,
} from './DayDetailModal.styles'

export function CategoryDrilldown(props: CategoryDrilldownProps) {
  const d = useDrilldownData(props)

  const renderBarSection = (sec: BarSectionData) => {
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
      const pct = d.formatPercent(total > 0 ? val / total : 0, 2)
      const prevVal = d.isAmountMode ? (it.prevAmount ?? 0) : (it.prevQuantity ?? 0)
      const curVal = d.isAmountMode ? it.amount : it.quantity
      const diff = isPrev ? undefined : curVal - prevVal
      const yoy = isPrev
        ? undefined
        : prevVal > 0
          ? d.formatPercent(curVal / prevVal, 2)
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

  if (d.isEmpty) return null

  return (
    <DrillSection>
      <DetailSectionTitle>分類別売上ドリルダウン</DetailSectionTitle>

      <ToggleBar>
        <ToggleLabel>指標</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn $active={d.metric === 'amount'} onClick={() => d.setMetric('amount')}>
            販売金額
          </ToggleBtn>
          <ToggleBtn $active={d.metric === 'quantity'} onClick={() => d.setMetric('quantity')}>
            点数
          </ToggleBtn>
        </ToggleGroup>
        <ToggleLabel>比較</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn
            $active={d.compare === 'daily'}
            onClick={() => {
              d.setCompare('daily')
              d.setDrillSourceRow('actual')
            }}
          >
            単日
          </ToggleBtn>
          <ToggleBtn
            $active={d.compare === 'cumulative'}
            onClick={() => {
              d.setCompare('cumulative')
              d.setDrillSourceRow('actual')
            }}
          >
            累計
          </ToggleBtn>
        </ToggleGroup>
        <ToggleLabel>データソース</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn
            $active={d.drillSourceRow === 'actual'}
            onClick={() => d.setDrillSourceRow('actual')}
          >
            実績
          </ToggleBtn>
          <ToggleBtn
            $active={d.drillSourceRow === 'prev'}
            onClick={() => d.setDrillSourceRow('prev')}
          >
            前年
          </ToggleBtn>
          {d.hasWoW && d.compare === 'daily' && (
            <ToggleBtn
              $active={d.drillSourceRow === 'wow'}
              onClick={() => d.setDrillSourceRow('wow')}
            >
              前週
            </ToggleBtn>
          )}
        </ToggleGroup>
      </ToggleBar>

      <DrillBreadcrumb>
        {d.breadcrumb.map((bc, i) => (
          <Fragment key={i}>
            {i > 0 && <BcSep>▸</BcSep>}
            <BcItem $active={i === d.breadcrumb.length - 1} onClick={() => d.setFilter(bc.f)}>
              {bc.label}
            </BcItem>
          </Fragment>
        ))}
        {d.filter.departmentCode && <BcReset onClick={() => d.setFilter({})}>リセット</BcReset>}
      </DrillBreadcrumb>

      <SummaryRow>
        <SumItem>
          <SumLabel>{d.levelLabels[d.currentLevel]}数</SumLabel>
          <SumValue>{d.items.length}</SumValue>
        </SumItem>
        <SumItem>
          <SumLabel>合計（{d.drillSourceLabel}）</SumLabel>
          <SumValue>{d.fmtVal(d.displayTotal)}</SumValue>
        </SumItem>
        {d.summaryBudget > 0 && (
          <>
            <SumItem>
              <SumLabel>予算額</SumLabel>
              <SumValue>{d.fmtSen(d.summaryBudget)}</SumValue>
            </SumItem>
            <SumItem>
              <SumLabel>予算差異</SumLabel>
              <SumValue>
                <YoYVal $positive={d.budgetDiff >= 0}>{d.fmtSen(d.budgetDiff)}</YoYVal>
              </SumValue>
            </SumItem>
            <SumItem>
              <SumLabel>予算達成率</SumLabel>
              <SumValue>
                <YoYVal $positive={d.budgetAch >= 1}>{d.formatPercent(d.budgetAch, 2)}</YoYVal>
              </SumValue>
            </SumItem>
          </>
        )}
        {d.hasPrevYear && d.summaryPrevYear > 0 && (
          <>
            <SumItem>
              <SumLabel>前年金額</SumLabel>
              <SumValue>{d.fmtSen(d.summaryPrevYear)}</SumValue>
            </SumItem>
            <SumItem>
              <SumLabel>前年差異</SumLabel>
              <SumValue>
                <YoYVal $positive={d.pyDiff >= 0}>{d.fmtSen(d.pyDiff)}</YoYVal>
              </SumValue>
            </SumItem>
            <SumItem>
              <SumLabel>前年対比</SumLabel>
              <SumValue>
                <YoYVal $positive={d.pyRatio >= 1}>{d.formatPercent(d.pyRatio, 2)}</YoYVal>
              </SumValue>
            </SumItem>
          </>
        )}
        {d.hasWoW && d.compare === 'daily' && d.summaryWow > 0 && (
          <>
            <SumItem>
              <SumLabel>前週金額</SumLabel>
              <SumValue>{d.fmtSen(d.summaryWow)}</SumValue>
            </SumItem>
            <SumItem>
              <SumLabel>前週差異</SumLabel>
              <SumValue>
                <YoYVal $positive={d.wowDiff >= 0}>{d.fmtSen(d.wowDiff)}</YoYVal>
              </SumValue>
            </SumItem>
            <SumItem>
              <SumLabel>前週対比</SumLabel>
              <SumValue>
                <YoYVal $positive={d.wowRatio >= 1}>{d.formatPercent(d.wowRatio, 2)}</YoYVal>
              </SumValue>
            </SumItem>
          </>
        )}
      </SummaryRow>

      {renderBarSection(d.dailyBarSection)}
      {renderBarSection(d.cumulativeBarSection)}
      {d.hoveredSeg &&
        d.segTooltip &&
        createPortal(
          <SegmentTooltip
            style={{
              left: d.segTooltip.x,
              top: d.segTooltip.y,
              transform: 'translate(-50%, calc(-100% - 8px))',
            }}
          >
            {d.segTooltip.content}
          </SegmentTooltip>,
          document.body,
        )}

      <DrillTreemap>
        {d.items.slice(0, 12).map((it) => {
          const val = d.isAmountMode ? d.primaryAmt(it) : d.primaryQty(it)
          const totalForPct = d.isAmountMode ? d.displayPrimaryAmt : d.displayPrimaryQty
          const pctVal = totalForPct > 0 ? (val / totalForPct) * 100 : 0
          return (
            <TreeBlock
              key={it.code}
              $flex={val}
              $color={it.color}
              $canDrill={d.canDrill}
              onClick={() => d.canDrill && d.handleDrill(it)}
              onDoubleClick={() => d.canDrill && d.handleDrill(it)}
              title={`${it.name}: ${d.fmtVal(val)} (${pctVal.toFixed(2)}%)`}
            >
              <TreeLabel>{it.name}</TreeLabel>
              <TreePct>{pctVal.toFixed(2)}%</TreePct>
            </TreeBlock>
          )
        })}
        {d.items.length > 12 && (
          <TreeBlock
            $flex={1}
            $color={palette.slate}
            $canDrill={false}
            title={`他 ${d.items.length - 12}件`}
          >
            <TreeLabel>他 {d.items.length - 12}件</TreeLabel>
          </TreeBlock>
        )}
      </DrillTreemap>

      <div style={{ overflowX: 'auto' }}>
        <DrillTable>
          <thead>
            <tr>
              <DTh>#</DTh>
              <DTh $sortable onClick={() => d.handleSort('name')}>
                {d.levelLabels[d.currentLevel]}名{d.arrow('name')}
              </DTh>
              <DTh $sortable onClick={() => d.handleSort('amount')}>
                {d.isAmountMode ? '売上金額' : '数量'}
                {d.arrow('amount')}
              </DTh>
              <DTh $sortable onClick={() => d.handleSort('pct')}>
                構成比{d.arrow('pct')}
              </DTh>
              <DTh $sortable onClick={() => d.handleSort('quantity')}>
                {d.isAmountMode ? '数量' : '売上金額'}
                {d.arrow('quantity')}
              </DTh>
              {d.hasPrevYear && (
                <>
                  <DTh>{d.isPrevSource && d.effectiveSource === 'prev' ? '実績' : '前年'}</DTh>
                  <DTh $sortable onClick={() => d.handleSort('yoyRatio' as SortKey)}>
                    前年比{d.arrow('yoyRatio' as SortKey)}
                  </DTh>
                </>
              )}
              {d.hasWoW && d.compare === 'daily' && (
                <>
                  <DTh>{d.isPrevSource && d.effectiveSource === 'wow' ? '実績' : '前週'}</DTh>
                  <DTh>前週比</DTh>
                </>
              )}
              {d.canDrill && <DTh />}
            </tr>
          </thead>
          <tbody>
            {d.sorted.map((it, i) => {
              const mainVal = d.isAmountMode ? d.primaryAmt(it) : d.primaryQty(it)
              const subVal = d.isAmountMode ? d.primaryQty(it) : d.primaryAmt(it)
              // YoY comparison
              const yoyItem =
                d.effectiveSource === 'wow' ? d.dayItemsYoY.find((y) => y.code === it.code) : it
              const yoyCounterpart =
                d.isPrevSource && d.effectiveSource === 'prev'
                  ? d.isAmountMode
                    ? it.amount
                    : it.quantity
                  : d.isAmountMode
                    ? (yoyItem?.prevAmount ?? 0)
                    : (yoyItem?.prevQuantity ?? 0)
              const yoy = d.isAmountMode ? yoyItem?.yoyRatio : yoyItem?.yoyQtyRatio
              // WoW comparison
              const wowItem = d.effectiveSource === 'wow' ? it : d.wowItemMap.get(it.code)
              const wowCounterpart =
                d.isPrevSource && d.effectiveSource === 'wow'
                  ? d.isAmountMode
                    ? it.amount
                    : it.quantity
                  : d.isAmountMode
                    ? (wowItem?.prevAmount ?? 0)
                    : (wowItem?.prevQuantity ?? 0)
              const wowRatioVal = wowItem
                ? d.isAmountMode
                  ? wowItem.yoyRatio
                  : wowItem.yoyQtyRatio
                : undefined
              const totalForPct = d.isAmountMode ? d.displayPrimaryAmt : d.displayPrimaryQty
              const pctVal = totalForPct > 0 ? (mainVal / totalForPct) * 100 : 0
              return (
                <DTr
                  key={it.code}
                  $clickable={d.canDrill}
                  onDoubleClick={() => d.canDrill && d.handleDrill(it)}
                >
                  <DTd $mono>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <LegendDot $color={it.color} />
                      {i + 1}
                    </span>
                  </DTd>
                  <DTdName>{it.name}</DTdName>
                  <DTdAmt>
                    <AmtWrap>
                      <AmtTrack>
                        <AmtFill
                          $pct={d.maxVal > 0 ? (mainVal / d.maxVal) * 100 : 0}
                          $color={it.color}
                        />
                      </AmtTrack>
                      <AmtVal>{d.fmtVal(mainVal)}</AmtVal>
                    </AmtWrap>
                  </DTdAmt>
                  <DTd $mono>{pctVal.toFixed(2)}%</DTd>
                  <DTd $mono>{d.fmtValSub(subVal)}</DTd>
                  {d.hasPrevYear && (
                    <>
                      <DTd $mono>{yoyCounterpart > 0 ? d.fmtVal(yoyCounterpart) : '-'}</DTd>
                      <DTd $mono>
                        {yoy != null ? (
                          <YoYVal $positive={yoy >= 1}>{d.formatPercent(yoy, 2)}</YoYVal>
                        ) : (
                          '-'
                        )}
                      </DTd>
                    </>
                  )}
                  {d.hasWoW && d.compare === 'daily' && (
                    <>
                      <DTd $mono>{wowCounterpart > 0 ? d.fmtVal(wowCounterpart) : '-'}</DTd>
                      <DTd $mono>
                        {wowRatioVal != null ? (
                          <YoYVal $positive={wowRatioVal >= 1}>
                            {d.formatPercent(wowRatioVal, 2)}
                          </YoYVal>
                        ) : (
                          '-'
                        )}
                      </DTd>
                    </>
                  )}
                  {d.canDrill && (
                    <DTd>
                      <DrillArrow>▸</DrillArrow>
                    </DTd>
                  )}
                </DTr>
              )
            })}
          </tbody>
        </DrillTable>
      </div>
    </DrillSection>
  )
}
