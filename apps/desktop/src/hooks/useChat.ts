import { useState, useCallback, useRef, useEffect } from 'react';
import { chatService, streamingEngine } from '@luna-ai/ai';
import type { Message, ChatCompletionRequest, StreamEvent, ChatCompletionChunk, StreamCallback } from '@luna-ai/ai';
import { contextBuilder } from '../services/contextBuilder';

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface UseChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export function useChat(options: UseChatOptions = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Create a new conversation
  const createConversation = useCallback(() => {
    const newConversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: options.model,
    };
    setConversations((prev) => [...prev, newConversation]);
    setActiveConversationId(newConversation.id);
    return newConversation;
  }, [options.model]);

  // Delete a conversation
  const deleteConversation = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  // Switch to a conversation
  const switchConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  // Generate a title for the conversation based on the first message
  const generateTitle = useCallback(async (conversationId: string, firstMessage: string) => {
    try {
      const request: ChatCompletionRequest = {
        messages: [
          {
            role: 'system',
            content: 'Generate a short, concise title (max 5 words) for the following conversation. Return only the title, no quotes or additional text.',
          },
          {
            role: 'user',
            content: firstMessage,
          },
        ],
        model: options.model || 'gpt-4o-mini',
        maxTokens: 20,
        temperature: 0.7,
      };

      const response = await chatService.createChatCompletion(request);
      const title = response.choices[0]?.message?.content?.trim() || 'New Conversation';
      
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, title, updatedAt: Date.now() } : c))
      );
    } catch (err) {
      // If title generation fails, use a default
      console.error('Failed to generate title:', err);
    }
  }, [options.model]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    setError(null);
    
    // Create conversation if none exists
    let conversation = activeConversation;
    if (!conversation) {
      conversation = createConversation();
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    // Add user message
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversation.id
          ? {
              ...c,
              messages: [...c.messages, userMessage],
              updatedAt: Date.now(),
            }
          : c
      )
    );

    // Generate title if this is the first message
    if (conversation.messages.length === 0) {
      generateTitle(conversation.id, content);
    }

    // Create assistant message placeholder
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversation.id
          ? {
              ...c,
              messages: [...c.messages, assistantMessage],
              updatedAt: Date.now(),
            }
          : c
      )
    );

    // Prepare messages for API
    const apiMessages: Message[] = [
      ...conversation.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user', content },
    ];

    // Build context and prepend to user message
    const context = contextBuilder.buildContext({
      maxTokens: 4000,
      includeWorkspace: true,
      includeEditor: true,
      includeFileTree: true,
      includeOpenFiles: true,
      includeSelectedText: true,
      includeNearbyCode: true,
      nearbyCodeLines: 10,
    });

    // If context exists, prepend it to the user message
    let userContent = content;
    if (context) {
      userContent = `${context}\n\nUser Message: ${content}`;
    }

    const finalMessages: Message[] = [
      ...conversation.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user', content: userContent },
    ];

    const request: ChatCompletionRequest = {
      messages: finalMessages,
      model: conversation.model || options.model || 'gpt-4o-mini',
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stream: true,
    };

    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      await streamingEngine.stream(
        async (callback: StreamCallback) => {
          await chatService.streamChatCompletion(request, callback);
        },
        {
          onChunk: (chunk: ChatCompletionChunk) => {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== conversation.id) return c;
                  const messages = [...c.messages];
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    messages[messages.length - 1] = {
                      ...lastMessage,
                      content: lastMessage.content + content,
                    };
                  }
                  return { ...c, messages, updatedAt: Date.now() };
                })
              );
            }
          },
          onError: (err: Error) => {
            setError(err.message);
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== conversation.id) return c;
                const messages = [...c.messages];
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
                  messages[messages.length - 1] = {
                    ...lastMessage,
                    isStreaming: false,
                    content: lastMessage.content || 'Error: Failed to generate response.',
                  };
                }
                return { ...c, messages, updatedAt: Date.now() };
              })
            );
          },
          onComplete: () => {
            setConversations((prev) =>
              prev.map((c) => {
                if (c.id !== conversation.id) return c;
                const messages = [...c.messages];
                const lastMessage = messages[messages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  messages[messages.length - 1] = {
                    ...lastMessage,
                    isStreaming: false,
                  };
                }
                return { ...c, messages, updatedAt: Date.now() };
              })
            );
          },
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conversation.id) return c;
          const messages = [...c.messages];
          const lastMessage = messages[messages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
            messages[messages.length - 1] = {
              ...lastMessage,
              isStreaming: false,
              content: `Error: ${errorMessage}`,
            };
          }
          return { ...c, messages, updatedAt: Date.now() };
        })
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [activeConversation, createConversation, generateTitle, options.model, options.temperature, options.maxTokens]);

  // Stop generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      streamingEngine.abort();
      setIsStreaming(false);
      
      // Mark the current streaming message as complete
      if (activeConversationId) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== activeConversationId) return c;
            const messages = [...c.messages];
            const lastMessage = messages[messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
              messages[messages.length - 1] = {
                ...lastMessage,
                isStreaming: false,
              };
            }
            return { ...c, messages, updatedAt: Date.now() };
          })
        );
      }
    }
  }, [activeConversationId]);

  // Regenerate the last assistant message
  const regenerateResponse = useCallback(async () => {
    if (!activeConversation || activeConversation.messages.length < 2) {
      return;
    }

    // Remove the last assistant message
    const messagesWithoutLast = activeConversation.messages.slice(0, -1);
    const lastUserMessage = messagesWithoutLast[messagesWithoutLast.length - 1];
    
    if (lastUserMessage && lastUserMessage.role === 'user') {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, messages: messagesWithoutLast, updatedAt: Date.now() }
            : c
        )
      );
      
      // Resend the user message
      await sendMessage(lastUserMessage.content);
    }
  }, [activeConversation, sendMessage]);

  // Clear all conversations
  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
  }, []);

  return {
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
    clearAllConversations,
  };
}
