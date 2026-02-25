import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentMonitoring } from '../components/AgentMonitoring'
import React from 'react'

describe('AgentMonitoring Component', () => {
  it('should render monitoring title', () => {
    render(<AgentMonitoring />)
    expect(screen.getByText('Agent Monitoring')).toBeDefined()
  })

  it('should render log entries', () => {
    render(<AgentMonitoring />)
    expect(screen.getByText('Arga')).toBeDefined()
    expect(screen.getByText('Starting iteration 4 monitoring')).toBeDefined()
  })
})
