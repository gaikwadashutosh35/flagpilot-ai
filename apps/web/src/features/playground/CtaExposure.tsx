import { useExperiment } from '@flagsmith/flagsmith/react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ctaCopyFor, FLAG_KEY } from '@/lib/flagsmith/constants'
import { markCtaSeen } from '@/lib/flagsmith/events'

// The ONLY place useExperiment is called: mounting this records the exposure.
export function CtaExposure({ visitorId, onClick }: { visitorId: string; onClick: () => void }) {
  const flag = useExperiment(FLAG_KEY)
  // Seen = the SDK recorded an exposure (the visitor is enrolled in the experiment).
  const inExperiment = !!flag?.experiment?.inExperiment
  useEffect(() => {
    if (inExperiment) markCtaSeen(visitorId)
  }, [visitorId, inExperiment])
  return (
    <Button size="lg" onClick={onClick}>
      {ctaCopyFor(flag?.variant)}
    </Button>
  )
}
