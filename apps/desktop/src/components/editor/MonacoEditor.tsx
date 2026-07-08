import React, { useRef, useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { editorContextService } from '../../services/editorContext'
import { CodeActionsMenu } from './CodeActionsMenu'
import { InlineAssistance } from './InlineAssistance'
import type { CodeActionType } from '../../services/codeActions'
import type { CodeActionResult } from '../../services/codeActions'

interface MonacoEditorProps {
  language: string
  value: string
  onChange?: (value: string | undefined) => void
  theme?: string
  options?: editor.IStandaloneEditorConstructionOptions
  filePath?: string
  onActionSelect?: (action: CodeActionType) => void
  assistanceResult?: CodeActionResult | null
  isStreaming?: boolean
  onAcceptAssistance?: (modifiedText: string) => void
  onRejectAssistance?: () => void
  onRegenerateAssistance?: () => void
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  language,
  value,
  onChange,
  theme = 'vs-dark',
  options = {},
  filePath,
  onActionSelect,
  assistanceResult,
  isStreaming = false,
  onAcceptAssistance,
  onRejectAssistance,
  onRegenerateAssistance,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [hasSelection, setHasSelection] = useState(false)

  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: true },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on',
    bracketPairColorization: {
      enabled: true,
    },
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: true,
    folding: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'always',
    find: {
      autoFindInSelection: 'always',
    },
    multiCursorModifier: 'ctrlCmd',
    renderWhitespace: 'selection',
    contextmenu: true,
    ...options,
  }

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: any) => {
    editorRef.current = editor
    
    // Register editor with context service
    editorContextService.setEditorInstance(editor)
    editorContextService.updateFilePath(filePath || null)
    editorContextService.updateLanguage(language)
    editorContextService.updateContent(value)
    
    // Add keyboard shortcuts
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
      () => {
        // Prevent default save behavior for now
        console.log('Save shortcut pressed')
      }
    )

    // Add AI Actions command (Ctrl+K)
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
      () => {
        const selection = editor.getSelection()
        const hasSel = selection && !selection.isEmpty()
        setHasSelection(hasSel || false)
        
        // Get cursor position for menu
        const position = editor.getPosition()
        if (position) {
          const coords = editor.getScrolledVisiblePosition(position)
          if (coords) {
            setMenuPosition({ x: coords.left, y: coords.top + 20 })
            setShowActionsMenu(true)
          }
        }
      }
    )

    // Track selection changes
    editor.onDidChangeCursorSelection((e) => {
      const hasSel = e.selection && !e.selection.isEmpty()
      setHasSelection(hasSel)
    })
  }

  const handleActionSelect = (action: CodeActionType) => {
    onActionSelect?.(action)
  }

  // Update context when props change
  useEffect(() => {
    if (filePath) {
      editorContextService.updateFilePath(filePath)
    }
  }, [filePath])

  useEffect(() => {
    editorContextService.updateLanguage(language)
  }, [language])

  useEffect(() => {
    if (editorRef.current) {
      editorContextService.updateContent(value)
    }
  }, [value])

  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={value}
          onChange={onChange}
          theme={theme}
          options={defaultOptions}
          onMount={handleEditorDidMount}
          loading={<div className="flex items-center justify-center h-full text-gray-400">Loading editor...</div>}
        />
      </div>
      {showActionsMenu && (
        <CodeActionsMenu
          onActionSelect={handleActionSelect}
          hasSelection={hasSelection}
          onClose={() => setShowActionsMenu(false)}
          position={menuPosition}
        />
      )}
      {assistanceResult && (
        <InlineAssistance
          result={assistanceResult}
          isStreaming={isStreaming}
          onAccept={onAcceptAssistance || (() => {})}
          onReject={onRejectAssistance || (() => {})}
          onRegenerate={onRegenerateAssistance || (() => {})}
        />
      )}
    </div>
  )
}
