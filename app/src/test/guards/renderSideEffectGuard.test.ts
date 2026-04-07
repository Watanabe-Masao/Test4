/**
 * 描画層の副作用禁止ガード
 *
 * presentation/ が localStorage / sessionStorage を直接使用していないことを検証する。
 * 永続化は application/adapters/uiPersistenceAdapter 経由で行う。
 *
 * @guard A3 Presentation 描画専用
 * @guard H4 component に acquisition logic 禁止
 * ルール定義: architectureRules.ts (AR-STRUCT-RENDER-SIDE-EFFECT)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const rule = getRuleById('AR-STRUCT-RENDER-SIDE-EFFECT')!

/** presentation/ 内で localStorage/sessionStorage 直接使用が許可されたファイル */
const ALLOWLIST = new Set([
  // chunk reload retry のループ防止フラグ（sessionStorage）
  'presentation/lazyWithRetry.ts',
  // ダッシュボードプリセット（localStorage）— adapter 移行予定
  'presentation/pages/Dashboard/widgets/layoutPresets.ts',
  // マルチページ widget レイアウト（localStorage）— adapter 移行予定
  'presentation/components/widgets/widgetLayout.ts',
])

const SIDE_EFFECT_PATTERNS = [/\blocalStorage\s*\./, /\bsessionStorage\s*\./]

describe('Render Side-Effect Guard', () => {
  it('presentation/ が localStorage/sessionStorage を直接使用しない', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    if (!fs.existsSync(presDir)) return

    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const relPath = rel(file)
      if (ALLOWLIST.has(relPath)) continue

      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of SIDE_EFFECT_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(
            `${relPath}: ${pattern.source} — presentation/ での直接使用禁止。application/adapters/uiPersistenceAdapter を使用してください`,
          )
          break
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('presentation/ が mutate/persist 系の関数を render パスで呼ばない', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    if (!fs.existsSync(presDir)) return

    const files = collectTsFiles(presDir).filter((f) => f.endsWith('.tsx'))
    const violations: string[] = []

    // render 関数本体内での直接 write 呼び出しパターン
    const RENDER_WRITE_PATTERNS = [/\bfs\.writeFile/, /\bdocument\.cookie\s*=/]

    for (const file of files) {
      const relPath = rel(file)
      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of RENDER_WRITE_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${relPath}: ${pattern.source}`)
          break
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('許可リストのファイルが実在する（orphan 検出）', () => {
    const orphans: string[] = []
    for (const entry of ALLOWLIST) {
      const filePath = path.join(SRC_DIR, entry)
      if (!fs.existsSync(filePath)) {
        orphans.push(`${entry}: 許可リストに登録されているが存在しない`)
      }
    }

    expect(orphans, formatViolationMessage(rule, orphans)).toEqual([])
  })
})
