export const FLAGSMITH_ENV_KEY: string = import.meta.env.VITE_FLAGSMITH_ENVIRONMENT_KEY ?? ''
export const hasFlagsmithKey: boolean = FLAGSMITH_ENV_KEY.length > 0
