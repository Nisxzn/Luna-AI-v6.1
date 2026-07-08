import { z } from 'zod';
import { toolManager } from '../ToolManager';
import type { ToolDefinition } from '../types';
import { editorContextService } from '../../services/editorContext';

// Get Active File Tool
const getActiveFileTool: ToolDefinition<{}, { filePath: string | null; content: string; language: string }> = {
  id: 'get_active_file',
  name: 'Get Active File',
  description: 'Get the currently active file in the editor',
  category: 'editor',
  inputSchema: z.object({}),
  outputSchema: z.object({
    filePath: z.string().nullable(),
    content: z.string(),
    language: z.string(),
  }),
  permissions: ['read'],
  timeout: 5000,
  requiresApproval: false,
  execute: async () => {
    const context = editorContextService.getContext();
    return {
      filePath: context.filePath,
      content: context.content,
      language: context.language,
    };
  },
};

// Get Selected Text Tool
const getSelectedTextTool: ToolDefinition<{}, { text: string; startLine: number; endLine: number }> = {
  id: 'get_selected_text',
  name: 'Get Selected Text',
  description: 'Get the currently selected text in the editor',
  category: 'editor',
  inputSchema: z.object({}),
  outputSchema: z.object({
    text: z.string(),
    startLine: z.number(),
    endLine: z.number(),
  }),
  permissions: ['read'],
  timeout: 5000,
  requiresApproval: false,
  execute: async () => {
    const context = editorContextService.getContext();
    const selection = context.selection;
    if (!selection) {
      return { text: '', startLine: 0, endLine: 0 };
    }
    return {
      text: selection.text,
      startLine: selection.startLineNumber,
      endLine: selection.endLineNumber,
    };
  },
};

// Replace Selection Tool (placeholder - would need editor integration)
const replaceSelectionTool: ToolDefinition<{ text: string }, { success: boolean }> = {
  id: 'replace_selection',
  name: 'Replace Selection',
  description: 'Replace the currently selected text with new text',
  category: 'editor',
  inputSchema: z.object({
    text: z.string().describe('The new text to replace the selection with'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  permissions: ['write'],
  timeout: 5000,
  requiresApproval: true,
  execute: async ({ text }) => {
    // This would need to integrate with the editor to actually replace text
    // For now, this is a placeholder
    console.log('Replace selection with:', text);
    return { success: true };
  },
};

// Insert Text Tool (placeholder - would need editor integration)
const insertTextTool: ToolDefinition<{ text: string; position?: { line: number; column: number } }, { success: boolean }> = {
  id: 'insert_text',
  name: 'Insert Text',
  description: 'Insert text at the cursor position',
  category: 'editor',
  inputSchema: z.object({
    text: z.string().describe('The text to insert'),
    position: z.object({
      line: z.number(),
      column: z.number(),
    }).optional().describe('The position to insert at (defaults to cursor position)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  permissions: ['write'],
  timeout: 5000,
  requiresApproval: true,
  execute: async ({ text }) => {
    // This would need to integrate with the editor to actually insert text
    // For now, this is a placeholder
    console.log('Insert text:', text);
    return { success: true };
  },
};

export function registerEditorTools() {
  toolManager.registerTool(getActiveFileTool);
  toolManager.registerTool(getSelectedTextTool);
  toolManager.registerTool(replaceSelectionTool);
  toolManager.registerTool(insertTextTool);
}
