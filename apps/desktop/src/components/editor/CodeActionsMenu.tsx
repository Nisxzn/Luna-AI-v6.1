import React, { useState, useRef, useEffect } from 'react';
import { codeActionsService, CODE_ACTIONS, type CodeActionType } from '../../services/codeActions';

interface CodeActionsMenuProps {
  onActionSelect: (action: CodeActionType) => void;
  hasSelection: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export const CodeActionsMenu: React.FC<CodeActionsMenuProps> = ({
  onActionSelect,
  hasSelection,
  onClose,
  position,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const availableActions = codeActionsService.getAvailableActions(hasSelection);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleActionClick = (action: CodeActionType) => {
    onActionSelect(action);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl py-2 z-50 min-w-[200px]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-2 border-b border-[#3c3c3c]">
        <span className="text-xs font-semibold text-gray-400">AI Actions</span>
      </div>
      {availableActions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleActionClick(action.id)}
          className="w-full px-3 py-2 text-left hover:bg-[#3c3c3c] transition-colors flex items-center gap-2"
        >
          <span className="text-sm">{action.icon}</span>
          <div className="flex-1">
            <div className="text-sm text-gray-200">{action.label}</div>
            <div className="text-xs text-gray-500">{action.description}</div>
          </div>
        </button>
      ))}
      {availableActions.length === 0 && (
        <div className="px-3 py-2 text-sm text-gray-500">
          No actions available
        </div>
      )}
    </div>
  );
};
