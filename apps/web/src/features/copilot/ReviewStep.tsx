import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { validatePlan, type ExperimentPlan } from './plan'

export function ReviewStep({
  plan,
  pending,
  onBack,
  onApprove,
}: {
  plan: ExperimentPlan
  pending: boolean
  onBack: () => void
  onApprove: () => void
}) {
  const [reviewed, setReviewed] = useState(false)
  const valid = validatePlan(plan).length === 0
  return (
    <div className="space-y-4">
      <dl className="space-y-1 text-sm">
        <dt className="font-medium">Title</dt><dd>{plan.title}</dd>
        <dt className="font-medium">Question</dt><dd>{plan.question}</dd>
        <dt className="font-medium">Hypothesis</dt><dd>{plan.hypothesis}</dd>
        <dt className="font-medium">Flag key</dt><dd>{plan.flagKey}</dd>
        <dt className="font-medium">Variants</dt>
        <dd>{plan.variants.map((v) => `${v.key}: ${v.label}`).join(' / ')}</dd>
        <dt className="font-medium">Primary metric</dt><dd>{plan.primaryMetric.event}</dd>
        <dt className="font-medium">Diagnostic event</dt><dd>{plan.diagnosticEvent ?? 'none'}</dd>
        <dt className="font-medium">Allocation</dt><dd>50/50</dd>
        <dt className="font-medium">Risks</dt><dd>{plan.risks.join(' ')}</dd>
      </dl>
      <div className="flex items-center gap-2">
        <Checkbox id="reviewed" checked={reviewed} onCheckedChange={(c) => setReviewed(c === true)} />
        <Label htmlFor="reviewed">I reviewed this plan</Label>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={pending}>Back</Button>
        <Button disabled={!valid || !reviewed || pending} onClick={onApprove}>{pending ? 'Approving…' : 'Approve plan'}</Button>
      </div>
    </div>
  )
}
