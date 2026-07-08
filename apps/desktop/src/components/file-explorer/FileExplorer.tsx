import React, { useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { FileTreeItem, FileSystemItem } from './FileTreeItem';
import { workspaceContextService } from '../../services/workspaceContext';

interface FileExplorerProps {
  onFileSelect: (item: FileSystemItem) => void;
  selectedPath: string | null;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  onFileSelect,
  selectedPath,
}) => {
  const {
    workspacePath,
    fileTree,
    isLoading,
    error,
    openFolder,
    closeWorkspace,
    refresh,
  } = useWorkspace();

  // Update workspace context when workspace changes
  useEffect(() => {
    if (workspacePath) {
      workspaceContextService.updateWorkspacePath(workspacePath);
    } else {
      workspaceContextService.updateWorkspacePath(null);
    }
  }, [workspacePath]);

  // Update file tree in context when it changes
  useEffect(() => {
    workspaceContextService.updateFileTree(fileTree);
  }, [fileTree]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 p-4">
        <div className="text-red-400 text-sm mb-2">{error}</div>
        <button
          onClick={refresh}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!workspacePath) {
    return (
      <div className="flex flex-col items-center justify-center h-32 p-4">
        <div className="text-4xl mb-4">📂</div>
        <div className="text-sm text-gray-400 mb-4">No workspace open</div>
        <button
          onClick={openFolder}
          className="px-3 py-1.5 bg-[#0e639c] hover:bg-[#1177bb] text-white text-sm rounded transition-colors"
        >
          Open Folder
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b border-[#3c3c3c]">
        <span className="text-xs text-gray-400 truncate flex-1">
          {workspacePath}
        </span>
        <div className="flex gap-1">
          <button
            onClick={refresh}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#4c4c4c] rounded transition-colors"
            title="Refresh"
          >
            🔄
          </button>
          <button
            onClick={closeWorkspace}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#4c4c4c] rounded transition-colors"
            title="Close Workspace"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {fileTree.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-400 text-sm">Empty folder</div>
          </div>
        ) : (
          fileTree.map((item) => (
            <FileTreeItem
              key={item.path}
              item={item}
              level={0}
              onFileClick={onFileSelect}
              selectedPath={selectedPath}
            />
          ))
        )}
      </div>
    </div>
  );
};
