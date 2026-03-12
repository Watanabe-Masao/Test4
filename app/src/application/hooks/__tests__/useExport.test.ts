import { describe, it, expect } from 'vitest'
import { useExport } from '../useExport'
import { exportService } from '@/application/usecases/export/ExportService'

describe('useExport', () => {
  it('exportService を返す', () => {
    const result = useExport()
    expect(result).toBe(exportService)
  })
})
