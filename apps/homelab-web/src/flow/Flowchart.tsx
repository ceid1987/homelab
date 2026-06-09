import { useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import { LuPlus, LuMinus, LuMaximize, LuEye, LuEyeOff } from 'react-icons/lu'
import '@xyflow/react/dist/style.css'

import FlowCard from './FlowCard'
import GroupCard from './GroupCard'
import LabeledEdge from './LabeledEdge'
import { initialNodes } from './nodes'
import { allEdges } from './edges'
import './flow.css'

const nodeTypes: NodeTypes = { card: FlowCard, group: GroupCard }
const edgeTypes: EdgeTypes = { labeled: LabeledEdge }

type Props = {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  hoveredEdgeId: string | null
  hoveredNodeId: string | null
  onSelectNode: (id: string) => void
  onSelectEdge: (id: string) => void
  onHoverEdge: (id: string | null) => void
  onClearSelection: () => void
}

function FlowCanvas({
  selectedNodeId,
  selectedEdgeId,
  hoveredEdgeId,
  hoveredNodeId,
  onSelectNode,
  onSelectEdge,
  onHoverEdge,
  onClearSelection,
}: Props) {
  const rf = useReactFlow()
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(allEdges)
  const [showAnnotations, setShowAnnotations] = useState(false)

  const displayNodes = useMemo(
    () =>
      nodes.map(n => {
        const cls = n.id === selectedNodeId || n.id === hoveredNodeId ? 'node-selected' : undefined
        return n.className === cls ? n : { ...n, className: cls }
      }),
    [nodes, selectedNodeId, hoveredNodeId],
  )

  // A line animates its flow when hovered (chart or panel) or selected.
  const activeEdgeId = hoveredEdgeId ?? selectedEdgeId
  const displayEdges = useMemo(
    () =>
      edges.map(e => {
        const active = e.id === activeEdgeId
        return e.data?.active === active ? e : { ...e, data: { ...e.data, active } }
      }),
    [edges, activeEdgeId],
  )

  // Focus the current selection: a node, or both ends of an action's line.
  useEffect(() => {
    if (selectedNodeId) {
      const t = setTimeout(() => {
        rf.fitView({ nodes: [{ id: selectedNodeId }], maxZoom: 1.3, padding: 0.6, duration: 600 })
      }, 30)
      return () => clearTimeout(t)
    }
    if (selectedEdgeId) {
      const e = allEdges.find(x => x.id === selectedEdgeId)
      if (e) {
        const t = setTimeout(() => {
          rf.fitView({ nodes: [{ id: e.source }, { id: e.target }], maxZoom: 1.2, padding: 0.5, duration: 600 })
        }, 30)
        return () => clearTimeout(t)
      }
    }
  }, [selectedNodeId, selectedEdgeId, rf])

  return (
    <ReactFlow
      nodes={displayNodes}
      edges={displayEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
      onEdgeMouseEnter={(_, edge) => onHoverEdge(edge.id)}
      onEdgeMouseLeave={() => onHoverEdge(null)}
      onPaneClick={onClearSelection}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      className={showAnnotations ? undefined : 'hide-annotations'}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.2}
      maxZoom={1.75}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="#23232a" />
      <MiniMap
        pannable
        zoomable
        maskColor="rgba(2, 6, 23, 0.6)"
        nodeColor={n => (n.type === 'group' ? 'transparent' : ((n.data?.color as string) || '#94a3b8'))}
        nodeStrokeColor={n => (n.type === 'group' ? ((n.data?.color as string) || '#64748b') : 'transparent')}
        nodeStrokeWidth={3}
        nodeBorderRadius={4}
        style={{ background: '#0b0b0f' }}
      />
      <Controls showZoom={false} showFitView={false} showInteractive={false} position="bottom-right">
        <ControlButton onClick={() => rf.zoomIn()} title="Zoom in" aria-label="Zoom in">
          <LuPlus />
        </ControlButton>
        <ControlButton onClick={() => rf.zoomOut()} title="Zoom out" aria-label="Zoom out">
          <LuMinus />
        </ControlButton>
        <ControlButton
          onClick={() => rf.fitView({ padding: 0.15, duration: 400 })}
          title="Fit to screen"
          aria-label="Fit to screen"
        >
          <LuMaximize />
        </ControlButton>
        <ControlButton
          onClick={() => setShowAnnotations(s => !s)}
          title={showAnnotations ? 'Hide line labels' : 'Show line labels'}
          aria-label="Toggle line labels"
        >
          {showAnnotations ? <LuEye /> : <LuEyeOff />}
        </ControlButton>
      </Controls>
    </ReactFlow>
  )
}

export default function Flowchart(props: Props) {
  return (
    <div className="flowchart">
      <ReactFlowProvider>
        <FlowCanvas {...props} />
      </ReactFlowProvider>
    </div>
  )
}
