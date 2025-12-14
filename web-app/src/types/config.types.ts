/**
 * Config Types
 */

export type Theme = 'light' | 'dark' | 'system';

export interface BrowserSettings {
  headless: boolean;
  slowMo: number;
  timeout: number;
}

export interface ExecutionSettings {
  parallel: boolean;
  maxParallel: number;
  retryCount: number;
  stopOnFailure: boolean;
}

export interface UiSettings {
  theme: Theme;
  sidebarCollapsed: boolean;
  showNotifications: boolean;
}

export interface ApiSettings {
  baseUrl: string;
  timeout: number;
}

export interface AppSettings {
  browser: BrowserSettings;
  execution: ExecutionSettings;
  ui: UiSettings;
  api: ApiSettings;
}
