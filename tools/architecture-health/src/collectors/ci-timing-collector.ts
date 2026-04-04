/**
 * CI Timing Collector — ビルド・テスト実行時間の KPI を収集
 *
 * CI では以下のいずれかから時間を取得する:
 *   1. 環境変数: HEALTH_BUILD_SECONDS, HEALTH_GUARDS_SECONDS 等
 *   2. timing.json ファイル（CI job が書き出す）
 *
 * ローカル実行時はスキップ（KPI を生成しない）。
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { HealthKpi } from '../types.js'

interface TimingData {
  readonly buildSeconds?: number
  readonly guardsSeconds?: number
  readonly coverageSeconds?: number
  readonly e2eSeconds?: number
  readonly storybookSeconds?: number
}

function readTimingFromEnv(): TimingData {
  return {
    buildSeconds: parseFloat(process.env.HEALTH_BUILD_SECONDS ?? '') || undefined,
    guardsSeconds: parseFloat(process.env.HEALTH_GUARDS_SECONDS ?? '') || undefined,
    coverageSeconds: parseFloat(process.env.HEALTH_COVERAGE_SECONDS ?? '') || undefined,
    e2eSeconds: parseFloat(process.env.HEALTH_E2E_SECONDS ?? '') || undefined,
    storybookSeconds: parseFloat(process.env.HEALTH_STORYBOOK_SECONDS ?? '') || undefined,
  }
}

function readTimingFromFile(repoRoot: string): TimingData {
  const timingPath = resolve(repoRoot, 'app/timing.json')
  if (!existsSync(timingPath)) return {}
  try {
    return JSON.parse(readFileSync(timingPath, 'utf-8'))
  } catch {
    return {}
  }
}

export function collectFromCiTiming(repoRoot: string): HealthKpi[] {
  const fromEnv = readTimingFromEnv()
  const fromFile = readTimingFromFile(repoRoot)
  const timing: TimingData = { ...fromFile, ...fromEnv }

  const kpis: HealthKpi[] = []

  if (timing.buildSeconds !== undefined) {
    kpis.push({
      id: 'perf.build.app.seconds',
      label: 'アプリビルド時間',
      category: 'build_perf',
      value: Math.round(timing.buildSeconds),
      unit: 'seconds',
      status: 'ok',
      owner: 'architecture',
      docRefs: [{ kind: 'source', path: '.github/workflows/ci.yml', section: 'fast-gate' }],
      implRefs: ['app/vite.config.ts', 'app/tsconfig.app.json'],
    })
  }

  if (timing.guardsSeconds !== undefined) {
    kpis.push({
      id: 'perf.test.guards.seconds',
      label: 'ガードテスト時間',
      category: 'build_perf',
      value: Math.round(timing.guardsSeconds),
      unit: 'seconds',
      status: 'ok',
      owner: 'architecture',
      docRefs: [{ kind: 'source', path: '.github/workflows/ci.yml', section: 'fast-gate' }],
      implRefs: ['app/src/test/guards/'],
    })
  }

  if (timing.coverageSeconds !== undefined) {
    kpis.push({
      id: 'perf.test.coverage.seconds',
      label: 'カバレッジテスト時間',
      category: 'build_perf',
      value: Math.round(timing.coverageSeconds),
      unit: 'seconds',
      status: 'ok',
      owner: 'architecture',
      docRefs: [{ kind: 'source', path: '.github/workflows/ci.yml', section: 'test-coverage' }],
      implRefs: ['app/vitest.config.ts'],
    })
  }

  if (timing.e2eSeconds !== undefined) {
    kpis.push({
      id: 'perf.test.e2e.seconds',
      label: 'E2E テスト時間',
      category: 'build_perf',
      value: Math.round(timing.e2eSeconds),
      unit: 'seconds',
      status: 'ok',
      owner: 'architecture',
      docRefs: [{ kind: 'source', path: '.github/workflows/ci.yml', section: 'e2e' }],
      implRefs: ['app/playwright.config.ts'],
    })
  }

  return kpis
}
