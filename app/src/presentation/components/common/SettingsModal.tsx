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
    defaultMarkupRate: (settings.defaultMarkupRate * 100).toString(),
    defaultBudget: settings.defaultBudget.toString(),
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
      defaultMarkupRate: parseFloat(values.defaultMarkupRate) / 100,
      defaultBudget: parseFloat(values.defaultBudget),
    })
    onClose()
  }, [values, onSave, onClose])

  const fields = [
    { key: 'targetGrossProfitRate', label: '目標粗利率 (%)', hint: 'デフォルト: 25%' },
    { key: 'warningThreshold', label: '警告しきい値 (%)', hint: 'デフォルト: 23%' },
    { key: 'flowerCostRate', label: '花掛け率 (%)', hint: 'デフォルト: 80%' },
    { key: 'directProduceCostRate', label: '産直掛け率 (%)', hint: 'デフォルト: 85%' },
    { key: 'defaultMarkupRate', label: 'デフォルト値入率 (%)', hint: 'デフォルト: 26%' },
    { key: 'defaultBudget', label: 'デフォルト予算 (円)', hint: 'デフォルト: 6,450,000' },
  ] as const

  return (
    <Modal
      title="アプリケーション設定"
      onClose={onClose}
      footer={
        <>
          <Button $variant="outline" onClick={onClose}>キャンセル</Button>
          <Button $variant="primary" onClick={handleSave}>保存</Button>
        </>
      }
    >
      {fields.map(({ key, label, hint }) => (
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
