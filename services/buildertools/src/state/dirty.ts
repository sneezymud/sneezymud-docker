import { create } from "zustand";

interface DirtyState {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
}

export const useDirtyStore = create<DirtyState>((set) => ({
  dirty: false,
  setDirty: (dirty) => {
    set({ dirty });
  },
}));
