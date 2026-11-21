import { useFlags } from '@flagsmith/flagsmith/react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EVENTS, FLAG_KEY } from '@/lib/flagsmith/constants'
import type { CompleteResult } from '@/lib/flagsmith/events'
import { useFlagsmithAvailable } from '@/lib/flagsmith/FlagsmithRoot'

const SKIP_COPY = {
  unavailable: 'Flagsmith unavailable',
  already_counted: 'already counted for this visitor',
  cta_not_seen: "not counted: you didn't arrive through the experiment CTA",
}

// useFlags needs the provider and reads without recording exposure.
function SeenVariant() {
  const flags = useFlags([FLAG_KEY])
  return <>{flags[FLAG_KEY]?.variant ?? 'not assigned'}</>
}

export function DoneStep({ result, onRestart }: { result: CompleteResult; onRestart: () => void }) {
  const available = useFlagsmithAvailable()
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Plan approved</h2>
      <ul className="space-y-1 text-sm">
        <li>Variant you saw: {available ? <SeenVariant /> : 'not assigned'}</li>
        <li>Event: {EVENTS.demoCompleted}</li>
        <li>{result.sent ? 'Sent' : `Skipped: ${SKIP_COPY[result.reason]}`}</li>
      </ul>
      <div className="flex gap-2">
        <Button render={<Link to="/experiment" />} variant="outline">View experiment status</Button>
        <Button onClick={onRestart}>Start another plan</Button>
      </div>
    </div>
  )
}
