import { create } from "zustand";

import type { SessionUser } from "@/shared/schemas/auth.ts";

interface AuthState {
  clearUser: () => void;
  setUser: (user: SessionUser) => void;
  user: null | SessionUser;
}

export const useAuthStore = create<AuthState>((set) => ({
  clearUser: () => {
    set({ user: null });
  },
  setUser: (user) => {
    set({ user });
  },
  user: null,
}));
