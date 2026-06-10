/** Shared helpers for live metric widgets (info panel + flowchart overlays). */

export const scalar = (raw: string | undefined) =>
  raw != null && raw !== '' ? parseFloat(raw) : null

/** Neutral colour for unknown / loading state. */
export const MUTED = '#94a3b8'

/** Continuous green→red gradient colour for a 0–100 percentage (0 = green). */
export function gaugeColor(pct: number): string {
  const p = Math.max(0, Math.min(100, pct))
  return `hsl(${120 - 1.2 * p} 75% 50%)`
}

export function fmtUptime(seconds: number) {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
