import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { validatePlan, type ExperimentPlan } from './plan'

export function PlanEditor({
  plan,
  onChange,
  onBack,
  onNext,
}: {
  plan: ExperimentPlan
  onChange: (p: ExperimentPlan) => void
  onBack: () => void
  onNext: () => void
}) {
  const errors = validatePlan(plan)
  const setVariant = (i: 0 | 1, patch: { label?: string; description?: string }) => {
    const variants: ExperimentPlan['variants'] = [{ ...plan.variants[0] }, { ...plan.variants[1] }]
    Object.assign(variants[i], patch)
    onChange({ ...plan, variants })
  }
  const field = (id: string, label: string, value: string, set: (v: string) => void, area = false) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {area ? (
        <Textarea id={id} value={value} onChange={(e) => set(e.target.value)} />
      ) : (
        <Input id={id} value={value} onChange={(e) => set(e.target.value)} />
      )}
    </div>
  )
  return (
    <div className="space-y-4">
      {field('title', 'Title', plan.title, (v) => onChange({ ...plan, title: v }))}
      {field('hypothesis', 'Hypothesis', plan.hypothesis, (v) => onChange({ ...plan, hypothesis: v }), true)}
      {field('flagKey', 'Flag key', plan.flagKey, (v) => onChange({ ...plan, flagKey: v }))}
      {plan.variants.map((v, i) => (
        <div key={i} className="space-y-2">
          <p className="text-sm font-medium">Variant key: {v.key}</p>
          {field(`v${i}-label`, `Variant ${i + 1} label`, v.label, (x) => setVariant(i as 0 | 1, { label: x }))}
          {field(`v${i}-desc`, `Variant ${i + 1} description`, v.description, (x) =>
            setVariant(i as 0 | 1, { description: x }),
          )}
        </div>
      ))}
      {field('metric', 'Primary metric event', plan.primaryMetric.event, (v) =>
        onChange({ ...plan, primaryMetric: { ...plan.primaryMetric, event: v } }),
      )}
      {field('diagnostic', 'Diagnostic event', plan.diagnosticEvent ?? '', (v) =>
        onChange({ ...plan, diagnosticEvent: v === '' ? undefined : v }),
      )}
      <p className="text-sm text-muted-foreground">Allocation: 50% control / 50% treatment (fixed)</p>
      {errors.length > 0 && (
        <ul role="alert" className="list-disc pl-5 text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button disabled={errors.length > 0} onClick={onNext}>Next</Button>
      </div>
    </div>
  )
}
