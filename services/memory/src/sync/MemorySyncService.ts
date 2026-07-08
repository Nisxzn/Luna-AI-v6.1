import { Memory } from '@luna-ai/types';
import { MemoryStore } from '../store/MemoryStore';
import { MemoryIndex } from '../index/MemoryIndex';
import EventEmitter from 'events';

export interface SyncEvent {
  type: 'create' | 'update' | 'delete' | 'archive' | 'unarchive';
  memoryId: string;
  timestamp: Date;
}

export class MemorySyncService extends EventEmitter {
  private store: MemoryStore;
  private index: MemoryIndex;
  private syncQueue: SyncEvent[];
  private isProcessing: boolean;

  constructor(store: MemoryStore, index: MemoryIndex) {
    super();
    this.store = store;
    this.index = index;
    this.syncQueue = [];
    this.isProcessing = false;
  }

  syncMemory(memory: Memory): void {
    const existing = this.store.getById(memory.id);
    
    if (!existing) {
      this.store.save(memory);
      this.index.indexMemory(memory);
      this.queueEvent({ type: 'create', memoryId: memory.id, timestamp: new Date() });
    } else {
      this.store.update(memory.id, memory);
      this.index.updateMemory(memory);
      this.queueEvent({ type: 'update', memoryId: memory.id, timestamp: new Date() });
    }

    this.emit('sync', { type: existing ? 'update' : 'create', memory });
  }

  syncDelete(memoryId: string): void {
    this.store.delete(memoryId);
    this.index.removeMemory(memoryId);
    this.queueEvent({ type: 'delete', memoryId, timestamp: new Date() });
    this.emit('sync', { type: 'delete', memoryId });
  }

  syncArchive(memoryId: string): void {
    this.store.archive(memoryId);
    this.queueEvent({ type: 'archive', memoryId, timestamp: new Date() });
    this.emit('sync', { type: 'archive', memoryId });
  }

  syncUnarchive(memoryId: string): void {
    this.store.unarchive(memoryId);
    this.queueEvent({ type: 'unarchive', memoryId, timestamp: new Date() });
    this.emit('sync', { type: 'unarchive', memoryId });
  }

  private queueEvent(event: SyncEvent): void {
    this.syncQueue.push(event);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.syncQueue.length > 0) {
      const event = this.syncQueue.shift();
      if (event) {
        this.emit('syncEvent', event);
      }
    }

    this.isProcessing = false;
  }

  getSyncQueue(): SyncEvent[] {
    return [...this.syncQueue];
  }

  clearSyncQueue(): void {
    this.syncQueue = [];
  }

  getIndex(): MemoryIndex {
    return this.index;
  }

  getStore(): MemoryStore {
    return this.store;
  }

  rebuildIndex(): void {
    this.index.clear();
    const memories = this.store.getAll(10000);
    memories.forEach(memory => this.index.indexMemory(memory));
  }

  onSync(callback: (event: { type: string; memory?: Memory; memoryId?: string }) => void): void {
    this.on('sync', callback);
  }

  onSyncEvent(callback: (event: SyncEvent) => void): void {
    this.on('syncEvent', callback);
  }
}
