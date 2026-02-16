import styled from 'styled-components'
import { useState, useCallback, useRef, type DragEvent } from 'react'

const Zone = styled.div<{ $isDragOver: boolean }>`
  border: 2px dashed ${({ $isDragOver, theme }) =>
    $isDragOver ? theme.colors.palette.success : theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background: ${({ $isDragOver, theme }) =>
    $isDragOver ? `${theme.colors.palette.success}10` : 'transparent'};

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
    background: ${({ theme }) => theme.colors.palette.primary}08;
  }
`

const Icon = styled.div`
  font-size: 1.8rem;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const MainText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const HintText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[2]};
`

export function FileDropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        onFiles(e.dataTransfer.files)
      }
    },
    [onFiles],
  )

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFiles(e.target.files)
        e.target.value = ''
      }
    },
    [onFiles],
  )

  return (
    <Zone
      $isDragOver={isDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <Icon>📂</Icon>
      <MainText>ファイルをドラッグ＆ドロップ</MainText>
      <HintText>Excel (.xlsx) / CSV (.csv) 対応</HintText>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        style={{ display: 'none' }}
        onChange={handleChange}
      />
    </Zone>
  )
}
