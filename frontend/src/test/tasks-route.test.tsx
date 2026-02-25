import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import TasksPage from '@/app/(dashboard)/tasks/page'

vi.mock('@/components/TrelloBoard', () => ({
  TrelloBoard: () => <div data-testid="trello-board">Mock Trello Board</div>,
}))

describe('/tasks route', () => {
  it('renders board component', () => {
    render(<TasksPage />)

    expect(screen.getByText('Tasks Board')).toBeInTheDocument()
    expect(screen.getByTestId('trello-board')).toBeInTheDocument()
  })
})
