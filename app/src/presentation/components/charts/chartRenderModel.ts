/**
 * ChartRenderModel — chart data builder (*Logic.ts / *.vm.ts) 共通返却契約
 *
 * unify-period-analysis Phase 5 閉じ込み: 描画ロジック層の出力形を揃えるため
 * 導入した共通 ViewModel shape。chart 別の個別 ViewModel 型を持つのではなく、
 * 本契約に寄せることで次を実現する:
 *
 * - Phase 5 閉じ込み（描画側）の移行が全 chart で揃った shape になる
 * - Phase 6 (画面載せ替え + useComparisonModule の ComparisonScope 直接受領化)
 *   で input 側を触っても、output 契約はほぼ変わらない
 * - `expectChartRenderModel` テストヘルパで *Logic.ts の単体テストが
 *   同じ書式に揃う
 * - UI を mount せずに「render 前の意味」が正しいかを固定できる
 *
 * ## 設計方針
 *
 * - **points ジェネリック**: chart 固有の 1 データ点の shape は chart が
 *   決める。本契約は「配列として points を持つ」ことだけを強制する
 * - **summary / flags / annotations / emptyReason は全て optional**: すべての
 *   chart が全項目を埋める必要はない。使わない chart は undefined のまま
 * - **非 ECharts 依存**: EChartsOption を含まない。本契約は data builder の
 *   出力であり、option builder は別ファイル (`*OptionBuilder.ts`) が受け取る
 *
 * ## 使い方（chart logic 層）
 *
 * ```ts
 * // DiscountTrendChartLogic.ts
 * export interface DiscountPoint { date: string; discount: number }
 *
 * export function buildDiscountData(
 *   rows: readonly XxxRow[],
 * ): ChartRenderModel<DiscountPoint> {
 *   if (rows.length === 0) {
 *     return { points: [], emptyReason: 'no-data' }
 *   }
 *   const points = rows.map(...)
 *   return {
 *     points,
 *     summary: { primary: total, delta: yoyDelta },
 *     flags: { hasComparison: true },
 *   }
 * }
 * ```
 *
 * ## 使い方（chart component）
 *
 * ```tsx
 * const renderModel = useMemo(() => buildDiscountData(rows), [rows])
 * // points / summary / flags を展開して option builder に渡す
 * const option = useMemo(
 *   () => buildDiscountOption(renderModel.points, theme, renderModel.summary),
 *   [renderModel, theme],
 * )
 * ```
 *
 * @see references/03-implementation/chart-rendering-three-stage-pattern.md §残り3件の移行完了条件
 *
 * @responsibility R:unclassified
 */

/**
 * chart data builder 共通返却契約。
 *
 * @typeParam TPoint chart 固有の 1 データ点の shape
 */
export interface ChartRenderModel<TPoint = unknown> {
  /** 描画対象のデータ点配列。shape は chart が決める */
  readonly points: readonly TPoint[]
  /** サマリー値。必要な chart だけが埋める */
  readonly summary?: {
    /** 主要指標 (例: 合計売上、合計数量) */
    readonly primary?: number
    /** 補助指標 (例: 合計前年値、合計前月値) */
    readonly secondary?: number
    /** 差分 (例: 当期 − 比較期) */
    readonly delta?: number
    /** 比率 (例: 成長率 = delta / secondary) */
    readonly ratio?: number
  }
  /** chart 描画に影響する bool フラグ群 */
  readonly flags?: {
    /** 比較期データが存在するか */
    readonly hasComparison?: boolean
    /** 欠損・ギャップが検出されたか */
    readonly hasGap?: boolean
    /** fallback 経路が使われたか */
    readonly fallbackUsed?: boolean
  }
  /** 画面上で表示する短い注釈文字列（例: 警告、補足） */
  readonly annotations?: readonly string[]
  /** points が空のときの理由。chart は empty state の文言選択に使う */
  readonly emptyReason?: 'no-data' | 'no-scope' | 'not-ready'
}

/**
 * 空 (points=[]) の ChartRenderModel を生成する factory。
 * logic 層の early return で使う典型パターン。
 */
export function emptyChartRenderModel<TPoint>(
  reason: 'no-data' | 'no-scope' | 'not-ready' = 'no-data',
): ChartRenderModel<TPoint> {
  return { points: [], emptyReason: reason }
}

// ─── テストヘルパ ─────────────────────────────────────────

/**
 * ChartRenderModel の基本不変条件をテストで固定する helper。
 *
 * *Logic.ts の unit test で:
 *
 * ```ts
 * const result = buildDiscountData(rows)
 * expectChartRenderModel(result, {
 *   minPoints: 1,
 *   expectSummary: { primary: 1000 },
 *   expectFlags: { hasComparison: true },
 * })
 * ```
 *
 * のように書式を揃えることで、全 *Logic.ts のテストが同じ語彙で比較可能になる。
 *
 * @param actual 実際の ChartRenderModel
 * @param expectations 期待値（全項目 optional）
 */
export function expectChartRenderModel<TPoint>(
  actual: ChartRenderModel<TPoint>,
  expectations: {
    /** points の最小個数（例: 1 = 少なくとも 1 点存在する） */
    readonly minPoints?: number
    /** points の最大個数 */
    readonly maxPoints?: number
    /** points がちょうどこの個数であること */
    readonly exactPoints?: number
    /** emptyReason の期待値 */
    readonly emptyReason?: ChartRenderModel<TPoint>['emptyReason']
    /** summary フィールドの期待値（部分一致） */
    readonly expectSummary?: ChartRenderModel<TPoint>['summary']
    /** flags フィールドの期待値（部分一致） */
    readonly expectFlags?: ChartRenderModel<TPoint>['flags']
    /** annotations の期待値（exact equal） */
    readonly expectAnnotations?: readonly string[]
  } = {},
): void {
  // vitest の expect を動的に import すると test 外で壊れるため、caller 側が
  // ラップする設計。ここでは assertion を throw ベースで組み立て、test で
  // try/catch しやすくする。呼び出し元の test で `expect(() =>
  // expectChartRenderModel(...)).not.toThrow()` のように使える。
  if (expectations.exactPoints !== undefined && actual.points.length !== expectations.exactPoints) {
    throw new Error(
      `expected exactly ${expectations.exactPoints} points, got ${actual.points.length}`,
    )
  }
  if (expectations.minPoints !== undefined && actual.points.length < expectations.minPoints) {
    throw new Error(
      `expected at least ${expectations.minPoints} points, got ${actual.points.length}`,
    )
  }
  if (expectations.maxPoints !== undefined && actual.points.length > expectations.maxPoints) {
    throw new Error(
      `expected at most ${expectations.maxPoints} points, got ${actual.points.length}`,
    )
  }
  if (expectations.emptyReason !== undefined && actual.emptyReason !== expectations.emptyReason) {
    throw new Error(`expected emptyReason=${expectations.emptyReason}, got ${actual.emptyReason}`)
  }
  if (expectations.expectSummary !== undefined) {
    const e = expectations.expectSummary
    const a = actual.summary ?? {}
    for (const key of Object.keys(e) as Array<keyof typeof e>) {
      if (a[key] !== e[key]) {
        throw new Error(`expected summary.${key}=${e[key]}, got ${a[key]}`)
      }
    }
  }
  if (expectations.expectFlags !== undefined) {
    const e = expectations.expectFlags
    const a = actual.flags ?? {}
    for (const key of Object.keys(e) as Array<keyof typeof e>) {
      if (a[key] !== e[key]) {
        throw new Error(`expected flags.${key}=${e[key]}, got ${a[key]}`)
      }
    }
  }
  if (expectations.expectAnnotations !== undefined) {
    const actualAnns = actual.annotations ?? []
    const expAnns = expectations.expectAnnotations
    if (actualAnns.length !== expAnns.length) {
      throw new Error(`expected ${expAnns.length} annotations, got ${actualAnns.length}`)
    }
    for (let i = 0; i < expAnns.length; i++) {
      if (actualAnns[i] !== expAnns[i]) {
        throw new Error(`expected annotations[${i}]=${expAnns[i]}, got ${actualAnns[i]}`)
      }
    }
  }
}
