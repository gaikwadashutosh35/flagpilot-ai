import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ExperimentPlan } from './plan'

type Ctx = { plan: ExperimentPlan | null; setPlan: (p: ExperimentPlan) => void }
const ApprovedPlanContext = createContext<Ctx>({ plan: null, setPlan: () => {} })

// Session-only: lives in React state, never persisted.
export function ApprovedPlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<ExperimentPlan | null>(null)
  return <ApprovedPlanContext.Provider value={{ plan, setPlan }}>{children}</ApprovedPlanContext.Provider>
}

export const useApprovedPlan = () => useContext(ApprovedPlanContext)
