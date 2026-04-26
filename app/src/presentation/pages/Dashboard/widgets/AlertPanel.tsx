/**
 * アラートパネル
 *
 * 既存の alertSystem.ts を UI に接続し、
 * 閾値超過を自動通知するウィジェット。
 */
import { useCallback, useMemo } from 'react'
import { useTheme } from 'styled-components'
import { evaluateAlerts, DEFAULT_ALERT_RULES } from '@/application/hooks/analytics'
import { getPrevYearDailyValue } from '@/application/comparison/comparisonAccessors'
import type { AlertSeverity } from '@/application/hooks/analytics'
import type { DashboardWidgetContext } from './DashboardWidgetContext'
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
import {
  ALERT_METRIC_MAP,
  SEVERITY_ICONS,
  formatAlertValue,
  formatAlertThreshold,
  formatAlertDelta,
} from './AlertPanel.helpers'

// ─── Component ──────────────────────────────────────────

/** SP-B ADR-B-002: full ctx passthrough を絞り込み props 化 */
export type AlertPanelWidgetProps = Pick<
  DashboardWidgetContext,
  'result' | 'targetRate' | 'prevYear' | 'year' | 'month' | 'storeKey' | 'onExplain' | 'fmtCurrency'
>

export function AlertPanelWidget({
  result: r,
  targetRate: targetGpRate,
  prevYear,
  year,
  month,
  storeKey,
  onExplain,
  fmtCurrency,
}: AlertPanelWidgetProps) {
  const theme = useTheme()

  const alerts = useMemo(() => {
    // PrevYearData.daily は DateKey キー。evaluateAlerts は day number キーを期待
    let prevYearDailySales: ReadonlyMap<number, number> | undefined
    if (prevYear.hasPrevYear && prevYear.daily.size > 0) {
      const salesMap = new Map<number, number>()
      const daysInMonth = new Date(year, month, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        const entry = getPrevYearDailyValue(prevYear, year, month, d)
        if (entry) salesMap.set(d, entry.sales)
      }
      prevYearDailySales = salesMap
    }

    return evaluateAlerts(storeKey, storeKey, r, DEFAULT_ALERT_RULES, {
      targetGrossProfitRate: targetGpRate,
      prevYearDailySales,
    })
  }, [r, storeKey, targetGpRate, prevYear, year, month])

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length
  const warningCount = alerts.filter((a) => a.severity === 'warning').length

  const topSeverity: AlertSeverity =
    criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'info'

  const handleAlertClick = useCallback(
    (ruleId: string) => {
      const metricId = ALERT_METRIC_MAP[ruleId]
      if (metricId) {
        onExplain(metricId)
      }
    },
    [onExplain],
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
                fontSize: theme.typography.fontSize.micro,
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
                    <DetailItem>実測: {formatAlertValue(alert, fmtCurrency)}</DetailItem>
                    <DetailItem>閾値: {formatAlertThreshold(alert, fmtCurrency)}</DetailItem>
                    <DetailItem>乖離: {formatAlertDelta(alert, fmtCurrency)}</DetailItem>
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
