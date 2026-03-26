/**
 * factorDecomposition モード切替ディスパッチャ (Bridge)
 *
 * 既存 factorDecomposition.ts と同一シグネチャの関数をエクスポートする。
 * 3モードディスパッチ:
 *   - ts-only: TS 実装のみ
 *   - wasm-only: WASM のみ（初期化未完了時は TS フォールバック）
 *   - dual-run-compare: 両方実行→結果比較→差分ログ→TS 結果を返却
 *
 * bridge の責務: mode dispatch, fallback, dual-run compare, logging
 * bridge に含めないもの: metrics, timings, cache, mode persistence, error policy
 */
import {
  decompose2 as decompose2TS,
  decompose3 as decompose3TS,
  decompose5 as decompose5TS,
  decomposePriceMix as decomposePriceMixTS,
} from '@/domain/calculations/factorDecomposition'
import type {
  TwoFactorResult,
  ThreeFactorResult,
  FiveFactorResult,
  PriceMixResult,
  CategoryQtyAmt,
} from '@/domain/calculations/factorDecomposition'
import { getExecutionMode, getWasmModuleState } from './wasmEngine'
import type { WasmState, ExecutionMode } from './wasmEngine'
import {
  decompose2Wasm,
  decompose3Wasm,
  decompose5Wasm,
  decomposePriceMixWasm,
} from './factorDecompositionWasm'
import { recordCall, recordMismatch, recordNullMismatch } from './dualRunObserver'

// Re-export types for consumer convenience
export type { TwoFactorResult, ThreeFactorResult, FiveFactorResult, PriceMixResult, CategoryQtyAmt }

/* ── dual-run 差分ログフォーマット ────────────── */

interface DualRunMismatchLog {
  readonly function: 'decompose2' | 'decompose3' | 'decomposePriceMix' | 'decompose5'
  readonly inputSummary: {
    readonly prevSales: number
    readonly curSales: number
    readonly categoryCount?: number
  }
  readonly tsResult: Record<string, number>
  readonly wasmResult: Record<string, number>
  readonly diffs: Record<string, number>
  readonly maxAbsDiff: number
  readonly sumInvariantTs: 'ok' | 'violated'
  readonly sumInvariantWasm: 'ok' | 'violated'
  readonly wasmState: WasmState
  readonly executionMode: ExecutionMode
}

/* ── 内部ヘルパー ─────────────────────────────── */

function isWasmReady(): boolean {
  return getWasmModuleState('factorDecomposition') === 'ready'
}

function isDualRun(): boolean {
  return import.meta.env.DEV && getExecutionMode() === 'dual-run-compare' && isWasmReady()
}

function checkInvariant(effects: Record<string, number>, delta: number): 'ok' | 'violated' {
  const sum = Object.values(effects).reduce((a, b) => a + b, 0)
  return Math.abs(sum - delta) < 1.0 ? 'ok' : 'violated'
}

function compareResults(
  fnName: DualRunMismatchLog['function'],
  tsResult: Record<string, number>,
  wasmResult: Record<string, number>,
  delta: number,
  inputSummary: DualRunMismatchLog['inputSummary'],
): void {
  const diffs: Record<string, number> = {}
  let maxAbsDiff = 0
  for (const key of Object.keys(tsResult)) {
    const diff = (wasmResult[key] ?? 0) - (tsResult[key] ?? 0)
    diffs[key] = diff
    maxAbsDiff = Math.max(maxAbsDiff, Math.abs(diff))
  }

  const sumInvariantTs = checkInvariant(tsResult, delta)
  const sumInvariantWasm = checkInvariant(wasmResult, delta)

  if (maxAbsDiff > 1e-10 || sumInvariantTs === 'violated' || sumInvariantWasm === 'violated') {
    const log: DualRunMismatchLog = {
      function: fnName,
      inputSummary,
      tsResult,
      wasmResult,
      diffs,
      maxAbsDiff,
      sumInvariantTs,
      sumInvariantWasm,
      wasmState: getWasmModuleState('factorDecomposition'),
      executionMode: getExecutionMode(),
    }
    console.warn('[factorDecomposition dual-run mismatch]', log)
    recordMismatch(fnName, maxAbsDiff, sumInvariantTs, sumInvariantWasm, inputSummary)
  }
}

/* ── 公開関数 ─────────────────────────────────── */

export function decompose2(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
): TwoFactorResult {
  if (import.meta.env.DEV) recordCall('decompose2')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return decompose2TS(prevSales, curSales, prevCust, curCust)
  }

  if (mode === 'wasm-only') {
    return decompose2Wasm(prevSales, curSales, prevCust, curCust)
  }

  // dual-run-compare
  const tsResult = decompose2TS(prevSales, curSales, prevCust, curCust)
  if (isDualRun()) {
    const wasmResult = decompose2Wasm(prevSales, curSales, prevCust, curCust)
    const delta = curSales - prevSales
    compareResults(
      'decompose2',
      { custEffect: tsResult.custEffect, ticketEffect: tsResult.ticketEffect },
      { custEffect: wasmResult.custEffect, ticketEffect: wasmResult.ticketEffect },
      delta,
      { prevSales, curSales },
    )
  }
  return tsResult
}

export function decompose3(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
): ThreeFactorResult {
  if (import.meta.env.DEV) recordCall('decompose3')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return decompose3TS(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
  }

  if (mode === 'wasm-only') {
    return decompose3Wasm(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
  }

  // dual-run-compare
  const tsResult = decompose3TS(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
  if (isDualRun()) {
    const wasmResult = decompose3Wasm(
      prevSales,
      curSales,
      prevCust,
      curCust,
      prevTotalQty,
      curTotalQty,
    )
    const delta = curSales - prevSales
    compareResults(
      'decompose3',
      {
        custEffect: tsResult.custEffect,
        qtyEffect: tsResult.qtyEffect,
        pricePerItemEffect: tsResult.pricePerItemEffect,
      },
      {
        custEffect: wasmResult.custEffect,
        qtyEffect: wasmResult.qtyEffect,
        pricePerItemEffect: wasmResult.pricePerItemEffect,
      },
      delta,
      { prevSales, curSales },
    )
  }
  return tsResult
}

export function decomposePriceMix(
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): PriceMixResult | null {
  if (import.meta.env.DEV) recordCall('decomposePriceMix')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return decomposePriceMixTS(curCategories, prevCategories)
  }

  if (mode === 'wasm-only') {
    return decomposePriceMixWasm(curCategories, prevCategories)
  }

  // dual-run-compare
  const tsResult = decomposePriceMixTS(curCategories, prevCategories)
  if (isDualRun()) {
    const wasmResult = decomposePriceMixWasm(curCategories, prevCategories)
    if (tsResult !== null && wasmResult !== null) {
      compareResults(
        'decomposePriceMix',
        { priceEffect: tsResult.priceEffect, mixEffect: tsResult.mixEffect },
        { priceEffect: wasmResult.priceEffect, mixEffect: wasmResult.mixEffect },
        tsResult.priceEffect + tsResult.mixEffect, // compare total as invariant
        { prevSales: 0, curSales: 0, categoryCount: curCategories.length },
      )
    } else if ((tsResult === null) !== (wasmResult === null)) {
      console.warn('[factorDecomposition dual-run null mismatch] decomposePriceMix:', {
        tsNull: tsResult === null,
        wasmNull: wasmResult === null,
      })
      recordNullMismatch('decomposePriceMix')
    }
  }
  return tsResult
}

export function decompose5(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): FiveFactorResult | null {
  if (import.meta.env.DEV) recordCall('decompose5')
  const mode = getExecutionMode()

  if (mode === 'ts-only' || !isWasmReady()) {
    return decompose5TS(
      prevSales,
      curSales,
      prevCust,
      curCust,
      prevTotalQty,
      curTotalQty,
      curCategories,
      prevCategories,
    )
  }

  if (mode === 'wasm-only') {
    return decompose5Wasm(
      prevSales,
      curSales,
      prevCust,
      curCust,
      prevTotalQty,
      curTotalQty,
      curCategories,
      prevCategories,
    )
  }

  // dual-run-compare
  const tsResult = decompose5TS(
    prevSales,
    curSales,
    prevCust,
    curCust,
    prevTotalQty,
    curTotalQty,
    curCategories,
    prevCategories,
  )
  if (isDualRun()) {
    const wasmResult = decompose5Wasm(
      prevSales,
      curSales,
      prevCust,
      curCust,
      prevTotalQty,
      curTotalQty,
      curCategories,
      prevCategories,
    )
    if (tsResult !== null && wasmResult !== null) {
      const delta = curSales - prevSales
      compareResults(
        'decompose5',
        {
          custEffect: tsResult.custEffect,
          qtyEffect: tsResult.qtyEffect,
          priceEffect: tsResult.priceEffect,
          mixEffect: tsResult.mixEffect,
        },
        {
          custEffect: wasmResult.custEffect,
          qtyEffect: wasmResult.qtyEffect,
          priceEffect: wasmResult.priceEffect,
          mixEffect: wasmResult.mixEffect,
        },
        delta,
        { prevSales, curSales, categoryCount: curCategories.length },
      )
    } else if ((tsResult === null) !== (wasmResult === null)) {
      console.warn('[factorDecomposition dual-run null mismatch] decompose5:', {
        tsNull: tsResult === null,
        wasmNull: wasmResult === null,
      })
      recordNullMismatch('decompose5')
    }
  }
  return tsResult
}
