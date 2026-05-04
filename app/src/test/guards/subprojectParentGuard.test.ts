/**
 * Subproject Parent Guard
 *
 * `projects/<id>/config/project.json` の optional `parent` フィールドに対する
 * 構造検証を行う。
 *
 * 目的: 派生トピックを「親 project から切り出したサブ project」として
 * 文脈リンク付きで管理する軽量機能（aag-format-redesign Phase 4 — P1）。
 * 親子の完了連動や blocking 依存は P2 以降の scope。
 *
 * 検証項目:
 * 1. 親実在: `parent` が指す project が active（`projects/<id>/`）または
 *    archived（`projects/completed/<id>/`）に実在する
 * 2. 自己参照禁止: `parent` が自分自身ではない
 * 3. 循環禁止: 親子関係が循環していない（A → B → A 等）
 * 4. 深さ制限: 親子階層は 2 段まで（親 → 子のみ、孫なし）
 *
 * P1 では `parent` の宣言は optional。フィールド未定義の project は通常 project
 * として従来通り扱われる（全既存 project は無変更で PASS する）。
 *
 * @responsibility R:unclassified
 * @see projects/completed/aag-format-redesign/subproject-design.md
 *
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const PROJECTS_DIR = path.join(PROJECT_ROOT, 'projects')

interface ProjectEntry {
  readonly projectId: string
  readonly parent: string | undefined
  readonly configPath: string
  readonly isArchived: boolean
}

function listAllProjects(): ProjectEntry[] {
  const out: ProjectEntry[] = []
  if (!fs.existsSync(PROJECTS_DIR)) return out

  const collectFromDir = (dir: string, isArchived: boolean) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name === '_template' || entry.name.startsWith('_')) continue
      if (!isArchived && entry.name === 'completed') {
        collectFromDir(path.join(dir, 'completed'), true)
        continue
      }
      // R6b (DA-α-007b、2026-05-03): projects/active/<id>/ split に対応。
      if (!isArchived && entry.name === 'active') {
        collectFromDir(path.join(dir, 'active'), false)
        continue
      }
      const configPath = path.join(dir, entry.name, 'config/project.json')
      if (!fs.existsSync(configPath)) continue
      try {
        const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
          projectId: string
          parent?: string
        }
        out.push({
          projectId: parsed.projectId,
          parent: parsed.parent,
          configPath,
          isArchived,
        })
      } catch {
        // parse 失敗は別 guard が検出する
      }
    }
  }

  collectFromDir(PROJECTS_DIR, false)
  return out
}

describe('Subproject Parent Guard', () => {
  const projects = listAllProjects()
  const byId = new Map(projects.map((p) => [p.projectId, p]))

  it('parent で指定された project が実在する', () => {
    const violations: string[] = []
    for (const p of projects) {
      if (p.parent == null) continue
      if (!byId.has(p.parent)) {
        violations.push(
          `${p.projectId}: parent '${p.parent}' が projects/<id>/ または projects/completed/<id>/ に存在しません`,
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('parent が自分自身ではない（self-reference 禁止）', () => {
    const violations: string[] = []
    for (const p of projects) {
      if (p.parent != null && p.parent === p.projectId) {
        violations.push(`${p.projectId}: parent が自分自身を指しています`)
      }
    }
    expect(violations).toEqual([])
  })

  it('親子関係が循環していない', () => {
    const violations: string[] = []
    for (const p of projects) {
      if (p.parent == null) continue
      // 親を辿る。循環があれば検出する。
      const visited = new Set<string>([p.projectId])
      let current: string | undefined = p.parent
      while (current != null) {
        if (visited.has(current)) {
          violations.push(
            `${p.projectId}: 親子チェーンが循環しています (${[...visited, current].join(' → ')})`,
          )
          break
        }
        visited.add(current)
        current = byId.get(current)?.parent
      }
    }
    expect(violations).toEqual([])
  })

  it('親子階層が 2 段まで（P1 では孫を許可しない）', () => {
    const violations: string[] = []
    for (const p of projects) {
      if (p.parent == null) continue
      const parentEntry = byId.get(p.parent)
      if (parentEntry && parentEntry.parent != null) {
        violations.push(
          `${p.projectId}: 親 '${p.parent}' 自身が parent='${parentEntry.parent}' を持っています。` +
            ` P1 の subproject 機能は 2 段階（親 → 子）までしか許可しません。` +
            ` 詳細: projects/completed/aag-format-redesign/subproject-design.md §6`,
        )
      }
    }
    expect(violations).toEqual([])
  })
})
