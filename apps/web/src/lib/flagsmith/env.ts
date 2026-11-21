const raw: string = import.meta.env.VITE_FLAGSMITH_ENVIRONMENT_KEY ?? ''
// A server key (ser.) must never be used client-side: treat it as missing.
export const FLAGSMITH_ENV_KEY: string = raw.startsWith('ser.') ? '' : raw
export const hasFlagsmithKey: boolean = FLAGSMITH_ENV_KEY.length > 0
