import { useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import { LuPlus, LuMinus, LuMaximize, LuEye, LuEyeOff, LuTags, LuActivity } from 'react-icons/lu'
import '@xyflow/react/dist/style.css'

import FlowCard from './FlowCard'
import GroupCard from './GroupCard'
import LabeledEdge from './LabeledEdge'
import { MetricsContext } from './MetricsContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { initialNodes, legend } from './nodes'
import { allEdges } from './edges'
import './flow.css'

const nodeTypes: NodeTypes = { card: FlowCard, group: GroupCard }
const edgeTypes: EdgeTypes = { labeled: LabeledEdge }

type Props = {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  hoveredEdgeId: string | null
  hoveredNodeId: string | null
  /** Whether the info side panel is open (so the legend can move clear of it). */
  infoOpen: boolean
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
  infoOpen,
  onSelectNode,
  onSelectEdge,
  onHoverEdge,
  onClearSelection,
}: Props) {
  const rf = useReactFlow()
  // Mobile (phone portrait or landscape): hide the controls panel; metrics on,
  // line labels and legend off by default.
  const isMobile = useMediaQuery('(max-width: 640px), (max-height: 600px) and (orientation: landscape)')
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(allEdges)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [showMetrics, setShowMetrics] = useState(true)
  const [showLegend, setShowLegend] = useState(() => !isMobile)
  // Keeps the legend mounted through its exit animation after being toggled off.
  const [legendMounted, setLegendMounted] = useState(false)
  // Colour of the legend row currently hovered — highlights its whole category.
  const [legendColor, setLegendColor] = useState<string | null>(null)

  useEffect(() => {
    if (showLegend) {
      setLegendMounted(true)
      return
    }
    if (!legendMounted) return
    const t = setTimeout(() => setLegendMounted(false), 220)
    return () => clearTimeout(t)
  }, [showLegend, legendMounted])

  const nodeColor = useMemo(() => new Map(initialNodes.map(n => [n.id, n.data.color as string])), [])

  const displayNodes = useMemo(
    () =>
      nodes.map(n => {
        const cls =
          n.id === selectedNodeId ||
          n.id === hoveredNodeId ||
          (legendColor != null && n.data.color === legendColor)
            ? 'node-selected'
            : undefined
        return n.className === cls ? n : { ...n, className: cls }
      }),
    [nodes, selectedNodeId, hoveredNodeId, legendColor],
  )

  // A line animates its flow when hovered (chart or panel) or selected. A legend
  // hover instead brightens every line whose endpoints touch that category.
  const activeEdgeId = hoveredEdgeId ?? selectedEdgeId
  const displayEdges = useMemo(
    () =>
      edges.map(e => {
        const active = e.id === activeEdgeId
        const highlight =
          legendColor != null &&
          (nodeColor.get(e.source) === legendColor || nodeColor.get(e.target) === legendColor)
        return e.data?.active === active && e.data?.highlight === highlight
          ? e
          : { ...e, data: { ...e.data, active, highlight } }
      }),
    [edges, activeEdgeId, legendColor, nodeColor],
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
    <MetricsContext.Provider value={showMetrics}>
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
      {!isMobile && (
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
        <ControlButton
          onClick={() => setShowMetrics(s => !s)}
          title={showMetrics ? 'Hide live metrics' : 'Show live metrics'}
          aria-label="Toggle live metrics"
        >
          <span className={`ctrl-icon${showMetrics ? '' : ' ctrl-icon--off'}`}>
            <LuActivity />
          </span>
        </ControlButton>
        <ControlButton
          onClick={() => setShowLegend(s => !s)}
          title={showLegend ? 'Hide legend' : 'Show legend'}
          aria-label="Toggle legend"
        >
          <span className={`ctrl-icon${showLegend ? '' : ' ctrl-icon--off'}`}>
            <LuTags />
          </span>
        </ControlButton>
      </Controls>
      )}

      {legendMounted && (
        <Panel
          position="bottom-left"
          style={{
            // slide clear of the info side panel (same width), matching its
            // GSAP motion: open = 0.5s power4.out, close = 0.32s power3.in.
            transform: infoOpen ? 'translateX(clamp(260px, 38vw, 420px))' : 'translateX(0)',
            transition: infoOpen
              ? 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
              : 'transform 0.32s cubic-bezier(0.5, 0, 0.75, 0)',
          }}
        >
          <div className={`flow-legend ${showLegend ? 'flow-legend--in' : 'flow-legend--out'}`}>
            <h4 className="flow-legend__title">Legend</h4>
            <ul className="flow-legend__list">
              {legend.map((item, i) => (
                <li
                  key={item.color}
                  className="flow-legend__item"
                  style={{ ['--i' as any]: i }}
                  onMouseEnter={() => setLegendColor(item.color)}
                  onMouseLeave={() => setLegendColor(null)}
                >
                  <span className="flow-legend__swatch" style={{ background: item.color }} />
                  <span className="flow-legend__label">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}
    </ReactFlow>
    </MetricsContext.Provider>
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
