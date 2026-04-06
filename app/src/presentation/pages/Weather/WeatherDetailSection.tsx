/**
 * WeatherDetailSection — 日別詳細セクション（テーブル/カレンダー切替 + 曜日フィルタ）
 *
 * WeatherPage の行数制限（R12: 600行）対応のため分離。
 */
import { memo, useState } from 'react'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { renderDetailRow } from './WeatherDetailRow'
import { WeatherCalendarView } from './WeatherCalendarView'
import { SectionLabel, NavBtn, TableWrapper, DetailTable } from './WeatherPage.styles'

interface Props {
  readonly daily: readonly DailyWeatherSummary[]
  readonly prevYearDaily: readonly DailyWeatherSummary[]
  readonly year: number
  readonly month: number
  readonly selectedDays: ReadonlySet<string>
  readonly onDayClick: (dateKey: string) => void
}

export const WeatherDetailSection = memo(function WeatherDetailSection({
  daily,
  prevYearDaily,
  year,
  month,
  selectedDays,
  onDayClick,
}: Props) {
  const [detailView, setDetailView] = useState<'table' | 'calendar'>('table')

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <SectionLabel style={{ marginBottom: 0 }}>📋 日別詳細データ</SectionLabel>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {(['table', 'calendar'] as const).map((v) => (
            <NavBtn
              key={v}
              onClick={() => setDetailView(v)}
              style={{
                padding: '3px 10px',
                fontSize: '0.7rem',
                fontWeight: detailView === v ? 700 : 400,
                background: detailView === v ? '#3b82f6' : undefined,
                color: detailView === v ? '#fff' : undefined,
                borderColor: detailView === v ? 'transparent' : undefined,
              }}
            >
              {v === 'table' ? '表' : 'カレンダー'}
            </NavBtn>
          ))}
        </div>
      </div>
      {detailView === 'calendar' ? (
        <WeatherCalendarView
          daily={daily}
          prevYearDaily={prevYearDaily}
          year={year}
          month={month}
          selectedDays={selectedDays}
          onDayClick={onDayClick}
        />
      ) : (
        <TableWrapper>
          <DetailTable>
            <thead>
              <tr>
                <th>日付</th>
                <th>天気</th>
                <th>平均</th>
                <th>最高</th>
                <th>最低</th>
                <th>降水量</th>
                <th>湿度</th>
                <th>日照</th>
                <th style={{ textAlign: 'left' }}>概況</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((d) => {
                const dayNum = Number(d.dateKey.split('-')[2])
                const prev = prevYearDaily.find((p) => Number(p.dateKey.split('-')[2]) === dayNum)
                return renderDetailRow(d, prev ?? null, year, month, onDayClick, selectedDays)
              })}
            </tbody>
          </DetailTable>
        </TableWrapper>
      )}
    </>
  )
})
