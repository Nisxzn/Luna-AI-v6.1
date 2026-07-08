import React from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ConversationList } from './ConversationList';
import { useChat } from '../../hooks/useChat';

export const ChatPanel: React.FC = () => {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    isStreaming,
    error,
    sendMessage,
    stopGeneration,
    regenerateResponse,
    createConversation,
    deleteConversation,
    switchConversation,
  } = useChat({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
  });

  const [showConversationList, setShowConversationList] = React.useState(true);

  const handleSendMessage = (message: string) => {
    sendMessage(message);
  };

  const handleRegenerate = () => {
    regenerateResponse();
  };

  return (
    <div className="w-96 bg-[#252526] border-l border-[#3c3c3c] flex flex-col h-full">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-[#3c3c3c] bg-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConversationList(!showConversationList)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Toggle conversation list"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-300">AI Assistant</span>
        </div>
        {activeConversation && activeConversation.messages.length > 1 && (
          <button
            onClick={handleRegenerate}
            disabled={isStreaming}
            className="text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Regenerate last response"
          >
            Regenerate
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation Sidebar */}
        {showConversationList && (
          <div className="w-64 border-r border-[#3c3c3c] flex-shrink-0">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversationId}
              onSelectConversation={switchConversation}
              onCreateConversation={createConversation}
              onDeleteConversation={deleteConversation}
            />
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Error Display */}
          {error && (
            <div className="mx-4 mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Messages */}
          <MessageList
            messages={activeConversation?.messages || []}
            isStreaming={isStreaming}
          />

          {/* Input */}
          <ChatInput
            onSend={handleSendMessage}
            disabled={isStreaming}
            isStreaming={isStreaming}
            onStop={stopGeneration}
          />
        </div>
      </div>
    </div>
  );
};
