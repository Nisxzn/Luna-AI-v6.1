/**
 * AI Provider Manager
 * Manages multiple AI providers and handles provider selection
 */

import type { AIProvider } from '../providers';
import type { ProviderConfig, ProviderType } from '../types';
import type { ModelInfo } from '../types';
import { OpenAIProvider } from '../providers/openai';
import { AnthropicProvider } from '../providers/anthropic';
import { GeminiProvider } from '../providers/gemini';
import { OllamaProvider } from '../providers/ollama';
import { OpenRouterProvider } from '../providers/openrouter';
import { configManager } from '../config';

export class ProviderManager {
  private providers: Map<ProviderType, AIProvider> = new Map();
  private defaultProvider: ProviderType = 'openai';

  constructor() {
    this.initializeProviders();
    this.applyConfiguration();
  }

  private initializeProviders(): void {
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('gemini', new GeminiProvider());
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('openrouter', new OpenRouterProvider());
  }

  private applyConfiguration(): void {
    const config = configManager.getConfig();
    
    // Apply configuration to each provider
    for (const [providerType, providerConfig] of Object.entries(config.providers)) {
      const provider = this.providers.get(providerType as ProviderType);
      if (provider && Object.keys(providerConfig).length > 0) {
        provider.configure(providerConfig);
      }
    }

    // Set default provider
    if (config.defaultProvider) {
      this.defaultProvider = config.defaultProvider;
    }
  }

  /**
   * Get a specific provider by type
   */
  getProvider(type: ProviderType): AIProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): AIProvider[] {
    return Array.from(this.providers.values()).filter((p) => p.isConfigured());
  }

  /**
   * Configure a specific provider
   */
  configureProvider(type: ProviderType, config: ProviderConfig): void {
    const provider = this.providers.get(type);
    if (provider) {
      provider.configure(config);
    }
  }

  /**
   * Reload configuration from config manager
   */
  reloadConfiguration(): void {
    this.applyConfiguration();
  }

  /**
   * Configure multiple providers at once
   */
  configureProviders(configs: Record<ProviderType, ProviderConfig>): void {
    Object.entries(configs).forEach(([type, config]) => {
      this.configureProvider(type as ProviderType, config);
    });
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(type: ProviderType): void {
    if (this.providers.has(type)) {
      this.defaultProvider = type;
    }
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): AIProvider | undefined {
    return this.providers.get(this.defaultProvider);
  }

  /**
   * Get a provider for a specific model
   * Automatically determines the provider based on the model ID
   */
  getProviderForModel(modelId: string): AIProvider | undefined {
    // Check if model ID contains provider hint
    if (modelId.startsWith('gpt-') || modelId.startsWith('o1-')) {
      return this.providers.get('openai');
    }
    if (modelId.startsWith('claude-')) {
      return this.providers.get('anthropic');
    }
    if (modelId.startsWith('gemini-')) {
      return this.providers.get('gemini');
    }
    if (modelId.includes('/')) {
      // OpenRouter uses format like "anthropic/claude-3.5-sonnet"
      return this.providers.get('openrouter');
    }

    // Default to configured provider
    return this.getDefaultProvider();
  }

  /**
   * Get all available models from all providers
   */
  async getAllModels(): Promise<ModelInfo[]> {
    const allModels: ModelInfo[] = [];

    for (const provider of this.providers.values()) {
      try {
        const models = await provider.getModels();
        allModels.push(...models);
      } catch (error) {
        console.error(`Error fetching models from ${provider.type}:`, error);
      }
    }

    return allModels;
  }

  /**
   * Get models from a specific provider
   */
  async getModelsFromProvider(type: ProviderType): Promise<ModelInfo[]> {
    const provider = this.providers.get(type);
    if (!provider) {
      return [];
    }

    try {
      return await provider.getModels();
    } catch (error) {
      console.error(`Error fetching models from ${type}:`, error);
      return [];
    }
  }

  /**
   * Find a model by ID across all providers
   */
  async findModel(modelId: string): Promise<ModelInfo | null> {
    for (const provider of this.providers.values()) {
      try {
        const model = await provider.getModel(modelId);
        if (model) {
          return model;
        }
      } catch (error) {
        console.error(`Error finding model ${modelId} in ${provider.type}:`, error);
      }
    }

    return null;
  }

  /**
   * Auto-select the best provider based on configuration and capabilities
   */
  autoSelectProvider(requiredCapabilities?: {
    supportsStreaming?: boolean;
    supportsFunctionCalling?: boolean;
    supportsVision?: boolean;
    supportsTools?: boolean;
  }): AIProvider | undefined {
    // First try configured providers
    const configured = this.getConfiguredProviders();
    if (configured.length === 0) {
      return this.getDefaultProvider();
    }

    if (!requiredCapabilities) {
      return configured[0];
    }

    // Find a configured provider that meets requirements
    for (const provider of configured) {
      // This would require checking model capabilities
      // For now, return the first configured provider
      return provider;
    }

    return this.getDefaultProvider();
  }
}

export const providerManager = new ProviderManager();
