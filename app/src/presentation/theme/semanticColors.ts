/**
 * セマンティックカラーユーティリティ（色覚多様性対応）
 *
 * Wong (2011) ベースの color-blind safe パレット:
 *   positive: Sky Blue (#0ea5e9)  — 良好・プラス
 *   negative: Orange   (#f97316)  — 注意・マイナス
 *   caution:  Yellow   (#eab308)  — 警告・中間
 *
 * 使い方:
 *   import { sc } from '@/presentation/theme/semanticColors'
 *   <div style={{ color: sc.positive }}>+100</div>
 *   <div style={{ color: sc.cond(value >= 0) }}>...</div>
 */
import { palette } from './tokens'

/** セマンティックカラー定数 */
export const sc = {
  positive: palette.positive,
  positiveDark: palette.positiveDark,
  negative: palette.negative,
  negativeDark: palette.negativeDark,
  caution: palette.caution,
  cautionDark: palette.cautionDark,
  neutral: palette.slate,

  /** positive / negative の2値判定 */
  cond: (isPositive: boolean): string =>
    isPositive ? palette.positive : palette.negative,

  /** positive / caution / negative の3値判定 */
  cond3: (isPositive: boolean, isCaution: boolean): string =>
    isPositive ? palette.positive : isCaution ? palette.caution : palette.negative,

  /** 達成率用: >=1 → positive, >=threshold → caution, else → negative */
  achievement: (rate: number, cautionThreshold = 0.9): string =>
    rate >= 1 ? palette.positive : rate >= cautionThreshold ? palette.caution : palette.negative,

  /** 粗利率用: >=target → positive, >=warning → caution, else → negative */
  gpRate: (rate: number, target: number, warning: number): string =>
    rate >= target ? palette.positive : rate >= warning ? palette.caution : palette.negative,
} as const
