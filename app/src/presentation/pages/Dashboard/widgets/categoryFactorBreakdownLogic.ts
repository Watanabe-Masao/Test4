/**
 * CategoryFactorBreakdown — 計算ロジック
 *
 * useMemo の純粋関数部分を抽出（C1: 1ファイル = 1変更理由）。
 * コンポーネントは描画のみ、ロジックはここに閉じる。
 */
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import {
  decompose2,
  decompose3,
  decompose5 as decompose5Domain,
  decomposePriceMix as decomposePriceMixDomain,
} from '@/application/hooks/calculation'
import type {
  DecompLevel,
  FactorItem,
  WaterfallFactorItem,
  DrillLevel,
  FactorTotals,
} from './categoryFactorBreakdown.types'

interface FilteredRecords {
  readonly cur: readonly CategoryLeafDailyEntry[]
  readonly prev: readonly CategoryLeafDailyEntry[]
}

/** レコードを現在のドリルパスでフィルタする */
export function filterRecordsByDrillPath(
  curRecords: readonly CategoryLeafDailyEntry[],
  prevRecords: readonly CategoryLeafDailyEntry[],
  drillPath: readonly { level: DrillLevel; code: string }[],
): FilteredRecords {
  let fc = curRecords
  let fp = prevRecords
  for (const entry of drillPath) {
    if (entry.level === 'dept') {
      fc = fc.filter((r) => r.deptCode === entry.code)
      fp = fp.filter((r) => r.deptCode === entry.code)
    } else if (entry.level === 'line') {
      fc = fc.filter((r) => r.lineCode === entry.code)
      fp = fp.filter((r) => r.lineCode === entry.code)
    }
  }
  return { cur: fc, prev: fp }
}

/** サブカテゴリが存在するかチェック */
export function checkHasSubCategories(
  filteredCur: readonly CategoryLeafDailyEntry[],
  currentLevel: DrillLevel,
): boolean {
  if (currentLevel === 'class') return false
  const childKeys = new Set<string>()
  for (const r of filteredCur) {
    if (currentLevel === 'dept') {
      childKeys.add(`${r.deptCode}|${r.lineCode}`)
    } else {
      childKeys.add(`${r.lineCode}|${r.klassCode}`)
    }
    if (childKeys.size > 1) return true
  }
  return false
}

/** 要因分解アイテムを計算する */
export function computeFactorItems(
  filtered: FilteredRecords,
  currentLevel: DrillLevel,
  activeLevel: DecompLevel,
  hasCust: boolean,
  curCustomers: number,
  prevCustomers: number,
  compact: boolean,
): FactorItem[] {
  const keyOf = (r: CategoryLeafDailyEntry) => {
    if (currentLevel === 'dept') return { code: r.deptCode, name: r.deptName || r.deptCode }
    if (currentLevel === 'line') return { code: r.lineCode, name: r.lineName || r.lineCode }
    return { code: r.klassCode, name: r.klassName || r.klassCode }
  }

  const curG = new Map<string, { name: string; qty: number; amt: number }>()
  for (const r of filtered.cur) {
    const k = keyOf(r)
    const ex = curG.get(k.code) ?? { name: k.name, qty: 0, amt: 0 }
    ex.qty += r.totalQuantity
    ex.amt += r.totalAmount
    curG.set(k.code, ex)
  }

  const prevG = new Map<string, { name: string; qty: number; amt: number }>()
  for (const r of filtered.prev) {
    const k = keyOf(r)
    const ex = prevG.get(k.code) ?? { name: k.name, qty: 0, amt: 0 }
    ex.qty += r.totalQuantity
    ex.amt += r.totalAmount
    prevG.set(k.code, ex)
  }

  const childCheck = (code: string): boolean => {
    if (currentLevel === 'class') return false
    if (currentLevel === 'dept') {
      const lines = new Set<string>()
      for (const r of filtered.cur) {
        if (r.deptCode === code) lines.add(r.lineCode)
        if (lines.size > 1) return true
      }
      return false
    }
    const klasses = new Set<string>()
    for (const r of filtered.cur) {
      if (r.lineCode === code) klasses.add(r.klassCode)
      if (klasses.size > 1) return true
    }
    return false
  }

  const childKeyOf = (r: CategoryLeafDailyEntry) => {
    if (currentLevel === 'dept') return `${r.lineCode}|${r.klassCode}`
    return r.klassCode
  }

  const filterByGroup = (recs: readonly CategoryLeafDailyEntry[], code: string) => {
    if (currentLevel === 'dept') return recs.filter((r) => r.deptCode === code)
    if (currentLevel === 'line') return recs.filter((r) => r.lineCode === code)
    return recs.filter((r) => r.klassCode === code)
  }

  const allCodes = new Set([...curG.keys(), ...prevG.keys()])
  const result: FactorItem[] = []

  for (const code of allCodes) {
    const c = curG.get(code)
    const p = prevG.get(code)
    const cQty = c?.qty ?? 0,
      cAmt = c?.amt ?? 0
    const pQty = p?.qty ?? 0,
      pAmt = p?.amt ?? 0
    const name = c?.name ?? p?.name ?? code

    let custEffect = 0
    let ticketEffect = 0
    let qtyEffect = 0
    let priceEffect = 0
    let pricePureEffect = 0
    let mixEffect = 0

    if (activeLevel === 2) {
      if (hasCust && pAmt > 0) {
        const d = decompose2(pAmt, cAmt, prevCustomers, curCustomers)
        custEffect = d.custEffect
        ticketEffect = d.ticketEffect
      } else {
        ticketEffect = cAmt - pAmt
      }
    } else if (activeLevel === 3) {
      if (hasCust && pQty > 0) {
        const d = decompose3(pAmt, cAmt, prevCustomers, curCustomers, pQty, cQty)
        custEffect = d.custEffect
        qtyEffect = d.qtyEffect
        priceEffect = d.pricePerItemEffect
      } else if (pQty > 0 && cQty > 0) {
        const d = decompose2(pAmt, cAmt, pQty, cQty)
        qtyEffect = d.custEffect
        priceEffect = d.ticketEffect
      } else {
        priceEffect = cAmt - pAmt
      }
    } else {
      const curSub = filterByGroup(filtered.cur, code)
      const prevSub = filterByGroup(filtered.prev, code)
      const curQA = curSub.map((r) => ({
        key: childKeyOf(r),
        qty: r.totalQuantity,
        amt: r.totalAmount,
      }))
      const prevQA = prevSub.map((r) => ({
        key: childKeyOf(r),
        qty: r.totalQuantity,
        amt: r.totalAmount,
      }))

      if (hasCust && pQty > 0) {
        const d = decompose5Domain(
          pAmt,
          cAmt,
          prevCustomers,
          curCustomers,
          pQty,
          cQty,
          curQA,
          prevQA,
        )
        if (d) {
          custEffect = d.custEffect
          qtyEffect = d.qtyEffect
          pricePureEffect = d.priceEffect
          mixEffect = d.mixEffect
        } else {
          const d3 = decompose3(pAmt, cAmt, prevCustomers, curCustomers, pQty, cQty)
          custEffect = d3.custEffect
          qtyEffect = d3.qtyEffect
          pricePureEffect = d3.pricePerItemEffect
        }
      } else if (pQty > 0 && cQty > 0) {
        const pm = decomposePriceMixDomain(curQA, prevQA)
        const d = decompose2(pAmt, cAmt, pQty, cQty)
        qtyEffect = d.custEffect
        const unitPriceTotal = d.ticketEffect

        if (pm) {
          const pmSum = pm.priceEffect + pm.mixEffect
          const share = Math.abs(pmSum) > 0.01 ? pm.priceEffect / pmSum : 0.5
          pricePureEffect = unitPriceTotal * share
          mixEffect = unitPriceTotal * (1 - share)
        } else {
          pricePureEffect = unitPriceTotal
        }
      } else {
        pricePureEffect = cAmt - pAmt
      }
    }

    result.push({
      name,
      code,
      _level: activeLevel,
      custEffect,
      ticketEffect,
      qtyEffect,
      priceEffect,
      pricePureEffect,
      mixEffect,
      totalChange: cAmt - pAmt,
      prevAmount: pAmt,
      curAmount: cAmt,
      hasChildren: childCheck(code),
    })
  }

  result.sort((a, b) => Math.abs(b.totalChange) - Math.abs(a.totalChange))
  return result.slice(0, compact ? 8 : 12)
}

/** ウォーターフォール範囲を計算する */
export function computeWaterfallItems(
  items: readonly FactorItem[],
  activeLevel: DecompLevel,
  hasCust: boolean,
): WaterfallFactorItem[] {
  return items.map((item) => {
    type Step = { key: string; value: number }
    const steps: Step[] = []

    if (hasCust) steps.push({ key: 'cust', value: item.custEffect })
    if (activeLevel === 2) steps.push({ key: 'ticket', value: item.ticketEffect })
    if (activeLevel >= 3) steps.push({ key: 'qty', value: item.qtyEffect })
    if (activeLevel === 3) steps.push({ key: 'price', value: item.priceEffect })
    if (activeLevel === 5) {
      steps.push({ key: 'pricePure', value: item.pricePureEffect })
      steps.push({ key: 'mix', value: item.mixEffect })
    }

    let posOffset = 0
    let negOffset = 0
    const ranges = new Map<string, [number, number]>()
    for (const step of steps) {
      if (step.value >= 0) {
        ranges.set(step.key, [posOffset, posOffset + step.value])
        posOffset += step.value
      } else {
        ranges.set(step.key, [negOffset + step.value, negOffset])
        negOffset += step.value
      }
    }

    const nil: [number, number] = [0, 0]
    return {
      ...item,
      custRange: ranges.get('cust') ?? nil,
      ticketRange: ranges.get('ticket') ?? nil,
      qtyRange: ranges.get('qty') ?? nil,
      priceRange: ranges.get('price') ?? nil,
      pricePureRange: ranges.get('pricePure') ?? nil,
      mixRange: ranges.get('mix') ?? nil,
    }
  })
}

/** 合計行を計算する */
export function computeTotals(items: readonly FactorItem[]): FactorTotals {
  const t: FactorTotals = {
    prevAmount: 0,
    curAmount: 0,
    totalChange: 0,
    custEffect: 0,
    ticketEffect: 0,
    qtyEffect: 0,
    priceEffect: 0,
    pricePureEffect: 0,
    mixEffect: 0,
  }
  for (const item of items) {
    t.prevAmount += item.prevAmount
    t.curAmount += item.curAmount
    t.totalChange += item.totalChange
    t.custEffect += item.custEffect
    t.ticketEffect += item.ticketEffect
    t.qtyEffect += item.qtyEffect
    t.priceEffect += item.priceEffect
    t.pricePureEffect += item.pricePureEffect
    t.mixEffect += item.mixEffect
  }
  return t
}
