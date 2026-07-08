/**
 * Error Handler
 * Centralized error handling for AI operations
 */

import type { AIError, ProviderType } from '../types';

export enum ErrorCode {
  // Configuration errors
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  INVALID_CONFIG = 'INVALID_CONFIG',

  // Request errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  REQUEST_FAILED = 'REQUEST_FAILED',
  TIMEOUT = 'TIMEOUT',

  // Provider errors
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',

  // Rate limit errors
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Authentication errors
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_API_KEY = 'INVALID_API_KEY',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',

  // Content errors
  CONTENT_FILTERED = 'CONTENT_FILTERED',
  RESPONSE_TOO_LONG = 'RESPONSE_TOO_LONG',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
}

export class ErrorHandler {
  /**
   * Create a standardized AI error
   */
  createError(
    message: string,
    code: ErrorCode,
    provider: ProviderType,
    statusCode?: number,
    details?: unknown
  ): AIError {
    const error = new Error(message) as AIError;
    error.name = 'AIError';
    error.code = code;
    error.provider = provider;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }

  /**
   * Handle and categorize errors from providers
   */
  handleError(error: unknown, provider: ProviderType): AIError {
    if (this.isAIError(error)) {
      return error;
    }

    if (error instanceof Error) {
      // Categorize based on error message or status code
      const message = error.message.toLowerCase();

      if (message.includes('timeout') || message.includes('timed out')) {
        return this.createError(error.message, ErrorCode.TIMEOUT, provider);
      }

      if (message.includes('rate limit') || message.includes('429')) {
        return this.createError(error.message, ErrorCode.RATE_LIMITED, provider, 429);
      }

      if (message.includes('quota') || message.includes('exceeded')) {
        return this.createError(error.message, ErrorCode.QUOTA_EXCEEDED, provider);
      }

      if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
        return this.createError(error.message, ErrorCode.AUTHENTICATION_FAILED, provider, 401);
      }

      if (message.includes('api key') || message.includes('invalid key')) {
        return this.createError(error.message, ErrorCode.INVALID_API_KEY, provider);
      }

      if (message.includes('network') || message.includes('fetch')) {
        return this.createError(error.message, ErrorCode.NETWORK_ERROR, provider);
      }

      if (message.includes('content') || message.includes('filtered')) {
        return this.createError(error.message, ErrorCode.CONTENT_FILTERED, provider);
      }

      // Default to provider error
      return this.createError(error.message, ErrorCode.PROVIDER_ERROR, provider);
    }

    // Unknown error type
    return this.createError(
      String(error),
      ErrorCode.UNKNOWN_ERROR,
      provider
    );
  }

  /**
   * Check if error is an AIError
   */
  isAIError(error: unknown): error is AIError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'provider' in error
    );
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: AIError): boolean {
    const retryableCodes = [
      ErrorCode.TIMEOUT,
      ErrorCode.NETWORK_ERROR,
      ErrorCode.RATE_LIMITED,
      ErrorCode.PROVIDER_ERROR,
    ];

    return retryableCodes.includes(error.code as ErrorCode);
  }

  /**
   * Get retry delay for rate-limited errors
   */
  getRetryDelay(error: AIError): number {
    if (error.code === ErrorCode.RATE_LIMITED) {
      // Default to 1 second, could be extracted from error details
      return 1000;
    }

    if (error.code === ErrorCode.TIMEOUT) {
      return 2000;
    }

    if (error.code === ErrorCode.NETWORK_ERROR) {
      return 1000;
    }

    return 0;
  }

  /**
   * Format error for user display
   */
  formatError(error: AIError): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.NOT_CONFIGURED]: 'AI provider is not configured. Please check your settings.',
      [ErrorCode.INVALID_CONFIG]: 'Invalid AI provider configuration.',
      [ErrorCode.INVALID_REQUEST]: 'Invalid request to AI provider.',
      [ErrorCode.REQUEST_FAILED]: 'Request to AI provider failed.',
      [ErrorCode.TIMEOUT]: 'Request timed out. Please try again.',
      [ErrorCode.PROVIDER_ERROR]: 'AI provider returned an error.',
      [ErrorCode.PROVIDER_NOT_FOUND]: 'AI provider not found.',
      [ErrorCode.MODEL_NOT_FOUND]: 'AI model not found.',
      [ErrorCode.RATE_LIMITED]: 'Rate limit exceeded. Please wait and try again.',
      [ErrorCode.QUOTA_EXCEEDED]: 'API quota exceeded. Please check your plan.',
      [ErrorCode.AUTHENTICATION_FAILED]: 'Authentication failed. Please check your API key.',
      [ErrorCode.INVALID_API_KEY]: 'Invalid API key. Please check your configuration.',
      [ErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection.',
      [ErrorCode.CONNECTION_ERROR]: 'Connection error. Please try again.',
      [ErrorCode.CONTENT_FILTERED]: 'Content was filtered by the AI provider.',
      [ErrorCode.RESPONSE_TOO_LONG]: 'Response too long.',
      [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred.',
      [ErrorCode.MAX_RETRIES_EXCEEDED]: 'Maximum retry attempts exceeded.',
    };

    return messages[error.code as ErrorCode] || error.message;
  }

  /**
   * Log error with structured data
   */
  logError(error: AIError, context?: Record<string, unknown>): void {
    const logData = {
      code: error.code,
      provider: error.provider,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      context,
      timestamp: new Date().toISOString(),
    };

    console.error('[AI Error]', logData);
  }

  /**
   * Create a not configured error
   */
  notConfigured(provider: ProviderType): AIError {
    return this.createError(
      `Provider ${provider} is not configured`,
      ErrorCode.NOT_CONFIGURED,
      provider
    );
  }

  /**
   * Create a model not found error
   */
  modelNotFound(provider: ProviderType, modelId: string): AIError {
    return this.createError(
      `Model ${modelId} not found for provider ${provider}`,
      ErrorCode.MODEL_NOT_FOUND,
      provider
    );
  }

  /**
   * Create an invalid request error
   */
  invalidRequest(provider: ProviderType, reason: string): AIError {
    return this.createError(
      `Invalid request: ${reason}`,
      ErrorCode.INVALID_REQUEST,
      provider
    );
  }
}

export const errorHandler = new ErrorHandler();
