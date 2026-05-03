/**
 * piValue candidate-authoritative bridge
 *
 * @semanticClass business
 * @bridgeKind business
 * @contractId BIZ-012
 * @authorityKind candidate-authoritative
 *
 * Current reference: TS (domain/calculations/piValue.ts)
 * Candidate: WASM (wasm/pi-value/)
 * Promote Ceremony まで current authoritative (business-authoritative) は不変。
 *
 * candidate WASM 実装と current TS 実装を切り替える bridge。
 * 4 モードを持ち、dual-run-compare による昇格前観測を可能にする。
 *
 * 対象: 3 business candidate 関数（calculateQuantityPI, calculateAmountPI, calculatePIValues）
 *
 * @see references/03-implementation/tier1-business-migration-plan.md — 8ステップ移行プロセス
 * @see references/03-implementation/contract-definition-policy.md — 契約定義ポリシー
 *
 * @responsibility R:unclassified
 */
import {
  calculateQuantityPI as calculateQuantityPITS,
  calculateAmountPI as calculateAmountPITS,
  calculatePIValues as calculatePIValuesTS,
} from '@/domain/calculations/piValue'
import type { PIValueInput, PIValueResult } from '@/domain/calculations/piValue'
import { getPiValueWasmExports } from './wasmEngine'
import {
  calculateQuantityPIWasm,
  calculateAmountPIWasm,
  calculatePIValuesWasm,
} from './piValueWasm'

// Re-export types for consumer convenience
export type { PIValueInput, PIValueResult }

/* ── Bridge モード ──────────────────────────────── */

/**
 * Bridge 実行モード。
 *
 * - current-only: 既存 TS 実装のみ（デフォルト、通常運用）
 * - candidate-only: candidate WASM 実装のみ（テスト環境での検証）
 * - dual-run-compare: current + candidate を両方実行して比較（昇格前観測）
 * - fallback-to-current: candidate 失敗時に current に戻す（安全運用）
 */
export type PiValueBridgeMode =
  | 'current-only'
  | 'candidate-only'
  | 'dual-run-compare'
  | 'fallback-to-current'

let bridgeMode: PiValueBridgeMode = 'current-only'

/** Bridge モードを設定する。テスト・dual-run 用。 */
export function setPiValueBridgeMode(mode: PiValueBridgeMode): void {
  bridgeMode = mode
}

/** 現在の Bridge モードを取得する。 */
export function getPiValueBridgeMode(): PiValueBridgeMode {
  return bridgeMode
}

/* ── WASM ready 判定 ───────────────────────────── */

function isCandidateReady(): boolean {
  return getPiValueWasmExports() !== null
}

/* ── Dual-run compare 結果 ─────────────────────── */

export interface DualRunResult<T> {
  readonly current: T
  readonly candidate: T
  readonly match: boolean
}

let lastDualRunResult: DualRunResult<PIValueResult> | null = null

/** 最新の dual-run 比較結果を取得する。 */
export function getLastDualRunResult(): DualRunResult<PIValueResult> | null {
  return lastDualRunResult
}

function comparePIValues(a: PIValueResult, b: PIValueResult): boolean {
  return a.quantityPI === b.quantityPI && a.amountPI === b.amountPI
}

/* ── Bridge 関数 ───────────────────────────────── */

/**
 * 点数PI値を計算する。Bridge モードに応じて実装を切り替える。
 */
export function calculateQuantityPI(totalQuantity: number, customers: number): number {
  switch (bridgeMode) {
    case 'current-only':
      return calculateQuantityPITS(totalQuantity, customers)
    case 'candidate-only':
      return calculateQuantityPIWasm(totalQuantity, customers)
    case 'dual-run-compare': {
      const current = calculateQuantityPITS(totalQuantity, customers)
      if (isCandidateReady()) {
        const candidate = calculateQuantityPIWasm(totalQuantity, customers)
        if (current !== candidate && import.meta.env.DEV) {
          console.warn(
            `[piValueBridge] dual-run mismatch: quantityPI current=${current} candidate=${candidate}`,
          )
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return calculateQuantityPIWasm(totalQuantity, customers)
        } catch {
          return calculateQuantityPITS(totalQuantity, customers)
        }
      }
      return calculateQuantityPITS(totalQuantity, customers)
    }
  }
}

/**
 * 金額PI値を計算する。Bridge モードに応じて実装を切り替える。
 */
export function calculateAmountPI(totalSales: number, customers: number): number {
  switch (bridgeMode) {
    case 'current-only':
      return calculateAmountPITS(totalSales, customers)
    case 'candidate-only':
      return calculateAmountPIWasm(totalSales, customers)
    case 'dual-run-compare': {
      const current = calculateAmountPITS(totalSales, customers)
      if (isCandidateReady()) {
        const candidate = calculateAmountPIWasm(totalSales, customers)
        if (current !== candidate && import.meta.env.DEV) {
          console.warn(
            `[piValueBridge] dual-run mismatch: amountPI current=${current} candidate=${candidate}`,
          )
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return calculateAmountPIWasm(totalSales, customers)
        } catch {
          return calculateAmountPITS(totalSales, customers)
        }
      }
      return calculateAmountPITS(totalSales, customers)
    }
  }
}

/**
 * PI値を一括計算する。Bridge モードに応じて実装を切り替える。
 * dual-run-compare モードでは比較結果を保存する。
 */
export function calculatePIValues(input: PIValueInput): PIValueResult {
  switch (bridgeMode) {
    case 'current-only':
      return calculatePIValuesTS(input)
    case 'candidate-only':
      return calculatePIValuesWasm(input)
    case 'dual-run-compare': {
      const current = calculatePIValuesTS(input)
      if (isCandidateReady()) {
        const candidate = calculatePIValuesWasm(input)
        const match = comparePIValues(current, candidate)
        lastDualRunResult = { current, candidate, match }
        if (!match && import.meta.env.DEV) {
          console.warn(
            `[piValueBridge] dual-run mismatch: current=${JSON.stringify(current)} candidate=${JSON.stringify(candidate)}`,
          )
        }
      }
      return current
    }
    case 'fallback-to-current': {
      if (isCandidateReady()) {
        try {
          return calculatePIValuesWasm(input)
        } catch {
          return calculatePIValuesTS(input)
        }
      }
      return calculatePIValuesTS(input)
    }
  }
}

/**
 * Bridge モードを current-only にリセットする。
 * rollback 時に使用。
 */
export function rollbackToCurrentOnly(): void {
  bridgeMode = 'current-only'
  lastDualRunResult = null
}
