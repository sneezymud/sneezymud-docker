import { create } from "zustand";

import type { SessionUser } from "@/shared/schemas/auth.ts";

interface AuthState {
  clearUser: () => void;
  loggingOut: boolean;
  setLoggingOut: (value: boolean) => void;
  setUser: (user: SessionUser) => void;
  user: null | SessionUser;
}

export const useAuthStore = create<AuthState>((set) => ({
  clearUser: () => {
    set({ user: null });
  },
  loggingOut: false,
  setLoggingOut: (loggingOut) => {
    set({ loggingOut });
  },
  setUser: (user) => {
    set({ loggingOut: false, user });
  },
  user: null,
}));
