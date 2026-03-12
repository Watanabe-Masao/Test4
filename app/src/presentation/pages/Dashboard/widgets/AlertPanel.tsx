/**
 * アラートパネル
 *
 * 既存の alertSystem.ts を UI に接続し、
 * 閾値超過を自動通知するウィジェット。
 */
import { useCallback, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { evaluateAlerts, DEFAULT_ALERT_RULES } from '@/application/hooks/analytics'
import { formatPercent, formatCurrency } from '@/domain/formatting'
import type { Alert, AlertSeverity } from '@/application/hooks/analytics'
import type { MetricId } from '@/domain/models'
import type { WidgetContext } from './types'
import {
  Wrapper,
  Header,
  Title,
  BadgeCount,
  AlertList,
  AlertCard,
  SeverityIcon,
  AlertBody,
  AlertMessage,
  AlertDetail,
  DetailItem,
  AlertFooter,
  ExplainLink,
  EmptyState,
} from './AlertPanel.styles'

// ─── Alert → MetricId Mapping ───────────────────────────

const ALERT_METRIC_MAP: Record<string, MetricId> = {
  'gp-rate-target': 'invMethodGrossProfitRate',
  'daily-sales-prev-year': 'salesTotal',
  'cost-inclusion-ratio': 'totalCostInclusion',
  'budget-achievement': 'budgetAchievementRate',
  'discount-rate': 'discountRate',
}

// ─── Alert Value Formatters (threshold/actual/delta) ────

/** アラートルールが比率ベースかどうかを判定 */
function isRateAlert(alert: Alert): boolean {
  return ['gp-rate-target', 'cost-inclusion-ratio', 'budget-achievement', 'discount-rate'].includes(
    alert.ruleId,
  )
}

function formatAlertValue(alert: Alert): string {
  if (isRateAlert(alert)) return formatPercent(alert.value)
  return formatCurrency(alert.value)
}

function formatAlertThreshold(alert: Alert): string {
  if (isRateAlert(alert)) return formatPercent(alert.threshold)
  return formatCurrency(alert.threshold)
}

function formatAlertDelta(alert: Alert): string {
  const delta = alert.value - alert.threshold
  const sign = delta >= 0 ? '+' : ''
  if (isRateAlert(alert)) return `${sign}${formatPercent(delta).replace('%', 'pt')}`
  return `${sign}${formatCurrency(delta)}`
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

    return evaluateAlerts(ctx.storeKey, ctx.storeKey, r, DEFAULT_ALERT_RULES, {
      targetGrossProfitRate: targetGpRate,
      prevYearDailySales,
    })
  }, [r, ctx.storeKey, targetGpRate, ctx.prevYear])

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  const topSeverity: AlertSeverity =
    criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'info'

  const handleAlertClick = useCallback(
    (ruleId: string) => {
      const metricId = ALERT_METRIC_MAP[ruleId]
      if (metricId) {
        ctx.onExplain(metricId)
      }
    },
    [ctx],
  )

  const handleAlertKeyDown = useCallback(
    (e: React.KeyboardEvent, ruleId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleAlertClick(ruleId)
      }
    },
    [handleAlertClick],
  )

  return (
    <Wrapper>
      <Header>
        <Title>
          アラート
          {alerts.length > 0 && (
            <span
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.text3,
                marginLeft: 8,
              }}
            >
              {alerts.length}件
            </span>
          )}
        </Title>
        {alerts.length > 0 && (
          <BadgeCount $severity={topSeverity}>
            {criticalCount > 0
              ? `重大 ${criticalCount}`
              : warningCount > 0
                ? `注意 ${warningCount}`
                : `情報 ${alerts.length}`}
          </BadgeCount>
        )}
      </Header>

      {alerts.length === 0 ? (
        <EmptyState>全指標が正常範囲内です</EmptyState>
      ) : (
        <AlertList>
          {alerts.map((alert, i) => {
            const isClickable = alert.ruleId in ALERT_METRIC_MAP
            return (
              <AlertCard
                key={`${alert.ruleId}-${alert.day ?? 'all'}-${i}`}
                $severity={alert.severity}
                $clickable={isClickable}
                onClick={isClickable ? () => handleAlertClick(alert.ruleId) : undefined}
                onKeyDown={isClickable ? (e) => handleAlertKeyDown(e, alert.ruleId) : undefined}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                aria-label={isClickable ? `${alert.message} — 算出根拠を表示` : undefined}
              >
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
                  {isClickable && (
                    <AlertFooter>
                      <ExplainLink>→ 算出根拠</ExplainLink>
                    </AlertFooter>
                  )}
                </AlertBody>
              </AlertCard>
            )
          })}
        </AlertList>
      )}
    </Wrapper>
  )
}
