// Nexus TUI — public exports

// Setup wizard
export { renderWelcomeScreen } from './components/welcome-screen.js';
export { renderProviderSelector } from './components/provider-selector.js';
export { renderApiKeyEntry } from './components/api-key-entry.js';
export { renderModelListInput } from './components/model-list-input.js';
export { runSetupWizard } from './setup-wizard.js';
export type { SetupResult } from './setup-wizard.js';

// Screens
export { renderHomeScreen } from './components/screens/home.js';
export { renderSessionScreen } from './components/screens/session.js';
export type { Message, ToolCall, SidebarProps, SessionScreenProps } from './components/screens/session.js';

// Overlays
export { renderCommandPalette } from './components/command-palette.js';
export { renderModeSwitcher } from './components/mode-switcher.js';
export type { OperatingMode } from './components/mode-switcher.js';

// Utils
export { ansi, stripAnsi, visibleWidth, padOrTruncate, wrapText, parseKey, formatDuration, formatTokens, truncate } from './utils/ansi.js';

// Theme
export { defaultTheme, loadTheme, loadThemeFile, resolveSemanticColors } from './theme/index.js';
export type { Theme, ThemeColors, ThemeSemantic } from './theme/index.js';