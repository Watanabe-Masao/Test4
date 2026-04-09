#!/usr/bin/env npx tsx
/**
 * AAG Response CLI — pre-commit 等のシェル入口から統一レンダラを呼ぶ薄いラッパー
 *
 * Usage:
 *   npx tsx tools/aag-render-cli.ts <fixNow> <slice> <summary> <reason> [steps...]
 *
 * Example:
 *   npx tsx tools/aag-render-cli.ts now governance-ops "docs が古い" "guard 変更検出" "1. docs:generate" "2. git add"
 */
import { renderAagResponse, type AagResponse, type AagSlice, type FixNow } from './architecture-health/src/aag-response.js'

const [, , fixNow, slice, summary, reason, ...steps] = process.argv

if (!fixNow || !summary || !reason) {
  console.error('Usage: aag-render-cli.ts <fixNow> <slice> <summary> <reason> [steps...]')
  process.exit(1)
}

const resp: AagResponse = {
  source: 'pre-commit',
  fixNow: (fixNow as FixNow) || 'now',
  slice: (slice as AagSlice) || null,
  summary,
  reason,
  steps,
  exceptions: null,
  deepDive: null,
  violations: [],
}

console.log(renderAagResponse(resp))
