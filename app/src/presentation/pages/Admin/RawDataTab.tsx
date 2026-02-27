import { useState, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { useAppData } from '@/application/context'
import { formatCurrency } from '@/domain/calculations/utils'
import { aggregateAllStores } from '@/domain/models'
import { Section, SectionTitle, HelpText, EmptyState } from './AdminShared'

// ─── Styled Components ─────────────────────────────────────

const RawTableWrapper = styled.div`
  overflow-x: auto;
  max-height: 70vh;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

const RawTable = styled.table`
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const RawTh = styled.th<{ $sticky?: boolean }>`
  position: sticky;
  top: 0;
  z-index: ${({ $sticky }) => ($sticky ? 6 : 5)};
  ${({ $sticky }) => $sticky && 'left: 0;'}
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-align: right;
  white-space: nowrap;
`

const RawTd = styled.td<{ $sticky?: boolean; $zero?: boolean }>`
  ${({ $sticky }) => $sticky && 'position: sticky; left: 0; z-index: 3;'}
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $sticky, theme }) => ($sticky ? theme.colors.bg3 : 'transparent')};
  text-align: ${({ $sticky }) => ($sticky ? 'center' : 'right')};
  color: ${({ $zero, theme }) => ($zero ? theme.colors.text4 : theme.colors.text)};
  white-space: nowrap;
`

const DataTypeSelect = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const DataChip = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.pill};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const TotalRow = styled.tr`
  font-weight: 700;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
`

type RawDataType =
  | 'classifiedSales'
  | 'classifiedDiscount'
  | 'customers'
  | 'purchase_price'
  | 'purchase_cost'
  | 'prevYearClassifiedSales'
  | 'prevYearClassifiedDiscount'
  | 'interStoreIn'
  | 'interStoreOut'
  | 'flowers'
  | 'directProduce'
  | 'consumables'

const RAW_DATA_LABELS: Record<RawDataType, string> = {
  classifiedSales: '売上（分類別）',
  classifiedDiscount: '売変（分類別）',
  customers: '客数',
  purchase_price: '仕入（売価）',
  purchase_cost: '仕入（原価）',
  prevYearClassifiedSales: '前年売上（分類別）',
  prevYearClassifiedDiscount: '前年売変（分類別）',
  interStoreIn: '店間入（売価）',
  interStoreOut: '店間出（売価）',
  flowers: '花（売価）',
  directProduce: '産直（売価）',
  consumables: '消耗品（原価）',
}

export function RawDataTab() {
  const { data } = useAppData()
  const [dataType, setDataType] = useState<RawDataType>('classifiedSales')

  const stores = useMemo(
    () => Array.from(data.stores.values()).sort((a, b) => a.code.localeCompare(b.code)),
    [data.stores],
  )

  // classifiedSales の集計（store → day → {sales, discount}）
  const csAgg = useMemo(() => aggregateAllStores(data.classifiedSales), [data.classifiedSales])
  const prevCsAgg = useMemo(
    () => aggregateAllStores(data.prevYearClassifiedSales),
    [data.prevYearClassifiedSales],
  )

  /** StoreDayRecord のソースを dataType に応じて返す */
  const getSource = useCallback((): Record<string, Record<number, unknown>> => {
    switch (dataType) {
      case 'classifiedSales':
      case 'classifiedDiscount':
        return csAgg as Record<string, Record<number, unknown>>
      case 'customers':
        return data.flowers
      case 'purchase_price':
      case 'purchase_cost':
        return data.purchase
      case 'prevYearClassifiedSales':
      case 'prevYearClassifiedDiscount':
        return prevCsAgg as Record<string, Record<number, unknown>>
      case 'interStoreIn':
        return data.interStoreIn
      case 'interStoreOut':
        return data.interStoreOut
      case 'flowers':
        return data.flowers
      case 'directProduce':
        return data.directProduce
      case 'consumables':
        return data.consumables
      default:
        return {}
    }
  }, [data, dataType, csAgg, prevCsAgg])

  /** 各セルの数値を取得 */
  const extractValue = useCallback(
    (storeId: string, day: number): number => {
      switch (dataType) {
        case 'classifiedSales':
          return csAgg[storeId]?.[day]?.sales ?? 0
        case 'classifiedDiscount':
          return csAgg[storeId]?.[day]?.discount ?? 0
        case 'customers':
          return (
            (data.flowers[storeId]?.[day] as { customers?: number } | undefined)?.customers ?? 0
          )
        case 'purchase_price':
          return (
            (data.purchase[storeId]?.[day] as { total?: { price?: number } } | undefined)?.total
              ?.price ?? 0
          )
        case 'purchase_cost':
          return (
            (data.purchase[storeId]?.[day] as { total?: { cost?: number } } | undefined)?.total
              ?.cost ?? 0
          )
        case 'prevYearClassifiedSales':
          return prevCsAgg[storeId]?.[day]?.sales ?? 0
        case 'prevYearClassifiedDiscount':
          return prevCsAgg[storeId]?.[day]?.discount ?? 0
        case 'interStoreIn': {
          const entry = data.interStoreIn[storeId]?.[day] as
            | { interStoreIn?: readonly { price: number }[] }
            | undefined
          return entry?.interStoreIn?.reduce((s, r) => s + r.price, 0) ?? 0
        }
        case 'interStoreOut': {
          const entry = data.interStoreOut[storeId]?.[day] as
            | { interStoreOut?: readonly { price: number }[] }
            | undefined
          return entry?.interStoreOut?.reduce((s, r) => s + r.price, 0) ?? 0
        }
        case 'flowers':
          return (data.flowers[storeId]?.[day] as { price?: number } | undefined)?.price ?? 0
        case 'directProduce':
          return (data.directProduce[storeId]?.[day] as { price?: number } | undefined)?.price ?? 0
        case 'consumables':
          return (data.consumables[storeId]?.[day] as { cost?: number } | undefined)?.cost ?? 0
        default:
          return 0
      }
    },
    [data, dataType, csAgg, prevCsAgg],
  )

  // 対象データの日付範囲を計算
  const { days, tableRows } = useMemo(() => {
    let maxDay = 0
    const sources = getSource()

    for (const storeId of Object.keys(sources)) {
      const storeDays = sources[storeId]
      if (!storeDays) continue
      for (const dayStr of Object.keys(storeDays)) {
        const d = Number(dayStr)
        if (d > maxDay) maxDay = d
      }
    }

    const dayList = Array.from({ length: maxDay }, (_, i) => i + 1)

    const rows = dayList.map((day) => {
      const cells: { storeId: string; value: number }[] = stores.map((store) => ({
        storeId: store.id,
        value: extractValue(store.id, day),
      }))
      return { day, cells }
    })

    return { days: dayList, tableRows: rows }
  }, [stores, getSource, extractValue])

  // 店舗別合計
  const storeTotals = useMemo(() => {
    const totals = new Map<string, number>()
    for (const store of stores) totals.set(store.id, 0)
    for (const row of tableRows) {
      for (const cell of row.cells) {
        totals.set(cell.storeId, (totals.get(cell.storeId) ?? 0) + cell.value)
      }
    }
    return totals
  }, [stores, tableRows])

  const hasData = days.length > 0 && stores.length > 0
  const isIntegerType = dataType === 'customers'

  const fmt = (v: number) => {
    if (v === 0) return '-'
    if (isIntegerType) return v.toLocaleString('ja-JP')
    return formatCurrency(v)
  }

  return (
    <Section>
      <SectionTitle>取込データ一覧（ソースファイル値）</SectionTitle>
      <HelpText>
        インポートしたソースファイルのデータをそのまま日別×店舗のテーブルで確認できます。
      </HelpText>

      <DataTypeSelect>
        {(Object.keys(RAW_DATA_LABELS) as RawDataType[]).map((dt) => (
          <DataChip key={dt} $active={dataType === dt} onClick={() => setDataType(dt)}>
            {RAW_DATA_LABELS[dt]}
          </DataChip>
        ))}
      </DataTypeSelect>

      {!hasData ? (
        <EmptyState>
          {stores.length === 0
            ? 'データをインポートすると表示されます'
            : `${RAW_DATA_LABELS[dataType]}のデータがありません`}
        </EmptyState>
      ) : (
        <RawTableWrapper>
          <RawTable>
            <thead>
              <tr>
                <RawTh $sticky>日</RawTh>
                {stores.map((s) => (
                  <RawTh key={s.id}>{s.name || s.code}</RawTh>
                ))}
                <RawTh>合計</RawTh>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => {
                const rowTotal = row.cells.reduce((sum, c) => sum + c.value, 0)
                return (
                  <tr key={row.day}>
                    <RawTd $sticky>{row.day}</RawTd>
                    {row.cells.map((cell) => (
                      <RawTd key={cell.storeId} $zero={cell.value === 0}>
                        {fmt(cell.value)}
                      </RawTd>
                    ))}
                    <RawTd $zero={rowTotal === 0}>{fmt(rowTotal)}</RawTd>
                  </tr>
                )
              })}
              <TotalRow>
                <RawTd $sticky>合計</RawTd>
                {stores.map((s) => {
                  const total = storeTotals.get(s.id) ?? 0
                  return (
                    <RawTd key={s.id} $zero={total === 0}>
                      {fmt(total)}
                    </RawTd>
                  )
                })}
                <RawTd $zero={false}>
                  {fmt(Array.from(storeTotals.values()).reduce((a, b) => a + b, 0))}
                </RawTd>
              </TotalRow>
            </tbody>
          </RawTable>
        </RawTableWrapper>
      )}
    </Section>
  )
}
