"use client";

/**
 * ParticleField — ambient dust/sunlight motes.
 * Transparent canvas overlay. Extremely slow drift. Respects prefers-reduced-motion.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  /** Number of particles. Keep low for perf. */
  count?: number;
  /** Overall opacity of the layer. */
  opacity?: number;
  /** Particle tint (hex). */
  color?: string;
  /** Optional className for sizing/positioning the wrapper. */
  className?: string;
};

export default function ParticleField({
  count = 80,
  opacity = 0.35,
  color = "#F5EFE6",
  className = "",
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Respect reduced motion — render a static, even lighter pass.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Low-end device guard
    const lowEnd =
      typeof navigator !== "undefined" &&
      // @ts-expect-error — deviceMemory is non-standard but widely supported
      (navigator.deviceMemory ?? 8) <= 2;

    if (lowEnd) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Particle geometry
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      seeds[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.035,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let frame = 0;
    let raf = 0;
    const start = performance.now();

    const animate = () => {
      frame += 1;
      const t = (performance.now() - start) * 0.00008; // extremely slow
      const pos = geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const iy = i * 3 + 1;
        // gentle vertical drift using per-particle seed
        pos[iy] += Math.sin(t + seeds[i]) * 0.0015;
        // wrap
        if (pos[iy] > 4) pos[iy] = -4;
        if (pos[iy] < -4) pos[iy] = 4;
      }
      geometry.attributes.position.needsUpdate = true;
      points.rotation.y = t * 0.1;
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(animate);
    };

    // Kick off
    if (reduced) {
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(animate);
    }

    // Resize
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // Pause when offscreen (perf)
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!raf && !reduced) raf = requestAnimationFrame(animate);
        } else {
          if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        }
      },
      { threshold: 0 }
    );
    io.observe(mount);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      // silence unused var warning — helpful for future debugging
      void frame;
    };
  }, [count, opacity, color]);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
