// Provider registry - manages all available providers

import type { Provider, ProviderRegistryEntry, ProviderConfig, ModelInfo } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenRouterProvider } from './openrouter.js';
import { NVIDIAProvider } from './nvidia.js';
import { OpenAIProvider } from './openai.js';
import { GoogleProvider } from './google.js';
import { GroqProvider } from './groq.js';
import { MistralProvider } from './mistral.js';
import { CohereProvider } from './cohere.js';
import { OllamaProvider } from './ollama.js';
import { CustomProvider } from './custom.js';

export class ProviderRegistry {
  private providers: Map<string, ProviderRegistryEntry> = new Map();
  private modelCache: Map<string, ModelInfo[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.registerBuiltins();
  }

  private registerBuiltins(): void {
    const builtins: Provider[] = [
      new AnthropicProvider(),
      new OpenRouterProvider(),
      new NVIDIAProvider(),
      new OpenAIProvider(),
      new GoogleProvider(),
      new GroqProvider(),
      new MistralProvider(),
      new CohereProvider(),
      new OllamaProvider(),
      new CustomProvider(),
    ];

    for (const provider of builtins) {
      this.providers.set(provider.id, { provider, config: { enabled: false } });
    }
  }

  register(provider: Provider, config: ProviderConfig = { enabled: true }): void {
    this.providers.set(provider.id, { provider, config });
  }

  get(id: string): ProviderRegistryEntry | undefined {
    return this.providers.get(id);
  }

  getProvider(id: string): Provider | undefined {
    return this.providers.get(id)?.provider;
  }

  getEnabledProviders(): ProviderRegistryEntry[] {
    return Array.from(this.providers.values()).filter(e => e.config.enabled);
  }

  getAllProviders(): ProviderRegistryEntry[] {
    return Array.from(this.providers.values());
  }

  setConfig(id: string, config: ProviderConfig): void {
    const entry = this.providers.get(id);
    if (entry) {
      entry.config = config;
    }
  }

  setKey(id: string, key: string): void {
    const entry = this.providers.get(id);
    if (entry) {
      entry.key = key;
    }
  }

  getKey(id: string): string | undefined {
    return this.providers.get(id)?.key;
  }

  async listModels(providerId: string, forceRefresh = false): Promise<ModelInfo[]> {
    const entry = this.providers.get(providerId);
    if (!entry) throw new Error(`Provider not found: ${providerId}`);
    
    const now = Date.now();
    const cached = this.modelCache.get(providerId);
    const expiry = this.cacheExpiry.get(providerId) || 0;

    if (!forceRefresh && cached && now < expiry) {
      return cached;
    }

    const key = entry.key;
    if (!key && entry.provider.requires_key) {
      throw new Error(`API key required for provider: ${providerId}`);
    }

    try {
      const models = await entry.provider.listModels(key || '');
      this.modelCache.set(providerId, models);
      this.cacheExpiry.set(providerId, now + this.CACHE_TTL);
      return models;
    } catch (error) {
      // Return cached models if available, even if expired
      if (cached) return cached;
      throw error;
    }
  }

  async getAllModels(): Promise<ModelInfo[]> {
    const enabled = this.getEnabledProviders();
    const allModels: ModelInfo[] = [];
    
    for (const entry of enabled) {
      try {
        const models = await this.listModels(entry.provider.id);
        allModels.push(...models);
      } catch {
        // Skip providers that fail
      }
    }
    
    return allModels;
  }

  getModel(providerId: string, modelId: string): ModelInfo | undefined {
    const cached = this.modelCache.get(providerId);
    if (cached) {
      return cached.find(m => m.id === modelId);
    }
    return undefined;
  }

  clearCache(providerId?: string): void {
    if (providerId) {
      this.modelCache.delete(providerId);
      this.cacheExpiry.delete(providerId);
    } else {
      this.modelCache.clear();
      this.cacheExpiry.clear();
    }
  }
}

export const providerRegistry = new ProviderRegistry();