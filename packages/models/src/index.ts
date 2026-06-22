// Model registry - manages model information and caching

import type { ModelInfo, ModelRegistryOptions } from './types.js';
import { providerRegistry } from '../core/src/providers/registry.js';

export class ModelRegistry {
  private modelCache: Map<string, ModelInfo[]> = new Map(); // providerId => models
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly DEFAULT_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
  private refreshInterval: number;

  constructor(options: ModelRegistryOptions = {}) {
    this.refreshInterval = options.refreshIntervalMs ?? this.DEFAULT_REFRESH_INTERVAL;
  }

  /**
   * Get models for a specific provider
   */
  async getModels(providerId: string, forceRefresh = false): Promise<ModelInfo[]> {
    const now = Date.now();
    const cached = this.modelCache.get(providerId);
    const timestamp = this.cacheTimestamps.get(providerId) || 0;

    // Return cached if still fresh and not forcing refresh
    if (!forceRefresh && cached && (now - timestamp) < this.refreshInterval) {
      return cached;
    }

    // Fetch fresh models from provider
    try {
      const models = await providerRegistry.listModels(providerId);
      this.modelCache.set(providerId, models);
      this.cacheTimestamps.set(providerId, now);
      return models;
    } catch (error) {
      // If fetching fails, return cached models if available
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  /**
   * Get all models from all enabled providers
   */
  async getAllModels(forceRefresh = false): Promise<ModelInfo[]> {
    const enabledProviders = providerRegistry.getEnabledProviders();
    const allModels: ModelInfo[] = [];
    
    for (const provider of enabledProviders) {
      try {
        const models = await this.getModels(provider.provider.id, forceRefresh);
        allModels.push(...models);
      } catch (error) {
        // Skip providers that fail
        console.warn(`Failed to load models for provider ${provider.provider.id}:`, error);
      }
    }
    
    return allModels;
  }

  /**
   * Find a specific model by ID and provider
   */
  async getModel(providerId: string, modelId: string): Promise<ModelInfo | undefined> {
    const models = await this.getModels(providerId);
    return models.find(model => model.id === modelId);
  }

  /**
   * Search models by name or ID
   */
  async searchModels(query: string): Promise<ModelInfo[]> {
    const allModels = await this.getAllModels();
    const lowerQuery = query.toLowerCase();
    
    return allModels.filter(model => 
      model.id.toLowerCase().includes(lowerQuery) || 
      model.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Clear cache for a specific provider or all providers
   */
  clearCache(providerId?: string): void {
    if (providerId) {
      this.modelCache.delete(providerId);
      this.cacheTimestamps.delete(providerId);
    } else {
      this.modelCache.clear();
      this.cacheTimestamps.clear();
    }
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): Record<string, { count: number; ageMs: number }> {
    const status: Record<string, { count: number; ageMs: number }> = {};
    const now = Date.now();
    
    for (const [providerId, models] of this.modelCache.entries()) {
      const timestamp = this.cacheTimestamps.get(providerId) || 0;
      status[providerId] = {
        count: models.length,
        ageMs: now - timestamp,
      };
    }
    
    return status;
  }
}

export const modelRegistry = new ModelRegistry();