import React, { useState } from 'react';

export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
}

interface FileTreeItemProps {
  item: FileSystemItem;
  level: number;
  onFileClick: (item: FileSystemItem) => void;
  selectedPath: string | null;
}

const getFileIcon = (item: FileSystemItem): string => {
  if (item.type === 'directory') {
    return '📁';
  }

  const ext = item.name.split('.').pop()?.toLowerCase();
  
  const iconMap: Record<string, string> = {
    ts: '📘',
    tsx: '⚛️',
    js: '📜',
    jsx: '⚛️',
    json: '📋',
    md: '📝',
    css: '🎨',
    scss: '🎨',
    html: '🌐',
    svg: '🖼️',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
    pdf: '📕',
    txt: '📄',
    py: '🐍',
    rs: '🦀',
    go: '🐹',
    java: '☕',
    cpp: '⚙️',
    c: '⚙️',
    h: '⚙️',
    hpp: '⚙️',
    yaml: '⚙️',
    yml: '⚙️',
    xml: '📋',
    env: '🔒',
    gitignore: '📝',
  };

  return iconMap[ext || ''] || '📄';
};

export const FileTreeItem: React.FC<FileTreeItemProps> = ({
  item,
  level,
  onFileClick,
  selectedPath,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = selectedPath === item.path;

  const handleClick = () => {
    if (item.type === 'directory') {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(item);
    }
  };

  const paddingLeft = level * 12 + 8;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] rounded transition-colors ${
          isSelected ? 'bg-[#37373d]' : ''
        }`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
      >
        <span className="text-sm">
          {item.type === 'directory' ? (isExpanded ? '▼' : '▶') : ''}
        </span>
        <span className="text-sm">{getFileIcon(item)}</span>
        <span className="text-sm text-gray-300 truncate">{item.name}</span>
      </div>
      {item.type === 'directory' && isExpanded && item.children && (
        <div>
          {item.children.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              onFileClick={onFileClick}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};
