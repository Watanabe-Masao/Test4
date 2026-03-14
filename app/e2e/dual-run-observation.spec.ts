/**
 * E2E Dual-Run Observation Spec
 *
 * DEV サーバーで実行し、実 WASM + 実 TS の dual-run compare を E2E で検証する。
 *
 * 実行方法:
 *   cd app && npx playwright test --config=playwright.observation.config.ts
 *
 * 前提:
 * - DEV サーバー（npm run dev）で __dualRunStats / __runObservation が window に登録
 * - WASM モジュールが初期化済み（main.tsx で全 4 engine を init）
 * - dual-run-compare モードで TS 結果を返しつつ WASM と比較
 */
import { test, expect } from '@playwright/test'
import {
  isDualRunStatsAvailable,
  resetDualRunStats,
  getDualRunSummary,
  getDualRunLog,
} from './utils/dualRunStatsClient'
import { setObservationMode, cleanupObservationMode } from './utils/observationMode'
import { evaluateObservation } from './utils/observationAssertions'
import { EXPECTED_FUNCTIONS } from './utils/observationExpectations'
import { buildJsonReport, buildMarkdownReport } from './utils/observationReport'

import grossProfitNormal from './fixtures/observation/grossProfit-normal.json'
import grossProfitNullZero from './fixtures/observation/grossProfit-null-zero-missing.json'
import budgetAnalysisNormal from './fixtures/observation/budgetAnalysis-normal.json'
import forecastNormal from './fixtures/observation/forecast-normal.json'

/* ── ヘルパー ── */

async function runObservation(
  page: import('@playwright/test').Page,
  engine: string,
  data: unknown,
): Promise<string> {
  return page.evaluate(
    ({ engine: e, data: d }) => {
      const fn = (window as Record<string, unknown>).__runObservation
      if (typeof fn !== 'function') {
        throw new Error('__runObservation not available (not DEV build?)')
      }
      return fn({ engine: e, data: d }) as string
    },
    { engine, data },
  )
}

/* ── インフラ検証 ── */

test.describe('Observation infrastructure', () => {
  test('__dualRunStats is available on DEV server', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const available = await isDualRunStatsAvailable(page)
    expect(available).toBe(true)
  })

  test('__runObservation is available on DEV server', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const available = await page.evaluate(
      () => typeof (window as Record<string, unknown>).__runObservation === 'function',
    )
    expect(available).toBe(true)
  })

  test('reset → summary returns clean state', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await resetDualRunStats(page)
    const summary = await getDualRunSummary(page)
    expect(summary.totalCalls).toBe(0)
    expect(summary.totalMismatches).toBe(0)
    expect(summary.verdict).toBe('clean')
  })

  test('mode switching works', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await setObservationMode(page, 'dual-run-compare')

    const mode = await page.evaluate(() => {
      return localStorage.getItem('factorDecomposition.executionMode')
    })
    expect(mode).toBe('dual-run-compare')

    await cleanupObservationMode(page)
  })
})

/* ── grossProfit observation ── */

test.describe('grossProfit observation', () => {
  test.afterEach(async ({ page }) => {
    await cleanupObservationMode(page)
  })

  test('normal fixture: all 8 functions execute', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await setObservationMode(page, 'dual-run-compare')
    await resetDualRunStats(page)

    const result = await runObservation(page, 'grossProfit', grossProfitNormal)
    expect(result).toContain('8 functions executed')

    const summary = await getDualRunSummary(page)
    const log = await getDualRunLog(page)

    // All 8 functions should have been called
    for (const fn of EXPECTED_FUNCTIONS.grossProfit.all) {
      expect(summary.byFunction[fn]?.calls).toBeGreaterThanOrEqual(1)
    }

    const evaluation = evaluateObservation(summary, log, EXPECTED_FUNCTIONS.grossProfit.all)
    // WASM may or may not be initialized; if not, calls go to ts-only (no compare)
    // If WASM is loaded, compare runs and we check for clean/tolerance-only
    if (summary.totalCalls > 0 && summary.totalMismatches > 0) {
      expect(evaluation.status).not.toBe('fail')
    }
  })

  test('null-zero-missing fixture: safe execution', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await setObservationMode(page, 'dual-run-compare')
    await resetDualRunStats(page)

    const result = await runObservation(page, 'grossProfit', grossProfitNullZero)
    expect(result).toContain('8 functions executed')

    const summary = await getDualRunSummary(page)
    expect(summary.totalCalls).toBeGreaterThanOrEqual(8)
  })
})

/* ── budgetAnalysis observation ── */

test.describe('budgetAnalysis observation', () => {
  test.afterEach(async ({ page }) => {
    await cleanupObservationMode(page)
  })

  test('normal fixture: 2 functions execute', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await setObservationMode(page, 'dual-run-compare')
    await resetDualRunStats(page)

    const result = await runObservation(page, 'budgetAnalysis', budgetAnalysisNormal)
    expect(result).toContain('2 functions executed')

    const summary = await getDualRunSummary(page)
    for (const fn of EXPECTED_FUNCTIONS.budgetAnalysis.all) {
      expect(summary.byFunction[fn]?.calls).toBeGreaterThanOrEqual(1)
    }

    const log = await getDualRunLog(page)
    const evaluation = evaluateObservation(summary, log, EXPECTED_FUNCTIONS.budgetAnalysis.all)
    if (summary.totalMismatches > 0) {
      expect(evaluation.status).not.toBe('fail')
    }
  })
})

/* ── forecast observation ── */

test.describe('forecast observation', () => {
  test.afterEach(async ({ page }) => {
    await cleanupObservationMode(page)
  })

  test('normal fixture: 5 functions execute', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await setObservationMode(page, 'dual-run-compare')
    await resetDualRunStats(page)

    const result = await runObservation(page, 'forecast', forecastNormal)
    expect(result).toContain('5 functions executed')

    const summary = await getDualRunSummary(page)
    for (const fn of EXPECTED_FUNCTIONS.forecast.all) {
      expect(summary.byFunction[fn]?.calls).toBeGreaterThanOrEqual(1)
    }

    const log = await getDualRunLog(page)
    const evaluation = evaluateObservation(summary, log, EXPECTED_FUNCTIONS.forecast.all)
    if (summary.totalMismatches > 0) {
      expect(evaluation.status).not.toBe('fail')
    }
  })
})

/* ── 全 engine 横断: レポート生成 ── */

test.describe('Cross-engine observation report', () => {
  test.afterEach(async ({ page }) => {
    await cleanupObservationMode(page)
  })

  test('generates JSON and Markdown reports for all 3 engines', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await setObservationMode(page, 'dual-run-compare')

    const reports = []

    // grossProfit
    await resetDualRunStats(page)
    await runObservation(page, 'grossProfit', grossProfitNormal)
    const gpSummary = await getDualRunSummary(page)
    const gpLog = await getDualRunLog(page)
    const gpEval = evaluateObservation(gpSummary, gpLog, EXPECTED_FUNCTIONS.grossProfit.all)
    reports.push(
      buildJsonReport(
        'grossProfit',
        'all',
        'normal',
        'dual-run-compare',
        gpSummary,
        gpLog,
        gpEval,
        EXPECTED_FUNCTIONS.grossProfit.all,
      ),
    )

    // budgetAnalysis
    await resetDualRunStats(page)
    await runObservation(page, 'budgetAnalysis', budgetAnalysisNormal)
    const baSummary = await getDualRunSummary(page)
    const baLog = await getDualRunLog(page)
    const baEval = evaluateObservation(baSummary, baLog, EXPECTED_FUNCTIONS.budgetAnalysis.all)
    reports.push(
      buildJsonReport(
        'budgetAnalysis',
        'all',
        'normal',
        'dual-run-compare',
        baSummary,
        baLog,
        baEval,
        EXPECTED_FUNCTIONS.budgetAnalysis.all,
      ),
    )

    // forecast
    await resetDualRunStats(page)
    await runObservation(page, 'forecast', forecastNormal)
    const fcSummary = await getDualRunSummary(page)
    const fcLog = await getDualRunLog(page)
    const fcEval = evaluateObservation(fcSummary, fcLog, EXPECTED_FUNCTIONS.forecast.all)
    reports.push(
      buildJsonReport(
        'forecast',
        'all',
        'normal',
        'dual-run-compare',
        fcSummary,
        fcLog,
        fcEval,
        EXPECTED_FUNCTIONS.forecast.all,
      ),
    )

    // JSON reports have correct shape
    for (const report of reports) {
      expect(report.engine).toBeDefined()
      expect(report.status).toBeDefined()
      expect(report.callCounts).toBeDefined()
      expect(report.mismatchCounts).toBeDefined()
    }

    // Markdown report can be generated
    const markdown = buildMarkdownReport(reports)
    expect(markdown).toContain('# E2E Observation Report')
    expect(markdown).toContain('grossProfit')
    expect(markdown).toContain('budgetAnalysis')
    expect(markdown).toContain('forecast')
  })
})
