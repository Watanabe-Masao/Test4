/**
 * 売上要因分解ロジック
 *
 * 売上前年差を最大5つの要因に分解する:
 * 1. 客数効果   = (C₁−C₀) × Q₀ × P̄₀
 * 2. 点数効果   = C₁ × (Q₁−Q₀) × P̄₀
 * 3. 単価効果   = C₁ × Q₁ × (P̄₁−P̄₀)
 *    ├ 価格効果  = C₁Q₁ × Σ(p₁ᵢ−p₀ᵢ)s₀ᵢ
 *    └ 構成比変化効果 = C₁Q₁ × Σp₁ᵢ(s₁ᵢ−s₀ᵢ)
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

/* ── 2要素分解 ──────────────────────────────────────── */

/**
 * 客数効果 + 客単価効果
 */
export function decompose2(
  prevSales: number, curSales: number,
  prevCust: number, curCust: number,
): TwoFactorResult {
  const prevAvgTicket = safeDivide(prevSales, prevCust, 0)
  const curAvgTicket = safeDivide(curSales, curCust, 0)
  return {
    custEffect: (curCust - prevCust) * prevAvgTicket,
    ticketEffect: (curAvgTicket - prevAvgTicket) * curCust,
  }
}

/* ── 3要素分解 ──────────────────────────────────────── */

/**
 * 客数効果 + 点数効果 + 単価効果
 */
export function decompose3(
  prevSales: number, curSales: number,
  prevCust: number, curCust: number,
  prevTotalQty: number, curTotalQty: number,
): ThreeFactorResult {
  const prevQPC = safeDivide(prevTotalQty, prevCust, 0)
  const curQPC = safeDivide(curTotalQty, curCust, 0)
  const prevPPI = safeDivide(prevSales, prevTotalQty, 0)
  const curPPI = safeDivide(curSales, curTotalQty, 0)

  return {
    custEffect: (curCust - prevCust) * prevQPC * prevPPI,
    qtyEffect: curCust * (curQPC - prevQPC) * prevPPI,
    pricePerItemEffect: curCust * curQPC * (curPPI - prevPPI),
  }
}

/* ── 価格/ミックス分解 ─────────────────────────────── */

/**
 * 平均単価変動を価格効果とミックス効果に分解。
 *
 * 価格効果    = TQ₁ × Σᵢ (p₁ᵢ − p₀ᵢ) × s₀ᵢ  (各カテゴリの値上げ/値下げ)
 * 構成比変化効果 = TQ₁ × Σᵢ p₁ᵢ × (s₁ᵢ − s₀ᵢ)  (構成比変化)
 *
 * 消滅カテゴリ(p₁未定義)は p₁=p₀ と仮定 → 純粋なミックス効果
 * 新規カテゴリ(p₀未定義)は p₀=p₁ と仮定 → 純粋なミックス効果
 */
export function decomposePriceMix(
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): PriceMixResult | null {
  const curMap = new Map<string, { qty: number; amt: number }>()
  for (const c of curCategories) {
    const ex = curMap.get(c.key) ?? { qty: 0, amt: 0 }
    ex.qty += c.qty; ex.amt += c.amt
    curMap.set(c.key, ex)
  }

  const prevMap = new Map<string, { qty: number; amt: number }>()
  for (const c of prevCategories) {
    const ex = prevMap.get(c.key) ?? { qty: 0, amt: 0 }
    ex.qty += c.qty; ex.amt += c.amt
    prevMap.set(c.key, ex)
  }

  const prevTQ = [...prevMap.values()].reduce((s, c) => s + c.qty, 0)
  const curTQ = [...curMap.values()].reduce((s, c) => s + c.qty, 0)
  if (prevTQ <= 0 || curTQ <= 0) return null

  let deltaPPrice = 0
  let deltaPMix = 0

  const allKeys = new Set([...curMap.keys(), ...prevMap.keys()])
  for (const key of allKeys) {
    const c = curMap.get(key)
    const p = prevMap.get(key)
    const cQty = c?.qty ?? 0, cAmt = c?.amt ?? 0
    const pQty = p?.qty ?? 0, pAmt = p?.amt ?? 0

    // 消滅/新規カテゴリは相手期の単価を代用 → 価格差=0
    const p0 = pQty > 0 ? safeDivide(pAmt, pQty, 0) : safeDivide(cAmt, cQty, 0)
    const p1 = cQty > 0 ? safeDivide(cAmt, cQty, 0) : safeDivide(pAmt, pQty, 0)
    const s0 = pQty / prevTQ
    const s1 = cQty / curTQ

    deltaPPrice += (p1 - p0) * s0
    deltaPMix += p1 * (s1 - s0)
  }

  return {
    priceEffect: curTQ * deltaPPrice,
    mixEffect: curTQ * deltaPMix,
  }
}

/* ── 5要素分解（統合） ─────────────────────────────── */

/**
 * 客数効果 + 点数効果 + 価格効果 + ミックス効果
 */
export function decompose5(
  prevSales: number, curSales: number,
  prevCust: number, curCust: number,
  prevTotalQty: number, curTotalQty: number,
  curCategories: readonly CategoryQtyAmt[],
  prevCategories: readonly CategoryQtyAmt[],
): FiveFactorResult | null {
  const three = decompose3(prevSales, curSales, prevCust, curCust, prevTotalQty, curTotalQty)
  const pm = decomposePriceMix(curCategories, prevCategories)
  if (!pm) return null

  return {
    custEffect: three.custEffect,
    qtyEffect: three.qtyEffect,
    priceEffect: pm.priceEffect,
    mixEffect: pm.mixEffect,
  }
}
