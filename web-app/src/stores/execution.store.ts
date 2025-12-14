/**
 * Execution Store
 * Manages test execution state
 */

import { create } from 'zustand';
import type {
  CreateRunPlanResponse,
  GetRunStatusResponse,
} from '@/types';

// ============================================================================
// Types
// ============================================================================

interface ExecutionState {
  /** Current run plan */
  currentPlan: CreateRunPlanResponse | null;
  /** Current run status */
  currentStatus: GetRunStatusResponse | null;
  /** Run history */
  runHistory: GetRunStatusResponse[];
  /** Loading state */
  isLoading: boolean;
  /** Is polling for status */
  isPolling: boolean;
  /** Error state */
  error: string | null;
}

interface ExecutionActions {
  /** Set current plan */
  setCurrentPlan: (plan: CreateRunPlanResponse | null) => void;
  /** Set current status */
  setCurrentStatus: (status: GetRunStatusResponse | null) => void;
  /** Add to run history */
  addToHistory: (run: GetRunStatusResponse) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set polling state */
  setPolling: (polling: boolean) => void;
  /** Set error */
  setError: (error: string | null) => void;
  /** Clear current execution */
  clearCurrent: () => void;
  /** Clear all */
  clear: () => void;
}

type ExecutionStore = ExecutionState & ExecutionActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: ExecutionState = {
  currentPlan: null,
  currentStatus: null,
  runHistory: [],
  isLoading: false,
  isPolling: false,
  error: null,
};

// ============================================================================
// Store
// ============================================================================

export const useExecutionStore = create<ExecutionStore>()((set, get) => ({
  ...initialState,

  setCurrentPlan: (plan) => set({ currentPlan: plan }),

  setCurrentStatus: (status) => set({ currentStatus: status }),

  addToHistory: (run) => set({
    runHistory: [run, ...get().runHistory.filter((r) => r.runId !== run.runId)],
  }),

  setLoading: (isLoading) => set({ isLoading }),

  setPolling: (isPolling) => set({ isPolling }),

  setError: (error) => set({ error }),

  clearCurrent: () => set({
    currentPlan: null,
    currentStatus: null,
    error: null,
  }),

  clear: () => set(initialState),
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectIsRunning = (state: ExecutionStore): boolean => {
  return state.currentStatus?.status === 'running';
};

export const selectCanRun = (state: ExecutionStore): boolean => {
  return state.currentPlan !== null && !selectIsRunning(state);
};

export const selectProgress = (state: ExecutionStore) => {
  return state.currentStatus?.progress ?? { completed: 0, total: 0, percentage: 0 };
};
