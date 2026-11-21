import { useRef, useState } from 'react'
import { completeDemo, type CompleteResult } from '@/lib/flagsmith/events'
import { useFlagsmithAvailable } from '@/lib/flagsmith/FlagsmithRoot'
import { getVisitorId } from '@/lib/identity'
import { useApprovedPlan } from './approvedPlan'
import { DoneStep } from './DoneStep'
import { generatePlan, type ExperimentPlan } from './plan'
import { PlanEditor } from './PlanEditor'
import { QuestionStep } from './QuestionStep'
import { ReviewStep } from './ReviewStep'

export function CopilotPage() {
  const available = useFlagsmithAvailable()
  const { setPlan: saveApproved } = useApprovedPlan()
  const [step, setStep] = useState<'question' | 'plan' | 'review' | 'done'>('question')
  const [plan, setPlan] = useState<ExperimentPlan | null>(null)
  const [result, setResult] = useState<CompleteResult | null>(null)
  const [pending, setPending] = useState(false)
  const inFlight = useRef(false) // blocks a second approve before the re-render lands

  async function approve() {
    if (!plan || inFlight.current) return
    inFlight.current = true
    setPending(true)
    try {
      const r = await completeDemo(getVisitorId().id, available)
      saveApproved(plan)
      setResult(r)
      setStep('done')
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
        <ReviewStep plan={plan} pending={pending} onBack={() => setStep('plan')} onApprove={approve} />
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
