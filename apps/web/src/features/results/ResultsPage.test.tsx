import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ResultsPage } from './ResultsPage'
import committed from './snapshot.json'

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
    expect(screen.getByText('Status: Running')).toBeInTheDocument()
    expect(screen.getByText("Flagsmith hasn't computed results yet.")).toBeInTheDocument()
    expect(screen.getByText(/From Flagsmith, as of \S+/)).toBeInTheDocument()
  })

  it('completed with results null', () => {
    show(snap('completed'))
    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.queryByText(/results final/i)).toBeNull()
    expect(screen.getByText("Flagsmith hasn't computed results yet.")).toBeInTheDocument()
  })

  it('paused', () => {
    show(snap('paused'))
    expect(screen.getByText('Paused')).toBeInTheDocument()
    expect(screen.getByText("Flagsmith hasn't computed results yet.")).toBeInTheDocument()
  })

  it('unrecognised results keep the placeholder and show no raw values', () => {
    show(snap('running', { results: { foo: 12345 } }))
    expect(
      screen.getByText('Results captured from Flagsmith — detailed view coming once the format is confirmed.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/12345/)).toBeNull()
  })

  it('payload null reads as not computed yet', () => {
    show(snap('running', { as_of: null, is_final: false, payload: null }))
    expect(screen.getByText("Flagsmith hasn't computed results yet.")).toBeInTheDocument()
  })

  it('renders the table and verdict for the committed snapshot', () => {
    const { container } = show(committed)
    expect(screen.getByRole('table', { name: 'Demo completed (metric 319)' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(7)
    expect(screen.getByRole('rowheader', { name: 'control' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'benefit_copy' })).toBeInTheDocument()
    // The committed snapshot changes with every refresh: assert structure, not its numbers.
    for (const name of ['control', 'benefit_copy']) {
      const row = screen.getByRole('rowheader', { name }).closest('tr')!
      expect(within(row).getAllByRole('cell')).toHaveLength(6)
    }
    expect(screen.getByText(/^Verdict: (Collecting data|Inconclusive|Leading: (control|benefit_copy))$/)).toBeInTheDocument()
    expect(screen.getByText("Verdict per Flagsmith's documented thresholds")).toBeInTheDocument()
    expect(screen.getByText('SRM check not available from Flagsmith')).toBeInTheDocument()
    expect(screen.getByText('Results not final yet')).toBeInTheDocument()
    expect(screen.getByText(/^Flagsmith computed these results at \S+/)).toBeInTheDocument()
    const region = screen.getByRole('region', { name: 'Demo completed (metric 319)' })
    expect(region).toHaveAttribute('tabindex', '0')
    expect(region.querySelector('table')).not.toBeNull()
    expect(container.textContent).not.toMatch(/[{}]/)
  })

  it('first real snapshot (fc0b215): control missing shows six dashes and Collecting data', () => {
    // Projected results of the first real snapshot, 2026-11-27T16:52:18Z.
    const first = {
      as_of: '2026-11-27T16:51:16.295297Z',
      is_final: false,
      payload: {
        srm_p_value: null,
        metrics: [{ metric_id: 319, variants: { benefit_copy: { n: 1, sum: 1 } }, inference: { benefit_copy: null } }],
      },
    }
    show(snap('running', first))
    const cells = within(screen.getByRole('rowheader', { name: 'control' }).closest('tr')!).getAllByRole('cell')
    expect(cells.map((c) => c.textContent)).toEqual(['—', '—', '—', '—', '—', '—'])
    expect(screen.getByText('Verdict: Collecting data')).toBeInTheDocument()
  })

  it('warns on a sample ratio mismatch', () => {
    const r = structuredClone(committed.results) as { payload: { srm_p_value: number | null } }
    r.payload.srm_p_value = 0.0004
    show(snap('running', r))
    expect(screen.getByText('SRM p-value: <0.001')).toBeInTheDocument()
    expect(screen.getByText('Warning: sample ratio mismatch (SRM p-value below 0.001)')).toBeInTheDocument()
  })

  it('shows a plain SRM p-value at or above 0.001', () => {
    const r = structuredClone(committed.results) as { payload: { srm_p_value: number | null } }
    r.payload.srm_p_value = 0.0123
    show(snap('running', r))
    expect(screen.getByText('SRM p-value: 0.012')).toBeInTheDocument()
    expect(screen.queryByText(/Warning: sample ratio/)).toBeNull()
  })

  it('completed with results not final shows Ended and not final', () => {
    show(snap('completed', committed.results))
    expect(screen.getByText('Ended')).toBeInTheDocument()
    expect(screen.getByText('Results not final yet')).toBeInTheDocument()
    expect(screen.queryByText('Results final')).toBeNull()
  })

  it('shows Results final when Flagsmith says so, whatever the status', () => {
    show(snap('running', { ...committed.results, is_final: true }))
    expect(screen.getByText('Results final')).toBeInTheDocument()
    expect(screen.queryByText('Results not final yet')).toBeNull()
  })

  it('hides the compute time when Flagsmith gave none', () => {
    show(snap('running', { ...committed.results, as_of: null }))
    expect(screen.queryByText(/computed these results/)).toBeNull()
  })

  it('renders a numeric control arm', () => {
    const r = structuredClone(committed.results) as { payload: { metrics: { variants: Record<string, unknown> }[] } }
    r.payload.metrics[0].variants.control = { n: 120, sum: 36 }
    show(snap('running', r))
    const row = screen.getByRole('rowheader', { name: 'control' }).closest('tr')!
    const cells = within(row).getAllByRole('cell')
    expect(cells.slice(0, 3).map((c) => c.textContent)).toEqual(['120', '36', '30.0%'])
  })

  it('invalid snapshot', () => {
    show({ schemaVersion: 9 })
    expect(screen.getByText('Snapshot unreadable')).toBeInTheDocument()
    expect(screen.getByText('From Flagsmith')).toBeInTheDocument()
    expect(screen.queryByText(/No snapshot captured yet/)).toBeNull()
  })

  it('always shows provenance and dashboard link', () => {
    show()
    expect(screen.queryByText('Snapshot unreadable')).toBeNull()
    expect(screen.getByText('Snapshot updated by the project owner via the Flagsmith CLI')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Flagsmith (Flagsmith login required)' })).toHaveAttribute(
      'href',
      'https://app.flagsmith.com/',
    )
  })
})
