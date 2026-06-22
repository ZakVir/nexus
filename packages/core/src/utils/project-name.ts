// Project name generator — adjective × noun, seeded from hostname + timestamp

import { hostname } from 'os';

const ADJECTIVES = [
  'Iron', 'Cobalt', 'Titanium', 'Obsidian', 'Quantum', 'Neon', 'Prism',
  'Helix', 'Nova', 'Zenith', 'Pulse', 'Crimson', 'Azure', 'Onyx',
  'Storm', 'Blaze', 'Shadow', 'Crystal', 'Flux', 'Drift', 'Ember',
  'Frost', 'Lunar', 'Solar', 'Cipher', 'Vector', 'Vertex', 'Nexus',
  'Phantom', 'Aether', 'Bolt', 'Rapid', 'Swift', 'Dynamic', 'Kinetic',
  'Radiant', 'Vivid', 'Stark', 'Steel', 'Titan', 'Chrome', 'Atomic',
  'Binary', 'Neural', 'Synth', 'Echo', 'Delta', 'Omega', 'Alpha',
  'Sigma', 'Lambda', 'Theta', 'Gamma', 'Epsilon', 'Zeta', 'Kappa',
];

const NOUNS = [
  'Falcon', 'Drift', 'Forge', 'Pulse', 'Spark', 'Wave', 'Blade',
  'Storm', 'Vortex', 'Cascade', 'Nebula', 'Prism', 'Beacon', 'Phantom',
  'Sentinel', 'Warden', 'Horizon', 'Meridian', 'Zenith', 'Apex',
  'Cipher', 'Vector', 'Matrix', 'Helix', 'Spiral', 'Arc', 'Nexus',
  'Forge', 'Crucible', 'Anvil', 'Spire', 'Obelisk', 'Monolith',
  'Striker', 'Hunter', 'Ranger', 'Guardian', 'Oracle', 'Sage',
  'Phoenix', 'Dragon', 'Serpent', 'Titan', 'Golem', 'Specter',
  'Wraith', 'Shade', 'Bolt', 'Arrow', 'Lance', 'Shield',
];

/** Simple deterministic hash from a string */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit int
  }
  return Math.abs(hash);
}

/** Generate a project name seeded from hostname + timestamp */
export function generateProjectName(): string {
  const seed = `${hostname()}-${Date.now()}`;
  const hash = hashString(seed);
  
  const adjIndex = hash % ADJECTIVES.length;
  const nounIndex = (hash >> 8) % NOUNS.length;
  
  return `${ADJECTIVES[adjIndex]} ${NOUNS[nounIndex]}`;
}