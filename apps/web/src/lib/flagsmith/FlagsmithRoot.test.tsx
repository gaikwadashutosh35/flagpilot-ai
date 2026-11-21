import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  providerProps: vi.fn(),
  env: { hasFlagsmithKey: true, FLAGSMITH_ENV_KEY: 'CLIENTKEY' },
}))

vi.mock('@flagsmith/flagsmith', () => ({ default: { sdk: true } }))
vi.mock('@flagsmith/flagsmith/react', () => ({
  FlagsmithProvider: (props: { children: React.ReactNode }) => {
    m.providerProps(props)
    return <div data-testid="provider">{props.children}</div>
  },
}))
vi.mock('./env', () => ({
  get hasFlagsmithKey() { return m.env.hasFlagsmithKey },
  get FLAGSMITH_ENV_KEY() { return m.env.FLAGSMITH_ENV_KEY },
}))

import { getVisitorId } from '../identity'
import { FlagsmithRoot, useFlagsmithAvailable } from './FlagsmithRoot'

function Child() {
  return <span data-testid="child">{String(useFlagsmithAvailable())}</span>
}

beforeEach(() => {
  vi.clearAllMocks()
  m.env.hasFlagsmithKey = true
})

describe('FlagsmithRoot', () => {
  it('with a key wraps children in the provider with the stable identity and events enabled', () => {
    render(<FlagsmithRoot><Child /></FlagsmithRoot>)
    expect(screen.getByTestId('provider')).toBeInTheDocument()
    expect(m.providerProps.mock.calls[0][0].options).toEqual({
      environmentID: 'CLIENTKEY',
      identity: getVisitorId().id,
      enableEvents: true,
    })
    expect(screen.getByTestId('child')).toHaveTextContent('true')
  })

  it('without a key renders children with no provider and availability false', () => {
    m.env.hasFlagsmithKey = false
    render(<FlagsmithRoot><Child /></FlagsmithRoot>)
    expect(screen.queryByTestId('provider')).toBeNull()
    expect(m.providerProps).not.toHaveBeenCalled()
    expect(screen.getByTestId('child')).toHaveTextContent('false')
  })
})
