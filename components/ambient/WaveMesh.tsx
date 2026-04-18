"use client";

/**
 * WaveMesh — slow sine-wave plane, navy→teal gradient.
 * Meant to sit in the Philosophy section's empty right column.
 * No interaction. Pauses when offscreen.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  /** Container className (sizing). */
  className?: string;
  /** Layer opacity 0–1. */
  opacity?: number;
};

export default function WaveMesh({ className = "", opacity = 0.35 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const lowEnd =
      typeof navigator !== "undefined" &&
      // @ts-expect-error — non-standard
      (navigator.deviceMemory ?? 8) <= 2;

    if (lowEnd) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1f2a, 0.18);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 4.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Low-poly plane — complexity kept intentionally low
    const geometry = new THREE.PlaneGeometry(10, 6, 48, 28);
    geometry.rotateX(-Math.PI / 2.2);

    // Vertex color gradient navy → teal
    const colors = new Float32Array(geometry.attributes.position.count * 3);
    const navy = new THREE.Color("#0B1F2A");
    const teal = new THREE.Color("#2F6F73");
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const t = THREE.MathUtils.clamp((z + 3) / 6, 0, 1);
      const col = navy.clone().lerp(teal, t);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      wireframe: true,
      transparent: true,
      opacity,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Store original Y positions for wave displacement
    const basePositions = pos.array.slice() as Float32Array;

    let raf = 0;
    const start = performance.now();

    const animate = () => {
      const t = (performance.now() - start) * 0.0003; // extremely slow
      const arr = pos.array as Float32Array;
      for (let i = 0; i < pos.count; i++) {
        const x = basePositions[i * 3 + 0];
        const z = basePositions[i * 3 + 2];
        // two overlapping sines for organic motion
        const wave =
          Math.sin(x * 0.6 + t) * 0.18 + Math.cos(z * 0.5 + t * 0.8) * 0.14;
        arr[i * 3 + 1] = basePositions[i * 3 + 1] + wave;
      }
      pos.needsUpdate = true;
      mesh.rotation.z = Math.sin(t * 0.3) * 0.02;
      renderer.render(scene, camera);
      if (!reduced) raf = requestAnimationFrame(animate);
    };

    if (reduced) {
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(animate);
    }

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!raf && !reduced) raf = requestAnimationFrame(animate);
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
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
    };
  }, [opacity]);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`pointer-events-none ${className}`}
    />
  );
}
