/**
 * カレンダーセルのホバープレビュー
 *
 * MonthlyCalendar のセルにマウスオーバーした際に表示するポップオーバー。
 * 売上・予算・達成率・客数・客単価・前年比を一覧表示する。
 */
import { memo } from 'react'
import { sc } from '@/presentation/theme/semanticColors'
import { formatPercent } from '@/domain/formatting'
import { calculateTransactionValue } from '@/domain/calculations/utils'
import type { DailyWeatherSummary } from '@/domain/models'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import {
  CalPreview,
  PreviewTitle,
  PreviewRow,
  PreviewLabel,
  PreviewValue,
  PreviewHint,
} from '../DashboardPage.styles'

interface CalendarCellPreviewProps {
  readonly month: number
  readonly day: number
  readonly dayOfWeek: string
  readonly actual: number
  readonly budget: number
  readonly achievement: number
  readonly dayDiff: number
  readonly customers: number
  readonly pySales: number
  readonly hasPrevYear: boolean
  readonly weather: DailyWeatherSummary | undefined
  readonly weatherIcon: string | null
  readonly fmtCurrency: CurrencyFormatter
}

export const CalendarCellPreview = memo(function CalendarCellPreview({
  month,
  day,
  dayOfWeek,
  actual,
  budget,
  achievement,
  dayDiff,
  customers,
  pySales,
  hasPrevYear,
  weather,
  weatherIcon,
  fmtCurrency,
}: CalendarCellPreviewProps) {
  return (
    <CalPreview>
      <PreviewTitle>
        {month}月{day}日（{dayOfWeek}）{weatherIcon && ` ${weatherIcon}`}
        {weather &&
          ` ${Math.round(weather.temperatureMax)}°/${Math.round(weather.temperatureMin)}°`}
      </PreviewTitle>
      <PreviewRow>
        <PreviewLabel>売上</PreviewLabel>
        <PreviewValue>{fmtCurrency(actual)}</PreviewValue>
      </PreviewRow>
      <PreviewRow>
        <PreviewLabel>予算</PreviewLabel>
        <PreviewValue>{fmtCurrency(budget)}</PreviewValue>
      </PreviewRow>
      <PreviewRow $color={sc.cond(dayDiff >= 0)}>
        <PreviewLabel>予算差</PreviewLabel>
        <PreviewValue>
          {dayDiff >= 0 ? '+' : ''}
          {fmtCurrency(dayDiff)}
        </PreviewValue>
      </PreviewRow>
      {budget > 0 && (
        <PreviewRow $color={sc.achievement(achievement)}>
          <PreviewLabel>達成率</PreviewLabel>
          <PreviewValue>{formatPercent(achievement)}</PreviewValue>
        </PreviewRow>
      )}
      {customers > 0 && (
        <>
          <PreviewRow>
            <PreviewLabel>客数</PreviewLabel>
            <PreviewValue>{customers.toLocaleString()}人</PreviewValue>
          </PreviewRow>
          <PreviewRow>
            <PreviewLabel>客単価</PreviewLabel>
            <PreviewValue>{fmtCurrency(calculateTransactionValue(actual, customers))}</PreviewValue>
          </PreviewRow>
        </>
      )}
      {hasPrevYear && pySales > 0 && (
        <PreviewRow $color={sc.cond(actual / pySales >= 1)}>
          <PreviewLabel>前年比</PreviewLabel>
          <PreviewValue>{formatPercent(actual / pySales)}</PreviewValue>
        </PreviewRow>
      )}
      <PreviewHint>クリックで詳細分析</PreviewHint>
    </CalPreview>
  )
})
