// Theme types and loader

export interface ThemeColors {
  background: string;
  backgroundPanel: string;
  backgroundElement: string;
  backgroundElementHover: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  border: string;
  borderActive: string;
  borderSubtle: string;
  primary: string;
  secondary: string;
  accent: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  diffAdded: string;
  diffRemoved: string;
  diffContext: string;
  selection: string;
  cursor: string;
  overlay: string;
  scrollbar: string;
  scrollbarHover: string;
}

export interface ThemeSemantic {
  userBorder: string;
  assistantBorder: string;
  systemBorder: string;
  toolBorder: string;
  thinkingBorder: string;
  modeBadgeSingle: string;
  modeBadgeMulti: string;
  modeBadgeConversational: string;
  sidebarBg: string;
  promptBg: string;
  promptBorder: string;
  footerBg: string;
  footerText: string;
  logoPrimary: string;
  logoSecondary: string;
}

export interface Theme {
  name: string;
  description: string;
  author: string;
  version: string;
  colors: ThemeColors;
  semantic: ThemeSemantic;
}

export function resolveSemanticColors(theme: Theme): Record<string, string> {
  const { colors, semantic } = theme;
  const resolved: Record<string, string> = { ...colors };
  
  for (const [key, value] of Object.entries(semantic)) {
    if (colors[value as keyof ThemeColors]) {
      resolved[`semantic.${key}`] = colors[value as keyof ThemeColors];
    } else {
      resolved[`semantic.${key}`] = value;
    }
  }
  
  return resolved;
}

export function loadTheme(themeJson: string): Theme {
  return JSON.parse(themeJson);
}

export function loadThemeFile(path: string): Theme {
  const fs = require('fs');
  return loadTheme(fs.readFileSync(path, 'utf-8'));
}

export const defaultTheme: Theme = {
  name: 'nexus',
  description: 'Nexus default theme - warm charcoal with amber primary',
  author: 'Nexus Team',
  version: '1.0.0',
  colors: {
    background: '#0a0a0a',
    backgroundPanel: '#141414',
    backgroundElement: '#1e1e1e',
    backgroundElementHover: '#2a2a2a',
    text: '#eeeeee',
    textMuted: '#808080',
    textSubtle: '#505050',
    border: '#484848',
    borderActive: '#606060',
    borderSubtle: '#303030',
    primary: '#fab283',
    secondary: '#5c9cf5',
    accent: '#9d7cd8',
    error: '#e06c75',
    warning: '#f5a742',
    success: '#7fd88f',
    info: '#56b6c2',
    diffAdded: '#7fd88f',
    diffRemoved: '#e06c75',
    diffContext: '#808080',
    selection: '#fab28340',
    cursor: '#fab283',
    overlay: '#0a0a0acc',
    scrollbar: '#303030',
    scrollbarHover: '#484848',
  },
  semantic: {
    userBorder: 'primary',
    assistantBorder: 'secondary',
    systemBorder: 'accent',
    toolBorder: 'info',
    thinkingBorder: 'warning',
    modeBadgeSingle: 'primary',
    modeBadgeMulti: 'secondary',
    modeBadgeConversational: 'accent',
    sidebarBg: 'backgroundPanel',
    promptBg: 'backgroundPanel',
    promptBorder: 'borderActive',
    footerBg: 'background',
    footerText: 'textMuted',
    logoPrimary: 'primary',
    logoSecondary: 'text',
  },
};