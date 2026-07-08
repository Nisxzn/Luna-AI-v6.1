import React from 'react'

export const ActivityBar: React.FC = () => {
  const activities = [
    { icon: '📁', label: 'Explorer' },
    { icon: '🔍', label: 'Search' },
    { icon: '⚡', label: 'Run' },
    { icon: '🤖', label: 'AI' },
    { icon: '⚙️', label: 'Settings' },
  ]

  return (
    <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-2">
      {activities.map((activity, index) => (
        <button
          key={index}
          className="w-10 h-10 flex items-center justify-center text-xl hover:bg-[#4c4c4c] transition-colors rounded"
          title={activity.label}
        >
          {activity.icon}
        </button>
      ))}
      <div className="flex-1" />
      <button
        className="w-10 h-10 flex items-center justify-center text-xl hover:bg-[#4c4c4c] transition-colors rounded"
        title="Account"
      >
        👤
      </button>
    </div>
  )
}
