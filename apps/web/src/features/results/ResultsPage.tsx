import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { loadSnapshot } from './loadSnapshot'
import { fmtChance, fmtInterval, fmtLift, fmtRate, readResults, verdict, type ResultsView } from './resultsView'
import snapshotJson from './snapshot.json'

const STATUS = { created: 'Created', running: 'Running', paused: 'Paused', completed: 'Ended' }
const when = (v: string) => new Date(v).toLocaleString()
const COLS = ['Variant', 'Identities', 'Conversions', 'Conversion rate', 'Lift vs control', '95% interval', 'Chance to win']

function ResultsTable({ view }: { view: ResultsView }) {
  const rows = (['control', 'benefit_copy'] as const).map((k) => {
    const a = view[k]
    const i = k === 'control' ? undefined : a.inference
    return [k, a.n ?? '—', a.sum ?? '—', fmtRate(a.sum, a.n), fmtLift(i?.lift), fmtInterval(i?.ci_low, i?.ci_high), fmtChance(i?.chance_to_win)]
  })
  const srm = view.srmPValue
  return (
    <>
      <div
        role="region"
        aria-labelledby="results-caption"
        tabIndex={0}
        className="overflow-x-auto rounded-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <table className="w-full text-left text-sm">
          <caption id="results-caption" className="pb-2 text-left font-medium">Demo completed (metric 319)</caption>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c} scope="col" className="pr-3 pb-1 font-medium whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, ...cells]) => (
              <tr key={k}>
                <th scope="row" className="pr-3 py-1 font-medium">
                  {k}
                </th>
                {cells.map((c, j) => (
                  <td key={j} className="pr-3 py-1">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-medium">Verdict: {verdict(view)}</p>
      <p className="text-sm text-muted-foreground">Verdict per Flagsmith&apos;s documented thresholds</p>
      <p className="text-sm">{srm === null ? 'SRM check not available from Flagsmith' : `SRM p-value: ${srm < 0.001 ? '<0.001' : srm.toFixed(3)}`}</p>
      {srm !== null && srm < 0.001 && <p className="text-sm">Warning: sample ratio mismatch (SRM p-value below 0.001)</p>}
      <p className="text-sm text-muted-foreground">{view.isFinal ? 'Results final' : 'Results not final yet'}</p>
      {view.asOf && <p className="text-sm text-muted-foreground">Flagsmith computed these results at {when(view.asOf)}</p>}
    </>
  )
}

export function ResultsPage({ data = snapshotJson }: { data?: unknown }) {
  const loaded = loadSnapshot(data)
  const snap = loaded.ok ? loaded.snapshot : null
  const exp = snap?.experiment ?? null
  const read = snap?.results == null ? 'pending' : readResults(snap.results)

  return (
    <main data-testid="results-page" className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Results</h1>
      <p className="text-sm text-muted-foreground">
        {snap?.capturedAt ? `From Flagsmith, as of ${when(snap.capturedAt)}` : 'From Flagsmith'}
      </p>
      {snap && !snap.capturedAt && <p className="text-sm text-muted-foreground">No snapshot captured yet</p>}
      <p className="text-sm text-muted-foreground">Snapshot updated by the project owner via the Flagsmith CLI</p>
      <a className="text-sm underline" href="https://app.flagsmith.com/" target="_blank" rel="noreferrer">
        Open Flagsmith (Flagsmith login required)
      </a>
      <Card>
        <CardHeader>
          <CardTitle>Experiment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {!loaded.ok ? (
            <p>Snapshot unreadable</p>
          ) : !exp ? (
            <>
              <p>No experiment running yet.</p>
              <p className="text-sm text-muted-foreground">
                The experiment will be created and started with owner approval once Flagsmith&apos;s warehouse connects.
              </p>
            </>
          ) : exp.status === 'created' ? (
            <>
              <p className="text-sm">Status: {STATUS[exp.status]}</p>
              <p>Experiment created, not started yet.</p>
            </>
          ) : (
            <>
              <p className="text-sm">Status: {STATUS[exp.status]}</p>
              {exp.status === 'paused' && <Badge>Paused</Badge>}
              {exp.status === 'completed' && <Badge>Ended</Badge>}
              {exp.startedAt && <p className="text-sm">Started {when(exp.startedAt)}</p>}
              {read === 'pending' ? (
                <p>Flagsmith hasn&apos;t computed results yet.</p>
              ) : read === null ? (
                <p>Results captured from Flagsmith — detailed view coming once the format is confirmed.</p>
              ) : (
                <ResultsTable view={read} />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
