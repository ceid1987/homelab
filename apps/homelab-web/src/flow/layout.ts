/**
 * Semantic table layout — no pixel coordinates in the spec.
 *
 * Every NODE sits in a global grid cell { col, row }. Nodes align across the
 * whole canvas regardless of which group they're in. Groups are NOT grid items —
 * each group is simply a box computed to wrap the nodes it contains (with a
 * header on top), and groups may nest.
 *
 * To rearrange: change a node's { col, row } in `cell`. That's it.
 *
 *   The current table (cols 2 and 6 left empty for spacing):
 *   col →   0          1        2   3         4            5            6   7           8
 *   row 0   terraform  hetzner      argocd    homelab-web
 *   row 1   ansible                 operator               cloudflared      cloudflare  visitor
 *   row 2   developer  repo                   grafana
 *   row 3              ghcr                    prometheus
 */

type Cell = { col: number; row: number }

// ---- THE SPEC (edit these) ----------------------------------------------
const cell: Record<string, Cell> = {
  terraform: { col: 0, row: 0 },
  ansible: { col: 0, row: 1 },
  developer: { col: 0, row: 2 },

  hetzner: { col: 1, row: 0 },
  repo: { col: 1, row: 2 },
  ghcr: { col: 1, row: 3 },

  // col 2 intentionally left empty

  argocd: { col: 3, row: 0 },
  operator: { col: 3, row: 1 },

  'homelab-web': { col: 4, row: 0 },
  grafana: { col: 4, row: 2 },
  prometheus: { col: 4, row: 3 },

  cloudflared: { col: 5, row: 1 },

  // col 6 intentionally left empty

  cloudflare: { col: 7, row: 1 },
  visitor: { col: 8, row: 1 },
}

// Group membership (direct children). A child may itself be a group (nesting).
// Inner groups must be listed before the groups that contain them.
const groups: { id: string; children: string[] }[] = [
  { id: 'workload', children: ['homelab-web', 'grafana', 'prometheus'] },
  { id: 'github', children: ['repo', 'ghcr'] },
  { id: 'cluster', children: ['argocd', 'operator', 'workload', 'cloudflared'] },
]
// -------------------------------------------------------------------------

const CARD_W = 200
const CARD_H = 64
const COL_GAP = 90
const ROW_GAP = 80
const PAD = 18 // group inner padding
const HEADER = 50 // group title space (above the topmost member)

const COL_STEP = CARD_W + COL_GAP
const ROW_STEP = CARD_H + ROW_GAP

export type Box = { x: number; y: number; w: number; h: number }

const parentOf: Record<string, string> = {}
for (const g of groups) for (const c of g.children) parentOf[c] = g.id

export function computeBoxes(): Record<string, Box> {
  const abs: Record<string, Box> = {}

  // 1) Leaf nodes → absolute grid cells.
  for (const [id, { col, row }] of Object.entries(cell)) {
    abs[id] = { x: col * COL_STEP, y: row * ROW_STEP, w: CARD_W, h: CARD_H }
  }

  // 2) Group boxes wrap their members (inner groups already computed).
  for (const g of groups) {
    const bs = g.children.map(c => abs[c])
    const left = Math.min(...bs.map(b => b.x))
    const top = Math.min(...bs.map(b => b.y))
    const right = Math.max(...bs.map(b => b.x + b.w))
    const bottom = Math.max(...bs.map(b => b.y + b.h))
    abs[g.id] = {
      x: left - PAD,
      y: top - PAD - HEADER,
      w: right - left + PAD * 2,
      h: bottom - top + HEADER + PAD * 2,
    }
  }

  // 3) Convert children to positions relative to their parent group.
  const out: Record<string, Box> = {}
  for (const [id, b] of Object.entries(abs)) {
    const p = parentOf[id]
    out[id] = p ? { x: b.x - abs[p].x, y: b.y - abs[p].y, w: b.w, h: b.h } : { ...b }
  }
  return out
}
