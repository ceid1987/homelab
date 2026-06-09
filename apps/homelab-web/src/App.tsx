import { useCallback, useRef, useState } from 'react'
import VariableProximity from './components/VariableProximity'
import StaggeredMenu from './components/StaggeredMenu'
import type { StaggeredMenuSocialItem } from './components/StaggeredMenu'
import NodeInfo from './components/NodeInfo'
import EdgeInfo from './components/EdgeInfo'
import InfoPlaceholder from './components/InfoPlaceholder'
import Flowchart from './flow/Flowchart'
import './App.css'

const socialItems: StaggeredMenuSocialItem[] = [
  { label: 'GitHub', link: 'https://github.com/ceid1987' },
  { label: 'LinkedIn', link: 'https://www.linkedin.com/in/carl-eid/' },
]

type Selection = { kind: 'node' | 'edge'; id: string } | null

function App() {
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const repoRef = useRef<HTMLAnchorElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selection, setSelection] = useState<Selection>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const selectNode = useCallback((id: string) => {
    setSelection({ kind: 'node', id })
    setMenuOpen(true)
    setHoveredEdgeId(null)
    setHoveredNodeId(null)
  }, [])

  const selectEdge = useCallback((id: string) => {
    setSelection({ kind: 'edge', id })
    setMenuOpen(true)
    setHoveredEdgeId(null)
    setHoveredNodeId(null)
  }, [])

  const handleOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open)
    if (!open) {
      setSelection(null)
      setHoveredEdgeId(null)
      setHoveredNodeId(null)
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelection(null)
    setMenuOpen(false)
    setHoveredEdgeId(null)
    setHoveredNodeId(null)
  }, [])

  const selectedNodeId = selection?.kind === 'node' ? selection.id : null
  const selectedEdgeId = selection?.kind === 'edge' ? selection.id : null

  return (
    <div className="app">
      <Flowchart
        selectedNodeId={selectedNodeId}
        selectedEdgeId={selectedEdgeId}
        hoveredEdgeId={hoveredEdgeId}
        hoveredNodeId={hoveredNodeId}
        onSelectNode={selectNode}
        onSelectEdge={selectEdge}
        onHoverEdge={setHoveredEdgeId}
        onClearSelection={clearSelection}
      />

      <StaggeredMenu
        position="left"
        isFixed
        open={menuOpen}
        onOpenChange={handleOpenChange}
        closeOnClickAway={false}
        items={[]}
        socialItems={socialItems}
        displaySocials
        displayItemNumbering={false}
        accentColor="#a855f7"
        colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.09)']}
        menuButtonColor="#ededed"
        openMenuButtonColor="#ededed"
        body={
          selection?.kind === 'node' ? (
            <NodeInfo
              id={selection.id}
              onNavigate={selectNode}
              onSelectAction={selectEdge}
              onHoverAction={setHoveredEdgeId}
            />
          ) : selection?.kind === 'edge' ? (
            <EdgeInfo id={selection.id} onNavigate={selectNode} onHoverNode={setHoveredNodeId} />
          ) : (
            <InfoPlaceholder />
          )
        }
      />

      <header className="site-header">
        <div className="site-header__left" />

        <h1 className="site-title">homelab.carleid.dev</h1>

        <div className="site-header__right">
          <a
            ref={repoRef}
            className="site-cta"
            href="https://github.com/ceid1987/homelab"
            target="_blank"
            rel="noreferrer"
          >
            <VariableProximity
              label="Visit the repo"
              className="site-cta__text"
              fromFontVariationSettings="'wght' 400"
              toFontVariationSettings="'wght' 700"
              containerRef={repoRef}
              radius={100}
              falloff="linear"
            />
          </a>

          <a
            ref={ctaRef}
            className="site-cta"
            href="https://carleid.dev"
            target="_blank"
            rel="noreferrer"
          >
            <VariableProximity
              label="Visit my website"
              className="site-cta__text"
              fromFontVariationSettings="'wght' 400"
              toFontVariationSettings="'wght' 700"
              containerRef={ctaRef}
              radius={100}
              falloff="linear"
            />
          </a>
        </div>
      </header>
    </div>
  )
}

export default App
