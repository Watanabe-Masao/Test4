import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the dashboard', () => {
    render(<App />)
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
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
    expect(screen.getByText('仕入')).toBeInTheDocument()
    expect(screen.getByText('売上売変')).toBeInTheDocument()
    expect(screen.getByText('花')).toBeInTheDocument()
    expect(screen.getByText('店間入')).toBeInTheDocument()
  })
})
