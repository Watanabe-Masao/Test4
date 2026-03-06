import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkerCalculation, type WorkerCalculateResult } from '../useWorkerCalculation'
import { createEmptyImportedData } from '@/domain/models'
import type { AppSettings } from '@/domain/models'

// Worker モック
let mockWorkerInstance: {
  postMessage: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  onmessage: ((e: MessageEvent) => void) | null
  listeners: Map<string, ((...args: unknown[]) => void)[]>
}

let workerConstructorCalls = 0

beforeEach(() => {
  workerConstructorCalls = 0

  mockWorkerInstance = {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    listeners: new Map(),
    addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const existing = mockWorkerInstance.listeners.get(event) ?? []
      existing.push(handler)
      mockWorkerInstance.listeners.set(event, existing)
    }),
    removeEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const existing = mockWorkerInstance.listeners.get(event) ?? []
      mockWorkerInstance.listeners.set(
        event,
        existing.filter((h) => h !== handler),
      )
    }),
  }

  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        workerConstructorCalls++
        return mockWorkerInstance as unknown as Worker
      }
    },
  )
})

const mockSettings: AppSettings = {
  targetYear: 2024,
  targetMonth: 1,
  targetGrossProfitRate: 0.25,
  warningThreshold: 0.23,
  flowerCostRate: 0.8,
  directProduceCostRate: 0.85,
  defaultMarkupRate: 0.3,
  defaultBudget: 0,
  dataEndDay: null,
  supplierCategoryMap: {},
  prevYearSourceYear: null,
  prevYearSourceMonth: null,
  prevYearDowOffset: null,
  alignmentPolicy: 'sameDayOfWeek' as const,
  conditionConfig: { global: {}, storeOverrides: {} },
  gpDiffBlueThreshold: 0.2,
  gpDiffYellowThreshold: -0.2,
  gpDiffRedThreshold: -0.5,
  discountBlueThreshold: 0.02,
  discountYellowThreshold: 0.025,
  discountRedThreshold: 0.03,
  userCategoryLabels: {},
}

describe('useWorkerCalculation', () => {
  it('Worker が初期化される', () => {
    renderHook(() => useWorkerCalculation())
    expect(workerConstructorCalls).toBe(1)
  })

  it('isWorkerAvailable が true になる', async () => {
    const { result } = renderHook(() => useWorkerCalculation())

    await waitFor(() => {
      expect(result.current.isWorkerAvailable).toBe(true)
    })
  })

  it('calculateAsync がメッセージを Worker に送信する', async () => {
    const { result } = renderHook(() => useWorkerCalculation())

    const data = createEmptyImportedData()

    await waitFor(() => {
      expect(result.current.isWorkerAvailable).toBe(true)
    })

    // 非同期計算を開始 (resolve しないので await しない)
    act(() => {
      result.current.calculateAsync(data, mockSettings, 31)
    })

    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
      type: 'calculate',
      data,
      settings: mockSettings,
      daysInMonth: 31,
      requestId: expect.any(Number),
    })
  })

  it('Worker からの結果メッセージで Promise が resolve される', async () => {
    const { result } = renderHook(() => useWorkerCalculation())
    const data = createEmptyImportedData()

    await waitFor(() => {
      expect(result.current.isWorkerAvailable).toBe(true)
    })

    let resolvedResult: WorkerCalculateResult | undefined

    await act(async () => {
      const promise = result.current.calculateAsync(data, mockSettings, 31)

      // postMessage で送信された requestId を取得
      const sentMsg = mockWorkerInstance.postMessage.mock.calls[0][0]
      const reqId = sentMsg.requestId

      // Worker から結果を返す
      const messageHandlers = mockWorkerInstance.listeners.get('message') ?? []
      for (const handler of messageHandlers) {
        handler({
          data: {
            type: 'result',
            results: new Map([['s1', { storeId: 's1' }]]),
            fingerprint: 'abc123',
            requestId: reqId,
          },
        })
      }

      resolvedResult = await promise
    })

    expect(resolvedResult).toBeDefined()
    expect('results' in resolvedResult!).toBe(true)
    if ('results' in resolvedResult!) {
      expect(resolvedResult.results.size).toBe(1)
      expect(resolvedResult.results.get('s1')).toEqual({ storeId: 's1' })
    }
  })

  it('Worker からのエラーメッセージで Promise が reject される', async () => {
    const { result } = renderHook(() => useWorkerCalculation())
    const data = createEmptyImportedData()

    await waitFor(() => {
      expect(result.current.isWorkerAvailable).toBe(true)
    })

    await act(async () => {
      const promise = result.current.calculateAsync(data, mockSettings, 31)

      // postMessage で送信された requestId を取得
      const sentMsg = mockWorkerInstance.postMessage.mock.calls[0][0]
      const reqId = sentMsg.requestId

      const messageHandlers = mockWorkerInstance.listeners.get('message') ?? []
      for (const handler of messageHandlers) {
        handler({
          data: { type: 'error', message: '計算エラー', requestId: reqId },
        })
      }

      await expect(promise).rejects.toThrow('計算エラー')
    })
  })

  it('terminate で Worker を終了できる', async () => {
    const { result } = renderHook(() => useWorkerCalculation())

    await waitFor(() => {
      expect(result.current.isWorkerAvailable).toBe(true)
    })

    act(() => {
      result.current.terminate()
    })

    expect(mockWorkerInstance.terminate).toHaveBeenCalled()
    expect(result.current.isWorkerAvailable).toBe(false)
  })

  it('アンマウント時に Worker が自動終了する', async () => {
    const { unmount } = renderHook(() => useWorkerCalculation())

    unmount()

    expect(mockWorkerInstance.terminate).toHaveBeenCalled()
  })
})
