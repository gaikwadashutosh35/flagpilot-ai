import { useExperiment } from '@flagsmith/flagsmith/react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ctaCopyFor, FLAG_KEY } from '@/lib/flagsmith/constants'
import { markCtaSeen } from '@/lib/flagsmith/events'

// The ONLY place useExperiment is called: mounting this records the exposure.
export function CtaExposure({ visitorId, onClick }: { visitorId: string; onClick: () => void }) {
  const flag = useExperiment(FLAG_KEY)
  useEffect(() => markCtaSeen(visitorId), [visitorId])
  return (
    <Button size="lg" onClick={onClick}>
      {ctaCopyFor(flag?.variant)}
    </Button>
  )
}
