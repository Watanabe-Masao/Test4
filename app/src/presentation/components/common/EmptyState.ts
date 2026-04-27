import styled from 'styled-components'

/**
 * 共通 EmptyState コンポーネント
 *
 * データが存在しない場合や計算未実行時に表示する空状態メッセージ。
 * @responsibility R:unclassified
 */
export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`
