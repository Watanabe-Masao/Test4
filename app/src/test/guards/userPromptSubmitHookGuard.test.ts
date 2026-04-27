/**
 * UserPromptSubmit Hook Guard — manifest 駆動 context 注入 hook の存在検証
 *
 * .claude/hooks/user-prompt-submit.sh が存在し、実行可能で、
 * .claude/settings.json に登録されていることを検証する。
 *
 * Hook 自体の挙動は shell script のため整合性のみ検証（実行時 trace は対象外）。
 *
 * @guard G1 テストに書く / governance-ops
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER — 文書品質ガバナンス)
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const HOOK_PATH = path.join(PROJECT_ROOT, '.claude/hooks/user-prompt-submit.sh')
const SETTINGS_PATH = path.join(PROJECT_ROOT, '.claude/settings.json')
const rule = getRuleById('AR-DOC-STATIC-NUMBER')!

interface SettingsHookEntry {
  hooks: { type: string; command: string }[]
}
interface Settings {
  hooks: Record<string, SettingsHookEntry[]>
}

describe('UserPromptSubmit Hook Guard: manifest 駆動 hook の存在と登録', () => {
  it('hook script ファイルが存在する', () => {
    expect(fs.existsSync(HOOK_PATH)).toBe(true)
  })

  it('hook script が実行可能（mode に x bit が立っている）', () => {
    const stat = fs.statSync(HOOK_PATH)
    const mode = stat.mode
    // owner / group / other のいずれかに execute bit
    const executable = (mode & 0o111) !== 0
    expect(executable, `hook script ${HOOK_PATH} が実行不可（chmod +x 必要）`).toBe(true)
  })

  it('hook script が manifest を参照している', () => {
    const content = fs.readFileSync(HOOK_PATH, 'utf-8')
    expect(content).toContain('.claude/manifest.json')
    expect(content).toContain('discovery.byTopic')
  })

  it('hook script が fail-open 設計（exit 0 でフォールバック）', () => {
    const content = fs.readFileSync(HOOK_PATH, 'utf-8')
    // jq / manifest 不在時は exit 0 で抜ける
    expect(content).toMatch(/exit 0/)
  })

  it('settings.json に UserPromptSubmit が登録されている', () => {
    expect(fs.existsSync(SETTINGS_PATH)).toBe(true)
    const settings: Settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'))
    expect(settings.hooks?.UserPromptSubmit).toBeTruthy()
    const entries = settings.hooks.UserPromptSubmit
    expect(Array.isArray(entries) && entries.length > 0).toBe(true)
    const commands = entries.flatMap((e) => e.hooks.map((h) => h.command))
    const hasOurHook = commands.some((c) => c.includes('user-prompt-submit.sh'))
    expect(
      hasOurHook,
      formatViolationMessage(rule, [
        'settings.json の UserPromptSubmit に user-prompt-submit.sh が登録されていない',
      ]),
    ).toBe(true)
  })
})
