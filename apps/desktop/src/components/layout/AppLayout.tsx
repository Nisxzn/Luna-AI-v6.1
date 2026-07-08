import React, { useState } from 'react';
import { TitleBar } from './TitleBar';
import { ActivityBar } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { EditorPanel } from './EditorPanel';
import { AIPanel } from './AIPanel';
import { BottomPanel } from './BottomPanel';
import { StatusBar } from './StatusBar';
import { FileSystemItem } from '../file-explorer';

export const AppLayout: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<FileSystemItem | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleFileSelect = (item: FileSystemItem) => {
    setSelectedFile(item);
    setSelectedPath(item.path);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e]">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <ActivityBar />
        <Sidebar onFileSelect={handleFileSelect} selectedPath={selectedPath} />
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex overflow-hidden">
            <EditorPanel selectedFile={selectedFile} />
            <AIPanel />
          </div>
          <BottomPanel />
        </div>
      </div>
      <StatusBar />
    </div>
  );
};
