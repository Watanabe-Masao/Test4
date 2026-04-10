/**
 * domain/calculations/ 正本化分類レジストリ — Master Registry
 *
 * **唯一の正本**: business / analytic / candidate の view は全て derived。
 * derived view の手編集は禁止。CI で master との一致を検証する。
 *
 * 全ファイルを「必須」「検討」「不要」に分類し、
 * 未分類のファイルが存在しないことをガードテストで保証する。
 *
 * 新規ファイルを domain/calculations/ に追加する場合は、
 * 必ずこのレジストリに登録すること。
 *
 * @see references/01-principles/calculation-canonicalization-map.md
 * @see references/01-principles/semantic-classification-policy.md
 */

export type CanonTag = 'required' | 'review' | 'not-needed'

/** 意味分類: 何を決めるかで棚を分ける */
export type SemanticClass = 'business' | 'analytic' | 'presentation' | 'utility'

/** 権限種別: authoritative を単独で使わない（I1 原則） */
export type AuthorityKind =
  | 'business-authoritative'
  | 'analytic-authoritative'
  | 'candidate-authoritative'
  | 'non-authoritative'

/** 実行時ステータス: current と candidate は絶対に混ぜない（I3 原則） */
export type RuntimeStatus = 'current' | 'candidate' | 'non-target'

/** 所有区分: 保守 vs 移行 */
export type OwnerKind = 'maintenance' | 'migration'

export interface CanonEntry {
  readonly tag: CanonTag
  readonly reason: string
  /** Zod 契約が追加済みか */
  readonly zodAdded: boolean
  // ── 意味分類軸（Phase 2: optional → Phase 2C で required 項目は必須化予定） ──
  /** 意味責任の棚。pure であることは棚の決定基準にならない */
  readonly semanticClass?: SemanticClass
  /** 権限種別。authoritative 単独使用禁止 */
  readonly authorityKind?: AuthorityKind
  /** 技法種別（analytic_decomposition, forecasting 等）。semanticClass とは独立軸 */
  readonly methodFamily?: string
  /** 実行時ステータス */
  readonly runtimeStatus?: RuntimeStatus
  /** 所有区分 */
  readonly ownerKind?: OwnerKind
  // ── 契約軸（Phase 3 で値を埋める。型は Phase 2 で先に定義） ──
  /** 契約 ID: BIZ-XXX or ANA-XXX */
  readonly contractId?: string
  /** bridge 種別 */
  readonly bridgeKind?: 'business' | 'analytics'
  /** 率の算出責任。engine 側で算出し UI/VM/SQL で再計算しない */
  readonly rateOwnership?: 'engine' | 'n/a'
  /** fallback 方針 */
  readonly fallbackPolicy?: 'current' | 'none'
  /** 移行優先度 */
  readonly migrationTier?: 'tier1' | 'tier2'
  /** 補足 */
  readonly notes?: string
}

/**
 * domain/calculations/ の全ファイルの正本化分類。
 *
 * キー: domain/calculations/ からの相対パス（例: 'invMethod.ts'）
 * バレル（index.ts 等）も含む。
 */
export const CALCULATION_CANON_REGISTRY: Readonly<Record<string, CanonEntry>> = {
  // ══ Business Semantic Core（business-authoritative） ══

  'invMethod.ts': {
    tag: 'required',
    reason: '在庫法粗利（calculateGrossProfit 経由）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'accounting',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-001',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'current',
  },
  'estMethod.ts': {
    tag: 'required',
    reason: '推定法マージン（calculateGrossProfit 経由）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'accounting',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-002',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'current',
  },
  'budgetAnalysis.ts': {
    tag: 'required',
    reason: '予算分析（StoreResult 統一済み）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'budget',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-003',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'current',
  },
  'factorDecomposition.ts': {
    tag: 'required',
    reason: 'シャープリー値分解（calculateFactorDecomposition）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'analytic_decomposition',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-004',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'current',
    notes: '技法は Shapley（analytic）だが意味責任は business',
  },
  'discountImpact.ts': {
    tag: 'required',
    reason: '売変ロス原価',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'accounting',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-005',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'current',
  },
  'costAggregation.ts': {
    tag: 'required',
    reason: '移動合計・在庫仕入原価',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'accounting',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-006',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'current',
  },
  'markupRate.ts': {
    tag: 'required',
    reason: '値入率',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'pricing',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-007',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'current',
  },
  'remainingBudgetRate.ts': {
    tag: 'required',
    reason: '残予算必要達成率',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'budget',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-008',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'none',
    migrationTier: 'tier1',
  },
  'inventoryCalc.ts': {
    tag: 'required',
    reason: '日別推定在庫推移',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'accounting',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-009',
    bridgeKind: 'business',
    rateOwnership: 'n/a',
    fallbackPolicy: 'none',
    migrationTier: 'tier1',
  },
  'observationPeriod.ts': {
    tag: 'required',
    reason: '観測期間ステータス',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'data_quality',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-010',
    bridgeKind: 'business',
    rateOwnership: 'n/a',
    fallbackPolicy: 'none',
    migrationTier: 'tier1',
    notes: 'データ品質評価だが業務判断（在庫法/推定法の選択）に直結するため business',
  },
  'pinIntervals.ts': {
    tag: 'required',
    reason: '在庫確定区間の粗利',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'accounting',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-011',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'none',
    migrationTier: 'tier1',
  },
  'piValue.ts': {
    tag: 'required',
    reason: 'PI値（点数PI値・金額PI値）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'retail_kpi',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-012',
    bridgeKind: 'business',
    rateOwnership: 'n/a',
    fallbackPolicy: 'none',
    migrationTier: 'tier1',
  },
  'customerGap.ts': {
    tag: 'required',
    reason: '前年比客数GAP（点数・金額）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'business-authoritative',
    methodFamily: 'behavioral',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'BIZ-013',
    bridgeKind: 'business',
    rateOwnership: 'n/a',
    fallbackPolicy: 'none',
    migrationTier: 'tier1',
  },

  // ══ Candidate / Business（candidate-authoritative, Phase 5） ══

  'candidate/piValue.ts': {
    tag: 'required',
    reason: 'PI値（candidate: WASM 移行候補 CAND-BIZ-012）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'retail_kpi',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'BIZ-012',
    bridgeKind: 'business',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
    migrationTier: 'tier1',
    notes: 'WASM candidate: wasm/pi-value/。current reference: piValue.ts',
  },

  'candidate/remainingBudgetRate.ts': {
    tag: 'required',
    reason: '残予算必要達成率（candidate: WASM 移行候補 CAND-BIZ-008）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'budget',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'BIZ-008',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'current',
    migrationTier: 'tier1',
    notes: 'WASM candidate: wasm/remaining-budget-rate/。current reference: remainingBudgetRate.ts',
  },
  'candidate/customerGap.ts': {
    tag: 'required',
    reason: '前年比客数GAP（candidate: WASM 移行候補 CAND-BIZ-013）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'behavioral',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'BIZ-013',
    bridgeKind: 'business',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
    migrationTier: 'tier1',
    notes: 'WASM candidate: wasm/customer-gap/。current reference: customerGap.ts',
  },

  // ══ Analytic Kernel（analytic-authoritative） ══

  'timeSlotCalculations.ts': {
    tag: 'review',
    reason: 'コアタイム・ターンアラウンド',
    zodAdded: false,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'time_pattern',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-001',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
  },
  'algorithms/advancedForecast.ts': {
    tag: 'review',
    reason: 'WMA・回帰・天気調整予測',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'forecasting',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-002',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
  },
  'algorithms/sensitivity.ts': {
    tag: 'review',
    reason: 'What-if 分析',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'what_if',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-003',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
  },
  'algorithms/trendAnalysis.ts': {
    tag: 'review',
    reason: 'MoM/YoY/トレンド',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'temporal_pattern',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-004',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
  },
  'algorithms/correlation.ts': {
    tag: 'review',
    reason: '相関・類似度',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'statistical',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-005',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
  },
  'forecast.ts': {
    tag: 'review',
    reason: '週次サマリー・異常値検出',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'anomaly_detection',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-006',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
  },
  'dowGapAnalysis.ts': {
    tag: 'review',
    reason: '曜日ギャップ分析（出力型: DowGapAnalysis）',
    zodAdded: false,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'calendar_effect',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-007',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'none',
  },
  'dowGapActualDay.ts': {
    tag: 'review',
    reason: '実日数マッピング（出力型: ActualDayImpact）',
    zodAdded: false,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'calendar_effect',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-008',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'none',
  },
  'temporal/computeMovingAverage.ts': {
    tag: 'review',
    reason: '移動平均',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'time_series',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-009',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'none',
  },

  // ══ Utility / Not-needed（non-authoritative） ══

  'utils.ts': {
    tag: 'not-needed',
    reason: 'safeDivide 等のプリミティブ',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'divisor.ts': {
    tag: 'not-needed',
    reason: '除数計算ユーティリティ',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'averageDivisor.ts': {
    tag: 'not-needed',
    reason: '平均除数ユーティリティ',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'aggregation.ts': {
    tag: 'not-needed',
    reason: '多店舗集約ユーティリティ',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'rawAggregation/statisticalFunctions.ts': {
    tag: 'not-needed',
    reason: '標準偏差/Z-score',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'dowGapStatistics.ts': {
    tag: 'not-needed',
    reason: 'dowGap 内部ヘルパー',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'decomposition.ts': {
    tag: 'not-needed',
    reason: 're-export モジュール',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'factorDecompositionDto.ts': {
    tag: 'not-needed',
    reason: '型定義のみ（Rust FFI）',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'grossProfit.ts': {
    tag: 'not-needed',
    reason: 'バレルエクスポート',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'index.ts': {
    tag: 'not-needed',
    reason: 'バレルエクスポート',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'forecast.barrel.ts': {
    tag: 'not-needed',
    reason: 'バレルエクスポート',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'algorithms/index.ts': {
    tag: 'not-needed',
    reason: 'バレルエクスポート',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
  'temporal/index.ts': {
    tag: 'not-needed',
    reason: 'バレルエクスポート',
    zodAdded: false,
    semanticClass: 'utility',
    authorityKind: 'non-authoritative',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
  },
} as const
