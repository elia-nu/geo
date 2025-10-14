"use client";

import { create } from "zustand";

export const useSidebarStore = create((set, get) => ({
  isCollapsed: false,
  isHovered: false,
  autoCollapsed: false,
  setCollapsed: (value) => set({ isCollapsed: !!value }),
  toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setHovered: (value) => set({ isHovered: !!value }),
  setAutoCollapsed: (value) => set({ autoCollapsed: !!value }),
  
  // Initialize responsive behavior
  initializeResponsive: () => {
    if (typeof window === 'undefined') return;
    
    const checkWidth = () => {
      const width = window.innerWidth;
      const state = get();
      
      // Auto-collapse on tablet and smaller screens (< 1024px)
      if (width < 1024) {
        if (!state.autoCollapsed) {
          set({ isCollapsed: true, autoCollapsed: true });
        }
      } else {
        // On larger screens, restore previous state if it was auto-collapsed
        if (state.autoCollapsed) {
          const stored = localStorage.getItem("layout:isSidebarCollapsed");
          const shouldBeCollapsed = stored === "true";
          set({ isCollapsed: shouldBeCollapsed, autoCollapsed: false });
        }
      }
    };
    
    // Check on initialization
    checkWidth();
    
    // Add resize listener
    const handleResize = () => checkWidth();
    window.addEventListener('resize', handleResize);
    
    // Return cleanup function
    return () => window.removeEventListener('resize', handleResize);
  }
}));
