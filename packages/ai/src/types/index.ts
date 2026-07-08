/**
 * Core types for the AI module
 */

export type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openrouter';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface Message {
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ChatCompletionRequest {
  messages: Message[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: Message;
    finishReason: string | null;
  }[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  created: number;
}

export interface ChatCompletionChunk {
  id: string;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: MessageRole;
      content?: string;
    };
    finishReason: string | null;
  }[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  created: number;
}

export interface ModelCapability {
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  maxContextTokens: number;
  maxOutputTokens: number;
  inputCostPer1kTokens: number;
  outputCostPer1kTokens: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  capabilities: ModelCapability;
  contextWindow: number;
}

export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface StreamEvent {
  type: 'data' | 'error' | 'done';
  data?: ChatCompletionChunk;
  error?: Error;
}

export type StreamCallback = (event: StreamEvent) => void;

export interface AIError extends Error {
  code: string;
  provider: ProviderType;
  statusCode?: number;
  details?: unknown;
}

export interface ConversationContext {
  conversationId: string;
  messages: Message[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}
