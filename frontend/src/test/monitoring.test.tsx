import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AgentMonitoring } from '../components/AgentMonitoring'
import React from 'react'

describe('AgentMonitoring Component', () => {
  it('should render monitoring header', () => {
    render(<AgentMonitoring />)
    expect(screen.getByText('Logs')).toBeDefined()
  })

  it('should render empty state by default', () => {
    render(<AgentMonitoring />)
    expect(screen.getByText('Waiting for logs...')).toBeDefined()
  })
})
