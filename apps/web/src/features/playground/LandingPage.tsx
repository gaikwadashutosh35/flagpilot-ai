import { OnboardingCta } from './OnboardingCta'

export function LandingPage() {
  return (
    <main data-testid="landing-page" className="mx-auto flex max-w-2xl flex-col items-start gap-6 px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Plan experiments with a guided copilot.</h1>
      <p className="text-lg text-muted-foreground">
        Describe a question, review the plan, approve it. FlagPilot maps it to a Flagsmith experiment preview.
      </p>
      <OnboardingCta />
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Ask a product question.</li>
        <li>Review and edit the generated plan.</li>
        <li>Approve it to complete the demo.</li>
      </ol>
    </main>
  )
}
