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
 *
 * @responsibility R:unclassified
 */
import { Fragment } from 'react'
import { createPortal } from 'react-dom'
import { palette } from '@/presentation/theme/tokens'
import { DetailSectionTitle } from '../DashboardPage.styles'
import { useDrilldownData, type CategoryDrilldownProps, type SortKey } from './useDrilldownData'
import { CategoryBarSection } from './CategoryBarSection'
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
  LegendDot,
  SegmentTooltip,
} from './DayDetailModal.styles'

export function CategoryDrilldown(props: CategoryDrilldownProps) {
  const d = useDrilldownData(props)

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
            {i > 0 && <BcSep>/</BcSep>}
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

      <CategoryBarSection sec={d.dailyBarSection} d={d} />
      <CategoryBarSection sec={d.cumulativeBarSection} d={d} />
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
