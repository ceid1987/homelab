import { Fragment } from 'react'
import type { Edge } from '@xyflow/react'
import { initialNodes } from '../flow/nodes'
import { allEdges } from '../flow/edges'
import { nodeInfo } from '../flow/nodeInfo'
import { actionInfo } from '../flow/actionInfo'
import './NodeInfo.css'

type Props = {
  id: string
  onNavigate: (id: string) => void
  onSelectAction: (edgeId: string) => void
  onHoverAction: (edgeId: string | null) => void
}

const labelOf = (id: string) => initialNodes.find(n => n.id === id)?.data.label ?? id

const actionName = (e: Edge) =>
  (e.data?.label as string) || actionInfo[e.id]?.title || `${labelOf(e.source)} → ${labelOf(e.target)}`

// Split "...[label](id)..." into text + clickable link segments.
function renderDesc(desc: string, onNavigate: (id: string) => void) {
  const parts: React.ReactNode[] = []
  const re = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(desc)) !== null) {
    if (m.index > last) parts.push(<Fragment key={key++}>{desc.slice(last, m.index)}</Fragment>)
    const [, label, target] = m
    parts.push(
      <button key={key++} type="button" className="node-info__link" onClick={() => onNavigate(target)}>
        {label}
      </button>,
    )
    last = re.lastIndex
  }
  if (last < desc.length) parts.push(<Fragment key={key++}>{desc.slice(last)}</Fragment>)
  return parts
}

export default function NodeInfo({ id, onNavigate, onSelectAction, onHoverAction }: Props) {
  const node = initialNodes.find(n => n.id === id)
  if (!node) return null

  const info = nodeInfo[id]
  const color = node.data.color
  const actions = allEdges.filter(e => e.source === id || e.target === id)

  return (
    <div className="node-info">
      <div className="node-info__head">
        <span className="node-info__logo" style={{ ['--card-color' as any]: color }}>
          {node.data.icon}
        </span>
        <h2 className="node-info__title">{node.data.label}</h2>
      </div>

      {info && <p className="node-info__desc">{renderDesc(info.desc, onNavigate)}</p>}

      {actions.length > 0 && (
        <div className="node-info__section">
          <h3 className="node-info__subtitle">Actions</h3>
          <ul className="action-list">
            {actions.map(e => (
              <li key={e.id}>
                <button
                  type="button"
                  className="action-item"
                  onClick={() => onSelectAction(e.id)}
                  onMouseEnter={() => onHoverAction(e.id)}
                  onMouseLeave={() => onHoverAction(null)}
                >
                  <span className="action-item__dot" />
                  <span>{actionName(e)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
