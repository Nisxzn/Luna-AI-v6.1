// Memory Types and Interfaces

export type MemoryCategory =
  | 'conversation'
  | 'project'
  | 'workspace'
  | 'user_preference'
  | 'session';

export type MemorySource = 'ai' | 'user' | 'system' | 'tool';

export type MemoryImportance = 'low' | 'medium' | 'high' | 'critical';

export interface Memory {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  source: MemorySource;
  createdAt: Date;
  updatedAt: Date;
  importance: MemoryImportance;
  tags: string[];
  projectId?: string;
  workspaceId?: string;
  archived?: boolean;
}

export interface MemoryFilter {
  category?: MemoryCategory;
  source?: MemorySource;
  importance?: MemoryImportance;
  projectId?: string;
  workspaceId?: string;
  tags?: string[];
  archived?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface MemorySearchQuery {
  query: string;
  filters?: MemoryFilter;
  limit?: number;
  offset?: number;
}

export interface MemorySearchResult {
  memories: Memory[];
  total: number;
  query: string;
}

export interface MemoryRankingScore {
  memoryId: string;
  score: number;
  factors: {
    relevance: number;
    recency: number;
    importance: number;
    frequency: number;
  };
}

export interface MemorySummary {
  id: string;
  originalMemoryIds: string[];
  summary: string;
  createdAt: Date;
  wordCount: number;
}

export interface MemoryStats {
  totalMemories: number;
  memoriesByCategory: Record<MemoryCategory, number>;
  memoriesByImportance: Record<MemoryImportance, number>;
  totalSize: number;
  oldestMemory?: Date;
  newestMemory?: Date;
}

export interface MemoryConfig {
  maxMemories: number;
  maxMemorySize: number;
  autoArchiveDays: number;
  autoDeleteDays: number;
  enableSummarization: boolean;
  summarizationThreshold: number;
}
