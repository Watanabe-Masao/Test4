/**
 * SegmentedControl — macOS NSSegmentedControl 準拠デザイン
 *
 * Track: 微かな凹み（inset shadow）
 * Thumb: 浮き上がるインジケータ（box-shadow + bg3）
 * 静かで上品。業務分析UIに合う「整理された密度」。
 */
import styled from 'styled-components'

/** Track inset shadow opacity — dark / light */
const TRACK_SHADOW_OPACITY = { dark: '0.3', light: '0.06' } as const

export const Track = styled.div<{ $size: 'sm' | 'md' }>`
  display: inline-flex;
  gap: ${({ theme }) => theme.spacing[0]};
  padding: ${({ theme }) => theme.spacing[0]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg2};
  box-shadow: inset 0 1px 2px
    rgba(0, 0, 0, ${({ theme }) => TRACK_SHADOW_OPACITY[theme.mode]});
`

export const Segment = styled.button<{ $active: boolean; $size: 'sm' | 'md' }>`
  all: unset;
  cursor: pointer;
  padding: ${({ $size, theme }) =>
    $size === 'sm'
      ? `${theme.spacing[1]} ${theme.spacing[5]}`
      : `${theme.spacing[2]} ${theme.spacing[7]}`};
  font-size: ${({ $size, theme }) =>
    $size === 'sm' ? theme.typography.fontSize.xs : theme.typography.fontSize.sm};
  border-radius: ${({ theme }) => theme.radii.sm};
  white-space: nowrap;
  transition: all ${({ theme }) => theme.transitions.fast} ease;
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.bg3 : 'transparent')};
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadows.sm : 'none')};

  &:hover:not([aria-checked='true']) {
    color: ${({ theme }) => theme.colors.text2};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 1px;
  }
`
