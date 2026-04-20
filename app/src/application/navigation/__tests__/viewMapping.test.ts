/**
 * viewMapping — VIEW_TO_PATH / PATH_TO_VIEW マッピング整合性 tests
 *
 * preloadAdjacentPages は requestIdleCallback / import() 副作用を持つため対象外。
 * ここでは pageRegistry 由来のマッピング定数の整合性のみ検証する。
 */
import { describe, it, expect } from 'vitest'
import { VIEW_TO_PATH, PATH_TO_VIEW } from '../viewMapping'

describe('VIEW_TO_PATH', () => {
  it('全エントリが / で始まる', () => {
    for (const path of Object.values(VIEW_TO_PATH)) {
      expect(path.startsWith('/')).toBe(true)
    }
  })

  it('dashboard ViewType が /dashboard にマップ', () => {
    expect(VIEW_TO_PATH['dashboard']).toBe('/dashboard')
  })

  it('daily ViewType が /daily にマップ', () => {
    expect(VIEW_TO_PATH['daily']).toBe('/daily')
  })

  it('非空の Record', () => {
    expect(Object.keys(VIEW_TO_PATH).length).toBeGreaterThan(0)
  })
})

describe('PATH_TO_VIEW', () => {
  it('全エントリが / で始まる key', () => {
    for (const path of Object.keys(PATH_TO_VIEW)) {
      expect(path.startsWith('/')).toBe(true)
    }
  })

  it('/dashboard が dashboard ViewType にマップ', () => {
    expect(PATH_TO_VIEW['/dashboard']).toBe('dashboard')
  })

  it('非空の Record', () => {
    expect(Object.keys(PATH_TO_VIEW).length).toBeGreaterThan(0)
  })
})

describe('VIEW_TO_PATH と PATH_TO_VIEW の相互逆対応', () => {
  it('VIEW_TO_PATH → PATH_TO_VIEW で戻る（standard ページ）', () => {
    for (const [view, path] of Object.entries(VIEW_TO_PATH)) {
      expect(PATH_TO_VIEW[path]).toBe(view)
    }
  })

  it('エントリ数が一致', () => {
    expect(Object.keys(VIEW_TO_PATH).length).toBe(Object.keys(PATH_TO_VIEW).length)
  })
})
