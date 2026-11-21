import { useFlags, useFlagsmithLoading } from '@flagsmith/flagsmith/react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApprovedPlan } from '@/features/copilot/approvedPlan'
import { FLAGSHIP_QUESTION, generatePlan } from '@/features/copilot/plan'
import { hasFlagsmithKey } from '@/lib/flagsmith/env'
import { FLAG_KEY } from '@/lib/flagsmith/constants'
import { useFlagsmithAvailable } from '@/lib/flagsmith/FlagsmithRoot'
import { getVisitorId } from '@/lib/identity'
import { configPreview } from './configPreview'

const yn = (b: boolean) => (b ? 'yes' : 'no')

// Rendered only when the provider exists. Reads with useFlags, never useExperiment (no exposure).
function SdkStatus() {
  const loading = useFlagsmithLoading()
  const flag = useFlags([FLAG_KEY])[FLAG_KEY]
  const loaded = !!loading && !loading.isLoading && !loading.error
  return (
    <>
      <p>Flagsmith: {loaded ? 'loaded' : loading?.error ? 'SDK error' : 'loading'}</p>
      <p>Variant: {flag?.variant ?? 'none'}</p>
      <p>In experiment: {yn(!!flag?.experiment?.inExperiment)}</p>
    </>
  )
}

export function ExperimentStatusPage() {
  const available = useFlagsmithAvailable()
  const { plan: approved } = useApprovedPlan()
  const plan = approved ?? generatePlan({ question: FLAGSHIP_QUESTION })
  const preview = configPreview(plan)
  const { id, persistent } = getVisitorId()

  return (
    <main data-testid="experiment-status-page" className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Experiment status</h1>
      <Card>
        <CardHeader><CardTitle>Live state</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>Client key present: {yn(hasFlagsmithKey)}</p>
          <p>
            Identity: {id.slice(0, 8)}
            {!persistent && <Badge variant="outline" className="ml-2">not persistent</Badge>}
          </p>
          {available ? <SdkStatus /> : <p>Flagsmith: not configured</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Flagsmith configuration preview</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="font-medium">Preview only: applied by the project owner via the Flagsmith CLI after explicit approval. The browser never writes to Flagsmith.</p>
          <p>Flag: {preview.flag.key} (control value "{preview.flag.controlValue}")</p>
          <p>Variations: {preview.flag.variations.map((v) => `${v.key} (weight ${v.weight})`).join(', ')}</p>
          <p>Metric: {preview.metric.name} ({preview.metric.event}, {preview.metric.aggregation}, {preview.metric.direction})</p>
          <p>Allocation: {Object.entries(preview.experiment.allocation).map(([k, v]) => `${k} ${v}%`).join(', ')}</p>
          <p>Target: project FlagPilot / environment Development</p>
          <p className="text-xs text-muted-foreground">bash / Git Bash only</p>
          {preview.valid ? (
            preview.blocks.map((b) => (
              <section key={b.heading} className="space-y-1">
                <h3 className="font-medium">{b.heading}</h3>
                <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{b.commands.join('\n')}</pre>
              </section>
            ))
          ) : (
            <p role="alert">Plan is invalid — fix it in the copilot before previewing commands.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
