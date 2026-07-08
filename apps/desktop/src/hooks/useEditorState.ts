import { useState, useCallback, useRef } from 'react';

interface EditorState {
  value: string;
  language: string;
  filename: string;
}

export const useEditorState = (
  initialValue: string = '',
  initialLanguage: string = 'typescript',
  initialFilename: string = 'untitled.ts'
) => {
  const [editorState, setEditorState] = useState<EditorState>({
    value: initialValue,
    language: initialLanguage,
    filename: initialFilename,
  });
  const [isDirty, setIsDirty] = useState(false);
  const originalValueRef = useRef(initialValue);

  const setValue = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setEditorState((prev) => ({ ...prev, value }));
      setIsDirty(value !== originalValueRef.current);
    }
  }, []);

  const setLanguage = useCallback((language: string) => {
    setEditorState((prev) => ({ ...prev, language }));
  }, []);

  const setFilename = useCallback((filename: string) => {
    setEditorState((prev) => ({ ...prev, filename }));
  }, []);

  const reset = useCallback(() => {
    setEditorState({
      value: initialValue,
      language: initialLanguage,
      filename: initialFilename,
    });
    setIsDirty(false);
    originalValueRef.current = initialValue;
  }, [initialValue, initialLanguage, initialFilename]);

  const markAsSaved = useCallback(() => {
    setIsDirty(false);
    originalValueRef.current = editorState.value;
  }, [editorState.value]);

  const updateValueWithoutDirtyCheck = useCallback((value: string) => {
    setEditorState((prev) => ({ ...prev, value }));
    originalValueRef.current = value;
    setIsDirty(false);
  }, []);

  return {
    editorState,
    isDirty,
    setValue,
    setLanguage,
    setFilename,
    reset,
    markAsSaved,
    updateValueWithoutDirtyCheck,
  };
};
