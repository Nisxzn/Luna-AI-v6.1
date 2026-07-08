import { useState, useCallback } from 'react';
import { codeActionsService, type CodeActionType, type CodeActionResult, type CodeActionRequest } from '../services/codeActions';
import { editorContextService } from '../services/editorContext';

export const useCodeActions = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentResult, setCurrentResult] = useState<CodeActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  const executeAction = useCallback(async (
    action: CodeActionType,
    options?: {
      selectedText?: string;
      targetLanguage?: string;
      customInstruction?: string;
    }
  ) => {
    setIsExecuting(true);
    setError(null);
    setCurrentResult(null);
    setProgress('');

    const editorContext = editorContextService.getContext();
    const selectedText = options?.selectedText || editorContext.selection?.text || '';

    // Safety check: Ensure we have content to work with
    if (!selectedText && !editorContext.content) {
      setError('No content available to process');
      setIsExecuting(false);
      return;
    }

    const request: CodeActionRequest = {
      action,
      selectedText,
      targetLanguage: options?.targetLanguage,
      customInstruction: options?.customInstruction,
    };

    try {
      const result = await codeActionsService.executeAction(request, (content) => {
        setProgress(content);
      });

      setCurrentResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute action');
    } finally {
      setIsExecuting(false);
    }
  }, []);

  const stopAction = useCallback(() => {
    codeActionsService.stopAction();
    setIsExecuting(false);
  }, []);

  const acceptChanges = useCallback((onApply: (modifiedText: string) => void) => {
    if (currentResult) {
      onApply(currentResult.modifiedText);
      setCurrentResult(null);
      setProgress('');
    }
  }, [currentResult]);

  const rejectChanges = useCallback(() => {
    setCurrentResult(null);
    setProgress('');
  }, []);

  const regenerateAction = useCallback(() => {
    if (currentResult) {
      executeAction(currentResult.action, {
        selectedText: currentResult.originalText,
      });
    }
  }, [currentResult, executeAction]);

  const reset = useCallback(() => {
    setCurrentResult(null);
    setError(null);
    setProgress('');
    setIsExecuting(false);
  }, []);

  return {
    isExecuting,
    currentResult,
    error,
    progress,
    executeAction,
    stopAction,
    acceptChanges,
    rejectChanges,
    regenerateAction,
    reset,
  };
};
