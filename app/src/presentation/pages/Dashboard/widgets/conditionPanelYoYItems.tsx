/**
 * 点数 前年比詳細テーブル
 *
 * conditionPanelYoY.tsx から分離。
 * 全店点数の当年/前年比較 + 店舗別内訳 + 日別推移。
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo, useCallback } from 'react'
import { formatPercent } from '@/domain/formatting'
import { calculateYoYRatio } from '@/domain/calculations/utils'
import {
  type ItemsYoYDailyRow,
  buildItemsYoYDetailVm,
  buildItemsYoYStoreDailyRows,
} from './conditionPanelYoY.vm'
import { ItemsYoYDailyModal } from './conditionPanelYoYDailyModal'
import type { PrevYearMonthlyKpi } from '@/application/comparison/comparisonTypes'
import type { CurrentCtsQuantity } from './types'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { Store } from '@/domain/models/record'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { ToggleGroup, ToggleBtn } from './ConditionSummary.styles'
import {
  TotalSection,
  TotalGrid,
  TotalCell,
  SmallLabel,
  BigValue,
  AchValue,
  StoreRowWrapper,
  StoreRowGrid,
  StoreName,
  MonoSm,
  MonoMd,
  TableHeaderRow,
  TableHeaderCell,
  SectionLabel,
} from './ConditionSummaryEnhanced.styles'

const DAILY_COLS = '0.6fr 1fr 1fr 1fr'
const STORE_COLS = '1.2fr 1fr 1fr 1fr'

function renderItemsDailyRows(
  rows: readonly ItemsYoYDailyRow[],
  mode: 'cumulative' | 'daily',
): React.ReactNode[] {
  let cumCur = 0
  let cumPrev = 0

  return rows.map((row) => {
    cumCur += row.currentQty
    cumPrev += row.prevQty
    const cur = mode === 'cumulative' ? cumCur : row.currentQty
    const prev = mode === 'cumulative' ? cumPrev : row.prevQty
    const yoy = calculateYoYRatio(cur, prev)

    const yoyColor =
      prev > 0 ? (yoy >= 1.0 ? '#10b981' : yoy >= 0.97 ? '#eab308' : '#ef4444') : undefined

    return (
      <StoreRowWrapper key={row.day}>
        <StoreRowGrid style={{ gridTemplateColumns: DAILY_COLS }}>
          <MonoSm>{row.day}日</MonoSm>
          <MonoSm style={{ textAlign: 'right' }}>{cur.toLocaleString()}点</MonoSm>
          <MonoSm style={{ textAlign: 'right' }}>
            {prev > 0 ? `${prev.toLocaleString()}点` : '—'}
          </MonoSm>
          <MonoMd $bold $color={yoyColor} style={{ textAlign: 'right' }}>
            {prev > 0 ? formatPercent(yoy, 2) : '—'}
          </MonoMd>
        </StoreRowGrid>
      </StoreRowWrapper>
    )
  })
}

export interface ItemsYoYDetailProps {
  readonly sortedStoreEntries: readonly [string, StoreResult][]
  readonly stores: ReadonlyMap<string, Store>
  readonly effectiveConfig: ConditionSummaryConfig
  readonly currentCtsQuantity: CurrentCtsQuantity
  readonly effectiveDay: number
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
}

export function ItemsYoYDetailTable({
  sortedStoreEntries,
  stores,
  effectiveConfig,
  currentCtsQuantity,
  effectiveDay,
  prevYearMonthlyKpi,
}: ItemsYoYDetailProps) {
  const [dailyMode, setDailyMode] = useState<'cumulative' | 'daily'>('cumulative')
  const [dailyStoreId, setDailyStoreId] = useState<string | null>(null)

  const vm = useMemo(
    () =>
      buildItemsYoYDetailVm(
        sortedStoreEntries,
        stores,
        effectiveConfig,
        currentCtsQuantity,
        prevYearMonthlyKpi,
        effectiveDay,
      ),
    [
      sortedStoreEntries,
      stores,
      effectiveConfig,
      currentCtsQuantity,
      prevYearMonthlyKpi,
      effectiveDay,
    ],
  )

  const handleStoreClick = useCallback((storeId: string) => {
    setDailyStoreId(storeId)
  }, [])

  const handleCloseModal = useCallback(() => {
    setDailyStoreId(null)
  }, [])

  const modalDailyRows = useMemo(() => {
    if (!dailyStoreId) return []
    return buildItemsYoYStoreDailyRows(
      currentCtsQuantity,
      prevYearMonthlyKpi,
      effectiveDay,
      dailyStoreId,
    )
  }, [dailyStoreId, currentCtsQuantity, prevYearMonthlyKpi, effectiveDay])

  const modalStoreName = dailyStoreId ? (stores.get(dailyStoreId)?.name ?? dailyStoreId) : ''

  return (
    <>
      <TotalSection>
        <TotalGrid>
          <TotalCell>
            <SmallLabel>当年点数</SmallLabel>
            <BigValue>{vm.totalCurrentStr}</BigValue>
          </TotalCell>
          <TotalCell $align="center">
            <SmallLabel>前年点数</SmallLabel>
            <BigValue>{vm.totalPrevStr}</BigValue>
          </TotalCell>
          <TotalCell $align="right">
            <SmallLabel>前年比</SmallLabel>
            <AchValue $color={vm.totalColor}>{vm.totalYoYStr}</AchValue>
          </TotalCell>
        </TotalGrid>
      </TotalSection>

      {vm.storeRows.length > 1 && (
        <>
          <div style={{ padding: '12px 16px 4px' }}>
            <SectionLabel>店舗内訳</SectionLabel>
          </div>
          <TableHeaderRow style={{ gridTemplateColumns: STORE_COLS }}>
            <TableHeaderCell>店名</TableHeaderCell>
            <TableHeaderCell $align="right">当年点数</TableHeaderCell>
            <TableHeaderCell $align="right">前年点数</TableHeaderCell>
            <TableHeaderCell $align="right">前年比</TableHeaderCell>
          </TableHeaderRow>
          <div>
            {vm.storeRows.map((row) => (
              <StoreRowWrapper
                key={row.storeId}
                $clickable
                onClick={() => handleStoreClick(row.storeId)}
              >
                <StoreRowGrid style={{ gridTemplateColumns: STORE_COLS }}>
                  <StoreName>{row.storeName}</StoreName>
                  <MonoSm style={{ textAlign: 'right' }}>{row.currentQtyStr}</MonoSm>
                  <MonoSm style={{ textAlign: 'right' }}>{row.prevQtyStr}</MonoSm>
                  <MonoMd $bold $color={row.sigColor} style={{ textAlign: 'right' }}>
                    {row.yoyStr}
                  </MonoMd>
                </StoreRowGrid>
              </StoreRowWrapper>
            ))}
          </div>
        </>
      )}

      {vm.hasDailyRows && (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 16px 4px',
            }}
          >
            <SectionLabel>全店 日別推移</SectionLabel>
            <ToggleGroup>
              <ToggleBtn
                $active={dailyMode === 'cumulative'}
                onClick={() => setDailyMode('cumulative')}
              >
                累計
              </ToggleBtn>
              <ToggleBtn $active={dailyMode === 'daily'} onClick={() => setDailyMode('daily')}>
                日別
              </ToggleBtn>
            </ToggleGroup>
          </div>
          <TableHeaderRow style={{ gridTemplateColumns: DAILY_COLS }}>
            <TableHeaderCell>日</TableHeaderCell>
            <TableHeaderCell $align="right">当年</TableHeaderCell>
            <TableHeaderCell $align="right">前年</TableHeaderCell>
            <TableHeaderCell $align="right">前年比</TableHeaderCell>
          </TableHeaderRow>
          <div>{renderItemsDailyRows(vm.dailyRows, dailyMode)}</div>
        </>
      )}

      {dailyStoreId != null && modalDailyRows.length > 0 && (
        <ItemsYoYDailyModal
          storeName={modalStoreName}
          dailyRows={modalDailyRows}
          onClose={handleCloseModal}
        />
      )}
    </>
  )
}
