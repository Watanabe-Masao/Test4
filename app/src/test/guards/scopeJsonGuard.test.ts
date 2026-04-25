/**
 * Scope JSON Guard — ロールスコープ宣言の整合性検証
 *
 * roles/<role>/scope.json は各ロールの編集権限境界を **mechanism** として
 * 宣言する。ROLE.md の prose（exhortation）から昇格した形。
 *
 * 検証内容:
 * 1. 全 7 ロール（pm-business / review-gate / documentation-steward /
 *    architecture / implementation / invariant-guardian /
 *    duckdb-specialist / explanation-steward）に scope.json が存在
 * 2. 各 scope.json が必須フィールドを持つ（role / category / owns / rationale）
 * 3. role 名がディレクトリ名と一致
 * 4. owns / out_of_scope_warn の各 path prefix が実在する（broken path 検出）
 * 5. owns と out_of_scope_warn が排他的（同じ path が両方に出ない）
 *
 * @guard G1 テストに書く / governance-ops
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER — 文書品質ガバナンス)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const ROLES_DIR = path.join(PROJECT_ROOT, 'roles')
const rule = getRuleById('AR-DOC-STATIC-NUMBER')!

interface ScopeJson {
  role: string
  category: string
  owns: string[]
  out_of_scope_warn?: string[]
  rationale: string
}

interface RoleEntry {
  readonly relPath: string
  readonly expectedRole: string
}

const EXPECTED_ROLES: readonly RoleEntry[] = [
  { relPath: 'staff/pm-business', expectedRole: 'pm-business' },
  { relPath: 'staff/review-gate', expectedRole: 'review-gate' },
  { relPath: 'staff/documentation-steward', expectedRole: 'documentation-steward' },
  { relPath: 'line/architecture', expectedRole: 'architecture' },
  { relPath: 'line/implementation', expectedRole: 'implementation' },
  { relPath: 'line/specialist/invariant-guardian', expectedRole: 'invariant-guardian' },
  { relPath: 'line/specialist/duckdb-specialist', expectedRole: 'duckdb-specialist' },
  { relPath: 'line/specialist/explanation-steward', expectedRole: 'explanation-steward' },
]

function loadScope(roleRelPath: string): ScopeJson | null {
  const scopePath = path.join(ROLES_DIR, roleRelPath, 'scope.json')
  if (!fs.existsSync(scopePath)) return null
  return JSON.parse(fs.readFileSync(scopePath, 'utf-8'))
}

describe('Scope JSON Guard: ロールスコープ宣言の整合性', () => {
  it('全 8 ロールに scope.json が存在する', () => {
    const missing: string[] = []
    for (const entry of EXPECTED_ROLES) {
      const scopePath = path.join(ROLES_DIR, entry.relPath, 'scope.json')
      if (!fs.existsSync(scopePath)) {
        missing.push(`roles/${entry.relPath}/scope.json`)
      }
    }
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('各 scope.json が必須フィールドを持つ', () => {
    const violations: string[] = []
    for (const entry of EXPECTED_ROLES) {
      const scope = loadScope(entry.relPath)
      if (!scope) continue
      if (typeof scope.role !== 'string' || scope.role.length === 0) {
        violations.push(`${entry.relPath}: role フィールドが文字列でない`)
      }
      if (typeof scope.category !== 'string' || scope.category.length === 0) {
        violations.push(`${entry.relPath}: category フィールドが文字列でない`)
      }
      if (!Array.isArray(scope.owns)) {
        violations.push(`${entry.relPath}: owns フィールドが配列でない`)
      }
      if (typeof scope.rationale !== 'string' || scope.rationale.length === 0) {
        violations.push(`${entry.relPath}: rationale フィールドが文字列でない`)
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('role 名がディレクトリ名と一致する', () => {
    const violations: string[] = []
    for (const entry of EXPECTED_ROLES) {
      const scope = loadScope(entry.relPath)
      if (!scope) continue
      if (scope.role !== entry.expectedRole) {
        violations.push(
          `${entry.relPath}: role='${scope.role}' がディレクトリ名 '${entry.expectedRole}' と不一致`,
        )
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('owns の各 path prefix が実在する', () => {
    const violations: string[] = []
    for (const entry of EXPECTED_ROLES) {
      const scope = loadScope(entry.relPath)
      if (!scope || !Array.isArray(scope.owns)) continue
      for (const ownedPath of scope.owns) {
        const fullPath = path.join(PROJECT_ROOT, ownedPath)
        if (!fs.existsSync(fullPath)) {
          violations.push(`${entry.relPath}: owns の '${ownedPath}' が実在しない（broken path）`)
        }
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('out_of_scope_warn の各 path prefix が実在する', () => {
    const violations: string[] = []
    for (const entry of EXPECTED_ROLES) {
      const scope = loadScope(entry.relPath)
      if (!scope || !Array.isArray(scope.out_of_scope_warn)) continue
      for (const warnPath of scope.out_of_scope_warn) {
        const fullPath = path.join(PROJECT_ROOT, warnPath)
        if (!fs.existsSync(fullPath)) {
          violations.push(`${entry.relPath}: out_of_scope_warn の '${warnPath}' が実在しない`)
        }
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('owns と out_of_scope_warn が排他的（同じ path が両方に出ない）', () => {
    const violations: string[] = []
    for (const entry of EXPECTED_ROLES) {
      const scope = loadScope(entry.relPath)
      if (!scope || !Array.isArray(scope.owns) || !Array.isArray(scope.out_of_scope_warn)) {
        continue
      }
      const ownsSet = new Set(scope.owns)
      for (const warnPath of scope.out_of_scope_warn) {
        if (ownsSet.has(warnPath)) {
          violations.push(
            `${entry.relPath}: '${warnPath}' が owns と out_of_scope_warn の両方に存在`,
          )
        }
      }
    }
    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })
})
