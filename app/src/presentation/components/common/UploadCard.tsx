import styled from 'styled-components'
import { useCallback, useRef } from 'react'
import type { DataType } from '@/domain/models'

const CardWrapper = styled.div<{ $loaded: boolean }>`
  border: 1px ${({ $loaded }) => ($loaded ? 'solid' : 'dashed')}
    ${({ $loaded, theme }) => ($loaded ? theme.colors.palette.success : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background: ${({ $loaded, theme }) =>
    $loaded ? `${theme.colors.palette.success}08` : 'transparent'};

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const Icon = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const Name = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const Status = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.palette.success};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const fileTypeIcons: Record<string, string> = {
  purchase: '📦',
  classifiedSales: '💰',
  initialSettings: '⚙️',
  budget: '📊',
  flowers: '🌸',
  directProduce: '🥬',
  consumables: '🧹',
  categoryTimeSales: '🕐',
  interStoreIn: '🔄',
  interStoreOut: '🔄',
}

export function UploadCard({
  dataType,
  label,
  loaded,
  maxDay,
  filename,
  onFile,
  multiple,
}: {
  dataType: DataType
  label: string
  loaded: boolean
  /** 取込データの最終日（存在する場合に表示） */
  maxDay?: number
  filename?: string
  onFile: (files: File | File[], typeHint: DataType) => void
  multiple?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return

      if (multiple && files.length > 1) {
        onFile(Array.from(files), dataType)
      } else {
        onFile(files[0], dataType)
      }
      e.target.value = ''
    },
    [onFile, dataType, multiple],
  )

  return (
    <CardWrapper $loaded={loaded} onClick={handleClick}>
      <Icon>{fileTypeIcons[dataType] ?? '📄'}</Icon>
      <Name>{label}</Name>
      {loaded && (
        <Status>
          {filename ? `✓ ${filename}` : '✓ 読込済'}
          {maxDay != null && maxDay > 0 && ` ${maxDay}日`}
        </Status>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </CardWrapper>
  )
}
