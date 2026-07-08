import {
  ContextAssembler as IContextAssembler,
  RetrievalResult,
  RAGContext,
} from '@luna-ai/types';

export class ContextAssembler implements IContextAssembler {
  async assemble(
    query: string,
    retrievalResults: RetrievalResult[],
    workspaceContext?: string,
    memoryContext?: string
  ): Promise<RAGContext> {
    const startTime = Date.now();

    const uniqueResults = this.removeDuplicates(retrievalResults);
    const rankedResults = this.rankByRelevance(uniqueResults);
    const selectedResults = this.respectTokenLimits(rankedResults);

    const assembledContext = this.buildContextString(
      selectedResults,
      workspaceContext,
      memoryContext
    );

    const tokenCount = this.estimateTokenCount(assembledContext);

    const averageScore =
      selectedResults.length > 0
        ? selectedResults.reduce((sum, r) => sum + r.score, 0) / selectedResults.length
        : 0;

    return {
      query,
      retrievedDocuments: selectedResults,
      workspaceContext,
      memoryContext,
      assembledContext,
      tokenCount,
      metadata: {
        retrievalTime: Date.now() - startTime,
        totalDocuments: selectedResults.length,
        averageScore,
      },
    };
  }

  private removeDuplicates(results: RetrievalResult[]): RetrievalResult[] {
    const seen = new Set<string>();
    const unique: RetrievalResult[] = [];

    for (const result of results) {
      const key = `${result.chunk.documentId}-${result.chunk.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique;
  }

  private rankByRelevance(results: RetrievalResult[]): RetrievalResult[] {
    return results.sort((a, b) => b.score - a.score);
  }

  private respectTokenLimits(results: RetrievalResult[]): RetrievalResult[] {
    const maxTokens = 8000;
    let currentTokens = 0;
    const selected: RetrievalResult[] = [];

    for (const result of results) {
      const chunkTokens = this.estimateTokenCount(result.chunk.content);
      if (currentTokens + chunkTokens <= maxTokens) {
        selected.push(result);
        currentTokens += chunkTokens;
      } else {
        break;
      }
    }

    return selected;
  }

  private buildContextString(
    results: RetrievalResult[],
    workspaceContext?: string,
    memoryContext?: string
  ): string {
    const parts: string[] = [];

    if (workspaceContext && workspaceContext.trim().length > 0) {
      parts.push('## Workspace Context\n' + workspaceContext);
    }

    if (memoryContext && memoryContext.trim().length > 0) {
      parts.push('## Memory Context\n' + memoryContext);
    }

    if (results.length > 0) {
      parts.push('## Relevant Documents\n');
      
      for (const result of results) {
        parts.push(
          `### ${result.document.metadata.fileName}\n` +
          `**File:** ${result.document.metadata.filePath}\n` +
          `**Relevance:** ${result.score.toFixed(3)}\n\n` +
          `${result.chunk.content}\n`
        );
      }
    }

    return parts.join('\n---\n\n');
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
