import { useState, useCallback, useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import type {
  PurchaseDayEntry,
  TransferDayEntry,
  SpecialSalesDayEntry,
  CostInclusionRecord,
  StoreDayIndex,
} from '@/domain/models/record'
import { Section, SectionTitle, HelpText, EmptyState } from './AdminShared'
import {
  RawTableWrapper,
  RawTable,
  RawTh,
  RawTd,
  DataTypeSelect,
  DataChip,
  TotalRow,
} from './RawDataTab.styles'
import { buildAllIndices, type RawDataIndices } from './RawDataTabBuilders'

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
  | 'categoryTimeSales'

const RAW_DATA_LABELS: Record<RawDataType, string> = {
  classifiedSales: '売上（分類別）',
  classifiedDiscount: '売変（分類別）',
  customers: '客数',
  purchase_price: '仕入（売価）',
  purchase_cost: '仕入（原価）',
  prevYearClassifiedSales: '比較期売上（分類別）',
  prevYearClassifiedDiscount: '比較期売変（分類別）',
  interStoreIn: '店間入（売価）',
  interStoreOut: '店間出（売価）',
  flowers: '花（売価）',
  directProduce: '産直（売価）',
  consumables: '消耗品（原価）',
  categoryTimeSales: '時間帯売上（CTS）',
}

export function RawDataTab() {
  const { format: fmtCurrency } = useCurrencyFormat()
  const current = useDataStore((s) => s.currentMonthData)
  const prevYear = useDataStore((s) => s.appData.prevYear)
  const [dataType, setDataType] = useState<RawDataType>('classifiedSales')

  const stores = useMemo(
    () =>
      current
        ? Array.from(current.stores.values()).sort((a, b) => a.code.localeCompare(b.code))
        : [],
    [current],
  )

  // 全 index を一括構築（9 useMemo → 1 useMemo に集約）
  const indices: RawDataIndices = useMemo(
    () => buildAllIndices(current, prevYear),
    [current, prevYear],
  )

  /** StoreDayIndex のソースを dataType に応じて返す */
  const getSource = useCallback((): StoreDayIndex<unknown> => {
    switch (dataType) {
      case 'classifiedSales':
      case 'classifiedDiscount':
        return indices.csAgg as StoreDayIndex<unknown>
      case 'customers':
        return indices.flowersIdx as StoreDayIndex<unknown>
      case 'purchase_price':
      case 'purchase_cost':
        return indices.purchaseIdx as StoreDayIndex<unknown>
      case 'prevYearClassifiedSales':
      case 'prevYearClassifiedDiscount':
        return indices.prevCsAgg as StoreDayIndex<unknown>
      case 'interStoreIn':
        return indices.interStoreInIdx as StoreDayIndex<unknown>
      case 'interStoreOut':
        return indices.interStoreOutIdx as StoreDayIndex<unknown>
      case 'flowers':
        return indices.flowersIdx as StoreDayIndex<unknown>
      case 'directProduce':
        return indices.directProduceIdx as StoreDayIndex<unknown>
      case 'consumables':
        return indices.consumablesIdx as StoreDayIndex<unknown>
      case 'categoryTimeSales':
        return indices.ctsIdx as StoreDayIndex<unknown>
      default:
        return {}
    }
  }, [dataType, indices])

  /** 各セルの数値を取得 */
  const extractValue = useCallback(
    (storeId: string, day: number): number => {
      switch (dataType) {
        case 'classifiedSales':
          return indices.csAgg[storeId]?.[day]?.sales ?? 0
        case 'classifiedDiscount':
          return indices.csAgg[storeId]?.[day]?.discount ?? 0
        case 'customers':
          return (
            (indices.flowersIdx[storeId]?.[day] as SpecialSalesDayEntry | undefined)?.customers ?? 0
          )
        case 'purchase_price':
          return (
            (indices.purchaseIdx[storeId]?.[day] as PurchaseDayEntry | undefined)?.total?.price ?? 0
          )
        case 'purchase_cost':
          return (
            (indices.purchaseIdx[storeId]?.[day] as PurchaseDayEntry | undefined)?.total?.cost ?? 0
          )
        case 'prevYearClassifiedSales':
          return indices.prevCsAgg[storeId]?.[day]?.sales ?? 0
        case 'prevYearClassifiedDiscount':
          return indices.prevCsAgg[storeId]?.[day]?.discount ?? 0
        case 'interStoreIn': {
          const entry = indices.interStoreInIdx[storeId]?.[day] as TransferDayEntry | undefined
          return entry?.interStoreIn?.reduce((s, r) => s + r.price, 0) ?? 0
        }
        case 'interStoreOut': {
          const entry = indices.interStoreOutIdx[storeId]?.[day] as TransferDayEntry | undefined
          return entry?.interStoreOut?.reduce((s, r) => s + r.price, 0) ?? 0
        }
        case 'flowers':
          return (
            (indices.flowersIdx[storeId]?.[day] as SpecialSalesDayEntry | undefined)?.price ?? 0
          )
        case 'directProduce':
          return (
            (indices.directProduceIdx[storeId]?.[day] as SpecialSalesDayEntry | undefined)?.price ??
            0
          )
        case 'consumables':
          return (
            (indices.consumablesIdx[storeId]?.[day] as CostInclusionRecord | undefined)?.cost ?? 0
          )
        case 'categoryTimeSales':
          return (indices.ctsIdx[storeId]?.[day] as { amount: number } | undefined)?.amount ?? 0
        default:
          return 0
      }
    },
    [dataType, indices],
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
    return fmtCurrency(v)
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
