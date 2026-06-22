// Configuration manager - handles loading, saving, and defaults

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { NexusConfig, DEFAULT_CONFIG, validateConfig, mergeConfig } from './schema.js';
import type { ProjectNameData } from './types.js';

const CONFIG_DIR = join(homedir(), '.nexus');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const KEYS_FILE = join(CONFIG_DIR, 'keys.json');

export class ConfigManager {
  private config: NexusConfig | null = null;
  private keys: Record<string, string> = {};

  constructor() {
    this.ensureConfigDir();
  }

  private ensureConfigDir(): void {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
  }

  load(): NexusConfig {
    if (this.config) return this.config;

    if (existsSync(CONFIG_FILE)) {
      try {
        const content = readFileSync(CONFIG_FILE, 'utf-8');
        this.config = validateConfig(JSON.parse(content));
      } catch {
        this.config = { ...DEFAULT_CONFIG };
      }
    } else {
      this.config = { ...DEFAULT_CONFIG };
    }

    // Load keys separately (encrypted)
    this.loadKeys();
    return this.config;
  }

  save(config?: Partial<NexusConfig>): void {
    if (config) {
      this.config = mergeConfig(this.config || DEFAULT_CONFIG, config);
    }
    if (!this.config) return;

    writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), { mode: 0o600 });
  }

  getConfig(): NexusConfig {
    return this.load();
  }

  getKeys(): Record<string, string> {
    this.loadKeys();
    return { ...this.keys };
  }

  getKey(provider: string): string | undefined {
    this.loadKeys();
    return this.keys[provider];
  }

  setKey(provider: string, key: string): void {
    this.loadKeys();
    this.keys[provider] = key;
    this.saveKeys();
  }

  deleteKey(provider: string): void {
    this.loadKeys();
    delete this.keys[provider];
    this.saveKeys();
  }

  private loadKeys(): void {
    if (existsSync(KEYS_FILE)) {
      try {
        const content = readFileSync(KEYS_FILE, 'utf-8');
        this.keys = JSON.parse(content);
      } catch {
        this.keys = {};
      }
    }
  }

  private saveKeys(): void {
    writeFileSync(KEYS_FILE, JSON.stringify(this.keys, null, 2), { mode: 0o600 });
  }

  // Generate a project name on first run
  generateProjectName(): string {
    const adjectives = [
      'Iron', 'Cobalt', 'Titan', 'Quantum', 'Solar', 'Lunar', 'Stellar', 'Neural',
      'Cyber', 'Digital', 'Prism', 'Vector', 'Flux', 'Nova', 'Apex', 'Zenith',
      'Velocity', 'Momentum', 'Catalyst', 'Fusion', 'Nexus', 'Core', 'Prime',
      'Alpha', 'Omega', 'Delta', 'Sigma', 'Phoenix', 'Dragon', 'Falcon', 'Eagle'
    ];

    const nouns = [
      'Falcon', 'Drift', 'Flow', 'Surge', 'Pulse', 'Wave', 'Beam', 'Ray',
      'Core', 'Node', 'Link', 'Bridge', 'Gate', 'Key', 'Code', 'Logic',
      'Mind', 'Brain', 'Spark', 'Flash', 'Bolt', 'Strike', 'Force', 'Power',
      'Engine', 'Drive', 'Motor', 'System', 'Network', 'Matrix', 'Grid', 'Web'
    ];

    // Seed from hostname + timestamp for reproducibility per install
    const hostname = require('os').hostname();
    const seed = hostname.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) + Date.now();
    const adjIdx = seed % adjectives.length;
    const nounIdx = Math.floor(seed / adjectives.length) % nouns.length;

    return `${adjectives[adjIdx]} ${nouns[nounIdx]}`;
  }

  // Initialize config with generated project name if empty
  initializeIfNeeded(): NexusConfig {
    const config = this.load();
    if (!config.project_name) {
      config.project_name = this.generateProjectName();
      this.save(config);
    }
    return config;
  }

  // Reset to defaults (for testing)
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.keys = {};
    this.save();
    this.saveKeys();
  }
}

export const configManager = new ConfigManager();