/**
 * ActualDayProofTable — 実日法の証明テーブル
 *
 * 同日マッピングと同曜日マッピングの境界シフト（加わった日・失われた日）を
 * テーブル形式で明示的に表示する。
 *
 * @responsibility R:unclassified
 */
import { useTheme } from 'styled-components'
import type { ActualDayImpact } from '@/domain/models/ComparisonContext'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import {
  SummarySub,
  SectionTitle,
  ShiftedDayTable,
  ShiftedDayNumTd,
  ShiftedDaySummary,
  ShiftedDayLabel,
} from './PrevYearBudgetDetailPanel.styles'

interface ActualDayProofTableProps {
  readonly type: 'sameDow' | 'sameDate'
  readonly actualDayImpact: ActualDayImpact
}

export function ActualDayProofTable({ type, actualDayImpact }: ActualDayProofTableProps) {
  const theme = useTheme()
  const { format: fmtCurrency } = useCurrencyFormat()
  const { shiftedIn, shiftedOut, estimatedImpact, customerImpact } = actualDayImpact

  return (
    <>
      <SectionTitle>
        {type === 'sameDow'
          ? '同曜日マッピングの境界日（同日比較との差異）'
          : '実日法の証明（マッピング境界日の実データ）'}
      </SectionTitle>

      {shiftedIn.length > 0 && (
        <>
          <SummarySub style={{ marginBottom: 4 }}>
            同曜日マッピングで加わった日（同日にはない前年日）
          </SummarySub>
          <ShiftedDayTable>
            <thead>
              <tr>
                <th>日付</th>
                <th>曜日</th>
                <th style={{ textAlign: 'right' }}>前年売上</th>
                <th style={{ textAlign: 'right' }}>前年客数</th>
              </tr>
            </thead>
            <tbody>
              {shiftedIn.map((d) => (
                <tr key={`in-${d.prevYear}-${d.prevMonth}-${d.prevDay}`}>
                  <td>
                    {d.prevYear}/{d.prevMonth}/{d.prevDay}
                  </td>
                  <td>{d.label}</td>
                  <ShiftedDayNumTd>+{fmtCurrency(d.prevSales)}</ShiftedDayNumTd>
                  <ShiftedDayNumTd>+{d.prevCustomers.toLocaleString('ja-JP')}</ShiftedDayNumTd>
                </tr>
              ))}
            </tbody>
          </ShiftedDayTable>
        </>
      )}

      {shiftedOut.length > 0 && (
        <>
          <SummarySub style={{ marginBottom: 4 }}>
            同曜日マッピングで失われた日（同日にはあるが同曜日にない前年日）
          </SummarySub>
          <ShiftedDayTable>
            <thead>
              <tr>
                <th>日付</th>
                <th>曜日</th>
                <th style={{ textAlign: 'right' }}>前年売上</th>
                <th style={{ textAlign: 'right' }}>前年客数</th>
              </tr>
            </thead>
            <tbody>
              {shiftedOut.map((d) => (
                <tr key={`out-${d.prevYear}-${d.prevMonth}-${d.prevDay}`}>
                  <td>
                    {d.prevYear}/{d.prevMonth}/{d.prevDay}
                  </td>
                  <td>{d.label}</td>
                  <ShiftedDayNumTd>-{fmtCurrency(d.prevSales)}</ShiftedDayNumTd>
                  <ShiftedDayNumTd>-{d.prevCustomers.toLocaleString('ja-JP')}</ShiftedDayNumTd>
                </tr>
              ))}
            </tbody>
          </ShiftedDayTable>
        </>
      )}

      <ShiftedDaySummary>
        <span>
          <ShiftedDayLabel>売上影響:</ShiftedDayLabel>
          <span
            style={{
              color:
                estimatedImpact >= 0 ? theme.colors.palette.success : theme.colors.palette.danger,
            }}
          >
            {estimatedImpact >= 0 ? '+' : ''}
            {fmtCurrency(estimatedImpact)}
          </span>
        </span>
        <span>
          <ShiftedDayLabel>客数影響:</ShiftedDayLabel>
          <span
            style={{
              color:
                customerImpact >= 0 ? theme.colors.palette.success : theme.colors.palette.danger,
            }}
          >
            {customerImpact >= 0 ? '+' : ''}
            {customerImpact.toLocaleString('ja-JP')}人
          </span>
        </span>
        <span style={{ fontSize: theme.typography.fontSize.micro, color: theme.colors.text4 }}>
          = Σ(加わった日) - Σ(失われた日)
        </span>
      </ShiftedDaySummary>
    </>
  )
}
