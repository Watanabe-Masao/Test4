import { describe, it, expect, vi } from 'vitest'
import {
  TEMPLATE_DESCRIPTIONS,
  TEMPLATE_TYPES,
  TEMPLATE_LABELS,
  downloadTemplate,
} from '../templateGenerator'

// Mock downloadCsv to avoid browser APIs
vi.mock('../csvExporter', async () => {
  const actual = await vi.importActual('../csvExporter')
  return {
    ...actual,
    downloadCsv: vi.fn(),
  }
})

import { downloadCsv } from '../csvExporter'

describe('templateGenerator', () => {
  describe('TEMPLATE_TYPES', () => {
    it('contains 9 types', () => {
      expect(TEMPLATE_TYPES).toHaveLength(9)
    })

    it('includes all expected types', () => {
      expect(TEMPLATE_TYPES).toContain('purchase')
      expect(TEMPLATE_TYPES).toContain('classifiedSales')
      expect(TEMPLATE_TYPES).toContain('flowers')
      expect(TEMPLATE_TYPES).toContain('directProduce')
      expect(TEMPLATE_TYPES).toContain('interStoreOut')
      expect(TEMPLATE_TYPES).toContain('interStoreIn')
      expect(TEMPLATE_TYPES).toContain('budget')
      expect(TEMPLATE_TYPES).toContain('categoryTimeSales')
      expect(TEMPLATE_TYPES).toContain('consumables')
    })
  })

  describe('TEMPLATE_LABELS', () => {
    it('has label for every type', () => {
      for (const t of TEMPLATE_TYPES) {
        expect(TEMPLATE_LABELS[t]).toBeTruthy()
      }
    })
  })

  describe('TEMPLATE_DESCRIPTIONS', () => {
    it('has description for every type', () => {
      for (const t of TEMPLATE_TYPES) {
        expect(TEMPLATE_DESCRIPTIONS[t]).toBeTruthy()
      }
    })
  })

  describe('downloadTemplate', () => {
    it('calls downloadCsv for purchase', () => {
      downloadTemplate('purchase')
      expect(downloadCsv).toHaveBeenCalledWith(expect.any(String), {
        filename: 'テンプレート_仕入',
      })
    })

    it('calls downloadCsv for classifiedSales', () => {
      downloadTemplate('classifiedSales')
      expect(downloadCsv).toHaveBeenCalledWith(expect.any(String), {
        filename: 'テンプレート_分類別売上',
      })
    })

    it('does nothing for unknown type', () => {
      const mock = vi.mocked(downloadCsv)
      mock.mockClear()
      downloadTemplate('initialSettings')
      expect(mock).not.toHaveBeenCalled()
    })

    it('calls downloadCsv for all supported types', () => {
      const mock = vi.mocked(downloadCsv)
      for (const t of TEMPLATE_TYPES) {
        mock.mockClear()
        downloadTemplate(t)
        expect(mock).toHaveBeenCalledOnce()
      }
    })
  })
})
