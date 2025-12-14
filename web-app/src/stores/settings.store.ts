/**
 * Settings Store
 * Manages user preferences with localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UiSettings,
  Theme,
} from '@/types';
import {
  defaultUiSettings,
  defaultApiSettings,
} from '@/config';

// ============================================================================
// Types
// ============================================================================

interface SettingsState {
  /** UI configuration */
  ui: UiSettings;
  /** API base URL override */
  apiBaseUrl: string;
}

interface SettingsActions {
  /** Update UI settings */
  updateUi: (settings: Partial<UiSettings>) => void;
  /** Set theme */
  setTheme: (theme: Theme) => void;
  /** Toggle sidebar */
  toggleSidebar: () => void;
  /** Set API base URL */
  setApiBaseUrl: (url: string) => void;
  /** Reset to defaults */
  resetToDefaults: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: SettingsState = {
  ui: defaultUiSettings,
  apiBaseUrl: defaultApiSettings.baseUrl,
};

// ============================================================================
// Store
// ============================================================================

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      updateUi: (settings) => {
        set({
          ui: { ...get().ui, ...settings },
        });
      },

      setTheme: (theme) => {
        set({
          ui: { ...get().ui, theme },
        });
      },

      toggleSidebar: () => {
        set({
          ui: { ...get().ui, sidebarCollapsed: !get().ui.sidebarCollapsed },
        });
      },

      setApiBaseUrl: (url) => {
        set({ apiBaseUrl: url });
      },

      resetToDefaults: () => {
        set(initialState);
      },
    }),
    {
      name: 'swagger-ai-agent-settings',
      version: 1,
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectResolvedTheme = (state: SettingsStore): 'light' | 'dark' => {
  if (state.ui.theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return state.ui.theme;
};
