import { useState, useCallback } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import type { AppSettings } from '@/domain/models'
import styled from 'styled-components'

const Field = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const Hint = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const SectionTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-top: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-bottom: ${({ theme }) => theme.spacing[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

interface Props {
  settings: AppSettings
  onSave: (settings: Partial<AppSettings>) => void
  onClose: () => void
}

export function SettingsModal({ settings, onSave, onClose }: Props) {
  const [values, setValues] = useState({
    targetGrossProfitRate: (settings.targetGrossProfitRate * 100).toString(),
    warningThreshold: (settings.warningThreshold * 100).toString(),
    flowerCostRate: (settings.flowerCostRate * 100).toString(),
    directProduceCostRate: (settings.directProduceCostRate * 100).toString(),
    // コンディションサマリー閾値
    gpDiffBlueThreshold: settings.gpDiffBlueThreshold.toString(),
    gpDiffYellowThreshold: settings.gpDiffYellowThreshold.toString(),
    gpDiffRedThreshold: settings.gpDiffRedThreshold.toString(),
    discountBlueThreshold: (settings.discountBlueThreshold * 100).toString(),
    discountYellowThreshold: (settings.discountYellowThreshold * 100).toString(),
    discountRedThreshold: (settings.discountRedThreshold * 100).toString(),
  })

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(() => {
    onSave({
      targetGrossProfitRate: parseFloat(values.targetGrossProfitRate) / 100,
      warningThreshold: parseFloat(values.warningThreshold) / 100,
      flowerCostRate: parseFloat(values.flowerCostRate) / 100,
      directProduceCostRate: parseFloat(values.directProduceCostRate) / 100,
      gpDiffBlueThreshold: parseFloat(values.gpDiffBlueThreshold),
      gpDiffYellowThreshold: parseFloat(values.gpDiffYellowThreshold),
      gpDiffRedThreshold: parseFloat(values.gpDiffRedThreshold),
      discountBlueThreshold: parseFloat(values.discountBlueThreshold) / 100,
      discountYellowThreshold: parseFloat(values.discountYellowThreshold) / 100,
      discountRedThreshold: parseFloat(values.discountRedThreshold) / 100,
    })
    onClose()
  }, [values, onSave, onClose])

  const basicFields = [
    { key: 'targetGrossProfitRate', label: '目標粗利率 (%)', hint: 'デフォルト: 25%' },
    { key: 'warningThreshold', label: '警告しきい値 (%)', hint: 'デフォルト: 23%' },
    { key: 'flowerCostRate', label: '花掛け率 (%)', hint: 'デフォルト: 80%' },
    { key: 'directProduceCostRate', label: '産直掛け率 (%)', hint: 'デフォルト: 85%' },
  ] as const

  const gpThresholdFields = [
    {
      key: 'gpDiffBlueThreshold',
      label: '良好 (pt)',
      hint: '予算比 +N pt 以上で青。デフォルト: 0.20',
    },
    {
      key: 'gpDiffYellowThreshold',
      label: '注意 (pt)',
      hint: '予算比 -N pt 以上で黄色。デフォルト: -0.20',
    },
    {
      key: 'gpDiffRedThreshold',
      label: '警告 (pt)',
      hint: '予算比 -N pt 以上で赤。デフォルト: -0.50',
    },
  ] as const

  const discountThresholdFields = [
    { key: 'discountBlueThreshold', label: '良好 (%)', hint: 'N% 以下で青。デフォルト: 2.0' },
    { key: 'discountYellowThreshold', label: '注意 (%)', hint: 'N% 以下で黄色。デフォルト: 2.5' },
    { key: 'discountRedThreshold', label: '警告 (%)', hint: 'N% 以下で赤。デフォルト: 3.0' },
  ] as const

  return (
    <Modal
      title="アプリケーション設定"
      onClose={onClose}
      footer={
        <>
          <Button $variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button $variant="primary" onClick={handleSave}>
            保存
          </Button>
        </>
      }
    >
      {basicFields.map(({ key, label, hint }) => (
        <Field key={key}>
          <Label>{label}</Label>
          <Input
            type="number"
            step="any"
            value={values[key]}
            onChange={(e) => handleChange(key, e.target.value)}
          />
          <Hint>{hint}</Hint>
        </Field>
      ))}

      <SectionTitle>コンディションサマリー — 粗利率閾値</SectionTitle>
      {gpThresholdFields.map(({ key, label, hint }) => (
        <Field key={key}>
          <Label>{label}</Label>
          <Input
            type="number"
            step="any"
            value={values[key]}
            onChange={(e) => handleChange(key, e.target.value)}
          />
          <Hint>{hint}</Hint>
        </Field>
      ))}

      <SectionTitle>コンディションサマリー — 売変率閾値</SectionTitle>
      {discountThresholdFields.map(({ key, label, hint }) => (
        <Field key={key}>
          <Label>{label}</Label>
          <Input
            type="number"
            step="any"
            value={values[key]}
            onChange={(e) => handleChange(key, e.target.value)}
          />
          <Hint>{hint}</Hint>
        </Field>
      ))}
    </Modal>
  )
}
