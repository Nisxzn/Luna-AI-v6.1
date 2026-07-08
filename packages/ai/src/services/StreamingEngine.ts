/**
 * Streaming Engine
 * Handles streaming responses with buffering and event emission
 */

import type { ChatCompletionChunk, StreamCallback, StreamEvent } from '../types';

export interface StreamingOptions {
  bufferSize?: number;
  flushInterval?: number;
  onChunk?: (chunk: ChatCompletionChunk) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export class StreamingEngine {
  private buffer: string = '';
  private chunks: ChatCompletionChunk[] = [];
  private isStreaming: boolean = false;
  private abortController: AbortController | null = null;

  /**
   * Start streaming with custom options
   */
  async stream(
    streamFn: (callback: StreamCallback) => Promise<void>,
    options: StreamingOptions = {}
  ): Promise<string> {
    const { bufferSize = 100, flushInterval = 50, onChunk, onError, onComplete } = options;

    this.isStreaming = true;
    this.buffer = '';
    this.chunks = [];
    this.abortController = new AbortController();

    return new Promise((resolve, reject) => {
      const callback: StreamCallback = (event: StreamEvent) => {
        if (this.abortController?.signal.aborted) {
          return;
        }

        switch (event.type) {
          case 'data':
            if (event.data) {
              this.handleChunk(event.data, onChunk);
            }
            break;

          case 'error':
            this.isStreaming = false;
            onError?.(event.error!);
            reject(event.error);
            break;

          case 'done':
            this.isStreaming = false;
            onComplete?.();
            resolve(this.buffer);
            break;
        }
      };

      streamFn(callback).catch((error) => {
        this.isStreaming = false;
        onError?.(error);
        reject(error);
      });
    });
  }

  /**
   * Handle a streaming chunk
   */
  private handleChunk(chunk: ChatCompletionChunk, onChunk?: (chunk: ChatCompletionChunk) => void): void {
    this.chunks.push(chunk);

    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      this.buffer += content;
    }

    onChunk?.(chunk);
  }

  /**
   * Abort the current stream
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isStreaming = false;
  }

  /**
   * Check if currently streaming
   */
  getStreamingStatus(): boolean {
    return this.isStreaming;
  }

  /**
   * Get the current buffer content
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Get all chunks received so far
   */
  getChunks(): ChatCompletionChunk[] {
    return [...this.chunks];
  }

  /**
   * Clear the buffer and chunks
   */
  clear(): void {
    this.buffer = '';
    this.chunks = [];
  }

  /**
   * Reset the streaming engine
   */
  reset(): void {
    this.abort();
    this.clear();
    this.abortController = null;
  }

  /**
   * Create an async generator from a stream
   */
  async *streamGenerator(
    streamFn: (callback: StreamCallback) => Promise<void>
  ): AsyncGenerator<ChatCompletionChunk, string, unknown> {
    this.isStreaming = true;
    this.buffer = '';
    this.chunks = [];

    let resolve: (value: string) => void;
    let reject: (error: Error) => void;

    const promise = new Promise<string>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const callback: StreamCallback = (event: StreamEvent) => {
      switch (event.type) {
        case 'data':
          if (event.data) {
            this.handleChunk(event.data);
          }
          break;

        case 'error':
          this.isStreaming = false;
          reject!(event.error!);
          break;

        case 'done':
          this.isStreaming = false;
          resolve!(this.buffer);
          break;
      }
    };

    // Start the stream
    streamFn(callback).catch((error) => {
      this.isStreaming = false;
      reject!(error);
    });

    // Yield chunks as they arrive
    while (this.isStreaming) {
      if (this.chunks.length > 0) {
        const chunk = this.chunks.shift()!;
        yield chunk;
      } else {
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    // Return the final result
    return await promise;
  }

  /**
   * Stream with backpressure handling
   */
  async streamWithBackpressure(
    streamFn: (callback: StreamCallback) => Promise<void>,
    options: StreamingOptions = {}
  ): Promise<string> {
    const { onChunk } = options;

    let lastChunkTime = Date.now();
    const minChunkInterval = 16; // ~60fps

    const originalOnChunk = onChunk;

    const wrappedCallback: StreamCallback = (event: StreamEvent) => {
      if (event.type === 'data' && event.data) {
        const now = Date.now();
        const elapsed = now - lastChunkTime;

        if (elapsed < minChunkInterval) {
          // Delay the chunk to maintain consistent rate
          setTimeout(() => {
            if (originalOnChunk && event.data) originalOnChunk(event.data);
          }, minChunkInterval - elapsed);
        } else {
          if (originalOnChunk && event.data) originalOnChunk(event.data);
        }

        lastChunkTime = now;
      }
    };

    return this.stream(streamFn, { ...options, onChunk: undefined });
  }

  /**
   * Merge multiple streams into one
   */
  async mergeStreams(
    streams: Array<() => Promise<string>>
  ): Promise<string[]> {
    const results = await Promise.allSettled(streams.map((s) => s()));

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return '';
    });
  }

  /**
   * Get streaming statistics
   */
  getStatistics(): {
    totalChunks: number;
    totalCharacters: number;
    isStreaming: boolean;
  } {
    return {
      totalChunks: this.chunks.length,
      totalCharacters: this.buffer.length,
      isStreaming: this.isStreaming,
    };
  }
}

export const streamingEngine = new StreamingEngine();
