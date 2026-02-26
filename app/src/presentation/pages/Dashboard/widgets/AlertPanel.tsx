/**
 * アラートパネル
 *
 * 既存の alertSystem.ts を UI に接続し、
 * 閾値超過を自動通知するウィジェット。
 */
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { evaluateAlerts, DEFAULT_ALERT_RULES } from '@/domain/calculations/alertSystem'
import type { Alert, AlertSeverity } from '@/domain/calculations/alertSystem'
import type { WidgetContext } from './types'

// ─── Recommended Actions ─────────────────────────────

const ACTION_MAP: Record<string, string> = {
  'gp-rate-target': '売変種別（71-74）の内訳を確認し、見切りタイミングの見直しを検討',
  'daily-sales-prev-year': '前年同日の販促施策を確認し、客数低下の要因を特定',
  'consumable-ratio': '消耗品の使用量をチェックし、発注ルールの見直しを検討',
  'budget-achievement': '日別売上推移を確認し、残日数での着地予測を再計算',
  'discount-rate': '売変種別の構成比を確認し、特に71（見切り）の発生時間帯を特定',
}

function getRecommendedAction(alert: Alert): string {
  return ACTION_MAP[alert.ruleId] ?? '詳細データを確認してください'
}

// ─── Styled Components ──────────────────────────────────

const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

const BadgeCount = styled.span<{ $severity: AlertSeverity }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ $severity }) =>
    $severity === 'critical' ? '#ef4444' :
    $severity === 'warning' ? '#eab308' : '#3b82f6'};
  color: ${({ $severity }) =>
    $severity === 'warning' ? '#000' : '#fff'};
`

const AlertList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  max-height: 400px;
  overflow-y: auto;
`

const AlertCard = styled.div<{ $severity: AlertSeverity }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $severity }) =>
    $severity === 'critical' ? '#ef4444' :
    $severity === 'warning' ? '#eab308' : '#3b82f6'};
  border-radius: ${({ theme }) => theme.radii.md};
`

const SeverityIcon = styled.div<{ $severity: AlertSeverity }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: bold;
  background: ${({ $severity }) =>
    $severity === 'critical' ? '#ef444420' :
    $severity === 'warning' ? '#eab30820' : '#3b82f620'};
  color: ${({ $severity }) =>
    $severity === 'critical' ? '#ef4444' :
    $severity === 'warning' ? '#eab308' : '#3b82f6'};
`

const AlertBody = styled.div`
  flex: 1;
  min-width: 0;
`

const AlertMessage = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.4;
`

const ActionText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding-left: ${({ theme }) => theme.spacing[3]};
  border-left: 2px solid ${({ theme }) => theme.colors.border};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const SEVERITY_ICONS: Record<AlertSeverity, string> = {
  critical: '!',
  warning: '!',
  info: 'i',
}

// ─── Component ──────────────────────────────────────────

export function AlertPanelWidget({ ctx }: { ctx: WidgetContext }) {
  const theme = useTheme()
  const r = ctx.result
  const targetGpRate = ctx.targetRate

  const alerts = useMemo(() => {
    // PrevYearData.daily is Map<number, PrevYearDailyEntry>
    // evaluateAlerts expects Map<number, number> (sales only)
    let prevYearDailySales: ReadonlyMap<number, number> | undefined
    if (ctx.prevYear.hasPrevYear && ctx.prevYear.daily.size > 0) {
      const salesMap = new Map<number, number>()
      for (const [day, entry] of ctx.prevYear.daily) {
        salesMap.set(day, entry.sales)
      }
      prevYearDailySales = salesMap
    }

    return evaluateAlerts(
      ctx.storeKey,
      ctx.storeKey,
      r,
      DEFAULT_ALERT_RULES,
      {
        targetGrossProfitRate: targetGpRate,
        prevYearDailySales,
      },
    )
  }, [r, ctx.storeKey, targetGpRate, ctx.prevYear])

  const criticalCount = alerts.filter(a => a.severity === 'critical').length
  const warningCount = alerts.filter(a => a.severity === 'warning').length

  const topSeverity: AlertSeverity = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'info'

  return (
    <Wrapper>
      <Header>
        <Title>
          アラート
          {alerts.length > 0 && (
            <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.text3, marginLeft: 8 }}>
              {alerts.length}件
            </span>
          )}
        </Title>
        {alerts.length > 0 && (
          <BadgeCount $severity={topSeverity}>
            {criticalCount > 0 ? `重大 ${criticalCount}` : warningCount > 0 ? `注意 ${warningCount}` : `情報 ${alerts.length}`}
          </BadgeCount>
        )}
      </Header>

      {alerts.length === 0 ? (
        <EmptyState>
          全指標が正常範囲内です
        </EmptyState>
      ) : (
        <AlertList>
          {alerts.map((alert, i) => (
            <AlertCard key={`${alert.ruleId}-${alert.day ?? 'all'}-${i}`} $severity={alert.severity}>
              <SeverityIcon $severity={alert.severity}>
                {SEVERITY_ICONS[alert.severity]}
              </SeverityIcon>
              <AlertBody>
                <AlertMessage>{alert.message}</AlertMessage>
                <ActionText>
                  推奨: {getRecommendedAction(alert)}
                </ActionText>
              </AlertBody>
            </AlertCard>
          ))}
        </AlertList>
      )}
    </Wrapper>
  )
}
