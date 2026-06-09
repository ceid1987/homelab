import { useLayoutEffect, useRef, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

// Arrowhead rotation by the side the edge enters the target.
const ANGLE: Record<string, number> = { left: 0, right: 180, top: 90, bottom: 270 }

/**
 * An orthogonal edge with an optional glass-pill label and a custom arrowhead
 * (drawn here so it can glow in sync with the flow animation).
 *  - dashed lines flow their dashes when active.
 *  - solid lines send a single bright pulse along the line; the arrow flashes
 *    as the pulse reaches it.
 */
export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
  })

  const dashed = Boolean(data?.dashed)
  const active = Boolean(data?.active)
  const label = data?.label as string | undefined
  const hasArrow = Boolean(markerEnd)
  const solidActive = active && !dashed

  // Measure the path so the pulse travels exactly to the end (arrives at t=end
  // for every line, regardless of length → arrow flash stays in sync).
  const pulseRef = useRef<SVGPathElement>(null)
  const [len, setLen] = useState(0)
  useLayoutEffect(() => {
    if (solidActive && pulseRef.current) setLen(pulseRef.current.getTotalLength())
  }, [solidActive, path])

  const angle = ANGLE[targetPosition as unknown as string] ?? 0

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={`flow-edge${dashed ? ' flow-edge--dashed' : ''}${active ? ' flow-edge--active' : ''}`}
      />

      {solidActive && (
        <path
          ref={pulseRef}
          d={path}
          className="flow-edge__pulse"
          style={
            len
              ? { strokeDasharray: `22 ${len}`, ['--flow-len' as any]: `${len}px` }
              : { opacity: 0 }
          }
        />
      )}

      {hasArrow && (
        <path
          d="M0,0 L-11,-6 L-11,6 Z"
          className={`flow-arrow${solidActive ? ' flow-arrow--flow' : ''}`}
          transform={`translate(${targetX} ${targetY}) rotate(${angle})`}
        />
      )}

      {label && (
        <EdgeLabelRenderer>
          <div
            className={`flow-edge__label nodrag nopan${active ? ' flow-edge__label--active' : ''}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
