import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopNav } from '@/components/TopNav'
import React from 'react'

let mockPathname = '/'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('TopNav Component', () => {
  beforeEach(() => {
    mockPathname = '/'
  })

  it('renders brand and minimal navigation links', () => {
    render(<TopNav />)

    expect(screen.getByText('Heista HQ')).toBeDefined()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Monitor').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Logs').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
  })

  it('marks active link based on pathname', () => {
    mockPathname = '/tasks'
    render(<TopNav />)

    const activeLinks = screen.getAllByRole('link', { current: 'page' })
    expect(activeLinks.length).toBeGreaterThan(0)
    expect(activeLinks.some((link) => link.textContent?.includes('Tasks'))).toBe(true)
  })
})
