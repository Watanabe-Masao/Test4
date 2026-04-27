/**
 * CalculationFrame — 計算パイプラインの期間条件
 *
 * 計算ロジックの hidden dependency（daysInMonth, dataEndDay, effectiveDays）を
 * 単一の値オブジェクトにまとめる。AppSettings は含めない（期間条件のみ）。
 *
 * 生成は buildCalculationFrame() factory のみ。
 * caller が effectiveDays を独自計算することを防ぐ。
 *
 * @responsibility R:unclassified
 */
import type { AppSettings } from '@/domain/models/storeTypes'
import { getDaysInMonth } from '@/domain/constants/defaults'

/** 計算パイプラインの期間条件（期間のみ — 設定パラメータは含まない） */
export interface CalculationFrame {
  readonly targetYear: number
  readonly targetMonth: number
  readonly daysInMonth: number
  readonly dataEndDay: number | null
  readonly effectiveDays: number
}

/**
 * AppSettings から CalculationFrame を構築する唯一の factory。
 *
 * effectiveDays = min(dataEndDay ?? daysInMonth, daysInMonth)
 * この解釈を caller に散らさない。
 */
export function buildCalculationFrame(settings: AppSettings): CalculationFrame {
  const { targetYear, targetMonth, dataEndDay } = settings
  const daysInMonth = getDaysInMonth(targetYear, targetMonth)
  const effectiveDays = dataEndDay != null ? Math.min(dataEndDay, daysInMonth) : daysInMonth

  return {
    targetYear,
    targetMonth,
    daysInMonth,
    dataEndDay: dataEndDay ?? null,
    effectiveDays,
  }
}
