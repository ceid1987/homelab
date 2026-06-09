import { memo } from 'react'
import type { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'

export type FlowCardData = {
  label: string
  sublabel?: string
  /** Brand / accent colour used for the gradient, border tint and logo. */
  color: string
  /** Logo element (e.g. a react-icons brand icon). Optional. */
  icon?: ReactNode
}

export type FlowCardNode = Node<FlowCardData, 'card' | 'group'>

// Source + target handle on each side, kept invisible, so edges can attach
// from whichever direction reads cleanest once we wire the flows up.
const SIDES = [
  { pos: Position.Top, id: 'top' },
  { pos: Position.Right, id: 'right' },
  { pos: Position.Bottom, id: 'bottom' },
  { pos: Position.Left, id: 'left' },
] as const

function FlowCardComponent({ data }: NodeProps<FlowCardNode>) {
  return (
    <div className="flow-card" style={{ ['--card-color' as any]: data.color }}>
      {SIDES.map(({ pos, id }) => (
        <Handle key={`s-${id}`} type="source" position={pos} id={`s-${id}`} className="flow-handle" />
      ))}
      {SIDES.map(({ pos, id }) => (
        <Handle key={`t-${id}`} type="target" position={pos} id={`t-${id}`} className="flow-handle" />
      ))}

      <div className="flow-card__head">
        {data.icon && <span className="flow-card__logo">{data.icon}</span>}
        <span className="flow-card__title">{data.label}</span>
      </div>
      {data.sublabel && <div className="flow-card__sub">{data.sublabel}</div>}
    </div>
  )
}

export default memo(FlowCardComponent)
