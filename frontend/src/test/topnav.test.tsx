import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopNav } from '@/components/TopNav'
import React from 'react'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

describe('TopNav Component', () => {
  it('renders brand and core navigation links', () => {
    render(<TopNav />)

    expect(screen.getByText('Heista HQ')).toBeDefined()
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Agent Logs').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
  })
})
