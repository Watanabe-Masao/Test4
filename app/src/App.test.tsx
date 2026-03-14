import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the dashboard navigation', () => {
    render(<App />)
    expect(screen.getByTitle('概要')).toBeInTheDocument()
  })

  it('renders the data management sidebar', () => {
    render(<App />)
    expect(screen.getByText('データ管理')).toBeInTheDocument()
  })

  it('renders import button in sidebar', () => {
    render(<App />)
    expect(screen.getByText('取込')).toBeInTheDocument()
  })
})
