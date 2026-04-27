/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { summarizeImportPlan } from '../../models/ScopeResolution'
import type { ImportPlan, ImportScope } from '../../models/ScopeResolution'
import type { DatedRecord } from '../../models/DataTypes'

const scope: ImportScope = {
  dataType: 'purchase',
  year: 2025,
  month: 2,
  dayFrom: 1,
  dayTo: 28,
  storeIds: ['001'],
  deletePolicy: 'upsert-only',
}

const rec: DatedRecord = { year: 2025, month: 2, day: 5, storeId: '001' }

const emptyPlan: ImportPlan = {
  importId: 'test-001',
  importedAt: '2025-02-15T00:00:00Z',
  sourceFiles: [],
  operations: [],
  masterUpdates: { stores: new Map(), suppliers: new Map() },
  monthDataUpdates: [],
}

describe('summarizeImportPlan', () => {
  it('空の plan は isEmpty = true', () => {
    const summary = summarizeImportPlan(emptyPlan)
    expect(summary.isEmpty).toBe(true)
    expect(summary.totalAdds).toBe(0)
    expect(summary.totalUpdates).toBe(0)
    expect(summary.totalDeletes).toBe(0)
    expect(summary.needsConfirmation).toBe(false)
  })

  it('add のみの場合 needsConfirmation = false', () => {
    const plan: ImportPlan = {
      ...emptyPlan,
      operations: [
        {
          scope,
          adds: [{ kind: 'add', naturalKey: 'k1', record: rec }],
          updates: [],
          deletes: [],
        },
      ],
    }
    const summary = summarizeImportPlan(plan)
    expect(summary.totalAdds).toBe(1)
    expect(summary.needsConfirmation).toBe(false)
    expect(summary.isEmpty).toBe(false)
  })

  it('update がある場合 needsConfirmation = true', () => {
    const plan: ImportPlan = {
      ...emptyPlan,
      operations: [
        {
          scope,
          adds: [],
          updates: [{ kind: 'update', naturalKey: 'k1', record: rec, previousRecord: rec }],
          deletes: [],
        },
      ],
    }
    const summary = summarizeImportPlan(plan)
    expect(summary.needsConfirmation).toBe(true)
  })

  it('delete がある場合 deleteDetails にエントリが追加される', () => {
    const deleteScope: ImportScope = { ...scope, deletePolicy: 'replace-scope' }
    const plan: ImportPlan = {
      ...emptyPlan,
      operations: [
        {
          scope: deleteScope,
          adds: [],
          updates: [],
          deletes: [{ kind: 'delete', naturalKey: 'k1', previousRecord: rec }],
        },
      ],
    }
    const summary = summarizeImportPlan(plan)
    expect(summary.totalDeletes).toBe(1)
    expect(summary.needsConfirmation).toBe(true)
    expect(summary.deleteDetails).toHaveLength(1)
    expect(summary.deleteDetails[0].count).toBe(1)
  })

  it('byDataType で種別ごとの集計が取れる', () => {
    const plan: ImportPlan = {
      ...emptyPlan,
      operations: [
        {
          scope,
          adds: [
            { kind: 'add', naturalKey: 'k1', record: rec },
            { kind: 'add', naturalKey: 'k2', record: rec },
          ],
          updates: [{ kind: 'update', naturalKey: 'k3', record: rec, previousRecord: rec }],
          deletes: [],
        },
      ],
    }
    const summary = summarizeImportPlan(plan)
    expect(summary.byDataType).toHaveLength(1)
    expect(summary.byDataType[0].dataType).toBe('purchase')
    expect(summary.byDataType[0].adds).toBe(2)
    expect(summary.byDataType[0].updates).toBe(1)
  })
})
