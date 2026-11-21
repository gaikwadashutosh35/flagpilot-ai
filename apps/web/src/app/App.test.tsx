import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './App'

describe('AppRoutes', () => {
  it('renders top bar links and the landing route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Experiment status' })).toHaveAttribute('href', '/experiment')
    expect(screen.getByTestId('landing-page')).toBeInTheDocument()
  })

  it('renders the experiment route', () => {
    render(
      <MemoryRouter initialEntries={['/experiment']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('experiment-status-page')).toBeInTheDocument()
  })
})
