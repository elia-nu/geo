"use client";

import { create } from "zustand";

export const useSidebarStore = create((set) => ({
  isCollapsed: false,
  setCollapsed: (value) => set({ isCollapsed: !!value }),
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}));
