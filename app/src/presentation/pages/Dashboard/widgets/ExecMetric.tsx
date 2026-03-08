import { ExecRow, ExecLabel, ExecVal, ExecSub } from '../DashboardPage.styles'

export function ExecMetric({
  label,
  value,
  sub,
  subColor,
  formula,
}: {
  label: string
  value: string
  sub?: string
  subColor?: string
  /** 計算根拠（算出式）— 小さいグレー文字で表示 */
  formula?: string
}) {
  return (
    <div>
      <ExecRow>
        <ExecLabel>{label}</ExecLabel>
        <ExecVal>{value}</ExecVal>
      </ExecRow>
      {sub && <ExecSub $color={subColor}>{sub}</ExecSub>}
      {formula && (
        <ExecSub style={{ fontSize: '0.55rem', opacity: 0.55, marginTop: '1px' }}>
          {formula}
        </ExecSub>
      )}
    </div>
  )
}
