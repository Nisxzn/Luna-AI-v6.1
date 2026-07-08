/**
 * Model Registry
 * Central registry for all available AI models across providers
 */

import type { ModelInfo, ProviderType } from '../types';
import { providerManager } from '../manager/ProviderManager';

export class ModelRegistry {
  private models: Map<string, ModelInfo> = new Map();
  private providerModels: Map<ProviderType, string[]> = new Map();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.refreshModels();
  }

  /**
   * Refresh the model registry from all providers
   */
  async refreshModels(): Promise<void> {
    this.models.clear();
    this.providerModels.clear();

    const allModels = await providerManager.getAllModels();

    for (const model of allModels) {
      this.models.set(model.id, model);

      if (!this.providerModels.has(model.provider)) {
        this.providerModels.set(model.provider, []);
      }
      this.providerModels.get(model.provider)!.push(model.id);
    }
  }

  /**
   * Get a specific model by ID
   */
  getModel(modelId: string): ModelInfo | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all models
   */
  getAllModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: ProviderType): ModelInfo[] {
    const modelIds = this.providerModels.get(provider) || [];
    return modelIds.map((id) => this.models.get(id)!).filter(Boolean);
  }

  /**
   * Search models by name
   */
  searchModels(query: string): ModelInfo[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.models.values()).filter(
      (model) =>
        model.name.toLowerCase().includes(lowerQuery) ||
        model.id.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Filter models by capabilities
   */
  filterModelsByCapabilities(capabilities: {
    supportsStreaming?: boolean;
    supportsFunctionCalling?: boolean;
    supportsVision?: boolean;
    supportsTools?: boolean;
  }): ModelInfo[] {
    return Array.from(this.models.values()).filter((model) => {
      if (capabilities.supportsStreaming !== undefined && model.capabilities.supportsStreaming !== capabilities.supportsStreaming) {
        return false;
      }
      if (capabilities.supportsFunctionCalling !== undefined && model.capabilities.supportsFunctionCalling !== capabilities.supportsFunctionCalling) {
        return false;
      }
      if (capabilities.supportsVision !== undefined && model.capabilities.supportsVision !== capabilities.supportsVision) {
        return false;
      }
      if (capabilities.supportsTools !== undefined && model.capabilities.supportsTools !== capabilities.supportsTools) {
        return false;
      }
      return true;
    });
  }

  /**
   * Get models sorted by cost (cheapest first)
   */
  getModelsSortedByCost(): ModelInfo[] {
    return Array.from(this.models.values()).sort((a, b) => {
      const aCost = a.capabilities.inputCostPer1kTokens + a.capabilities.outputCostPer1kTokens;
      const bCost = b.capabilities.inputCostPer1kTokens + b.capabilities.outputCostPer1kTokens;
      return aCost - bCost;
    });
  }

  /**
   * Get models sorted by context window (largest first)
   */
  getModelsSortedByContextWindow(): ModelInfo[] {
    return Array.from(this.models.values()).sort((a, b) => b.contextWindow - a.contextWindow);
  }

  /**
   * Register a custom model
   */
  registerModel(model: ModelInfo): void {
    this.models.set(model.id, model);

    if (!this.providerModels.has(model.provider)) {
      this.providerModels.set(model.provider, []);
    }
    this.providerModels.get(model.provider)!.push(model.id);
  }

  /**
   * Unregister a model
   */
  unregisterModel(modelId: string): void {
    const model = this.models.get(modelId);
    if (model) {
      this.models.delete(modelId);
      const providerModels = this.providerModels.get(model.provider);
      if (providerModels) {
        const index = providerModels.indexOf(modelId);
        if (index > -1) {
          providerModels.splice(index, 1);
        }
      }
    }
  }

  /**
   * Get model statistics
   */
  getStatistics(): {
    totalModels: number;
    modelsByProvider: Record<ProviderType, number>;
    modelsWithStreaming: number;
    modelsWithFunctionCalling: number;
    modelsWithVision: number;
    modelsWithTools: number;
  } {
    const models = Array.from(this.models.values());
    const modelsByProvider: Record<ProviderType, number> = {} as any;

    for (const provider of this.providerModels.keys()) {
      modelsByProvider[provider] = this.providerModels.get(provider)!.length;
    }

    return {
      totalModels: models.length,
      modelsByProvider,
      modelsWithStreaming: models.filter((m) => m.capabilities.supportsStreaming).length,
      modelsWithFunctionCalling: models.filter((m) => m.capabilities.supportsFunctionCalling).length,
      modelsWithVision: models.filter((m) => m.capabilities.supportsVision).length,
      modelsWithTools: models.filter((m) => m.capabilities.supportsTools).length,
    };
  }
}

export const modelRegistry = new ModelRegistry();
