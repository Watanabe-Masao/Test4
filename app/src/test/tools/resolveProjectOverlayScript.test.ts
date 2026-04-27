/**
 * app/scripts/resolve-project-overlay.mjs 軽量テスト（Phase 6-2）
 *
 * vite / vitest alias 解決に使う Node スクリプトが、CURRENT_PROJECT.md と
 * project.json から overlay root を返すことを固定する。
 *
 * 注意: スクリプトは app ディレクトリからの相対位置を repo root とみなす。
 * テストでは fixture を作り、fixture 内の app/ ディレクトリを appDir として渡す。
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { afterEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createFixture, type Fixture } from './aagFixtureBuilder'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — plain JS module without declaration file
import { resolveProjectOverlayRoot } from '../../../scripts/resolve-project-overlay.mjs'

describe('resolve-project-overlay.mjs 契約テスト', () => {
  let fx: Fixture | null = null
  afterEach(() => {
    fx?.cleanup()
    fx = null
  })

  it('fixture の overlay root を返す', () => {
    fx = createFixture({ projectId: 'script-fx' })
    // スクリプトは repo root を appDir の親とみなすので、fixture の app/ を作って渡す
    const appDir = path.join(fx.repoRoot, 'app')
    fs.mkdirSync(appDir, { recursive: true })

    const resolved: string = resolveProjectOverlayRoot(appDir)
    expect(resolved).toBe(path.join(fx.repoRoot, 'projects/script-fx/aag'))
  })

  it('CURRENT_PROJECT.md の書き換えに追随する', () => {
    fx = createFixture({ projectId: 'initial-fx' })
    const appDir = path.join(fx.repoRoot, 'app')
    fs.mkdirSync(appDir, { recursive: true })

    // 別 project を追加
    const altConfig = path.join(fx.repoRoot, 'projects/alt-fx/config')
    fs.mkdirSync(altConfig, { recursive: true })
    fs.writeFileSync(
      path.join(altConfig, 'project.json'),
      JSON.stringify({
        projectId: 'alt-fx',
        overlayRoot: 'projects/alt-fx/aag',
      }),
    )
    fs.writeFileSync(path.join(fx.repoRoot, 'CURRENT_PROJECT.md'), 'active: alt-fx\n')

    const resolved: string = resolveProjectOverlayRoot(appDir)
    expect(resolved).toBe(path.join(fx.repoRoot, 'projects/alt-fx/aag'))
  })

  it('CURRENT_PROJECT.md の format 不正で throw する', () => {
    fx = createFixture({
      overrideFiles: {
        'CURRENT_PROJECT.md': 'no active line here',
      },
    })
    const appDir = path.join(fx.repoRoot, 'app')
    fs.mkdirSync(appDir, { recursive: true })
    expect(() => resolveProjectOverlayRoot(appDir)).toThrow(/active project id/)
  })
})
