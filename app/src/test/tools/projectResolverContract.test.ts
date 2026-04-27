/**
 * Project Resolver 契約テスト（Phase 6-2）
 *
 * CURRENT_PROJECT.md + projects/<id>/config/project.json から active project を
 * 解決する resolver の契約を固定する。
 *
 * 目的:
 * - 正常系: CURRENT_PROJECT.md の active: 行を読める
 * - 正常系: project.json の overlayRoot / overlayEntry が返される
 * - 異常系: projectId 不整合で fail
 * - 異常系: CURRENT_PROJECT.md parse fail
 * - 異常系: project.json 欠損で fail
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { afterEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { resolveActiveProject } from '@tools/architecture-health/project-resolver'
import { createFixture, type Fixture } from './aagFixtureBuilder'

describe('Project Resolver 契約テスト', () => {
  let fx: Fixture | null = null
  afterEach(() => {
    fx?.cleanup()
    fx = null
  })

  it('正常系: active project が返される', () => {
    fx = createFixture({ projectId: 'my-project' })
    const active = resolveActiveProject(fx.repoRoot)
    expect(active.projectId).toBe('my-project')
  })

  it('正常系: overlayRoot / overlayEntry が返される', () => {
    fx = createFixture({ projectId: 'my-project' })
    const active = resolveActiveProject(fx.repoRoot)
    expect(active.overlayRoot).toBe('projects/my-project/aag')
    expect(active.overlayEntry).toBe('projects/my-project/aag/execution-overlay.ts')
  })

  it('正常系: 絶対パスが返される', () => {
    fx = createFixture({ projectId: 'abs-project' })
    const active = resolveActiveProject(fx.repoRoot)
    expect(active.absProjectRoot.startsWith(fx.repoRoot)).toBe(true)
    expect(active.absOverlayEntry).toMatch(/execution-overlay\.ts$/)
  })

  it('正常系: project.json に overlayRoot が無ければ既定値で解決する', () => {
    fx = createFixture({
      projectId: 'no-overlay-root',
      overrideFiles: {
        'projects/no-overlay-root/config/project.json': JSON.stringify({
          projectId: 'no-overlay-root',
          title: 'without overlayRoot',
        }),
      },
    })
    const active = resolveActiveProject(fx.repoRoot)
    expect(active.overlayRoot).toBe('projects/no-overlay-root/aag')
    expect(active.overlayEntry).toBe('projects/no-overlay-root/aag/execution-overlay.ts')
  })

  it('異常系: projectId 不整合で throw する', () => {
    fx = createFixture({
      projectId: 'real-id',
      overrideFiles: {
        'projects/real-id/config/project.json': JSON.stringify({
          projectId: 'wrong-id',
        }),
      },
    })
    expect(() => resolveActiveProject(fx!.repoRoot)).toThrow(/projectId mismatch/)
  })

  it('異常系: CURRENT_PROJECT.md が正しい format でなければ throw する', () => {
    fx = createFixture({
      overrideFiles: {
        'CURRENT_PROJECT.md': 'This file has no active line',
      },
    })
    expect(() => resolveActiveProject(fx!.repoRoot)).toThrow(/active project id/)
  })

  it('異常系: project.json が存在しない場合 throw する', () => {
    fx = createFixture({
      projectId: 'missing-manifest',
    })
    // manifest を消す
    fs.unlinkSync(path.join(fx.repoRoot, 'projects/missing-manifest/config/project.json'))
    expect(() => resolveActiveProject(fx!.repoRoot)).toThrow()
  })

  it('project 切替の簡易シミュレーション（CURRENT_PROJECT.md の差し替え）', () => {
    fx = createFixture({ projectId: 'first-project' })
    expect(resolveActiveProject(fx.repoRoot).projectId).toBe('first-project')

    // second-project 用の manifest と overlay を追加し CURRENT_PROJECT.md を書き換える
    const secondConfigDir = path.join(fx.repoRoot, 'projects/second-project/config')
    fs.mkdirSync(secondConfigDir, { recursive: true })
    fs.writeFileSync(
      path.join(secondConfigDir, 'project.json'),
      JSON.stringify({ projectId: 'second-project' }),
    )
    fs.writeFileSync(path.join(fx.repoRoot, 'CURRENT_PROJECT.md'), 'active: second-project\n')

    const after = resolveActiveProject(fx.repoRoot)
    expect(after.projectId).toBe('second-project')
    expect(after.overlayEntry).toBe('projects/second-project/aag/execution-overlay.ts')
  })
})
