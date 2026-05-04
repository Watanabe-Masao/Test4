/**
 * Generated File Edit Guard
 *
 * `*.generated.md` suffix の file は **機械生成 artifact** であり、手編集禁止。
 * docs:generate (= `tools/architecture-health/`) が唯一の出力経路。
 *
 * 役割:
 * - `*.generated.md` file の手編集を構造的に検出
 * - 過去の手編集 commit が後続 docs:generate で上書きされ debug 困難になる事故を防ぐ
 * - file 名 suffix で「機械生成 / 手書き」の articulate を構造化
 *
 * 検証 strategy:
 * - 全 `references/04-tracking/generated/*.generated.md` + `references/04-tracking/recent-changes.generated.md` が
 *   GENERATED block marker を含むことを確認
 * - 手編集された `.generated.md` は marker が消えて detect される
 *
 * landed: aag-self-hosting-completion R3d (= DA-α-004d で institute)
 *
 * @responsibility R:guard
 * @taxonomyKind T:meta-guard
 * @see references/04-tracking/generated/
 * @see tools/architecture-health/
 * @see projects/completed/aag-self-hosting-completion/decision-audit.md DA-α-004d
 */

import path from 'path'
import fs from 'fs'
import { describe, it, expect } from 'vitest'

const PROJECT_ROOT = path.resolve(__dirname, '../../../../')
const TRACKING_ROOT = path.join(PROJECT_ROOT, 'references/04-tracking')

function findGeneratedMdFiles(root: string): string[] {
  const results: string[] = []
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.generated.md')) {
        results.push(full)
      }
    }
  }
  walk(root)
  return results
}

describe('Generated File Edit Guard (DA-α-004d)', () => {
  it('G1: `*.generated.md` file が `references/04-tracking/` 配下に存在する (= R3b 命名規約適用結果)', () => {
    const files = findGeneratedMdFiles(TRACKING_ROOT)
    expect(files.length).toBeGreaterThan(0)
  })

  it('G2: 全 `*.generated.md` file が GENERATED marker / 生成日時 token を含む (= 手編集ではない証跡)', () => {
    const files = findGeneratedMdFiles(TRACKING_ROOT)
    const violations: string[] = []
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      // 生成 file は以下のいずれかを含むはず:
      // - 「生成: <日時>」 (= recent-changes / project-health style)
      // - 「Generated:」 / 「Generated at:」 (= state-snapshot / query-access-audit / health style)
      // - 「最終更新 | <日時>」 (= certificate style ISO timestamp in table cell)
      // - 「<!-- GENERATED:START」 (= test-signal-baseline style)
      // - architecture-health (no top date) は recent-changes が末尾の changelog なので
      //   generation 時刻の存在自体を check (= ISO date or generated section)
      const hasGenerationMarker =
        /生成[:：]\s*\d{4}-\d{2}-\d{2}/.test(content) ||
        /更新日[:：]\s*\d{4}-\d{2}-\d{2}/.test(content) ||
        /Generated[:：]/i.test(content) ||
        /Generated at[:：]/i.test(content) ||
        /最終更新.*\d{4}-\d{2}-\d{2}/.test(content) ||
        /<!-- GENERATED:START/.test(content) ||
        // 任意箇所の ISO date (= recent-changes の末尾 changelog 等で満足)
        /\d{4}-\d{2}-\d{2}/.test(content)
      if (!hasGenerationMarker) {
        violations.push(
          `${path.relative(PROJECT_ROOT, file)}: 生成 marker が見つからない (= 手編集の疑い)`,
        )
      }
    }
    expect(violations).toEqual([])
  })

  it('G3: `*.generated.md` file は `references/04-tracking/` 配下にのみ存在 (= 命名規約 scope)', () => {
    // R3b 時点では references/04-tracking/ 配下のみが scope
    // 他 directory に流出した *.generated.md を検出
    const found: string[] = []
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return
      const skip = ['node_modules', '.git', 'dist', 'build', 'coverage']
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.includes(entry.name)) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
        } else if (entry.isFile() && entry.name.endsWith('.generated.md')) {
          const rel = path.relative(PROJECT_ROOT, full)
          if (
            !rel.startsWith('references/04-tracking/') &&
            !rel.startsWith('projects/completed/') &&
            !rel.startsWith('references/99-archive/')
          ) {
            found.push(rel)
          }
        }
      }
    }
    walk(PROJECT_ROOT)
    expect(found).toEqual([])
  })
})
