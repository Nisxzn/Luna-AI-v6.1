import React, { useState } from 'react';
import { FileExplorer, FileSystemItem } from '../file-explorer';

interface SidebarProps {
  onFileSelect: (item: FileSystemItem) => void;
  selectedPath: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ onFileSelect, selectedPath }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className={`bg-[#252526] border-r border-[#3c3c3c] transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-64'
      }`}
    >
      <div className="h-10 flex items-center justify-between px-2 border-b border-[#3c3c3c]">
        {!isCollapsed && (
          <span className="text-sm font-semibold text-gray-300 px-2">Explorer</span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#4c4c4c] rounded transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>
      <div className="p-2 h-[calc(100%-40px)]">
        {!isCollapsed && (
          <FileExplorer onFileSelect={onFileSelect} selectedPath={selectedPath} />
        )}
      </div>
    </div>
  );
};
