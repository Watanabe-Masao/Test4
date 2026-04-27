/**
 * 仕入内訳タブ — DayDetailModal の仕入・コスト内訳タブコンテンツ。
 * 仕入カテゴリ別の原価・売価・構成比を表示。
 *
 * @responsibility R:unclassified
 */
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { calculateShare } from '@/domain/calculations/utils'
import type { DailyRecord } from '@/domain/models/record'
import {
  DetailSection,
  DetailSectionTitle,
  DetailRow,
  DetailLabel,
  DetailValue,
} from '@/presentation/pages/Dashboard/DashboardPage.styles'

interface DayDetailBreakdownTabProps {
  readonly record: DailyRecord | undefined
  readonly actual: number
}

export function DayDetailBreakdownTab({ record, actual }: DayDetailBreakdownTabProps) {
  const { formatWithUnit: fmtCurrencyWithUnit } = useCurrencyFormat()

  return (
    <DetailSection>
      <DetailSectionTitle>仕入・コスト内訳</DetailSectionTitle>
      {record ? (
        (() => {
          const totalCost = record.totalCost
          const costItems: { label: string; cost: number; price: number }[] = [
            {
              label: '仕入（在庫）',
              cost: record.purchase.cost,
              price: record.purchase.price,
            },
            { label: '花', cost: record.flowers.cost, price: record.flowers.price },
            {
              label: '産直',
              cost: record.directProduce.cost,
              price: record.directProduce.price,
            },
            {
              label: '店間入',
              cost: record.interStoreIn.cost,
              price: record.interStoreIn.price,
            },
            {
              label: '店間出',
              cost: record.interStoreOut.cost,
              price: record.interStoreOut.price,
            },
            {
              label: '部門間入',
              cost: record.interDepartmentIn.cost,
              price: record.interDepartmentIn.price,
            },
            {
              label: '部門間出',
              cost: record.interDepartmentOut.cost,
              price: record.interDepartmentOut.price,
            },
          ].filter((item) => item.cost !== 0 || item.price !== 0)
          const totalPrice = costItems.reduce((sum, item) => sum + Math.abs(item.price), 0)

          return (
            <>
              {costItems.map((item) => {
                const ratio = calculateShare(Math.abs(item.price), totalPrice)
                return (
                  <DetailRow key={item.label}>
                    <DetailLabel>{item.label}</DetailLabel>
                    <DetailValue>
                      {fmtCurrencyWithUnit(item.price)}{' '}
                      <span style={{ color: palette.slate, fontSize: '0.75rem' }}>
                        (原 {fmtCurrencyWithUnit(item.cost)})
                      </span>
                      <span
                        style={{
                          color: palette.primary,
                          fontSize: '0.75rem',
                          marginLeft: '4px',
                        }}
                      >
                        ({formatPercent(ratio)})
                      </span>
                    </DetailValue>
                  </DetailRow>
                )
              })}
              <DetailRow>
                <DetailLabel>総仕入原価</DetailLabel>
                <DetailValue>{fmtCurrencyWithUnit(totalCost)}</DetailValue>
              </DetailRow>
              {actual > 0 && totalCost > 0 && (
                <DetailRow>
                  <DetailLabel>原価率</DetailLabel>
                  <DetailValue>{formatPercent(totalCost / actual)}</DetailValue>
                </DetailRow>
              )}
              {record.costInclusion.cost > 0 && (
                <DetailRow>
                  <DetailLabel>原価算入費</DetailLabel>
                  <DetailValue>{fmtCurrencyWithUnit(record.costInclusion.cost)}</DetailValue>
                </DetailRow>
              )}
              {record.discountAmount !== 0 && (
                <>
                  <DetailRow>
                    <DetailLabel>売変額</DetailLabel>
                    <DetailValue $color={sc.negative}>
                      {fmtCurrencyWithUnit(record.discountAmount)}
                    </DetailValue>
                  </DetailRow>
                  {record.grossSales > 0 && (
                    <DetailRow>
                      <DetailLabel>売変率</DetailLabel>
                      <DetailValue $color={sc.negative}>
                        {formatPercent(Math.abs(record.discountAmount) / record.grossSales)}
                      </DetailValue>
                    </DetailRow>
                  )}
                </>
              )}
            </>
          )
        })()
      ) : (
        <DetailRow>
          <DetailLabel>データなし</DetailLabel>
          <DetailValue>-</DetailValue>
        </DetailRow>
      )}
    </DetailSection>
  )
}
