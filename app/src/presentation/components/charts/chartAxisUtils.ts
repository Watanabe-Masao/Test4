/**
 * Chart axis helper — "nice number" magnitude rounding
 *
 * Box plot / scatter / bar chart の X 軸最大値を
 * 「10 の累乗で切り上げた見栄えの良い値」に丸める。
 *
 * 複数チャートで同じロジックが重複していたので集約（presentation 層内）。
 *
 * @responsibility R:unclassified
 */

/**
 * 数値配列の最大値を "nice magnitude" に切り上げる。
 *
 * 例:
 *   - max = 1234 → mag=1000 → ceil(1234/1000)*1000*1.05 = 2100
 *   - max = 47 → mag=10 → ceil(47/10)*10*1.05 = 52.5
 *
 * @param maxValue 元の最大値
 * @param padding 上方パディング倍率（デフォルト 1.05 = +5%）
 * @returns 切り上げ済みの axis 最大値
 */
export function niceAxisMax(maxValue: number, padding = 1.05): number {
  if (maxValue <= 0) return 100
  const mag = Math.pow(10, Math.floor(Math.log10(maxValue)))
  return Math.ceil(maxValue / mag) * mag * padding
}
