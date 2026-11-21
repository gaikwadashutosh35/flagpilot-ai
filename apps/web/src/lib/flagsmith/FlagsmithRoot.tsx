import flagsmith from '@flagsmith/flagsmith'
import { FlagsmithProvider } from '@flagsmith/flagsmith/react'
import { createContext, useContext, useState, type ReactNode } from 'react'
import { getVisitorId } from '../identity'
import { FLAGSMITH_ENV_KEY, hasFlagsmithKey } from './env'

// Default false: anything rendered outside FlagsmithRoot takes the no-SDK path.
export const FlagsmithAvailableContext = createContext(false)
export const useFlagsmithAvailable = () => useContext(FlagsmithAvailableContext)

export function FlagsmithRoot({ children }: { children: ReactNode }) {
  const [identity] = useState(() => getVisitorId().id)
  if (!hasFlagsmithKey) return <>{children}</>
  return (
    <FlagsmithAvailableContext.Provider value>
      <FlagsmithProvider
        flagsmith={flagsmith}
        options={{ environmentID: FLAGSMITH_ENV_KEY, identity, enableEvents: true }}
      >
        {children}
      </FlagsmithProvider>
    </FlagsmithAvailableContext.Provider>
  )
}
