import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByText('仕入荒利管理システム')).toBeInTheDocument()
  })

  it('renders the theme toggle button', () => {
    render(<App />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
