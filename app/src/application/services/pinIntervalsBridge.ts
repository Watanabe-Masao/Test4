/**
 * pinIntervals candidate-authoritative bridge
 *
 * @semanticClass business
 * @bridgeKind business
 * @contractId BIZ-011
 * @authorityKind candidate-authoritative
 */
import { calculatePinIntervals as calculatePinIntervalsTS } from '@/domain/calculations/pinIntervals'
import type { PinInterval } from '@/domain/calculations/pinIntervals'
import type { DailyRecord } from '@/domain/models/record'
import { getPinIntervalsWasmExports } from './wasmEngine'
import { calculatePinIntervalsWasm } from './pinIntervalsWasm'

export type { PinInterval }

export type PinIntervalsBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: PinIntervalsBridgeMode = 'current-only'

export function setPinIntervalsBridgeMode(mode: PinIntervalsBridgeMode): void {
  bridgeMode = mode
}

export function getPinIntervalsBridgeMode(): PinIntervalsBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getPinIntervalsWasmExports() !== null
}

export interface DualRunResult {
  readonly current: PinInterval[]
  readonly candidate: PinInterval[]
  readonly match: boolean
}

let lastDualRunResult: DualRunResult | null = null

export function getLastDualRunResult(): DualRunResult | null {
  return lastDualRunResult
}

function compareResults(a: PinInterval[], b: PinInterval[]): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (ai, i) =>
      ai.startDay === b[i].startDay &&
      ai.endDay === b[i].endDay &&
      ai.cogs === b[i].cogs &&
      ai.grossProfit === b[i].grossProfit &&
      ai.grossProfitRate === b[i].grossProfitRate,
  )
}

/**
 * pinIntervals bridge。daysInMonth は pins から推定（最終 pin day）。
 * dual-run / candidate モードでは adapter が DailyRecord → flat contract に正規化する。
 */
export function calculatePinIntervals(
  daily: ReadonlyMap<number, DailyRecord>,
  openingInventory: number | null,
  pins: [number, number][],
): PinInterval[] {
  // daysInMonth: 最終 pin day を使用（TS 版は daysInMonth を引数に取らない）
  const daysInMonth = pins.length > 0 ? pins[pins.length - 1][0] : 0

  switch (bridgeMode) {
    case 'current-only':
      return calculatePinIntervalsTS(daily, openingInventory, pins)
    case 'candidate-only':
      return calculatePinIntervalsWasm(daily, openingInventory, pins, daysInMonth)
    case 'dual-run-compare': {
      const current = calculatePinIntervalsTS(daily, openingInventory, pins)
      if (isCandidateReady()) {
        const candidate = calculatePinIntervalsWasm(daily, openingInventory, pins, daysInMonth)
        const match = compareResults(current, candidate)
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(
            `[pinIntervalsBridge] dual-run mismatch: current=${JSON.stringify(current)} candidate=${JSON.stringify(candidate)}`,
          )
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return calculatePinIntervalsWasm(daily, openingInventory, pins, daysInMonth)
        } catch {
          return calculatePinIntervalsTS(daily, openingInventory, pins)
        }
      }
      return calculatePinIntervalsTS(daily, openingInventory, pins)
    }
  }
}

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
