/**
 * ContainedAnalysisPanel — 包含型分析パネルのスタイル
 *
 * 親の中に子を含む共通UI枠。日別系もカテゴリ系も同じテンプレートで統一。
 * role に応じた背景色の段階（child=子、grandchild=孫）。
 */
import styled, { keyframes, css } from 'styled-components'
import { palette } from '@/presentation/theme/tokens'

// ── アニメーション ──

const slideDown = keyframes`
  0% {
    opacity: 0;
    transform: translateY(-8px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`

// ── role 別スタイル ──

const childStyle = css`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  border-left: 3px solid ${({ theme }) => theme.colors.palette.primary};
`

const grandchildStyle = css`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.008)'};
  border-left: 3px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')};
`

// ── 到達時ハイライト ──

const arrivalGlow = keyframes`
  0% {
    box-shadow: 0 0 0 0 var(--arrival-color, ${palette.blueDark}59);
  }
  50% {
    box-shadow: 0 0 0 3px var(--arrival-color, ${palette.blueDark}2e);
  }
  100% {
    box-shadow: 0 0 0 0 var(--arrival-color, ${palette.blueDark}00);
  }
`

const emphasizedStyle = css`
  animation:
    ${slideDown} 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) both,
    ${arrivalGlow} 0.6s ease-out 0.3s both;
  border-left-width: 4px;
`

// ── メインコンテナ ──

export type ContainedRole = 'child' | 'grandchild'

export const PanelShell = styled.div<{ $role: ContainedRole; $emphasized?: boolean }>`
  margin-top: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]};
  --arrival-color: ${({ theme }) => `${theme.colors.palette.primary}50`};
  ${({ $emphasized }) =>
    $emphasized
      ? emphasizedStyle
      : css`
          animation: ${slideDown} 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) both;
        `}
  ${({ $role }) => ($role === 'grandchild' ? grandchildStyle : childStyle)}
`

// ── ヘッダ ──

export const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const PanelTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const DrillLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.palette.primary};
  white-space: nowrap;
`

export const PanelSubtitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

// ── コンテキストタグ（継承条件表示） ──

export const ContextTagBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const ContextTagChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
`

export const TagLabel = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`
