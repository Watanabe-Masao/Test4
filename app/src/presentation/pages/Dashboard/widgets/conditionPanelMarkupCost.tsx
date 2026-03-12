/**
 * 値入率・原価算入費の詳細パネル
 *
 * VM (conditionPanelMarkupCost.vm.ts) で計算済みデータを受け取り、
 * レンダリングのみに専念する。
 */
import { useMemo } from 'react'
import {
  buildMarkupRateDetailVm,
  buildCostInclusionDetailVm,
} from './conditionPanelMarkupCost.vm'
import {
  DetailHeader,
  DetailTitle,
  ToggleGroup,
  ToggleBtn,
  BTable,
  BTh,
  BTd,
  BTr,
  BSignalDot,
  ExpandIcon,
  CategoryDot,
  SubRow,
  BarCell,
  StoreBorderTr,
} from './ConditionSummary.styles'
import type { MarkupDetailProps, CostInclusionDetailProps } from './conditionDetailTypes'

// ─── Markup Rate Detail ─────────────────────────────────

export function MarkupRateDetailTable({
  sortedStoreEntries,
  stores,
  result,
  effectiveConfig,
  displayMode,
  onDisplayModeChange,
  settings,
  expandedMarkupStore,
  onExpandToggle,
}: MarkupDetailProps) {
  const vm = useMemo(
    () => buildMarkupRateDetailVm(sortedStoreEntries, stores, result, effectiveConfig, settings),
    [sortedStoreEntries, stores, result, effectiveConfig, settings],
  )

  return (
    <>
      <DetailHeader>
        <DetailTitle>値入率 — 店舗内訳</DetailTitle>
        <ToggleGroup>
          <ToggleBtn $active={displayMode === 'rate'} onClick={() => onDisplayModeChange('rate')}>
            率
          </ToggleBtn>
          <ToggleBtn
            $active={displayMode === 'amount'}
            onClick={() => onDisplayModeChange('amount')}
          >
            金額
          </ToggleBtn>
        </ToggleGroup>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>平均値入率</BTh>
            <BTh>コア値入率</BTh>
            {displayMode === 'amount' && (
              <>
                <BTh>原価合計</BTh>
                <BTh>売価合計</BTh>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {vm.storeRows.flatMap((row) => {
            const isExpanded = expandedMarkupStore === row.storeId
            const rows: React.ReactNode[] = [
              <BTr
                key={row.storeId}
                onClick={() => onExpandToggle(row.storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={row.sigColor} />
                  {row.storeName}
                </BTd>
                <BTd $color={row.sigColor}>{row.avgMarkupRate}</BTd>
                <BTd>{row.coreMarkupRate}</BTd>
                {displayMode === 'amount' && (
                  <>
                    <BTd>{row.totalCost}</BTd>
                    <BTd>{row.totalPrice}</BTd>
                  </>
                )}
              </BTr>,
            ]

            if (isExpanded) {
              rows.push(
                <SubRow key={`${row.storeId}-header`}>
                  <BTd
                    colSpan={displayMode === 'amount' ? 5 : 3}
                    style={{ padding: '4px 12px', fontSize: '0.7rem', fontWeight: 600 }}
                  >
                    相乗積内訳 （値入率 × 売価構成比 = 相乗積）
                  </BTd>
                </SubRow>,
              )

              for (const cr of row.crossRows) {
                rows.push(
                  <SubRow key={`${row.storeId}-${cr.label}`}>
                    <BTd style={{ paddingLeft: '28px' }}>
                      <CategoryDot $color={cr.color} />
                      {cr.label}
                    </BTd>
                    <BTd>
                      <BarCell
                        $ratio={Math.abs(cr.crossMultiplication) / row.maxCross}
                        $color={cr.color}
                      >
                        {cr.crossMultStr}
                      </BarCell>
                    </BTd>
                    <BTd>
                      {cr.markupRate} × {cr.priceShare}
                    </BTd>
                    {displayMode === 'amount' && (
                      <>
                        <BTd>{cr.cost}</BTd>
                        <BTd>{cr.price}</BTd>
                      </>
                    )}
                  </SubRow>,
                )
              }

              rows.push(
                <SubRow key={`${row.storeId}-total`}>
                  <BTd style={{ paddingLeft: '28px', fontWeight: 700 }}>合計</BTd>
                  <BTd $bold>{row.totalCross}</BTd>
                  <BTd $bold>= 平均値入率</BTd>
                  {displayMode === 'amount' && (
                    <>
                      <BTd />
                      <BTd />
                    </>
                  )}
                </SubRow>,
              )
            }

            return rows
          })}
          {/* Total row */}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{vm.total.avgMarkupRate}</BTd>
            <BTd $bold>{vm.total.coreMarkupRate}</BTd>
            {displayMode === 'amount' && (
              <>
                <BTd $bold>{vm.total.totalCost}</BTd>
                <BTd $bold>{vm.total.totalPrice}</BTd>
              </>
            )}
          </BTr>
        </tbody>
      </BTable>
    </>
  )
}

// ─── Cost Inclusion Detail ──────────────────────────────

export function CostInclusionDetailTable({
  sortedStoreEntries,
  stores,
  result,
  effectiveConfig,
  expandedMarkupStore,
  onExpandToggle,
}: CostInclusionDetailProps) {
  const vm = useMemo(
    () => buildCostInclusionDetailVm(sortedStoreEntries, stores, result, effectiveConfig),
    [sortedStoreEntries, stores, result, effectiveConfig],
  )

  const hasExpanded = expandedMarkupStore != null

  return (
    <>
      <DetailHeader>
        <DetailTitle>原価算入費 — 店舗別 品目内訳</DetailTitle>
      </DetailHeader>
      <BTable>
        <thead>
          <tr>
            <BTh>店舗名</BTh>
            <BTh>原価算入費</BTh>
            <BTh>原価算入率</BTh>
          </tr>
        </thead>
        <tbody>
          {vm.storeRows.flatMap((row, idx) => {
            const isExpanded = expandedMarkupStore === row.storeId
            const rows: React.ReactNode[] = []

            if (hasExpanded && idx > 0) {
              rows.push(
                <StoreBorderTr key={`${row.storeId}-border`}>
                  <td colSpan={3} />
                </StoreBorderTr>,
              )
            }

            rows.push(
              <BTr
                key={row.storeId}
                onClick={() => onExpandToggle(row.storeId)}
                style={{ cursor: 'pointer' }}
              >
                <BTd>
                  <ExpandIcon $expanded={isExpanded}>▶</ExpandIcon>
                  <BSignalDot $color={row.sigColor} />
                  {row.storeName}
                </BTd>
                <BTd>{row.totalCostStr}</BTd>
                <BTd $color={row.sigColor}>{row.rateStr}</BTd>
              </BTr>,
            )

            if (isExpanded) {
              if (!row.hasItems) {
                rows.push(
                  <SubRow key={`${row.storeId}-empty`}>
                    <BTd
                      colSpan={3}
                      style={{ paddingLeft: '28px', fontSize: '0.7rem', color: '#999' }}
                    >
                      品目データなし
                    </BTd>
                  </SubRow>,
                )
              } else {
                rows.push(
                  <SubRow key={`${row.storeId}-header`}>
                    <BTd style={{ paddingLeft: '28px', fontSize: '0.7rem', fontWeight: 600 }}>
                      品目
                    </BTd>
                    <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>金額</BTd>
                    <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>構成比</BTd>
                  </SubRow>,
                )
                for (const item of row.items) {
                  rows.push(
                    <SubRow key={`${row.storeId}-${item.itemName}`}>
                      <BTd style={{ paddingLeft: '28px' }}>{item.itemName}</BTd>
                      <BTd>{item.costStr}</BTd>
                      <BTd>{item.shareStr}</BTd>
                    </SubRow>,
                  )
                }
              }
            }

            return rows
          })}
          {/* Total row */}
          <BTr $highlight>
            <BTd $bold>合計</BTd>
            <BTd $bold>{vm.grandTotalStr}</BTd>
            <BTd $bold>{vm.grandRateStr}</BTd>
          </BTr>
          {/* Grand total item breakdown */}
          {vm.hasTotalItems && (
            <>
              <SubRow>
                <BTd style={{ paddingLeft: '12px', fontSize: '0.7rem', fontWeight: 600 }}>
                  全店 品目内訳
                </BTd>
                <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>金額</BTd>
                <BTd style={{ fontSize: '0.7rem', fontWeight: 600 }}>構成比</BTd>
              </SubRow>
              {vm.totalItems.map((item) => (
                <SubRow key={`total-${item.itemName}`}>
                  <BTd style={{ paddingLeft: '20px' }}>{item.itemName}</BTd>
                  <BTd>{item.costStr}</BTd>
                  <BTd>{item.shareStr}</BTd>
                </SubRow>
              ))}
            </>
          )}
        </tbody>
      </BTable>
    </>
  )
}
