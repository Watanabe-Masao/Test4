/**
 * Evaluator — ルールを KPI に適用し status を決定する
 */
import type { HealthKpi, HealthRule, HealthReport, HealthSummary, KpiStatus } from './types.js'
import { HEALTH_RULES } from './config/health-rules.js'
import { DOC_LINKS } from './config/doc-links.js'

function applyRule(value: number, rule: HealthRule): KpiStatus {
  let pass: boolean
  switch (rule.operator) {
    case 'eq':
      pass = value === rule.target
      break
    case 'lte':
      pass = value <= rule.target
      break
    case 'gte':
      pass = value >= rule.target
      break
    case 'lt':
      pass = value < rule.target
      break
    case 'gt':
      pass = value > rule.target
      break
  }

  if (pass) return 'ok'

  switch (rule.type) {
    case 'hard_gate':
      return 'fail'
    case 'soft_gate':
      return 'warn'
    case 'trend_gate':
      return 'warn'
    case 'info':
      return 'ok'
  }
}

function enrichWithDocLinks(kpi: HealthKpi): HealthKpi {
  const links = DOC_LINKS[kpi.id]
  if (!links) return kpi
  return {
    ...kpi,
    docRefs: links.docRefs,
    implRefs: kpi.implRefs.length > 0 ? kpi.implRefs : links.implRefs,
  }
}

export function evaluate(rawKpis: readonly HealthKpi[]): HealthReport {
  const rulesMap = new Map<string, HealthRule>()
  for (const rule of HEALTH_RULES) {
    rulesMap.set(rule.id, rule)
  }

  const evaluatedKpis: HealthKpi[] = rawKpis.map((kpi) => {
    const rule = rulesMap.get(kpi.id)
    const status = rule ? applyRule(kpi.value, rule) : kpi.status
    const budget = rule?.target
    return enrichWithDocLinks({ ...kpi, status, budget })
  })

  const summary: HealthSummary = {
    totalKpis: evaluatedKpis.length,
    ok: evaluatedKpis.filter((k) => k.status === 'ok').length,
    warn: evaluatedKpis.filter((k) => k.status === 'warn').length,
    fail: evaluatedKpis.filter((k) => k.status === 'fail').length,
    hardGatePass: evaluatedKpis
      .filter((k) => {
        const rule = rulesMap.get(k.id)
        return rule?.type === 'hard_gate'
      })
      .every((k) => k.status === 'ok'),
  }

  return {
    schemaVersion: '1.0.0',
    timestamp: new Date().toISOString(),
    kpis: evaluatedKpis,
    summary,
  }
}
