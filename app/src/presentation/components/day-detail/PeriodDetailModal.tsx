/**
 * PeriodDetailModal — 複数日の集計詳細モーダル
 *
 * DrillCalendar の週合計 (W1〜W5) / 曜日平均 / 日平均 セルから起動する、
 * 「期間単位の分析」モーダル。単日用の `DayDetailModal` とは別の文脈を扱う:
 *   - 集計 KPI: 予算合計 / 実績合計 / 前年合計 / 予算達成率 / 前年比 / 差異
 *   - 含まれる日の daily breakdown テーブル
 *   - 実績ゼロの範囲 (未経過) は grayscale + 明示メッセージ
 *
 * 単日 modal との再利用は敢えてしない (単日向け tab = sales/hourly/breakdown は
 * 期間集計には意味が薄いため)。
 *
 * @responsibility R:widget
 */
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { CurrencyUnitToggle } from '@/presentation/components/charts'
import { palette } from '@/presentation/theme/tokens'
import { sc } from '@/presentation/theme/semanticColors'
import { dowOf, type SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import { computePeriodSummary } from '@/features/budget'
import {
  DetailModalContent,
  DetailHeader,
  DetailTitle,
  DetailCloseBtn,
  DetailKpiGrid,
  DetailKpiCard,
  DetailKpiLabel,
  DetailKpiValue,
} from '@/presentation/pages/Dashboard/DashboardPage.styles'
import { PinModalOverlay } from './DayDetailModal.styles'

const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'] as const

export interface PeriodDetailModalProps {
  /** モーダルタイトル (例: "第3週 (13〜19日) の詳細") */
  readonly title: string
  /** 対象日の配列 (1-based, 昇順) */
  readonly days: readonly number[]
  readonly scenario: SimulatorScenario
  readonly currentDay: number
  readonly onClose: () => void
}

export function PeriodDetailModal({
  title,
  days,
  scenario,
  currentDay,
  onClose,
}: PeriodDetailModalProps) {
  const { formatWithUnit: fmt } = useCurrencyFormat()
  const { year, month, dailyBudget, lyDaily, actualDaily } = scenario

  const summary = computePeriodSummary(days, scenario, currentDay)
  const {
    budgetSum,
    lySum,
    actualSum,
    elapsedDays,
    actualMinusBudget: diff,
    achievementRate: ach,
    yoyRatio: yoy,
    budgetYoyRatio: budgetYoY,
    hasActual,
  } = summary

  return (
    <PinModalOverlay onClick={onClose}>
      <DetailModalContent onClick={(e) => e.stopPropagation()}>
        <DetailHeader>
          <DetailTitle>{title}</DetailTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CurrencyUnitToggle />
            <DetailCloseBtn onClick={onClose}>✕</DetailCloseBtn>
          </div>
        </DetailHeader>

        {/* ── Row 1: plan-oriented (予算/前年/予算前年比) ── */}
        <DetailKpiGrid>
          <DetailKpiCard $accent={palette.primary}>
            <DetailKpiLabel>予算合計 ({days.length}日)</DetailKpiLabel>
            <DetailKpiValue>{fmt(budgetSum)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={palette.slate}>
            <DetailKpiLabel>前年合計</DetailKpiLabel>
            <DetailKpiValue>{fmt(lySum)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={palette.slate}>
            <DetailKpiLabel>予算前年比</DetailKpiLabel>
            <DetailKpiValue>{budgetYoY != null ? formatPercent(budgetYoY) : '-'}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={palette.slate}>
            <DetailKpiLabel>予算差異 (前年基準)</DetailKpiLabel>
            <DetailKpiValue>{fmt(budgetSum - lySum)}</DetailKpiValue>
          </DetailKpiCard>
        </DetailKpiGrid>

        {/* ── Row 2: actual-oriented (経過分のみ意味がある) ── */}
        <div
          style={{
            marginTop: 8,
            filter: hasActual ? undefined : 'grayscale(1)',
            opacity: hasActual ? 1 : 0.5,
          }}
        >
          <DetailKpiGrid>
            <DetailKpiCard $accent={hasActual ? sc.cond(actualSum >= budgetSum) : palette.slate}>
              <DetailKpiLabel>実績合計 ({elapsedDays}日 経過)</DetailKpiLabel>
              <DetailKpiValue>{hasActual ? fmt(actualSum) : '-'}</DetailKpiValue>
            </DetailKpiCard>
            <DetailKpiCard $accent={hasActual ? sc.cond(diff >= 0) : palette.slate}>
              <DetailKpiLabel>予算差異</DetailKpiLabel>
              <DetailKpiValue $color={hasActual ? sc.cond(diff >= 0) : undefined}>
                {hasActual ? fmt(diff) : '-'}
              </DetailKpiValue>
            </DetailKpiCard>
            <DetailKpiCard $accent={hasActual && ach != null ? sc.achievement(ach) : palette.slate}>
              <DetailKpiLabel>予算達成率</DetailKpiLabel>
              <DetailKpiValue $color={hasActual && ach != null ? sc.achievement(ach) : undefined}>
                {hasActual && ach != null ? formatPercent(ach) : '-'}
              </DetailKpiValue>
            </DetailKpiCard>
            <DetailKpiCard $accent={hasActual && yoy != null ? sc.cond(yoy >= 1) : palette.slate}>
              <DetailKpiLabel>前年比</DetailKpiLabel>
              <DetailKpiValue $color={hasActual && yoy != null ? sc.cond(yoy >= 1) : undefined}>
                {hasActual && yoy != null ? formatPercent(yoy) : '-'}
              </DetailKpiValue>
            </DetailKpiCard>
          </DetailKpiGrid>
        </div>

        {!hasActual && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              border: '1px dashed rgba(0,0,0,0.14)',
              background: 'rgba(0,0,0,0.03)',
              fontSize: '0.82rem',
              color: 'var(--text2, #64748b)',
              textAlign: 'center',
            }}
            role="status"
          >
            当年の実績がまだありません — 実績・達成率・前年比は分析できません
          </div>
        )}

        {/* ── 日別 breakdown ── */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 6 }}>日別内訳</div>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                fontSize: '0.75rem',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <th style={thStyle}>日</th>
                  <th style={thStyle}>曜日</th>
                  <th style={thNumStyle}>予算</th>
                  <th style={thNumStyle}>前年</th>
                  <th style={thNumStyle}>実績</th>
                  <th style={thNumStyle}>予算比</th>
                  <th style={thNumStyle}>前年比</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => {
                  const b = dailyBudget[d - 1] ?? 0
                  const ly = lyDaily[d - 1] ?? 0
                  const a = d <= currentDay ? (actualDaily[d - 1] ?? 0) : null
                  const rowAch = a != null && b > 0 ? a / b : null
                  const rowYoy = a != null && ly > 0 ? a / ly : null
                  return (
                    <tr key={d} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <td style={tdStyle}>{d}</td>
                      <td style={tdStyle}>{DOW_JP[dowOf(year, month, d)]}</td>
                      <td style={tdNumStyle}>{fmt(b)}</td>
                      <td style={tdNumStyle}>{fmt(ly)}</td>
                      <td style={tdNumStyle}>{a != null ? fmt(a) : '-'}</td>
                      <td
                        style={{
                          ...tdNumStyle,
                          color: rowAch != null ? sc.achievement(rowAch) : undefined,
                        }}
                      >
                        {rowAch != null ? formatPercent(rowAch) : '-'}
                      </td>
                      <td
                        style={{
                          ...tdNumStyle,
                          color: rowYoy != null ? sc.cond(rowYoy >= 1) : undefined,
                        }}
                      >
                        {rowYoy != null ? formatPercent(rowYoy) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DetailModalContent>
    </PinModalOverlay>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  fontWeight: 600,
  whiteSpace: 'nowrap',
}
const thNumStyle: React.CSSProperties = {
  ...thStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}
const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  whiteSpace: 'nowrap',
}
const tdNumStyle: React.CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}
