import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ResultsPage } from './ResultsPage'

const T = '2026-11-23T10:00:00Z'
const snap = (status: string, results: unknown = null) => ({
  schemaVersion: 1,
  capturedAt: T,
  experiment: { id: 1, name: 'x', status, startedAt: T, endedAt: null },
  exposures: null,
  results,
})
const show = (data?: unknown) =>
  render(
    <MemoryRouter>
      <ResultsPage data={data} />
    </MemoryRouter>,
  )

describe('ResultsPage', () => {
  it('no experiment', () => {
    show({ schemaVersion: 1, capturedAt: null, experiment: null, exposures: null, results: null })
    expect(screen.getByText('No experiment running yet.')).toBeInTheDocument()
    expect(screen.getByText(/No snapshot captured yet/)).toBeInTheDocument()
    expect(screen.getByText('From Flagsmith')).toBeInTheDocument()
  })

  it('created', () => {
    show(snap('created'))
    expect(screen.getByText('Experiment created, not started yet.')).toBeInTheDocument()
  })

  it('running with results null', () => {
    show(snap('running'))
    expect(screen.getByText("Flagsmith hasn't computed results yet.")).toBeInTheDocument()
    expect(screen.getByText(/From Flagsmith, as of \S+/)).toBeInTheDocument()
  })

  it('completed with results null', () => {
    show(snap('completed'))
    expect(screen.getByText('Ended — results final')).toBeInTheDocument()
    expect(screen.getByText("Flagsmith hasn't computed results yet.")).toBeInTheDocument()
  })

  it('paused', () => {
    show(snap('paused'))
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('results present before mapping', () => {
    show(snap('running', { foo: 12345 }))
    expect(
      screen.getByText('Results captured from Flagsmith — detailed view coming once the format is confirmed.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/12345/)).toBeNull()
  })

  it('invalid snapshot', () => {
    show({ schemaVersion: 9 })
    expect(screen.getByText('Snapshot unreadable')).toBeInTheDocument()
    expect(screen.getByText('From Flagsmith')).toBeInTheDocument()
    expect(screen.queryByText(/No snapshot captured yet/)).toBeNull()
  })

  it('always shows provenance and dashboard link', () => {
    show()
    expect(screen.getByText('Snapshot updated by the project owner via the Flagsmith CLI')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Flagsmith (Flagsmith login required)' })).toHaveAttribute(
      'href',
      'https://app.flagsmith.com/',
    )
  })
})
