/**
 * 売上要因分解ロジック（シャープリー値ベース）
 *
 * ── 2変数分解 (n=2) ──
 *   S = C × T  (客数 × 客単価)
 *   φ_C = ΔC × ½(T₀ + T₁)
 *   φ_T = ΔT × ½(C₀ + C₁)
 *
 * ── 3変数分解 (n=3) ──
 *   S = C × Q × P̄  (客数 × 一人当たり点数 × 点単価)
 *   重み = |S|!(n-1-|S|)!/n! → (2/6, 1/6, 1/6, 2/6)
 *
 *   φ_C = ΔC/6 × (2Q₀P̄₀ + Q₁P̄₀ + Q₀P̄₁ + 2Q₁P̄₁)
 *   φ_Q = ΔQ/6 × (2C₀P̄₀ + C₁P̄₀ + C₀P̄₁ + 2C₁P̄₁)
 *   φ_P̄ = ΔP̄/6 × (2C₀Q₀ + C₁Q₀ + C₀Q₁ + 2C₁Q₁)
 *
 * ── 5要素分解 (decompose3 + price/mix ratio) ──
 *   1. decompose3 で φ_C, φ_Q, φ_P̄ を実売上ベースで計算
 *   2. decomposePriceMix でカテゴリ別 価格/構成比 比率を取得
 *   3. φ_P̄ を比率で分割: φ_price + φ_mix = φ_P̄
 *
 * 性質: φ_C + φ_Q + φ_price + φ_mix = ΔS（実売上差に完全一致）
 * 利点: totalSales と categoryTimeSales の合計が異なっても正しく動作
 *
 * @responsibility R:unclassified
 */
import { safeDivide } from './utils'

/* ── 型 ─────────────────────────────────────────────── */

export interface CategoryQtyAmt {
  readonly key: string
  readonly qty: number
  readonly amt: number
}

export interface TwoFactorResult {
  custEffect: number
  ticketEffect: number
}

export interface ThreeFactorResult {
  custEffect: number
  qtyEffect: number
  pricePerItemEffect: number
}

export interface FiveFactorResult {
  custEffect: number
  qtyEffect: number
  priceEffect: number
  mixEffect: number
}

export interface PriceMixResult {
  priceEffect: number
  mixEffect: number
}

/* ── 2要素シャープリー分解 ─────────────────────────── */

/**
 * S = C × T（客数×客単価）の2変数シャープリー値
 *
 *   φ_C = (C₁−C₀) × ½(T₀+T₁)
 *   φ_T = (T₁−T₀) × ½(C₀+C₁)
 */
export function decompose2(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
): TwoFactorResult {
  const T0 = safeDivide(prevSales, prevCust, 0)
  const T1 = safeDivide(curSales, curCust, 0)
  return {
    custEffect: (curCust - prevCust) * 0.5 * (T0 + T1),
    ticketEffect: (T1 - T0) * 0.5 * (prevCust + curCust),
  }
}

/* ── 3要素シャープリー分解 ─────────────────────────── */

/**
 * S = C × Q × P̄ の3変数シャープリー値
 *
 * 各変数のシャープリー値は、他の2変数の全組み合わせに対する限界貢献の
 * 重み付き平均。重み = |S|!(n-1-|S|)!/n! で n=3:
 *   |S|=0: 2/6, |S|=1: 1/6, |S|=2: 2/6
 *
 *   φ_C = ΔC/6 × (2Q₀P̄₀ + Q₁P̄₀ + Q₀P̄₁ + 2Q₁P̄₁)
 *   φ_Q = ΔQ/6 × (2C₀P̄₀ + C₁P̄₀ + C₀P̄₁ + 2C₁P̄₁)
 *   φ_P̄ = ΔP̄/6 × (2C₀Q₀ + C₁Q₀ + C₀Q₁ + 2C₁Q₁)
 */
export function decompose3(
  prevSales: number,
  curSales: number,
  prevCust: number,
  curCust: number,
  prevTotalQty: number,
  curTotalQty: number,
): ThreeFactorResult {
  const C0 = prevCust,
    C1 = curCust
  const Q0 = safeDivide(prevTotalQty, prevCust, 0)
  const Q1 = safeDivide(curTotalQty, curCust, 0)
  const P0 = safeDivide(prevSales, prevTotalQty, 0)
  const P1 = safeDivide(curSales, curTotalQty, 0)

  // Shapley weights for n=3: (2, 1, 1, 2) / 6
  const sixth = 1 / 6
  return {
    custEffect: (C1 - C0) * sixth * (2 * Q0 * P0 + Q1 * P0 + Q0 * P1 + 2 * Q1 * P1),
    qtyEffect: (Q1 - Q0) * sixth * (2 * C0 * P0 + C1 * P0 + C0 * P1 + 2 * C1 * P1),
    pricePerItemEffect: (P1 - P0) * sixth * (2 * C0 * Q0 + C1 * Q0 + C0 * Q1 + 2 * C1 * Q1),
  }
}

/* ── 価格/構成比シャープリー分解 ─────────────────── */

/**
 * 平均単価変動を価格効果と構成比変化効果にシャープリー分解。
 *
 *   φ_p^(P̄) = ½[Σ(p₁ᵢ−p₀ᵢ)s₀ᵢ + Σ(p₁ᵢ−p₀ᵢ)s₁ᵢ]
 *   φ_s^(P̄) = ½[Σp₀ᵢ(s₁ᵢ−s₀ᵢ) + Σp₁ᵢ(s₁ᵢ−s₀ᵢ)]
 *
 * 消滅カテゴリ(p₁未定義)は p₁=p₀ と仮定 → 純粋な構成比変化効果
 * 新規カテゴリ(p₀未定義)は p₀=p₁ と仮定 → 純粋な構成比変化効果
 *
 * 戻り値は単価レベルのシャープリー値 × curTQ。
 * 比率 priceEffect/(priceEffect+mixEffect) が4変数シャープリーの比率と一致する。
 */
export function decomposePriceMix(
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): PriceMixResult | null {
  const curMap = new Map<string, { qty: number; amt: number }>()
  for (const c of curCategories) {
    const ex = curMap.get(c.key) ?? { qty: 0, amt: 0 }
    ex.qty += c.qty
    ex.amt += c.amt
    curMap.set(c.key, ex)
  }

  const prevMap = new Map<string, { qty: number; amt: number }>()
  for (const c of prevCategories) {
    const ex = prevMap.get(c.key) ?? { qty: 0, amt: 0 }
    ex.qty += c.qty
    ex.amt += c.amt
    prevMap.set(c.key, ex)
  }

  const prevTQ = [...prevMap.values()].reduce((s, c) => s + c.qty, 0)
  const curTQ = [...curMap.values()].reduce((s, c) => s + c.qty, 0)
  if (prevTQ <= 0 || curTQ <= 0) return null

  let phiPrice = 0
  let phiMix = 0

  const allKeys = new Set([...curMap.keys(), ...prevMap.keys()])
  for (const key of allKeys) {
    const c = curMap.get(key)
    const p = prevMap.get(key)
    const cQty = c?.qty ?? 0,
      cAmt = c?.amt ?? 0
    const pQty = p?.qty ?? 0,
      pAmt = p?.amt ?? 0

    // 消滅/新規カテゴリは相手期の単価を代用 → 価格差=0
    const p0 = pQty > 0 ? safeDivide(pAmt, pQty, 0) : safeDivide(cAmt, cQty, 0)
    const p1 = cQty > 0 ? safeDivide(cAmt, cQty, 0) : safeDivide(pAmt, pQty, 0)
    const s0 = safeDivide(pQty, prevTQ, 0)
    const s1 = safeDivide(cQty, curTQ, 0)

    // シャープリー: 前年・当年の構成比を平均
    phiPrice += 0.5 * ((p1 - p0) * s0 + (p1 - p0) * s1)
    // シャープリー: 前年・当年の単価を平均
    phiMix += 0.5 * (p0 * (s1 - s0) + p1 * (s1 - s0))
  }

  return {
    priceEffect: curTQ * phiPrice,
    mixEffect: curTQ * phiMix,
  }
}

/* ── 5要素分解（3変数シャープリー + 価格/構成比分割）── */

/**
 * S = C × Q × P̄ を客数・点数・価格・構成比の4効果に分解。
 *
 * 手順:
 *   1. decompose3 で実売上に基づく3変数シャープリー値を計算
 *      → φ_C, φ_Q, φ_P̄  (合計 = curSales − prevSales を保証)
 *   2. decomposePriceMix でカテゴリ別の価格/構成比変動比率を計算
 *   3. φ_P̄ をその比率で価格効果と構成比変化効果に分割
 *
 * これにより φ_C + φ_Q + φ_price + φ_mix = curSales − prevSales が
 * データソース間の差異に関係なく常に成立する。
 */
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
  // Step 1: 3変数シャープリー分解（実売上にアンカー → 合計保証）
  const d3 = decompose3(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)

  // Step 2: カテゴリ別の価格/構成比シャープリー比率
  const pm = decomposePriceMix(curCategories, prevCategories)
  if (!pm) return null

  // Step 3: 単価効果を価格/構成比に分割
  const pmTotal = pm.priceEffect + pm.mixEffect
  let priceEffect: number
  let mixEffect: number

  if (Math.abs(pmTotal) < 1) {
    // 単価変動が無視できるほど小さい場合は均等分割（両方とも≈0）
    priceEffect = d3.pricePerItemEffect * 0.5
    mixEffect = d3.pricePerItemEffect * 0.5
  } else {
    const priceFraction = pm.priceEffect / pmTotal
    priceEffect = d3.pricePerItemEffect * priceFraction
    mixEffect = d3.pricePerItemEffect * (1 - priceFraction)
  }

  return {
    custEffect: d3.custEffect,
    qtyEffect: d3.qtyEffect,
    priceEffect,
    mixEffect,
  }
}
