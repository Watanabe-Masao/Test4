/**
 * クリップエクスポート — 型定義
 *
 * 1ヶ月分のデータを自己完結型 HTML に埋め込むためのバンドル型。
 * DuckDB/ストア接続なしで、カレンダー・時間帯分析・ドリルダウン・
 * 5要素シャープリー分解を再現する。
 *
 * @responsibility R:unclassified
 */

/** 日別データ（シリアライズ可能な形式） */
export interface ClipDailyEntry {
  readonly day: number
  readonly sales: number
  readonly customers: number
  readonly discount: number
  readonly totalCost: number
  readonly budget: number
}

/** 前年日別データ */
export interface ClipPrevYearEntry {
  readonly day: number
  readonly sales: number
  readonly customers: number
  readonly discount: number
}

/** CTS レコード（シリアライズ可能な形式） */
export interface ClipCtsRecord {
  readonly day: number
  readonly deptCode: string
  readonly deptName: string
  readonly lineCode: string
  readonly lineName: string
  readonly klassCode: string
  readonly klassName: string
  readonly totalQuantity: number
  readonly totalAmount: number
  readonly timeSlots: readonly {
    readonly hour: number
    readonly quantity: number
    readonly amount: number
  }[]
}

/** シャープリー分解結果 */
export interface ClipDecomposition {
  readonly curSales: number
  readonly prevSales: number
  readonly curCustomers: number
  readonly prevCustomers: number
  readonly curTotalQty: number
  readonly prevTotalQty: number
  readonly decompose2: { readonly custEffect: number; readonly ticketEffect: number }
  readonly decompose3: {
    readonly custEffect: number
    readonly qtyEffect: number
    readonly pricePerItemEffect: number
  } | null
  readonly decompose5: {
    readonly custEffect: number
    readonly qtyEffect: number
    readonly priceEffect: number
    readonly mixEffect: number
  } | null
}

/** サマリー KPI */
export interface ClipSummary {
  readonly totalSales: number
  readonly totalCoreSales: number
  readonly totalCustomers: number
  readonly totalDiscount: number
  readonly totalCost: number
  readonly budget: number
  readonly grossProfitBudget: number
  readonly budgetAchievementRate: number
  readonly averageMarkupRate: number
  readonly coreMarkupRate: number
  readonly invMethodGrossProfit: number | null
  readonly invMethodGrossProfitRate: number | null
  readonly estMethodMargin: number
  readonly estMethodMarginRate: number
  readonly averageDailySales: number
  readonly projectedSales: number
  readonly totalCostInclusion: number
}

/** 前年サマリー */
export interface ClipPrevYearSummary {
  readonly hasPrevYear: boolean
  readonly totalSales: number
  readonly totalCustomers: number
  readonly totalDiscount: number
}

/** バンドル全体 */
export interface ClipBundle {
  readonly version: 1
  readonly exportedAt: string
  readonly year: number
  readonly month: number
  readonly daysInMonth: number
  readonly storeName: string

  /** 月次サマリー */
  readonly summary: ClipSummary
  /** 前年サマリー */
  readonly prevYear: ClipPrevYearSummary

  /** 日別データ */
  readonly daily: readonly ClipDailyEntry[]
  /** 前年日別データ */
  readonly prevYearDaily: readonly ClipPrevYearEntry[]

  /** 分類別時間帯売上レコード（当月） */
  readonly ctsRecords: readonly ClipCtsRecord[]
  /** 分類別時間帯売上レコード（前年同月） */
  readonly ctsPrevRecords: readonly ClipCtsRecord[]

  /** 月間シャープリー分解（事前計算） */
  readonly decomposition: ClipDecomposition | null
}
