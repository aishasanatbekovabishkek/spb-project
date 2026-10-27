export const API_MODE = import.meta.env.VITE_API_MODE === 'true'

export const APP_CONFIG = {
  apiMode: API_MODE,
  demoMode: !API_MODE,
  appName: 'JobTracker',
} as const
