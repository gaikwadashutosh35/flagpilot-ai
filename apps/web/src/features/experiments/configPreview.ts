import type { ExperimentPlan } from '../copilot/plan'

const api = (path: string, body?: unknown) =>
  `${body ? `echo '${JSON.stringify(body)}' | ` : ''}flagsmith api ${path} -X POST --input -`

export function configPreview(plan: ExperimentPlan) {
  const [, treatment] = plan.variants
  const { primaryMetric: pm } = plan
  const metricName = pm.event.replace(/_/g, ' ')
  const exp = 'api/v1/environments/<ENV_KEY>/experiments/'

  const metricBody = { name: metricName, aggregation: pm.aggregation, direction: pm.direction, definition: { version: 1, event: pm.event } }
  const experimentBody = {
    feature: '<FLAG_ID>',
    name: plan.title,
    hypothesis: plan.hypothesis,
    metrics: [{ metric: '<METRIC_ID>', expected_direction: 'increase' }],
    experiment_rollout: {
      enabled: true,
      rollout_percentage: 100,
      feature_state_value: { type: 'string', value: 'control' },
      multivariate_feature_state_values: [{ multivariate_feature_option: '<VARIANT_ID>', percentage_allocation: plan.allocation.treatment }],
    },
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
    cliSteps: [
      `flagsmith feature create ${plan.flagKey} --value control --enabled`,
      `flagsmith feature variant add ${plan.flagKey} --value ${treatment.key} --key ${treatment.key} --weight 0`,
      api('api/v1/environments/<ENV_KEY>/experiment-metrics/', metricBody),
      api(exp, experimentBody),
      api(`${exp}<EXPERIMENT_ID>/start/`),
    ],
  }
}
