/**
 * MetricBreakdown ViewModel 変換 — useMetricBreakdown から抽出した純粋変換ロジック
 *
 * 7つの useMemo の derivation ロジックを純粋関数化し、テスト可能にした。
 */
import type { Explanation, MetricId, MetricUnit, Store } from '@/domain/models'
import { formatCurrency, formatPercent } from '@/domain/formatting'
import type {
  FormattedInput,
  ReverseLink,
  BreakdownRow,
  EvidenceSummaryEntry,
  EvidenceRefRow,
  BreadcrumbItem,
} from '@/application/hooks/useMetricBreakdown'

// ── ヘルパー ──

function formatValue(value: number, unit: MetricUnit): string {
  switch (unit) {
    case 'yen':
      return formatCurrency(value)
    case 'rate':
      return formatPercent(value)
    case 'count':
      return value.toLocaleString()
  }
}

export function resolveStoreName(storeId: string, stores?: ReadonlyMap<string, Store>): string {
  if (storeId === 'aggregate') return '全店合計'
  if (!stores) return storeId
  const store = stores.get(storeId)
  return store ? `${store.name}（${store.code}）` : storeId
}

const DATA_TYPE_LABELS: Record<string, string> = {
  sales: '売上データ',
  purchase: '仕入データ',
  discount: '売変データ',
  flowers: '花データ',
  directProduce: '産直データ',
  interStoreIn: '店間入データ',
  interStoreOut: '店間出データ',
  consumables: '消耗品データ',
  categoryTimeSales: '分類別時間帯売上',
  budget: '予算データ',
  settings: '初期設定（在庫）',
}

// ── 変換関数 ──

/** inputs の表示データを構築 */
export function buildFormattedInputs(
  inputs: Explanation['inputs'],
  allExplanations: ReadonlyMap<MetricId, Explanation>,
): readonly FormattedInput[] {
  return inputs.map((inp) => ({
    name: inp.name,
    formattedValue: formatValue(inp.value, inp.unit),
    linkedMetric: inp.metric && allExplanations.has(inp.metric) ? inp.metric : undefined,
  }))
}

/** 逆リンク（この指標を入力として使っている他の指標）を構築 */
export function buildReverseLinks(
  allExplanations: ReadonlyMap<MetricId, Explanation>,
  currentMetric: MetricId,
): readonly ReverseLink[] {
  const links: ReverseLink[] = []
  for (const [metricId, exp] of allExplanations) {
    if (metricId === currentMetric) continue
    if (exp.inputs.some((inp) => inp.metric === currentMetric)) {
      links.push({
        metric: metricId,
        title: exp.title,
        formattedValue: formatValue(exp.value, exp.unit),
      })
    }
  }
  return links
}

/** エビデンス種別ごとの件数サマリ */
export function buildEvidenceSummary(
  evidenceRefs: Explanation['evidenceRefs'],
): readonly EvidenceSummaryEntry[] {
  if (evidenceRefs.length === 0) return []
  const counts = new Map<string, number>()
  for (const ref of evidenceRefs) {
    const dt = ref.dataType
    counts.set(dt, (counts.get(dt) ?? 0) + 1)
  }
  return Array.from(counts, ([dataType, count]) => ({
    dataType,
    label: DATA_TYPE_LABELS[dataType] ?? dataType,
    count,
  }))
}

/** 日別内訳行を構築 */
export function buildBreakdownRows(
  breakdown: Explanation['breakdown'],
  unit: MetricUnit,
): readonly BreakdownRow[] {
  if (!breakdown) return []
  return breakdown.map((entry) => ({
    day: entry.day,
    dayLabel: entry.label,
    formattedValue: formatValue(entry.value, entry.unit ?? unit),
    hasDetails: !!(entry.details && entry.details.length > 0),
    details: entry.details?.map((d) => ({
      label: d.label,
      formattedValue: formatValue(d.value, d.unit),
    })),
  }))
}

/** エビデンス参照を種別ごとにグループ化 */
export function buildEvidenceRefsByType(
  evidenceRefs: Explanation['evidenceRefs'],
  stores?: ReadonlyMap<string, Store>,
): ReadonlyMap<string, readonly EvidenceRefRow[]> {
  if (evidenceRefs.length === 0) return new Map()
  const grouped = new Map<string, EvidenceRefRow[]>()
  for (const ref of evidenceRefs) {
    const dt = ref.dataType
    if (!grouped.has(dt)) grouped.set(dt, [])
    grouped.get(dt)!.push({
      kind: ref.kind === 'daily' ? '日別' : '集計',
      storeName: resolveStoreName(ref.storeId, stores),
      dayLabel: ref.kind === 'daily' ? `${ref.day}日` : ref.day ? `${ref.day}日` : '-',
    })
  }
  // Limit to 31 per type
  for (const [dt, rows] of grouped) {
    if (rows.length > 31) grouped.set(dt, rows.slice(0, 31))
  }
  return grouped
}

/** パンくずリストを構築 */
export function buildBreadcrumb(
  history: readonly MetricId[],
  allExplanations: ReadonlyMap<MetricId, Explanation>,
): readonly BreadcrumbItem[] {
  return history.map((id, i) => ({
    metric: id,
    title: allExplanations.get(id)?.title ?? id,
    isLast: i === history.length - 1,
  }))
}

/** スコープラベルを構築 */
export function buildScopeLabel(
  scope: Explanation['scope'],
  stores?: ReadonlyMap<string, Store>,
): string {
  return `${scope.year}年${scope.month}月 / ${resolveStoreName(scope.storeId, stores)}`
}

/** 値を表示用フォーマット */
export function formatMetricValue(value: number, unit: MetricUnit): string {
  return formatValue(value, unit)
}
