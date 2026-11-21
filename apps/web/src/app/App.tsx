import { BrowserRouter, Route, Routes } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import { CopilotPage } from '@/features/copilot/CopilotPage'
import { ExperimentStatusPage } from '@/features/experiments/ExperimentStatusPage'
import { LandingPage } from '@/features/playground/LandingPage'

export function AppRoutes() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="/experiment" element={<ExperimentStatusPage />} />
      </Routes>
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
