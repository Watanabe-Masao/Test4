/**
 * domain/calculations/ 正本化分類レジストリ — Master Registry
 *
 * **唯一の正本**: business / analytic / candidate の view は全て derived。
 * derived view の手編集は禁止。CI で master との一致を検証する。
 *
 * 全ファイルを「必須」「検討」「不要」に分類し、
 * 未分類のファイルが存在しないことをガードテストで保証する。
 *
 * 2026-04-24 ADR-C-004 PR2: domain/calculations/index.ts (barrel) に
 * @sunsetCondition / @expiresAt / @reason JSDoc を追加（分類本体は変更なし）。
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

  'candidate/inventoryCalc.ts': {
    tag: 'required',
    reason: '日別推定在庫推移（candidate: WASM 移行候補 CAND-BIZ-009）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'accounting',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'BIZ-009',
    bridgeKind: 'business',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
    migrationTier: 'tier1',
    notes:
      'WASM candidate: wasm/inventory-calc/。current reference: inventoryCalc.ts。FFI: 6列 flat contract（dailySales/flowersPrice/directProducePrice/costInclusionCost/totalCost/deliverySalesCost）',
  },
  'candidate/pinIntervals.ts': {
    tag: 'required',
    reason: '在庫確定区間の粗利（candidate: WASM 移行候補 CAND-BIZ-011）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'accounting',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'BIZ-011',
    bridgeKind: 'business',
    rateOwnership: 'engine',
    fallbackPolicy: 'current',
    migrationTier: 'tier1',
    notes:
      'WASM candidate: wasm/pin-intervals/。current reference: pinIntervals.ts。FFI: dailySales + dailyTotalCost + pinDays/pinClosingInventory 列分離',
  },
  'candidate/observationPeriod.ts': {
    tag: 'required',
    reason: '観測期間ステータス（candidate: WASM 移行候補 CAND-BIZ-010）',
    zodAdded: true,
    semanticClass: 'business',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'data_quality',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'BIZ-010',
    bridgeKind: 'business',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
    migrationTier: 'tier1',
    notes:
      'WASM candidate: wasm/observation-period/。current reference: observationPeriod.ts。FFI: dailySales flat array + status/warning bitmask 出力',
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

  // ══ Candidate / Analytic（candidate-authoritative, Phase 6） ══

  'candidate/dowGapAnalysis.ts': {
    tag: 'required',
    reason: '曜日ギャップ分析（candidate: WASM 移行候補 CAND-ANA-007）',
    zodAdded: false,
    semanticClass: 'analytic',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'calendar_effect',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'ANA-007',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
    notes:
      'WASM candidate: wasm/dow-gap/。FFI: countDowsInMonth は TS adapter、統計計算は Rust kernel。文字列生成（DOW_LABELS, warnings）は TS 側',
  },
  'candidate/algorithms/trendAnalysis.ts': {
    tag: 'required',
    reason: 'トレンド分析（candidate: WASM 移行候補 CAND-ANA-004）',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'temporal_pattern',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'ANA-004',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
    notes: 'WASM candidate: wasm/trend-analysis/。FFI: years+months+totalSales 3列 flat contract',
  },
  'candidate/temporal/computeMovingAverage.ts': {
    tag: 'required',
    reason: '移動平均（candidate: WASM 移行候補 CAND-ANA-009）',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'time_series',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'ANA-009',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
    notes:
      'WASM candidate: wasm/moving-average/。FFI: values(Float64Array NaN=null) + statuses(Uint8Array 0=ok 1=missing) flat contract',
  },
  'candidate/algorithms/correlation.ts': {
    tag: 'required',
    reason: '相関分析・正規化・類似度（candidate: WASM 移行候補 CAND-ANA-005）',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'statistical',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'ANA-005',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
    notes:
      'WASM candidate: wasm/correlation/。correlationMatrix は string FFI のため candidate 対象外',
  },
  'candidate/algorithms/sensitivity.ts': {
    tag: 'required',
    reason: '感度分析（candidate: WASM 移行候補 CAND-ANA-003）',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'candidate-authoritative',
    methodFamily: 'what_if',
    runtimeStatus: 'candidate',
    ownerKind: 'migration',
    contractId: 'ANA-003',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'current',
    notes: 'WASM candidate: wasm/sensitivity/。current reference: algorithms/sensitivity.ts',
  },

  // ══ Analytic Kernel（analytic-authoritative） ══

  'timeSlotCalculations.ts': {
    tag: 'required',
    reason: 'コアタイム・ターンアラウンド（current/analytics WASM 稼働中）',
    zodAdded: true,
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
  'budgetSimulator.ts': {
    tag: 'required',
    reason: '予算達成シミュレーター — 残期間 what-if 試算 (yoy/ach/dow) + 基盤KPI',
    zodAdded: true,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'budget_simulation',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-010',
    bridgeKind: 'analytics',
    rateOwnership: 'engine',
    fallbackPolicy: 'none',
    notes:
      'projects/budget-achievement-simulator の Phase 1 成果物。既存 projectLinear / calculateYoYRatio / calculateAchievementRate / prorateBudget を再利用する orchestration 層。SimulatorScenarioSchema は daysInMonth === new Date(year, month, 0).getDate() を強制 (グレゴリオ暦整合性)。remLY は lyMonthly - elapsedLY で導出 (lyDaily alignment キャップ耐性)',
  },
  'budgetSimulatorAggregations.ts': {
    tag: 'required',
    reason: '予算達成シミュレーター ドリルダウン集計 (aggregateDowAverages / aggregateWeeks)',
    zodAdded: false,
    semanticClass: 'analytic',
    authorityKind: 'analytic-authoritative',
    methodFamily: 'budget_simulation',
    runtimeStatus: 'current',
    ownerKind: 'maintenance',
    contractId: 'ANA-010',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'none',
    notes:
      'budgetSimulator.ts のサイズ制限 (G5 ≤300 行) 対応で分離した Phase 3.5 成果物。入力は既に parse 済みの SimulatorScenario のため Zod 再適用は不要 (domain 内部消費)',
  },
  'algorithms/advancedForecast.ts': {
    tag: 'required',
    reason: 'WMA・回帰・天気調整予測（current/analytics、forecastBridge 経由 WASM 部分稼働）',
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
    notes:
      'current WASM: calculateWMA, linearRegression (forecastBridge 経由)。TS residual: projectDowAdjusted, calculateMonthEndProjection, weatherAdjustedProjection (Map/DailyForecast 入力のため WASM 未移行)',
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
    tag: 'required',
    reason: '週次サマリー・異常値検出（current/analytics、forecastBridge 経由 WASM 部分稼働）',
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
    notes:
      'current WASM: calculateStdDev, detectAnomalies (forecastBridge 経由)。TS residual: calculateForecast, calculateWeeklySummaries, calculateDayOfWeekAverages, getWeekRanges (Map 入力のため WASM 未移行)',
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
    authorityKind: 'non-authoritative',
    methodFamily: 'calendar_effect',
    runtimeStatus: 'non-target',
    ownerKind: 'maintenance',
    contractId: 'ANA-008',
    bridgeKind: 'analytics',
    rateOwnership: 'n/a',
    fallbackPolicy: 'none',
    notes:
      'WASM 候補から除外。JS-native: Map 集合差・Date DOW 計算・ラベル生成が中心で、数値 kernel が薄い。FFI マーシャリングコストが便益を上回る。将来の micro-kernel 切り出しで再評価可能',
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
    reason:
      'safeDivide 等のプリミティブ + 汎用統計関数 (calculateMovingAverage / calculatePartialMovingAverage)。非 authoritative',
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
