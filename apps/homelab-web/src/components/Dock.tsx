import type React from 'react'
import './Dock.css'

export type DockItemData = {
  icon: React.ReactNode
  label: React.ReactNode
  onClick: () => void
  className?: string
}

export type DockProps = {
  items: DockItemData[]
  className?: string
  panelHeight?: number
  baseItemSize?: number
}

export default function Dock({
  items,
  className = '',
  panelHeight = 64,
  baseItemSize = 46,
}: DockProps) {
  return (
    <div className="dock-outer">
      <div
        className={`dock-panel ${className}`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => (
          <button
            key={index}
            type="button"
            className={`dock-item ${item.className ?? ''}`}
            style={{ width: baseItemSize, height: baseItemSize }}
            onClick={item.onClick}
            aria-label={typeof item.label === 'string' ? item.label : undefined}
          >
            <span className="dock-icon">{item.icon}</span>
            <span className="dock-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
