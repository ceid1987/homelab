import { useEffect, useState } from 'react'

/** A single Prometheus instant-vector sample: { metric labels, [timestamp, value] }. */
export type PromSeries = { metric: Record<string, string>; value: [number, string] }
export type PromVector = { resultType: string; result: PromSeries[] }

export type MetricState = {
  data: PromVector | null
  error: string | null
  loading: boolean
}

/**
 * Fetches a homelab-api metric endpoint (e.g. "/api/metrics/argocd-apps").
 * Pass pollMs > 0 to re-fetch on an interval while mounted. Pass path = null
 * to stay idle (no fetch).
 */
export function useMetric(path: string | null, pollMs = 0): MetricState {
  const [state, setState] = useState<MetricState>({ data: null, error: null, loading: !!path })

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false })
      return
    }

    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(path)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as PromVector
        if (!cancelled) setState({ data: json, error: null, loading: false })
      } catch (e) {
        if (!cancelled) setState(s => ({ ...s, error: (e as Error).message, loading: false }))
      }
    }

    setState(s => ({ ...s, loading: true }))
    load()

    const id = pollMs > 0 ? window.setInterval(load, pollMs) : undefined
    return () => {
      cancelled = true
      if (id) window.clearInterval(id)
    }
  }, [path, pollMs])

  return state
}
