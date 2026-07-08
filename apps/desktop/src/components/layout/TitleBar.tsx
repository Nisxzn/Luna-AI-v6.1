import React from 'react'

export const TitleBar: React.FC = () => {
  return (
    <div className="h-8 bg-[#3c3c3c] flex items-center justify-between px-4 select-none">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-white">Luna AI</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-300 hover:text-white transition-colors text-sm">
          File
        </button>
        <button className="text-gray-300 hover:text-white transition-colors text-sm">
          Edit
        </button>
        <button className="text-gray-300 hover:text-white transition-colors text-sm">
          View
        </button>
        <button className="text-gray-300 hover:text-white transition-colors text-sm">
          Help
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#4c4c4c] hover:text-white transition-colors">
          −
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-[#4c4c4c] hover:text-white transition-colors">
          □
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-300 hover:bg-red-600 hover:text-white transition-colors">
          ×
        </button>
      </div>
    </div>
  )
}
