import { AgentConfiguration as IAgentConfiguration } from '@luna-ai/types';

export class AgentConfiguration implements IAgentConfiguration {
  private config: Map<string, unknown>;
  private schema: Map<string, { required: boolean; type: string }>;

  constructor(initialConfig?: Record<string, unknown>) {
    this.config = new Map();
    this.schema = new Map();
    
    if (initialConfig) {
      Object.entries(initialConfig).forEach(([key, value]) => {
        this.config.set(key, value);
      });
    }
  }

  get(key: string): unknown {
    return this.config.get(key);
  }

  set(key: string, value: unknown): void {
    this.config.set(key, value);
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.config.entries());
  }

  validate(): boolean {
    for (const [key, { required }] of this.schema.entries()) {
      if (required && !this.config.has(key)) {
        return false;
      }
    }
    return true;
  }

  defineSchema(key: string, options: { required: boolean; type: string }): void {
    this.schema.set(key, options);
  }

  merge(other: Record<string, unknown>): void {
    Object.entries(other).forEach(([key, value]) => {
      this.config.set(key, value);
    });
  }

  clear(): void {
    this.config.clear();
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  delete(key: string): boolean {
    return this.config.delete(key);
  }
}
