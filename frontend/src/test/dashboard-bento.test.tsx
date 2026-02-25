import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardBento } from '@/components/DashboardBento'
import React from 'react'

describe('DashboardBento Component', () => {
  it('renders all required bento cards', () => {
    render(<DashboardBento />)

    expect(screen.getByText('AI Token Usage')).toBeDefined()
    expect(screen.getByText('VPS Status')).toBeDefined()
    expect(screen.getByText('News')).toBeDefined()
    expect(screen.getByText('Twitter Trends')).toBeDefined()
  })
})
