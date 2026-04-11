/**
 * inventoryCalc candidate-authoritative bridge
 *
 * @semanticClass business
 * @bridgeKind business
 * @contractId BIZ-009
 * @authorityKind candidate-authoritative
 *
 * Current reference: TS (domain/calculations/inventoryCalc.ts)
 * Candidate: WASM (wasm/inventory-calc/)
 * Promote Ceremony まで current authoritative (business-authoritative) は不変。
 */
import { computeEstimatedInventoryDetails as computeTS } from '@/domain/calculations/inventoryCalc'
import type { InventoryDetailRow } from '@/domain/calculations/inventoryCalc'
import type { DailyRecord } from '@/domain/models/record'
import { getInventoryCalcWasmExports } from './wasmEngine'
import { computeEstimatedInventoryDetailsWasm } from './inventoryCalcWasm'

export type { InventoryDetailRow }

export type InventoryCalcBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: InventoryCalcBridgeMode = 'current-only'

export function setInventoryCalcBridgeMode(mode: InventoryCalcBridgeMode): void {
  bridgeMode = mode
}

export function getInventoryCalcBridgeMode(): InventoryCalcBridgeMode {
  return bridgeMode
}

function isCandidateReady(): boolean {
  return getInventoryCalcWasmExports() !== null
}

export interface DualRunResult {
  readonly current: InventoryDetailRow[]
  readonly candidate: InventoryDetailRow[]
  readonly match: boolean
}

let lastDualRunResult: DualRunResult | null = null

export function getLastDualRunResult(): DualRunResult | null {
  return lastDualRunResult
}

function compareResults(a: InventoryDetailRow[], b: InventoryDetailRow[]): boolean {
  if (a.length !== b.length) return false
  return a.every(
    (ai, i) =>
      ai.day === b[i].day &&
      ai.estimated === b[i].estimated &&
      ai.actual === b[i].actual &&
      ai.estCogs === b[i].estCogs,
  )
}

export function computeEstimatedInventoryDetails(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  openingInventory: number,
  closingInventory: number | null,
  markupRate: number,
  discountRate: number,
): InventoryDetailRow[] {
  switch (bridgeMode) {
    case 'current-only':
      return computeTS(
        daily,
        daysInMonth,
        openingInventory,
        closingInventory,
        markupRate,
        discountRate,
      )
    case 'candidate-only':
      return computeEstimatedInventoryDetailsWasm(
        daily,
        daysInMonth,
        openingInventory,
        closingInventory,
        markupRate,
        discountRate,
      )
    case 'dual-run-compare': {
      const current = computeTS(
        daily,
        daysInMonth,
        openingInventory,
        closingInventory,
        markupRate,
        discountRate,
      )
      if (isCandidateReady()) {
        const candidate = computeEstimatedInventoryDetailsWasm(
          daily,
          daysInMonth,
          openingInventory,
          closingInventory,
          markupRate,
          discountRate,
        )
        const match = compareResults(current, candidate)
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(`[inventoryCalcBridge] dual-run mismatch`)
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return computeEstimatedInventoryDetailsWasm(
            daily,
            daysInMonth,
            openingInventory,
            closingInventory,
            markupRate,
            discountRate,
          )
        } catch {
          return computeTS(
            daily,
            daysInMonth,
            openingInventory,
            closingInventory,
            markupRate,
            discountRate,
          )
        }
      }
      return computeTS(
        daily,
        daysInMonth,
        openingInventory,
        closingInventory,
        markupRate,
        discountRate,
      )
    }
  }
}

export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
