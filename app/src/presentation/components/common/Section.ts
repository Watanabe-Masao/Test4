import styled from 'styled-components'

/**
 * 共通セクション / セクションタイトルコンポーネント
 *
 * ページ内のセクション区切りに使う共通スタイル。
 * @responsibility R:unclassified
 */

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`
