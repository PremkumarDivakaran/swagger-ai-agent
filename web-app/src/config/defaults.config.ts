import type { BrowserSettings, ExecutionSettings, UiSettings, ApiSettings } from '@/types';

export const defaultBrowserSettings: BrowserSettings = {
  headless: true,
  slowMo: 0,
  timeout: 30000,
};

export const defaultExecutionSettings: ExecutionSettings = {
  parallel: false,
  maxParallel: 5,
  retryCount: 0,
  stopOnFailure: false,
};

export const defaultUiSettings: UiSettings = {
  theme: 'system',
  sidebarCollapsed: false,
  showNotifications: true,
};

export const defaultApiSettings: ApiSettings = {
  baseUrl: 'http://localhost:3001',
  timeout: 30000,
};
