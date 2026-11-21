import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { FlagsmithRoot } from './lib/flagsmith/FlagsmithRoot.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FlagsmithRoot>
      <App />
    </FlagsmithRoot>
  </StrictMode>,
)
