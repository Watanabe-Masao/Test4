/**
 * JSON Renderer — HealthReport を正本 JSON として出力
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import type { HealthReport } from '../types.js'

export function renderJson(report: HealthReport, repoRoot: string): string {
  const outPath = resolve(
    repoRoot,
    'references/04-tracking/generated/architecture-health.json',
  )
  mkdirSync(dirname(outPath), { recursive: true })
  const json = JSON.stringify(report, null, 2) + '\n'
  writeFileSync(outPath, json, 'utf-8')
  return outPath
}
