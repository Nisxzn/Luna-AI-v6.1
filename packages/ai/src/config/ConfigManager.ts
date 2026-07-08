/**
 * Configuration Manager
 * Manages AI configuration from environment and config files
 */

import type { ProviderConfig, ProviderType } from '../types';

export interface AIConfig {
  providers: Record<ProviderType, ProviderConfig>;
  defaultProvider?: ProviderType;
  defaultModel?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class ConfigManager {
  private config: AIConfig = {
    providers: {
      openai: {},
      anthropic: {},
      gemini: {},
      ollama: {},
      openrouter: {},
    },
    defaultProvider: 'openai',
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
  };

  /**
   * Load configuration from environment variables
   */
  loadFromEnv(): void {
    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.config.providers.openai.apiKey = process.env.OPENAI_API_KEY;
    }
    if (process.env.OPENAI_BASE_URL) {
      this.config.providers.openai.baseURL = process.env.OPENAI_BASE_URL;
    }

    // Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.config.providers.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
    }
    if (process.env.ANTHROPIC_BASE_URL) {
      this.config.providers.anthropic.baseURL = process.env.ANTHROPIC_BASE_URL;
    }

    // Gemini
    if (process.env.GEMINI_API_KEY) {
      this.config.providers.gemini.apiKey = process.env.GEMINI_API_KEY;
    }
    if (process.env.GEMINI_BASE_URL) {
      this.config.providers.gemini.baseURL = process.env.GEMINI_BASE_URL;
    }

    // Ollama
    if (process.env.OLLAMA_BASE_URL) {
      this.config.providers.ollama.baseURL = process.env.OLLAMA_BASE_URL;
    }

    // OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
      this.config.providers.openrouter.apiKey = process.env.OPENROUTER_API_KEY;
    }
    if (process.env.OPENROUTER_BASE_URL) {
      this.config.providers.openrouter.baseURL = process.env.OPENROUTER_BASE_URL;
    }

    // Default provider
    if (process.env.AI_DEFAULT_PROVIDER) {
      this.config.defaultProvider = process.env.AI_DEFAULT_PROVIDER as ProviderType;
    }

    // Default model
    if (process.env.AI_DEFAULT_MODEL) {
      this.config.defaultModel = process.env.AI_DEFAULT_MODEL;
    }

    // Global settings
    if (process.env.AI_MAX_RETRIES) {
      this.config.maxRetries = parseInt(process.env.AI_MAX_RETRIES, 10);
    }
    if (process.env.AI_RETRY_DELAY) {
      this.config.retryDelay = parseInt(process.env.AI_RETRY_DELAY, 10);
    }
    if (process.env.AI_TIMEOUT) {
      this.config.timeout = parseInt(process.env.AI_TIMEOUT, 10);
    }
  }

  /**
   * Load configuration from a config object
   */
  loadFromConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.providers) {
      this.config.providers = { ...this.config.providers, ...config.providers };
    }
  }

  /**
   * Get the full configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }

  /**
   * Get configuration for a specific provider
   */
  getProviderConfig(provider: ProviderType): ProviderConfig {
    return { ...this.config.providers[provider] };
  }

  /**
   * Set configuration for a specific provider
   */
  setProviderConfig(provider: ProviderType, config: ProviderConfig): void {
    this.config.providers[provider] = { ...this.config.providers[provider], ...config };
  }

  /**
   * Get the default provider
   */
  getDefaultProvider(): ProviderType {
    return this.config.defaultProvider || 'openai';
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(provider: ProviderType): void {
    this.config.defaultProvider = provider;
  }

  /**
   * Get the default model
   */
  getDefaultModel(): string | undefined {
    return this.config.defaultModel;
  }

  /**
   * Set the default model
   */
  setDefaultModel(model: string): void {
    this.config.defaultModel = model;
  }

  /**
   * Check if a provider is configured
   */
  isProviderConfigured(provider: ProviderType): boolean {
    return !!this.config.providers[provider].apiKey;
  }

  /**
   * Get all configured providers
   */
  getConfiguredProviders(): ProviderType[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => config.apiKey)
      .map(([provider]) => provider as ProviderType);
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = {
      providers: {
        openai: {},
        anthropic: {},
        gemini: {},
        ollama: {},
        openrouter: {},
      },
      defaultProvider: 'openai',
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
    };
  }

  /**
   * Export configuration (without sensitive data)
   */
  exportSafe(): Partial<AIConfig> {
    const safeConfig: Partial<AIConfig> = {
      providers: {
        openai: {},
        anthropic: {},
        gemini: {},
        ollama: {},
        openrouter: {},
      },
      defaultProvider: this.config.defaultProvider,
      defaultModel: this.config.defaultModel,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      timeout: this.config.timeout,
    };

    for (const [provider, config] of Object.entries(this.config.providers)) {
      safeConfig.providers![provider as ProviderType] = {
        baseURL: config.baseURL,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
        headers: config.headers,
      };
    }

    return safeConfig;
  }

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if at least one provider is configured
    const configuredProviders = this.getConfiguredProviders();
    if (configuredProviders.length === 0) {
      errors.push('No AI provider is configured');
    }

    // Validate numeric settings
    if (this.config.maxRetries !== undefined && this.config.maxRetries < 0) {
      errors.push('maxRetries must be non-negative');
    }
    if (this.config.retryDelay !== undefined && this.config.retryDelay < 0) {
      errors.push('retryDelay must be non-negative');
    }
    if (this.config.timeout !== undefined && this.config.timeout < 0) {
      errors.push('timeout must be non-negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const configManager = new ConfigManager();
