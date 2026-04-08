"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Playfair_Display } from "next/font/google";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { MapPin, Compass, ArrowRight } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["900"] });

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Iconic destinations to slowly rotate through
const DESTINATIONS: { center: [number, number]; zoom: number; label: string }[] = [
  { center: [73.6883, 24.5854], zoom: 12.5, label: "Udaipur" },
  { center: [78.0421, 27.1751], zoom: 14, label: "Taj Mahal" },
  { center: [76.2673, 10.8505], zoom: 11, label: "Munnar" },
  { center: [79.8425, 11.9331], zoom: 13, label: "Pondicherry" },
  { center: [77.1734, 28.6139], zoom: 12, label: "Delhi" },
];

export default function CloudLandingScene() {
  const { setFlowStep } = useOnboardingStore();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const destIndexRef = useRef(0);

  // Initialize background map
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const startDest = DESTINATIONS[0];
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: startDest.center,
      zoom: startDest.zoom,
      pitch: 50,
      bearing: -15,
      antialias: true,
      interactive: false,
      attributionControl: false,
    });

    map.on("load", () => {
      // 3D terrain
      map.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

      map.addLayer({
        id: "sky",
        type: "sky",
        paint: {
          "sky-type": "atmosphere",
          "sky-atmosphere-sun": [0.0, 90.0],
          "sky-atmosphere-sun-intensity": 15,
        },
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Slow fly between destinations
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const interval = setInterval(() => {
      destIndexRef.current = (destIndexRef.current + 1) % DESTINATIONS.length;
      const dest = DESTINATIONS[destIndexRef.current];
      mapRef.current?.flyTo({
        center: dest.center,
        zoom: dest.zoom,
        pitch: 45 + Math.random() * 15,
        bearing: -30 + Math.random() * 60,
        duration: 12000,
        essential: true,
      });
    }, 14000);

    return () => clearInterval(interval);
  }, [mapReady]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Mapbox background */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%", zIndex: 0 }}
      />

      {/* Dark overlay for contrast */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          background: "linear-gradient(to bottom, rgba(15,15,20,0.55) 0%, rgba(15,15,20,0.4) 40%, rgba(15,15,20,0.45) 70%, rgba(15,15,20,0.7) 100%)",
        }}
      />

      {/* Subtle animated map pins in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
        {[
          { top: "12%", left: "8%", delay: 0, size: 20 },
          { top: "18%", right: "12%", delay: 0.5, size: 16 },
          { bottom: "22%", left: "15%", delay: 1.0, size: 18 },
          { bottom: "30%", right: "8%", delay: 1.5, size: 14 },
        ].map((pin, i) => (
          <motion.div
            key={i}
            className="absolute text-amber-400/30"
            style={{ top: pin.top, left: pin.left, right: pin.right, bottom: pin.bottom }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{ delay: pin.delay, duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <MapPin size={pin.size} />
          </motion.div>
        ))}
      </div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center" style={{ zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        >
          {/* Velosta brand text */}
          <motion.div
            className="mx-auto mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <span
              className={`${playfair.className} text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-clip-text text-transparent drop-shadow-lg`}
              style={{ letterSpacing: "-0.02em" }}
            >
              Velosta
            </span>
          </motion.div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight drop-shadow-md">
            <span className="block">Where can your</span>
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              budget
            </span>{" "}
            <span>take you?</span>
          </h1>

          <motion.p
            className="mt-4 text-gray-200 text-base md:text-lg max-w-md mx-auto leading-relaxed drop-shadow-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            AI-powered travel planning that finds the best destinations
            within your budget. Spatially. Intelligently.
          </motion.p>
        </motion.div>

        {/* CTA */}
        <motion.button
          onClick={() => setFlowStep("budget")}
          className="mt-8 group relative flex items-center gap-2.5 px-8 py-3.5 rounded-full text-white font-semibold text-base shadow-xl active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            boxShadow: "0 8px 30px rgba(245,158,11,0.35)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6, type: "spring" }}
          whileHover={{ scale: 1.04, boxShadow: "0 12px 40px rgba(245,158,11,0.45)" }}
          whileTap={{ scale: 0.97 }}
        >
          <Compass size={18} className="group-hover:rotate-45 transition-transform duration-300" />
          Start Exploring
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </motion.button>

        {/* Feature hints */}
        <motion.div
          className="mt-8 flex items-center gap-6 text-xs text-gray-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Budget-optimized
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            AI-curated itineraries
          </span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Spatial intelligence
          </span>
        </motion.div>

        {/* Footer */}
        <motion.p
          className="mt-6 text-[11px] text-gray-400/80 font-medium tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
        >
          Powered by Velosta AI
        </motion.p>
      </div>
    </div>
  );
}
