import React, { useState, useEffect } from 'react';
import type { CodeActionResult, CodeActionType } from '../../services/codeActions';

interface InlineAssistanceProps {
  result: CodeActionResult;
  onAccept: (modifiedText: string) => void;
  onReject: () => void;
  onRegenerate: () => void;
  isStreaming?: boolean;
}

export const InlineAssistance: React.FC<InlineAssistanceProps> = ({
  result,
  onAccept,
  onReject,
  onRegenerate,
  isStreaming = false,
}) => {
  const [showDiff, setShowDiff] = useState(true);

  const getActionLabel = (action: CodeActionType): string => {
    const labels: Record<CodeActionType, string> = {
      explain: 'Explanation',
      improve: 'Improved Code',
      refactor: 'Refactored Code',
      optimize: 'Optimized Code',
      fix: 'Fixed Code',
      document: 'Documented Code',
      comment: 'Commented Code',
      test: 'Generated Tests',
      convert: 'Converted Code',
      complete: 'Completed Function',
      continue: 'Continued Code',
    };
    return labels[action];
  };

  const renderDiff = () => {
    const originalLines = result.originalText.split('\n');
    const modifiedLines = result.modifiedText.split('\n');
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    return (
      <div className="font-mono text-sm">
        <div className="grid grid-cols-2 gap-2">
          {/* Original */}
          <div className="bg-[#1e1e1e] rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">Original</div>
            {originalLines.map((line, i) => (
              <div key={i} className="text-gray-400 whitespace-pre-wrap">
                {line || ' '}
              </div>
            ))}
          </div>
          {/* Modified */}
          <div className="bg-[#1e1e1e] rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-2">
              {getActionLabel(result.action)}
            </div>
            {modifiedLines.map((line, i) => (
              <div
                key={i}
                className={`whitespace-pre-wrap ${
                  line !== originalLines[i] ? 'text-green-400' : 'text-gray-300'
                }`}
              >
                {line || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSingleView = () => {
    return (
      <div className="font-mono text-sm bg-[#1e1e1e] rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-2">
          {getActionLabel(result.action)}
        </div>
        <pre className="text-gray-300 whitespace-pre-wrap">{result.modifiedText}</pre>
      </div>
    );
  };

  return (
    <div className="border-t border-[#3c3c3c] bg-[#252526] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-300">
            {getActionLabel(result.action)}
          </span>
          {isStreaming && (
            <span className="text-xs text-gray-500 animate-pulse">Generating...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {showDiff ? 'Single View' : 'Diff View'}
          </button>
        </div>
      </div>

      {showDiff ? renderDiff() : renderSingleView()}

      {!isStreaming && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={onReject}
            className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300 text-sm rounded transition-colors"
          >
            Reject
          </button>
          <button
            onClick={onRegenerate}
            className="px-3 py-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-gray-300 text-sm rounded transition-colors"
          >
            Regenerate
          </button>
          <button
            onClick={() => onAccept(result.modifiedText)}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  );
};
