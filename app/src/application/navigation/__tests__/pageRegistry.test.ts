import { describe, it, expect } from 'vitest'
import {
  PAGE_REGISTRY,
  REDIRECT_REGISTRY,
  getPageById,
  getNavPages,
  getMobileNavPages,
  getShortcutMap,
  getViewToPath,
  getPathToView,
  getPageByPath,
  getRedirectTarget,
  getStandardPageIds,
} from '@/application/navigation/pageRegistry'

describe('pageRegistry', () => {
  describe('PAGE_REGISTRY', () => {
    it('contains dashboard as first standard page', () => {
      const dashboard = PAGE_REGISTRY.find((p) => p.id === 'dashboard')
      expect(dashboard).toBeTruthy()
      expect(dashboard?.kind).toBe('standard')
      expect(dashboard?.pathPattern).toBe('/dashboard')
    })

    it('has unique page ids', () => {
      const ids = PAGE_REGISTRY.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('getPageById', () => {
    it('resolves existing page by id', () => {
      const page = getPageById('daily')
      expect(page?.id).toBe('daily')
      expect(page?.pathPattern).toBe('/daily')
    })

    it('returns undefined for unknown id', () => {
      expect(getPageById('no-such-page')).toBeUndefined()
    })
  })

  describe('getNavPages', () => {
    it('returns pages sorted by navOrder ascending', () => {
      const pages = getNavPages()
      for (let i = 1; i < pages.length; i++) {
        expect(pages[i].navOrder).toBeGreaterThanOrEqual(pages[i - 1].navOrder)
      }
    })

    it('only includes navVisible pages', () => {
      const pages = getNavPages()
      expect(pages.every((p) => p.navVisible)).toBe(true)
    })
  })

  describe('getMobileNavPages', () => {
    it('only contains mobileNavVisible pages', () => {
      const pages = getMobileNavPages()
      expect(pages.every((p) => p.mobileNavVisible)).toBe(true)
      expect(pages.length).toBeGreaterThan(0)
    })
  })

  describe('getShortcutMap', () => {
    it('maps shortcutIndex → PageMeta', () => {
      const map = getShortcutMap()
      expect(map.get(1)?.id).toBe('dashboard')
      expect(map.get(2)?.id).toBe('daily')
    })

    it('excludes pages without shortcutIndex', () => {
      const map = getShortcutMap()
      for (const [, page] of map) {
        expect(page.shortcutIndex).not.toBeUndefined()
      }
    })
  })

  describe('getViewToPath / getPathToView', () => {
    it('view→path contains dashboard', () => {
      const map = getViewToPath()
      expect(map['dashboard']).toBe('/dashboard')
    })

    it('path→view is the inverse for standard pages', () => {
      const v2p = getViewToPath()
      const p2v = getPathToView()
      for (const [view, path] of Object.entries(v2p)) {
        expect(p2v[path]).toBe(view)
      }
    })
  })

  describe('getPageByPath', () => {
    it('matches standard page exactly', () => {
      const page = getPageByPath('/dashboard')
      expect(page?.id).toBe('dashboard')
    })

    it('matches dynamic path against pattern', () => {
      const page = getPageByPath('/custom/my-page-id')
      expect(page?.id).toBe('custom')
      expect(page?.kind).toBe('dynamic')
    })

    it('returns undefined for unknown path', () => {
      expect(getPageByPath('/this/does/not/exist')).toBeUndefined()
    })

    it('dynamic path rejects different segment count', () => {
      expect(getPageByPath('/custom')).toBeUndefined()
      expect(getPageByPath('/custom/a/b')).toBeUndefined()
    })
  })

  describe('getRedirectTarget', () => {
    it('resolves known redirect', () => {
      expect(getRedirectTarget('/analysis')).toBe('/insight')
      expect(getRedirectTarget('/forecast')).toBe('/insight')
    })

    it('returns undefined for non-redirect path', () => {
      expect(getRedirectTarget('/dashboard')).toBeUndefined()
    })
  })

  describe('getStandardPageIds', () => {
    it('excludes dynamic pages', () => {
      const ids = getStandardPageIds()
      expect(ids).not.toContain('custom')
      expect(ids).toContain('dashboard')
    })
  })

  describe('REDIRECT_REGISTRY', () => {
    it('contains defined legacy redirects', () => {
      const froms = REDIRECT_REGISTRY.map((r) => r.from)
      expect(froms).toContain('/analysis')
      expect(froms).toContain('/summary')
    })
  })
})
