// ── Map Store — Zustand ───────────────────────────────────────────────────────
// Manages map viewport state, markers, and active selection

import { create } from "zustand";
import type { MapMarker, MapViewport } from "@/lib/types/planner.types";

interface MapState {
  viewport: MapViewport;
  markers: MapMarker[];
  activeMarkerId: string | null;
  isMapReady: boolean;

  // ── Actions ─────────────────────────────────────────────────────────────
  setViewport: (vp: Partial<MapViewport>) => void;
  flyTo: (coords: [number, number], zoom?: number, pitch?: number) => void;
  setMarkers: (markers: MapMarker[]) => void;
  setActiveMarker: (id: string | null) => void;
  setMapReady: (ready: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewport: {
    longitude: 77.5946,
    latitude: 12.9716,
    zoom: 2,
    pitch: 0,
    bearing: 0,
  },
  markers: [],
  activeMarkerId: null,
  isMapReady: false,

  setViewport: (vp) =>
    set((s) => ({ viewport: { ...s.viewport, ...vp } })),

  flyTo: (coords, zoom = 13, pitch = 45) =>
    set({
      viewport: {
        longitude: coords[0],
        latitude: coords[1],
        zoom,
        pitch,
        bearing: 0,
      },
    }),

  setMarkers: (markers) => set({ markers }),

  setActiveMarker: (id) => set({ activeMarkerId: id }),

  setMapReady: (ready) => set({ isMapReady: ready }),
}));

