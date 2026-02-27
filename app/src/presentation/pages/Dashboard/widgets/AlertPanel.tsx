/**
 * アラートパネル
 *
 * 既存の alertSystem.ts を UI に接続し、
 * 閾値超過を自動通知するウィジェット。
 */
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { evaluateAlerts, DEFAULT_ALERT_RULES } from '@/domain/calculations/alertSystem'
import { formatPercent } from '@/domain/calculations/utils'
import type { Alert, AlertSeverity } from '@/domain/calculations/alertSystem'
import type { WidgetContext } from './types'

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

const AlertDetail = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

const DetailItem = styled.span`
  white-space: nowrap;
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

// ─── Alert Value Formatters (threshold/actual/delta) ────

/** アラートルールが比率ベースかどうかを判定 */
function isRateAlert(alert: Alert): boolean {
  return ['gp-rate-target', 'consumable-ratio', 'budget-achievement', 'discount-rate'].includes(alert.ruleId)
}

function formatAlertValue(alert: Alert): string {
  if (isRateAlert(alert)) return formatPercent(alert.value)
  return Math.round(alert.value).toLocaleString('ja-JP')
}

function formatAlertThreshold(alert: Alert): string {
  if (isRateAlert(alert)) return formatPercent(alert.threshold)
  return Math.round(alert.threshold).toLocaleString('ja-JP')
}

function formatAlertDelta(alert: Alert): string {
  const delta = alert.value - alert.threshold
  const sign = delta >= 0 ? '+' : ''
  if (isRateAlert(alert)) return `${sign}${formatPercent(delta, 1).replace('%', 'pt')}`
  return `${sign}${Math.round(delta).toLocaleString('ja-JP')}`
}

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
                <AlertDetail>
                  <DetailItem>実測: {formatAlertValue(alert)}</DetailItem>
                  <DetailItem>閾値: {formatAlertThreshold(alert)}</DetailItem>
                  <DetailItem>乖離: {formatAlertDelta(alert)}</DetailItem>
                </AlertDetail>
              </AlertBody>
            </AlertCard>
          ))}
        </AlertList>
      )}
    </Wrapper>
  )
}
