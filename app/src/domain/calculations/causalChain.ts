/**
 * CausalChainExplorer の純粋ロジック。
 *
 * UIコンポーネントから抽出した因果チェーンのステップ生成ロジック。
 * ドメイン層の型のみに依存し、React非依存でテスト可能。
 */
import { safeDivide } from './utils'
import type { StoreResult, DiscountEntry } from '@/domain/models'

export interface CausalFactor {
  readonly label: string
  readonly value: number
  readonly formatted: string
  readonly color: string
}

export interface CausalStep {
  readonly title: string
  readonly description: string
  readonly factors: readonly CausalFactor[]
  readonly maxFactorIndex: number
  readonly insight: string
}

/**
 * buildCausalSteps の前年データ入力。
 * StoreResult の全フィールドは不要。PrevYearData から変換する場合は
 * 取得不可能なフィールドを null にすることで部分的な比較を行える。
 */
export interface CausalChainPrevInput {
  readonly grossProfitRate: number | null
  readonly costRate: number | null
  readonly discountRate: number
  readonly consumableRate: number | null
  readonly discountEntries: readonly DiscountEntry[]
}

/** StoreResult → CausalChainPrevInput 変換 */
export function storeResultToCausalPrev(r: StoreResult): CausalChainPrevInput {
  return {
    grossProfitRate: r.invMethodGrossProfitRate ?? r.estMethodMarginRate,
    costRate: safeDivide(r.inventoryCost + r.deliverySalesCost, r.grossSales, 0),
    discountRate: r.discountRate,
    consumableRate: r.consumableRate,
    discountEntries: r.discountEntries,
  }
}

/** パーセントフォーマット（toPctと同等だがReact非依存） */
function fmtPct(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`
}

function fmtComma(v: number): string {
  return Math.round(v).toLocaleString('ja-JP')
}

/**
 * StoreResult（当年）+ 前年データから因果チェーンのステップ列を生成する。
 *
 * ステップ構造:
 * 1. 粗利率の状況 — メイン指標の把握
 * 2. 粗利率変動の要因分解 — 原価・売変・消耗品の寄与度
 * 3. 売変種別内訳 — 売変データがある場合のみ
 * 4. 推奨アクション — 分析結果に基づく提案
 */
export function buildCausalSteps(
  result: StoreResult,
  prevYear: CausalChainPrevInput | undefined,
): readonly CausalStep[] {
  const r = result
  const prev = prevYear
  const steps: CausalStep[] = []

  // Step 1: 粗利率の状況
  const currentGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate
  const prevGPRate = prev?.grossProfitRate ?? null
  const gpRateDelta = prevGPRate != null ? currentGPRate - prevGPRate : 0

  const budgetGPRate = r.grossProfitRateBudget
  const budgetDelta = budgetGPRate > 0 ? currentGPRate - budgetGPRate : 0

  const deltaDesc = prevGPRate != null
    ? `前年 ${fmtPct(prevGPRate)} → 今年 ${fmtPct(currentGPRate)}（${gpRateDelta >= 0 ? '+' : ''}${fmtPct(gpRateDelta)}）`
    : `今年 ${fmtPct(currentGPRate)}`

  steps.push({
    title: '粗利率の状況',
    description: deltaDesc,
    factors: [
      ...(prevGPRate != null ? [{ label: '前年比変動', value: Math.abs(gpRateDelta), formatted: `${gpRateDelta >= 0 ? '+' : ''}${fmtPct(gpRateDelta)}`, color: gpRateDelta >= 0 ? '#22c55e' : '#ef4444' }] : []),
      ...(budgetGPRate > 0 ? [{ label: '予算比変動', value: Math.abs(budgetDelta), formatted: `${budgetDelta >= 0 ? '+' : ''}${fmtPct(budgetDelta)}`, color: budgetDelta >= 0 ? '#22c55e' : '#ef4444' }] : []),
      { label: '現在の粗利率', value: currentGPRate, formatted: fmtPct(currentGPRate), color: '#6366f1' },
    ],
    maxFactorIndex: 0,
    insight: gpRateDelta < -0.01
      ? '粗利率が前年比で1pt以上低下しています。要因をStep 2で深堀りします。'
      : gpRateDelta > 0.01
      ? '粗利率が前年比で改善しています。どの要因が寄与したかを確認します。'
      : '粗利率は前年と同等水準です。構造的な変化がないか確認します。',
  })

  // Step 2: 要因分解
  const costRate = safeDivide(r.inventoryCost + r.deliverySalesCost, r.grossSales, 0)
  const discountRate = r.discountRate
  const consumableRate = r.consumableRate

  const prevCostRate = prev?.costRate ?? null
  const prevDiscountRate = prev ? prev.discountRate : null
  const prevConsumableRate = prev?.consumableRate ?? null

  const costDelta = prevCostRate != null ? costRate - prevCostRate : 0
  const discountDelta = prevDiscountRate != null ? discountRate - prevDiscountRate : 0
  const consumableDelta = prevConsumableRate != null ? consumableRate - prevConsumableRate : 0

  const factors2: CausalFactor[] = [
    { label: '原価率変動', value: Math.abs(costDelta), formatted: `${costDelta >= 0 ? '+' : ''}${fmtPct(costDelta)}`, color: '#ef4444' },
    { label: '売変率変動', value: Math.abs(discountDelta), formatted: `${discountDelta >= 0 ? '+' : ''}${fmtPct(discountDelta)}`, color: '#f59e0b' },
    { label: '消耗品率変動', value: Math.abs(consumableDelta), formatted: `${consumableDelta >= 0 ? '+' : ''}${fmtPct(consumableDelta)}`, color: '#f97316' },
  ]

  const maxIdx2 = factors2.reduce((max, f, i) => f.value > factors2[max].value ? i : max, 0)
  const maxFactor = factors2[maxIdx2].label.replace('変動', '')

  steps.push({
    title: '粗利率変動の要因分解',
    description: `原価率 ${fmtPct(costRate)} / 売変率 ${fmtPct(discountRate)} / 消耗品率 ${fmtPct(consumableRate)}`,
    factors: factors2,
    maxFactorIndex: maxIdx2,
    insight: prev
      ? `最大の変動要因は「${maxFactor}」です（${factors2[maxIdx2].formatted}）。Step 3で詳細を確認します。`
      : '前年データがないため差分分析は行えません。現在の構成比を表示しています。',
  })

  // Step 3: 売変種別内訳
  const entries = r.discountEntries
  const prevEntries = prev?.discountEntries

  if (entries.length > 0) {
    const entryFactors = entries.map((e: DiscountEntry) => {
      const prevEntry = prevEntries?.find((pe: DiscountEntry) => pe.type === e.type)
      const delta = prevEntry ? e.amount - prevEntry.amount : 0
      return {
        label: e.label,
        value: Math.abs(delta),
        formatted: `${fmtComma(e.amount)}円${prevEntry ? `（差: ${delta >= 0 ? '+' : ''}${fmtComma(delta)}円）` : ''}`,
        color: e.type === '71' ? '#ef4444' : e.type === '72' ? '#f59e0b' : e.type === '73' ? '#3b82f6' : '#8b5cf6',
      }
    })

    const maxIdx3 = entryFactors.length > 0
      ? entryFactors.reduce((max, f, i) => f.value > entryFactors[max].value ? i : max, 0)
      : 0

    steps.push({
      title: '売変種別内訳',
      description: `売変合計: ${fmtComma(r.totalDiscount)}円（${fmtPct(r.discountRate)}）`,
      factors: entryFactors,
      maxFactorIndex: maxIdx3,
      insight: entryFactors.length > 0 && prevEntries
        ? `最も変動が大きい種別は「${entryFactors[maxIdx3].label}」です。`
        : '売変の種別内訳を表示しています。',
    })
  }

  // Step 4: 推奨アクション
  const actions: string[] = []
  if (discountDelta > 0.005) actions.push('売変率が上昇しています。見切りタイミングの見直しを検討してください。')
  if (costDelta > 0.005) actions.push('原価率が上昇しています。仕入先や発注ロットの見直しを検討してください。')
  if (consumableDelta > 0.003) actions.push('消耗品率が上昇しています。消耗品の管理を確認してください。')
  if (gpRateDelta > 0.01) actions.push('粗利率が改善しています。成功要因を維持する施策を継続してください。')
  if (actions.length === 0) actions.push('現時点で大きな変動は見られません。引き続きモニタリングを継続してください。')

  steps.push({
    title: '推奨アクション',
    description: '分析結果に基づく次のステップ',
    factors: [],
    maxFactorIndex: 0,
    insight: actions.join('\n'),
  })

  return steps
}
