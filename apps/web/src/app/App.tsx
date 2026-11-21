import { BrowserRouter, Route, Routes } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { ApprovedPlanProvider } from '@/features/copilot/approvedPlan'
import { CopilotPage } from '@/features/copilot/CopilotPage'
import { ExperimentStatusPage } from '@/features/experiments/ExperimentStatusPage'
import { LandingPage } from '@/features/playground/LandingPage'

export function AppRoutes() {
  return (
    <>
      <TopBar />
      <ApprovedPlanProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/experiment" element={<ExperimentStatusPage />} />
        </Routes>
      </ApprovedPlanProvider>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
