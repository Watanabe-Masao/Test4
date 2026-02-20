import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the dashboard navigation', () => {
    render(<App />)
    expect(screen.getByTitle('ダッシュボード')).toBeInTheDocument()
  })

  it('renders the data management sidebar', () => {
    render(<App />)
    expect(screen.getByText('データ管理')).toBeInTheDocument()
  })

  it('renders file upload area', () => {
    render(<App />)
    expect(screen.getByText('ファイル/フォルダをドラッグ＆ドロップ')).toBeInTheDocument()
  })

  it('renders upload cards for file types', () => {
    render(<App />)
    expect(screen.getByText('2_仕入')).toBeInTheDocument()
    expect(screen.getByText('1_売上売変客数')).toBeInTheDocument()
    expect(screen.getByText('3_花')).toBeInTheDocument()
    expect(screen.getByText('5_店間入')).toBeInTheDocument()
  })
})
