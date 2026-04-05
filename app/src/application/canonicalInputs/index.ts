/**
 * Canonical Input Builders
 *
 * 複合指標の入力を readModel から構築する。
 * 粒度合わせと domain 計算呼び出しを一箇所に閉じ込める。
 *
 * @see references/01-principles/canonical-input-sets.md
 */
export {
  buildGrandTotalPI,
  buildStorePIResults,
  type PIResult,
  type StorePIResult,
} from './piCanonicalInput'
export {
  buildAndCalculateCustomerGap,
  buildCustomerGapCanonicalInput,
} from './customerGapCanonicalInput'
