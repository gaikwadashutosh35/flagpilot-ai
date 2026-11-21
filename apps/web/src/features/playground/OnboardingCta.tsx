import { useFlagsmithLoading } from '@flagsmith/flagsmith/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getVisitorId } from '@/lib/identity'
import { ctaCopyFor } from '@/lib/flagsmith/constants'
import { trackCtaClick } from '@/lib/flagsmith/events'
import { useFlagsmithAvailable } from '@/lib/flagsmith/FlagsmithRoot'
import { CtaExposure } from './CtaExposure'

type Phase = 'loading' | 'exposed' | 'timed_out'

function ControlCta({ available }: { available: boolean }) {
  const navigate = useNavigate()
  return (
    <Button
      size="lg"
      onClick={() => {
        trackCtaClick(available)
        navigate('/copilot')
      }}
    >
      {ctaCopyFor(null)}
    </Button>
  )
}

function CtaGate({ timeoutMs }: { timeoutMs: number }) {
  const navigate = useNavigate()
  const loading = useFlagsmithLoading()
  const [visitorId] = useState(() => getVisitorId().id)
  const [phase, setPhase] = useState<Phase>('loading')
  // "Loaded" = SDK finished with flag data and no error (isLoading is true until then).
  const loaded = !!loading && !loading.isLoading && !loading.error
  const failed = !!loading?.error

  useEffect(() => {
    const t = setTimeout(() => setPhase((p) => (p === 'loading' ? 'timed_out' : p)), timeoutMs)
    return () => clearTimeout(t)
  }, [timeoutMs])

  // Phase is decided once; set during render (React's derived-state pattern), never changes after.
  if (phase === 'loading' && (loaded || failed)) setPhase(loaded ? 'exposed' : 'timed_out')

  if (phase === 'loading') return <Skeleton data-testid="cta-skeleton" className="h-9 w-64" />
  if (phase === 'timed_out') return <ControlCta available={false} />
  return (
    <CtaExposure
      visitorId={visitorId}
      onClick={() => {
        trackCtaClick(true)
        navigate('/copilot')
      }}
    />
  )
}

export function OnboardingCta({ timeoutMs = 3000 }: { timeoutMs?: number }) {
  return useFlagsmithAvailable() ? <CtaGate timeoutMs={timeoutMs} /> : <ControlCta available={false} />
}
