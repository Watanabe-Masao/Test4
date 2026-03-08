import styled from 'styled-components'

export const Field = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const Input = styled.input`
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

export const Hint = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

export const SectionTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-top: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-bottom: ${({ theme }) => theme.spacing[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const FolderSyncRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const FolderName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`

export const FolderStatus = styled.span<{ $ok: boolean }>`
  font-size: 0.6rem;
  color: ${({ theme, $ok }) => ($ok ? theme.colors.palette.success : theme.colors.text4)};
`

export const FolderSmallBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text3};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

export const DiagnosticBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
`
