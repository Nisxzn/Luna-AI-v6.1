import React, { useEffect, useState, useCallback } from 'react';
import { MonacoEditor } from '../editor/MonacoEditor';
import { useEditorState } from '../../hooks/useEditorState';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useCodeActions } from '../../hooks/useCodeActions';
import { FileSystemItem } from '../file-explorer';
import type { CodeActionType } from '../../services/codeActions';

interface EditorPanelProps {
  selectedFile: FileSystemItem | null;
}

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    txt: 'plaintext',
  };

  return languageMap[ext || ''] || 'plaintext';
};

export const EditorPanel: React.FC<EditorPanelProps> = ({ selectedFile }) => {
  const { readFile, saveFile, setActiveFile } = useWorkspace();
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [externalChangeNotice, setExternalChangeNotice] = useState<string | null>(null);
  
  const {
    isExecuting,
    currentResult,
    error: actionError,
    executeAction,
    stopAction,
    acceptChanges,
    rejectChanges,
    regenerateAction,
  } = useCodeActions();

  const defaultContent = `// Welcome to Luna AI
// This is a TypeScript/JavaScript editor with Monaco Editor

function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const message = greet("Luna AI");
console.log(message);

// Features:
// - Syntax highlighting for TypeScript, JavaScript, JSON, HTML, CSS, Markdown
// - Line numbers
// - Minimap
// - Bracket pair colorization
// - Auto indentation
// - Word wrap
// - Multiple cursors
// - Find/Replace
// - Code folding
// - Dark theme
`;

  const content = selectedFile ? fileContent : defaultContent;
  const filename = selectedFile?.name || 'Welcome.tsx';
  const language = selectedFile ? getLanguageFromFilename(selectedFile.name) : 'typescript';

  const { editorState, setValue, isDirty, markAsSaved, updateValueWithoutDirtyCheck } = useEditorState(
    content,
    language,
    filename
  );

  const handleSave = useCallback(async () => {
    if (!selectedFile || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      const success = await saveFile(selectedFile.path, editorState.value);
      if (success) {
        markAsSaved();
        setExternalChangeNotice(null);
      } else {
        setError('Failed to save file');
      }
    } catch (err) {
      console.error('Error saving file:', err);
      setError('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, editorState.value, saveFile, markAsSaved, isSaving]);

  const handleActionSelect = useCallback(async (action: CodeActionType) => {
    await executeAction(action);
  }, [executeAction]);

  const handleAcceptAssistance = useCallback((modifiedText: string) => {
    acceptChanges(() => {
      setValue(modifiedText);
      setFileContent(modifiedText);
    });
  }, [acceptChanges, setValue]);

  const handleRejectAssistance = useCallback(() => {
    rejectChanges();
  }, [rejectChanges]);

  const handleRegenerateAssistance = useCallback(() => {
    regenerateAction();
  }, [regenerateAction]);

  const handleReload = useCallback(async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    setExternalChangeNotice(null);

    try {
      const content = await readFile(selectedFile.path);
      setFileContent(content);
      updateValueWithoutDirtyCheck(content);
    } catch (err) {
      console.error('Error reloading file:', err);
      setError('Failed to reload file');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, readFile, updateValueWithoutDirtyCheck]);

  useEffect(() => {
    const loadFile = async () => {
      if (!selectedFile) {
        setFileContent('');
        setError(null);
        setExternalChangeNotice(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      setExternalChangeNotice(null);

      try {
        const content = await readFile(selectedFile.path);
        setFileContent(content);
        updateValueWithoutDirtyCheck(content);
        setActiveFile(selectedFile.path);
      } catch (err) {
        console.error('Error loading file:', err);
        setError('Failed to load file');
        setFileContent('');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [selectedFile, readFile, updateValueWithoutDirtyCheck, setActiveFile]);

  useEffect(() => {
    if (!selectedFile) return;

    const setupFileWatcher = async () => {
      try {
        await window.electronAPI.watchFile(selectedFile.path);
      } catch (err) {
        console.error('Error setting up file watcher:', err);
      }
    };

    setupFileWatcher();

    const cleanup = window.electronAPI.onFileChanged((change) => {
      if (change.filePath === selectedFile?.path) {
        if (change.eventType === 'change') {
          setExternalChangeNotice('File has been modified externally. Click to reload.');
        } else if (change.eventType === 'unlink') {
          setExternalChangeNotice('File has been deleted externally.');
        } else if (change.eventType === 'rename') {
          setExternalChangeNotice('File has been renamed externally.');
        }
      }
    });

    return () => {
      cleanup();
      window.electronAPI.unwatchFile(selectedFile.path);
    };
  }, [selectedFile]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <div className="flex-1 bg-[#1e1e1e] flex flex-col">
      <div className="h-8 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="text-sm text-gray-400">Loading...</span>
          ) : error ? (
            <span className="text-sm text-red-400">{error}</span>
          ) : externalChangeNotice ? (
            <button
              onClick={handleReload}
              className="text-sm text-yellow-400 hover:text-yellow-300 underline"
            >
              {externalChangeNotice}
            </button>
          ) : (
            <span className="text-sm text-gray-300">
              {isDirty ? '● ' : ''}{editorState.filename}
            </span>
          )}
        </div>
        {selectedFile && (
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="text-xs px-2 py-1 bg-[#0e639c] hover:bg-[#1177bb] disabled:bg-[#3c3c3c] disabled:text-gray-500 text-white rounded transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          language={editorState.language}
          value={editorState.value}
          onChange={setValue}
          theme="vs-dark"
          filePath={selectedFile?.path}
          onActionSelect={handleActionSelect}
          assistanceResult={currentResult}
          isStreaming={isExecuting}
          onAcceptAssistance={handleAcceptAssistance}
          onRejectAssistance={handleRejectAssistance}
          onRegenerateAssistance={handleRegenerateAssistance}
        />
      </div>
    </div>
  );
};
