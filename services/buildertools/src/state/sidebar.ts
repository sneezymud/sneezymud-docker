import { create } from "zustand";

interface SidebarState {
  close: () => void;
  open: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  close: () => {
    set({ open: false });
  },
  open: false,
  toggle: () => {
    set((state) => ({ open: !state.open }));
  },
}));
