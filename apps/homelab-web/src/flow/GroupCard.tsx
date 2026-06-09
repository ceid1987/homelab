import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import type { FlowCardNode } from './FlowCard'

const SIDES = [
  { pos: Position.Top, id: 'top' },
  { pos: Position.Right, id: 'right' },
  { pos: Position.Bottom, id: 'bottom' },
  { pos: Position.Left, id: 'left' },
] as const

/**
 * A large gray glass container that visually groups child nodes (e.g. the k3s
 * cluster or the GitHub group). Child cards are real React Flow nodes parented
 * to this one, so they render on top of this frame.
 */
function GroupCardComponent({ data }: NodeProps<FlowCardNode>) {
  return (
    <div className="flow-group" style={{ ['--card-color' as any]: data.color }}>
      {SIDES.map(({ pos, id }) => (
        <Handle key={`s-${id}`} type="source" position={pos} id={`s-${id}`} className="flow-handle" />
      ))}
      {SIDES.map(({ pos, id }) => (
        <Handle key={`t-${id}`} type="target" position={pos} id={`t-${id}`} className="flow-handle" />
      ))}

      <div className="flow-group__head">
        {data.icon && <span className="flow-group__logo">{data.icon}</span>}
        <span className="flow-group__title">{data.label}</span>
        {data.sublabel && <span className="flow-group__sub">{data.sublabel}</span>}
      </div>
    </div>
  )
}

export default memo(GroupCardComponent)
