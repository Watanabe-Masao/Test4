/**
 * IntegratedSalesChart — 日別売上と時間帯別売上の統合ビュー
 *
 * 同一カード領域で「日別」と「時間帯」を切り替える。
 * 各チャートは独立した ChartCard を持つため、CSS でビュー切替とトランジションを実現。
 */
import { useState, useCallback, memo } from 'react'
import styled, { keyframes } from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { DailyRecord } from '@/domain/models/record'
import { DailySalesChart } from './DailySalesChart'
import { TimeSlotChart } from './TimeSlotChart'

type MasterTab = 'daily' | 'timeslot'

interface Props {
  // DailySalesChart props
  readonly daily: ReadonlyMap<number, DailyRecord>
  readonly daysInMonth: number
  readonly year: number
  readonly month: number
  readonly prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; customers?: number }
  >
  readonly budgetDaily?: ReadonlyMap<number, number>
  // TimeSlotChart props
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

const TAB_LABELS: Record<MasterTab, string> = {
  daily: '日別',
  timeslot: '時間帯',
}

const TABS: MasterTab[] = ['daily', 'timeslot']

export const IntegratedSalesChart = memo(function IntegratedSalesChart(props: Props) {
  const [tab, setTab] = useState<MasterTab>('daily')
  const handleTab = useCallback((t: MasterTab) => setTab(t), [])

  const showTimeSlot = props.duckConn != null && props.duckDataVersion > 0

  return (
    <Wrapper>
      <MasterTabBar>
        {TABS.map((t) => {
          if (t === 'timeslot' && !showTimeSlot) return null
          return (
            <MasterTabBtn key={t} $active={tab === t} onClick={() => handleTab(t)}>
              {TAB_LABELS[t]}
            </MasterTabBtn>
          )
        })}
      </MasterTabBar>
      <ViewContainer>
        <ViewPane $active={tab === 'daily'} $direction="left">
          <DailySalesChart
            daily={props.daily}
            daysInMonth={props.daysInMonth}
            year={props.year}
            month={props.month}
            prevYearDaily={props.prevYearDaily}
            budgetDaily={props.budgetDaily}
          />
        </ViewPane>
        {showTimeSlot && (
          <ViewPane $active={tab === 'timeslot'} $direction="right">
            <TimeSlotChart
              duckConn={props.duckConn}
              duckDataVersion={props.duckDataVersion}
              currentDateRange={props.currentDateRange}
              selectedStoreIds={props.selectedStoreIds}
              prevYearScope={props.prevYearScope}
            />
          </ViewPane>
        )}
      </ViewContainer>
    </Wrapper>
  )
})

// ── Styles ──

const slideInFromRight = keyframes`
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
`

const slideInFromLeft = keyframes`
  from { opacity: 0; transform: translateX(-30px); }
  to   { opacity: 1; transform: translateX(0); }
`

const Wrapper = styled.div`
  position: relative;
`

const MasterTabBar = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
  width: fit-content;
`

const MasterTabBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  padding: 4px 14px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: ${({ $active, theme }) =>
      $active
        ? theme.colors.palette.primary
        : theme.mode === 'dark'
          ? 'rgba(255,255,255,0.08)'
          : 'rgba(0,0,0,0.06)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

const ViewContainer = styled.div`
  position: relative;
`

const ViewPane = styled.div<{ $active: boolean; $direction: 'left' | 'right' }>`
  display: ${({ $active }) => ($active ? 'block' : 'none')};
  animation: ${({ $active, $direction }) =>
    $active
      ? `${$direction === 'left' ? slideInFromLeft : slideInFromRight} 0.3s ease-out`
      : 'none'};
`
