import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { loadSnapshot } from './loadSnapshot'
import snapshotJson from './snapshot.json'

const STATUS = { created: 'Created', running: 'Running', paused: 'Paused', completed: 'Ended' }
const when = (v: string) => new Date(v).toLocaleString()

export function ResultsPage({ data = snapshotJson }: { data?: unknown }) {
  const loaded = loadSnapshot(data)
  const snap = loaded.ok ? loaded.snapshot : null
  const exp = snap?.experiment ?? null

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
              {exp.status === 'completed' && <Badge>Ended — results final</Badge>}
              {exp.startedAt && <p className="text-sm">Started {when(exp.startedAt)}</p>}
              {snap?.results == null ? (
                <p>Flagsmith hasn&apos;t computed results yet.</p>
              ) : (
                <p>Results captured from Flagsmith — detailed view coming once the format is confirmed.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
