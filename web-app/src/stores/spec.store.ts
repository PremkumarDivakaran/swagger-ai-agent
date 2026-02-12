/**
 * Spec Store
 * Manages spec state
 */

import { create } from 'zustand';
import type {
  SpecSummary,
  SpecMetadata,
  Operation,
} from '@/types';

// ============================================================================
// Types
// ============================================================================

interface SpecState {
  /** List of imported specs */
  specs: SpecSummary[];
  /** Currently selected spec */
  selectedSpec: SpecMetadata | null;
  /** Operations for selected spec */
  operations: Operation[];
  /** Selected operation IDs for test execution */
  selectedOperationIds: string[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
}

interface SpecActions {
  /** Set specs list */
  setSpecs: (specs: SpecSummary[]) => void;
  /** Add a new spec */
  addSpec: (spec: SpecSummary) => void;
  /** Remove a spec */
  removeSpec: (specId: string) => void;
  /** Set selected spec */
  setSelectedSpec: (spec: SpecMetadata | null) => void;
  /** Set operations */
  setOperations: (operations: Operation[]) => void;
  /** Set selected operation IDs */
  setSelectedOperationIds: (ids: string[]) => void;
  /** Clear selected operations */
  clearSelectedOperations: () => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error */
  setError: (error: string | null) => void;
  /** Clear state */
  clear: () => void;
}

type SpecStore = SpecState & SpecActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: SpecState = {
  specs: [],
  selectedSpec: null,
  operations: [],
  selectedOperationIds: [],
  isLoading: false,
  error: null,
};

// ============================================================================
// Store
// ============================================================================

export const useSpecStore = create<SpecStore>()((set, get) => ({
  ...initialState,

  setSpecs: (specs) => set({ specs }),

  addSpec: (spec) => set({ specs: [...get().specs, spec] }),

  removeSpec: (specId) => set({
    specs: get().specs.filter((s) => s.id !== specId),
    selectedSpec: get().selectedSpec?.specId === specId ? null : get().selectedSpec,
    operations: get().selectedSpec?.specId === specId ? [] : get().operations,
  }),

  setSelectedSpec: (spec) => set({ selectedSpec: spec }),

  setOperations: (operations) => set({ operations }),

  setSelectedOperationIds: (ids) => set({ selectedOperationIds: ids }),

  clearSelectedOperations: () => set({ selectedOperationIds: [] }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clear: () => set(initialState),
}));
