/**
 * コンディションメトリクスレジストリ
 *
 * 全メトリクスのデフォルト閾値を一元管理する。
 * ユーザー設定はこのデフォルトを部分的にオーバーライドする。
 */
import type { ConditionMetricDef, ConditionMetricId } from '../models/ConditionConfig'

/** メトリクス定義一覧（表示順序順） */
export const CONDITION_METRIC_DEFS: readonly ConditionMetricDef[] = [
  // ── 予算達成メトリクス ──
  {
    id: 'sales',
    label: '売上予算達成',
    direction: 'higher_better',
    unit: 'pct',
    defaults: { blue: 1.0, yellow: 0.95, red: 0.9 },
    displayMultiplier: 100,
    inputStep: 1,
    inputUnit: '%',
  },
  {
    id: 'gp',
    label: '粗利額予算達成',
    direction: 'higher_better',
    unit: 'pct',
    defaults: { blue: 1.0, yellow: 0.95, red: 0.9 },
    displayMultiplier: 100,
    inputStep: 1,
    inputUnit: '%',
  },
  {
    id: 'gpRate',
    label: '粗利率',
    direction: 'higher_better',
    unit: 'pt',
    defaults: { blue: 0.2, yellow: -0.2, red: -0.5 },
    displayMultiplier: 100,
    inputStep: 0.01,
    inputUnit: 'pt',
  },
  {
    id: 'markupRate',
    label: '値入率',
    direction: 'higher_better',
    unit: 'pt',
    defaults: { blue: 0, yellow: -1, red: -2 },
    displayMultiplier: 100,
    inputStep: 0.01,
    inputUnit: 'pt',
  },
  {
    id: 'discountRate',
    label: '売変率',
    direction: 'lower_better',
    unit: 'pct',
    defaults: { blue: 0.02, yellow: 0.025, red: 0.03 },
    displayMultiplier: 100,
    inputStep: 0.1,
    inputUnit: '%',
  },
  // ── 前年比メトリクス ──
  {
    id: 'salesYoY',
    label: '売上前年比',
    direction: 'higher_better',
    unit: 'pct',
    defaults: { blue: 1.0, yellow: 0.95, red: 0.9 },
    displayMultiplier: 100,
    inputStep: 1,
    inputUnit: '%',
    requiresPrevYear: true,
  },
  {
    id: 'customerYoY',
    label: '客数前年比',
    direction: 'higher_better',
    unit: 'pct',
    defaults: { blue: 1.0, yellow: 0.95, red: 0.9 },
    displayMultiplier: 100,
    inputStep: 1,
    inputUnit: '%',
    requiresPrevYear: true,
  },
  {
    id: 'txValue',
    label: '客単価前年比',
    direction: 'higher_better',
    unit: 'pct',
    defaults: { blue: 1.0, yellow: 0.97, red: 0.94 },
    displayMultiplier: 100,
    inputStep: 1,
    inputUnit: '%',
    requiresPrevYear: true,
  },
  {
    id: 'itemsYoY',
    label: '販売点数前年比',
    direction: 'higher_better',
    unit: 'pct',
    defaults: { blue: 1.0, yellow: 0.95, red: 0.9 },
    displayMultiplier: 100,
    inputStep: 1,
    inputUnit: '%',
    requiresPrevYear: true,
  },
  {
    id: 'totalCost',
    label: '総仕入前年比',
    direction: 'higher_better',
    unit: 'pct',
    defaults: { blue: 1.0, yellow: 0.95, red: 0.9 },
    displayMultiplier: 100,
    inputStep: 1,
    inputUnit: '%',
    requiresPrevYear: true,
  },
  {
    id: 'requiredPace',
    label: '残予算必要達成率',
    direction: 'lower_better',
    unit: 'pct',
    defaults: { blue: 1.0, yellow: 1.1, red: 1.2 },
    displayMultiplier: 100,
    inputStep: 1,
    inputUnit: '%',
  },
] as const

/** ID → Def のマップ（O(1) ルックアップ用） */
export const CONDITION_METRIC_MAP: ReadonlyMap<ConditionMetricId, ConditionMetricDef> = new Map(
  CONDITION_METRIC_DEFS.map((d) => [d.id, d]),
)

/** デフォルトの ConditionSummaryConfig（空 = 全てレジストリデフォルト） */
export const DEFAULT_CONDITION_CONFIG = {
  global: {},
  storeOverrides: {},
} as const
