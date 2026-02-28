import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TopNav } from '@/components/TopNav'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('TopNav', () => {
  it('renders branding name', () => {
    render(<TopNav />)
    expect(screen.getByText('HEISTA')).toBeDefined()
  })

  it('renders navigation links', () => {
    render(<TopNav />)
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Logs')).toBeDefined()
    expect(screen.getByText('Settings')).toBeDefined()
  })
})
