import { createContext, useContext } from 'react'

/** Whether the on-chart metric overlays are currently enabled. */
export const MetricsContext = createContext(false)

export const useMetricsEnabled = () => useContext(MetricsContext)
