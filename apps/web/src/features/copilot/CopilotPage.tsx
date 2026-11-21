import { useFlagsmithLoading } from '@flagsmith/flagsmith/react'
import { useRef, useState } from 'react'
import { completeDemo, type CompleteResult } from '@/lib/flagsmith/events'
import { useFlagsmithAvailable } from '@/lib/flagsmith/FlagsmithRoot'
import { getVisitorId } from '@/lib/identity'
import { useApprovedPlan } from './approvedPlan'
import { DoneStep } from './DoneStep'
import { generatePlan, validatePlan, type ExperimentPlan } from './plan'
import { PlanEditor } from './PlanEditor'
import { QuestionStep } from './QuestionStep'
import { ReviewStep } from './ReviewStep'

export function CopilotPage() {
  // Unavailable = no key, SDK error or still loading. useFlagsmithLoading returns undefined without a provider.
  const loading = useFlagsmithLoading()
  const available = useFlagsmithAvailable() && !!loading && !loading.isLoading && !loading.error
  const { setPlan: saveApproved } = useApprovedPlan()
  const [step, setStep] = useState<'question' | 'plan' | 'review' | 'done'>('question')
  const [plan, setPlan] = useState<ExperimentPlan | null>(null)
  const [result, setResult] = useState<CompleteResult | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const inFlight = useRef(false) // blocks a second approve before the re-render lands

  async function approve() {
    if (!plan || inFlight.current || validatePlan(plan).length > 0) return
    inFlight.current = true
    setPending(true)
    setError(false)
    try {
      const r = await completeDemo(getVisitorId().id, available)
      saveApproved(plan)
      setResult(r)
      setStep('done')
    } catch {
      setError(true)
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  return (
    <main data-testid="copilot-page" className="mx-auto max-w-2xl space-y-6 p-6">
      {step === 'question' && (
        <QuestionStep
          onNext={(input) => {
            setPlan(generatePlan(input))
            setStep('plan')
          }}
        />
      )}
      {step === 'plan' && plan && (
        <PlanEditor plan={plan} onChange={setPlan} onBack={() => setStep('question')} onNext={() => setStep('review')} />
      )}
      {step === 'review' && plan && (
        <>
          <ReviewStep plan={plan} pending={pending} onBack={() => setStep('plan')} onApprove={approve} />
          {error && <p role="alert" className="text-sm text-destructive">Could not approve the plan. Please try again.</p>}
        </>
      )}
      {step === 'done' && result && (
        <DoneStep
          result={result}
          onRestart={() => {
            setPlan(null)
            setResult(null)
            setStep('question')
          }}
        />
      )}
    </main>
  )
}
