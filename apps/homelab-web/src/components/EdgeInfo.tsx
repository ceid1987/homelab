import { LuArrowRight } from 'react-icons/lu'
import { initialNodes } from '../flow/nodes'
import { allEdges } from '../flow/edges'
import { actionInfo } from '../flow/actionInfo'
import './NodeInfo.css'

type Props = {
  id: string
  onNavigate: (id: string) => void
  onHoverNode: (id: string | null) => void
}

export default function EdgeInfo({ id, onNavigate, onHoverNode }: Props) {
  const edge = allEdges.find(e => e.id === id)
  if (!edge) return null

  const info = actionInfo[id]
  const title = (edge.data?.label as string) || info?.title || 'Action'

  const chip = (nid: string) => {
    const n = initialNodes.find(x => x.id === nid)
    if (!n) return null
    return (
      <button
        type="button"
        className="node-chip"
        onClick={() => onNavigate(nid)}
        onMouseEnter={() => onHoverNode(nid)}
        onMouseLeave={() => onHoverNode(null)}
      >
        <span className="node-chip__logo" style={{ ['--card-color' as any]: n.data.color }}>
          {n.data.icon}
        </span>
        <span>{n.data.label}</span>
      </button>
    )
  }

  return (
    <div className="node-info">
      <div className="node-info__head">
        <span className="node-info__logo node-info__logo--action">
          <LuArrowRight />
        </span>
        <h2 className="node-info__title">{title}</h2>
      </div>

      {info?.desc && <p className="node-info__desc">{info.desc}</p>}

      <div className="node-info__section">
        <h3 className="node-info__subtitle">Nodes</h3>
        <div className="node-chips">
          {chip(edge.source)}
          <span className="node-chip__arrow">→</span>
          {chip(edge.target)}
        </div>
      </div>
    </div>
  )
}
