import { useState, useCallback, useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { formatCurrency } from '@/domain/formatting'
import { aggregateAllStores, indexByStoreDay } from '@/domain/models'
import type {
  PurchaseDayEntry,
  TransferDayEntry,
  SpecialSalesDayEntry,
  CostInclusionRecord,
  StoreDayIndex,
} from '@/domain/models'
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
  prevYearClassifiedSales: '比較期売上（分類別）',
  prevYearClassifiedDiscount: '比較期売変（分類別）',
  interStoreIn: '店間入（売価）',
  interStoreOut: '店間出（売価）',
  flowers: '花（売価）',
  directProduce: '産直（売価）',
  consumables: '消耗品（原価）',
}

export function RawDataTab() {
  const data = useDataStore((s) => s.data)
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

  // flat records → StoreDayIndex に変換（RawDataTab 表示用）
  const purchaseIdx = useMemo(() => indexByStoreDay(data.purchase.records), [data.purchase.records])
  const interStoreInIdx = useMemo(
    () => indexByStoreDay(data.interStoreIn.records),
    [data.interStoreIn.records],
  )
  const interStoreOutIdx = useMemo(
    () => indexByStoreDay(data.interStoreOut.records),
    [data.interStoreOut.records],
  )
  const flowersIdx = useMemo(() => indexByStoreDay(data.flowers.records), [data.flowers.records])
  const directProduceIdx = useMemo(
    () => indexByStoreDay(data.directProduce.records),
    [data.directProduce.records],
  )
  const consumablesIdx = useMemo(
    () => indexByStoreDay(data.consumables.records),
    [data.consumables.records],
  )

  /** StoreDayIndex のソースを dataType に応じて返す */
  const getSource = useCallback((): StoreDayIndex<unknown> => {
    switch (dataType) {
      case 'classifiedSales':
      case 'classifiedDiscount':
        return csAgg as StoreDayIndex<unknown>
      case 'customers':
        return flowersIdx as StoreDayIndex<unknown>
      case 'purchase_price':
      case 'purchase_cost':
        return purchaseIdx as StoreDayIndex<unknown>
      case 'prevYearClassifiedSales':
      case 'prevYearClassifiedDiscount':
        return prevCsAgg as StoreDayIndex<unknown>
      case 'interStoreIn':
        return interStoreInIdx as StoreDayIndex<unknown>
      case 'interStoreOut':
        return interStoreOutIdx as StoreDayIndex<unknown>
      case 'flowers':
        return flowersIdx as StoreDayIndex<unknown>
      case 'directProduce':
        return directProduceIdx as StoreDayIndex<unknown>
      case 'consumables':
        return consumablesIdx as StoreDayIndex<unknown>
      default:
        return {}
    }
  }, [
    dataType,
    csAgg,
    prevCsAgg,
    purchaseIdx,
    interStoreInIdx,
    interStoreOutIdx,
    flowersIdx,
    directProduceIdx,
    consumablesIdx,
  ])

  /** 各セルの数値を取得 */
  const extractValue = useCallback(
    (storeId: string, day: number): number => {
      switch (dataType) {
        case 'classifiedSales':
          return csAgg[storeId]?.[day]?.sales ?? 0
        case 'classifiedDiscount':
          return csAgg[storeId]?.[day]?.discount ?? 0
        case 'customers':
          return (flowersIdx[storeId]?.[day] as SpecialSalesDayEntry | undefined)?.customers ?? 0
        case 'purchase_price':
          return (purchaseIdx[storeId]?.[day] as PurchaseDayEntry | undefined)?.total?.price ?? 0
        case 'purchase_cost':
          return (purchaseIdx[storeId]?.[day] as PurchaseDayEntry | undefined)?.total?.cost ?? 0
        case 'prevYearClassifiedSales':
          return prevCsAgg[storeId]?.[day]?.sales ?? 0
        case 'prevYearClassifiedDiscount':
          return prevCsAgg[storeId]?.[day]?.discount ?? 0
        case 'interStoreIn': {
          const entry = interStoreInIdx[storeId]?.[day] as TransferDayEntry | undefined
          return entry?.interStoreIn?.reduce((s, r) => s + r.price, 0) ?? 0
        }
        case 'interStoreOut': {
          const entry = interStoreOutIdx[storeId]?.[day] as TransferDayEntry | undefined
          return entry?.interStoreOut?.reduce((s, r) => s + r.price, 0) ?? 0
        }
        case 'flowers':
          return (flowersIdx[storeId]?.[day] as SpecialSalesDayEntry | undefined)?.price ?? 0
        case 'directProduce':
          return (directProduceIdx[storeId]?.[day] as SpecialSalesDayEntry | undefined)?.price ?? 0
        case 'consumables':
          return (consumablesIdx[storeId]?.[day] as CostInclusionRecord | undefined)?.cost ?? 0
        default:
          return 0
      }
    },
    [
      dataType,
      csAgg,
      prevCsAgg,
      purchaseIdx,
      interStoreInIdx,
      interStoreOutIdx,
      flowersIdx,
      directProduceIdx,
      consumablesIdx,
    ],
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
