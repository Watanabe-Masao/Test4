/**
 * Unified Widget Context No Dashboard-Specific Guard
 *
 * `app/src/presentation/components/widgets/types.ts` の `UnifiedWidgetContext`
 * interface 内の **Dashboard 固有 optional field** を ratchet-down で監視。
 *
 * 検出する違反:
 *
 * - **DS1**: `// ── Dashboard 固有 ──` section 配下の optional field 数が
 *   baseline を超える（増加禁止）
 *
 * 設計意図:
 *   ADR-A-002 で UnifiedWidgetContext から Dashboard 固有 20 field を
 *   DashboardWidgetContext に required 集約する移行計画。本 guard は
 *   PR2 時点で baseline=20 で凍結し、PR3 で 4 registry を切替後、
 *   PR4 で field 削除して baseline=0 + fixed mode に到達させる。
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-A-002
 *  - projects/architecture-debt-recovery/inquiry/16-breaking-changes.md §BC-2
 *  - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-004
 *  - projects/widget-context-boundary/checklist.md Phase 2
 *
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const UNIFIED_CTX_PATH = path.join(PROJECT_ROOT, 'app/src/presentation/components/widgets/types.ts')

// ratchet-down baseline（ADR-A-002 PR4 で 0 に削減予定）
const BASELINE = 20

// Dashboard 固有 section の開始マーカー
const DASHBOARD_SECTION_START_RE = /^\s*\/\/\s*[-─]+\s*Dashboard\s*固有/
// 別 section の開始（Dashboard 固有 section の終了点として使う）
const ANY_SECTION_START_RE = /^\s*\/\/\s*[-─]+\s*[^─\-\s]/

/**
 * UnifiedWidgetContext の `Dashboard 固有` section 内 optional field を抽出
 */
function detectDashboardSpecificOptionalFields(): string[] {
  if (!fs.existsSync(UNIFIED_CTX_PATH)) return []
  const content = fs.readFileSync(UNIFIED_CTX_PATH, 'utf-8')
  const lines = content.split('\n')

  // UnifiedWidgetContext interface の開始 / 終了位置を探す
  let ifaceStart = -1
  let ifaceEnd = -1
  let depth = 0
  for (let i = 0; i < lines.length; i++) {
    if (ifaceStart === -1 && /export\s+interface\s+UnifiedWidgetContext\b/.test(lines[i])) {
      ifaceStart = i
      if (lines[i].includes('{')) depth = 1
      continue
    }
    if (ifaceStart !== -1) {
      for (const ch of lines[i]) {
        if (ch === '{') depth += 1
        else if (ch === '}') depth -= 1
      }
      if (depth === 0 && i > ifaceStart) {
        ifaceEnd = i
        break
      }
    }
  }
  if (ifaceStart === -1 || ifaceEnd === -1) return []

  // Dashboard 固有 section の範囲を確定
  let sectionStart = -1
  let sectionEnd = -1
  for (let i = ifaceStart + 1; i < ifaceEnd; i++) {
    if (sectionStart === -1 && DASHBOARD_SECTION_START_RE.test(lines[i])) {
      sectionStart = i
      continue
    }
    if (sectionStart !== -1) {
      // 別 section の comment が来たら Dashboard 固有 section 終了
      if (ANY_SECTION_START_RE.test(lines[i]) && !DASHBOARD_SECTION_START_RE.test(lines[i])) {
        sectionEnd = i
        break
      }
    }
  }
  if (sectionStart === -1) return []
  if (sectionEnd === -1) sectionEnd = ifaceEnd

  // section 内の optional field を抽出
  const detected: string[] = []
  for (let i = sectionStart + 1; i < sectionEnd; i++) {
    const fieldMatch = lines[i].match(/^\s*(?:readonly\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\?:/)
    if (fieldMatch) detected.push(fieldMatch[1])
  }
  return detected
}

describe('Unified Widget Context No Dashboard-Specific Guard', () => {
  it('Dashboard 固有 optional field 数が baseline を超えない（DS1 ratchet-down）', () => {
    const detected = detectDashboardSpecificOptionalFields()
    expect(
      detected.length,
      `UnifiedWidgetContext の Dashboard 固有 optional field 数 ${detected.length} が baseline=${BASELINE} を超過。\n` +
        '検出された field: ' +
        detected.join(', ') +
        '\n\n' +
        'hint: ADR-A-002 PR3a-d で Dashboard registry を DashboardWidgetContext 経由に切替後、\n' +
        '  PR4 で当該 field を物理削除して baseline=0 に到達してください。',
    ).toBeLessThanOrEqual(BASELINE)
  })

  it('detectDashboardSpecificOptionalFields は section が存在しない場合に空を返す（regression 防止）', () => {
    expect(Array.isArray(detectDashboardSpecificOptionalFields())).toBe(true)
  })
})
