import React, { useState } from 'react';
import { Terminal } from '../terminal';

type PanelType = 'terminal' | 'problems' | 'output' | 'debug';

export const BottomPanel: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType>('terminal');

  const handleData = (data: string) => {
    // Currently just echo input for testing
    // Shell integration will be implemented in Phase 4.5
    console.log('Terminal input:', data);
  };

  return (
    <div className="h-48 bg-[#252526] border-t border-[#3c3c3c] flex flex-col">
      <div className="h-8 bg-[#252526] border-b border-[#3c3c3c] flex items-center px-4">
        <button
          className={`text-sm mr-4 ${
            activePanel === 'terminal'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActivePanel('terminal')}
        >
          Terminal
        </button>
        <button
          className={`text-sm mr-4 ${
            activePanel === 'problems'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActivePanel('problems')}
        >
          Problems
        </button>
        <button
          className={`text-sm mr-4 ${
            activePanel === 'output'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActivePanel('output')}
        >
          Output
        </button>
        <button
          className={`text-sm ${
            activePanel === 'debug'
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          }`}
          onClick={() => setActivePanel('debug')}
        >
          Debug Console
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activePanel === 'terminal' && (
          <Terminal onData={handleData} className="h-full" />
        )}
        {activePanel !== 'terminal' && (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center">
              <div className="text-4xl mb-4">�</div>
              <div className="text-xl text-gray-400 font-semibold">
                {activePanel.charAt(0).toUpperCase() + activePanel.slice(1)} Coming Soon
              </div>
              <div className="text-sm text-gray-500 mt-2">
                This panel will be implemented in a future phase
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
