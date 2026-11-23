import { EVENTS } from '@/lib/flagsmith/constants'
import { validatePlan, type ExperimentPlan } from '../copilot/plan'

// Single-line JSON with every non-ASCII code unit escaped (JSON-equivalent): no U+2028/2029, bidi or zero-width characters survive.
const json = (body: unknown) =>
  JSON.stringify(body).replace(/[^ -~]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)

// Quoted heredoc: the shell interprets nothing in the body. The JSON is single-line, so a bare JSON line cannot occur.
const api = (path: string, body?: unknown, method = 'POST') =>
  `flagsmith api ${path} -X ${method} --input -${body ? ` <<'JSON'\n${json(body)}\nJSON` : ''}`

const sentence = (e: string) => e.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())

export function configPreview(plan: ExperimentPlan) {
  const valid = validatePlan(plan).length === 0
  const [, treatment] = plan.variants
  const { primaryMetric: pm } = plan
  const metricName = pm.event === EVENTS.demoCompleted ? 'Demo completed' : sentence(pm.event)
  const exp = 'api/v1/environments/<ENV_KEY>/experiments/'

  const metricBody = { name: metricName, aggregation: pm.aggregation, direction: pm.direction, definition: { version: 1, event: pm.event } }
  const rollout = (live: boolean) => ({
    enabled: live,
    rollout_percentage: live ? 100 : 0,
    feature_state_value: { type: 'string', value: 'control' },
    multivariate_feature_state_values: [{ multivariate_feature_option: '<VARIANT_ID>', percentage_allocation: plan.allocation.treatment }],
  })
  const experimentBody = {
    feature: '<FLAG_ID>',
    name: plan.title,
    hypothesis: plan.hypothesis,
    metrics: [{ metric: '<METRIC_ID>', expected_direction: 'increase' }],
    experiment_rollout: rollout(false),
  }

  return {
    flag: {
      key: plan.flagKey,
      controlValue: 'control' as const,
      variations: [{ key: treatment.key, value: treatment.key, weight: 0 as const }],
    },
    metric: { name: metricName, event: pm.event, aggregation: pm.aggregation, direction: pm.direction },
    experiment: {
      name: plan.title,
      hypothesis: plan.hypothesis,
      allocation: { control: plan.allocation.control, [treatment.key]: plan.allocation.treatment },
    },
    valid,
    blocks: valid
      ? [
          {
            heading: 'Step 1 — approval #1, run separately',
            commands: [
              `flagsmith feature create ${plan.flagKey} --value control --enabled`,
              `flagsmith feature variant add ${plan.flagKey} --value ${treatment.key} --key ${treatment.key} --weight 0`,
            ],
          },
          { heading: 'Step 2 — approval #2, run separately', commands: [api('api/v1/environments/<ENV_KEY>/experiment-metrics/', metricBody)] },
          { heading: 'Step 3 — approval #3, run separately — rollout off (0%), no visitor sees a change', commands: [api(exp, experimentBody)] },
          { heading: 'Step 4 — approval #4, run separately — only after step 3 succeeded — still 0%', commands: [api(`${exp}<EXPERIMENT_ID>/start/`)] },
          {
            heading: 'Step 5 — approval #5, run separately — only after step 4 succeeded — go live: visitors start seeing the split',
            commands: [api(`${exp}<EXPERIMENT_ID>/rollout/`, rollout(true), 'PATCH')],
          },
        ]
      : [],
  }
}
