import { formatCurrency } from '@/domain/formatting'
import { calculateTransactionValue } from '@/domain/calculations/utils'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { DailySalesEntry } from './ChartTabContent'
import {
  DailyHeader,
  DailyRow,
  DailyDay,
  DailyValues,
  DailyCol,
} from './MobileDashboardPage.styles'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

export type DailyTabContentProps = {
  readonly dailySalesData: readonly DailySalesEntry[]
  readonly r: StoreResult
}

export function DailyTabContent({ dailySalesData, r }: DailyTabContentProps) {
  return (
    <>
      <DailyHeader $isWeekend={false}>
        <DailyDay>日</DailyDay>
        <DailyValues>
          <DailyCol>売上</DailyCol>
          <DailyCol>客数</DailyCol>
          <DailyCol>客単価</DailyCol>
        </DailyValues>
      </DailyHeader>
      {dailySalesData.map((entry) => {
        const rec = r.daily.get(entry.day)
        if (!rec && entry.sales === 0) return null
        const customers = rec?.customers ?? 0
        const tv = calculateTransactionValue(entry.sales, customers)
        const isWeekend = entry.dow === 0 || entry.dow === 6
        return (
          <DailyRow key={entry.day} $isWeekend={isWeekend}>
            <DailyDay>
              {entry.day} {DOW_LABELS[entry.dow]}
            </DailyDay>
            <DailyValues>
              <DailyCol>{formatCurrency(entry.sales)}</DailyCol>
              <DailyCol>{customers > 0 ? formatCurrency(customers) : '-'}</DailyCol>
              <DailyCol>{tv > 0 ? formatCurrency(tv) : '-'}</DailyCol>
            </DailyValues>
          </DailyRow>
        )
      })}
    </>
  )
}
