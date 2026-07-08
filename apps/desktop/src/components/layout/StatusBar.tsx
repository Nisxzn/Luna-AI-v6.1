import React from 'react'

export const StatusBar: React.FC = () => {
  return (
    <div className="h-6 bg-[#007acc] flex items-center justify-between px-4 text-xs text-white">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span>🔀</span>
          <span>main</span>
        </span>
        <span className="flex items-center gap-1">
          <span>⭕</span>
          <span>0</span>
          <span>⚠️</span>
          <span>0</span>
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>Ln 1, Col 1</span>
        <span>UTF-8</span>
        <span>TypeScript React</span>
        <span>🔔</span>
      </div>
    </div>
  )
}
