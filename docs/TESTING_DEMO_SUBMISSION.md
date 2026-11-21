# Testing, Demo and Submission

## Testing layers

### Unit
- Experiment plan schema and required fields.
- Exact event naming.
- Identity persistence.
- Conversion only after real completion.
- Approval required for privileged actions.
- Results formatting for empty/inconclusive states.

### Integration
- Flagsmith SDK initialises correctly.
- Flag evaluation returns control/treatment variant.
- Exposure is recorded where the variant is shown.
- Conversion is associated with the same identity.
- Event flush runs through supported SDK method.
- Results API errors are surfaced.

### End-to-end
1. Open Experiment Playground.
2. Confirm Flagsmith assigns CTA variation.
3. Complete real demo flow.
4. Verify conversion event.
5. Open Flagsmith results view.
6. Confirm UI shows Flagsmith-sourced status/results.

## Manual quality gates

- [ ] No SDK errors in browser console.
- [ ] No admin key or LLM key in built JS.
- [ ] Stable identity across refresh.
- [ ] Same identity in exposure and conversion.
- [ ] Exact metric event name.
- [ ] Experiment status verified.
- [ ] Results are from Flagsmith.
- [ ] Inconclusive state is honest.
- [ ] Responsive and keyboard-accessible.
- [ ] No fake analytics/results.

## Demo video: 2–3 minutes

1. Problem and target user.
2. Plain-language experiment idea.
3. Generated hypothesis, variants and metric.
4. Human approval of proposed configuration.
5. Flagsmith-controlled UI variant.
6. Genuine completion and conversion event.
7. Flagsmith experiment/result view.
8. Honest explanation of result and impact.

## Submission

Confirm the current official hackathon form. The event page expects a public project/repository and demo video; follow the live submission portal for final required fields.

Official dates currently shown:
- Nov 26, 2026, 8:00 AM IST: hacking starts.
- Nov 29, 2026, 8:00 PM IST: submissions close.

Submit with a time buffer. Keep README, public repo, deployed demo and video links accessible.
