"use client";

/**
 * OceanCinematicBackground
 *
 * Layered background:
 *   1. HTML5 <video> — real ocean footage (autoplay, muted, loop)
 *   2. Three.js canvas — samples the video as a VideoTexture and applies
 *      a very subtle UV-distortion fragment shader (sine + low-freq noise)
 *   3. Gradient overlay — content readability
 *
 * Use behind hero / philosophy sections. Pointer-events are disabled; the
 * component is purely decorative and is aria-hidden.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  /** Video source. Supply a short, high-quality, seamlessly-looping mp4. */
  src: string;
  /** Optional poster (first-frame fallback while video loads). */
  poster?: string;
  /** Extra className on the wrapper. */
  className?: string;
  /** Strength of UV distortion (0 = none). Keep ≤ 0.01 for calm. */
  distortion?: number;
  /** Overall shader layer opacity. */
  overlayOpacity?: number;
  /**
   * Tailwind-compatible gradient classes or inline style override for the
   * readability gradient. Defaults to a bottom-weighted navy fade.
   */
  gradient?: string;
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;

  uniform sampler2D uVideo;
  uniform float uTime;
  uniform float uDistortion;
  uniform float uOpacity;
  uniform vec2 uResolution;

  varying vec2 vUv;

  // Cheap value noise — enough for atmosphere, no heavy math.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 uv = vUv;

    // Sine ripple — extremely slow, very small amplitude.
    float t = uTime * 0.08;
    vec2 warp;
    warp.x = sin(uv.y * 6.0 + t) * 0.5 + sin(uv.y * 2.3 + t * 0.6) * 0.5;
    warp.y = cos(uv.x * 5.0 - t * 0.8) * 0.5 + cos(uv.x * 2.1 - t * 0.4) * 0.5;

    // Low-frequency noise adds organic drift.
    float n = noise(uv * 3.0 + t * 0.2) - 0.5;

    vec2 distorted = uv + (warp + n) * uDistortion;

    vec4 video = texture2D(uVideo, distorted);

    // Faint chromatic separation — nearly invisible, just adds film feel.
    float ca = uDistortion * 0.35;
    float r = texture2D(uVideo, distorted + vec2(ca, 0.0)).r;
    float b = texture2D(uVideo, distorted - vec2(ca, 0.0)).b;
    video.r = mix(video.r, r, 0.4);
    video.b = mix(video.b, b, 0.4);

    gl_FragColor = vec4(video.rgb, uOpacity);
  }
`;

export default function OceanCinematicBackground({
  src,
  poster,
  className = "",
  distortion = 0.006,
  overlayOpacity = 1.0,
  gradient,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !video || !canvas) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Low-power device guard — skip the shader entirely; video alone is fine.
    const lowEnd =
      typeof navigator !== "undefined" &&
      // @ts-expect-error non-standard
      ((navigator.deviceMemory ?? 8) <= 2 ||
        // @ts-expect-error non-standard
        (navigator.hardwareConcurrency ?? 8) <= 2);

    // Attempt muted autoplay (iOS requires playsInline + muted).
    video.muted = true;
    video.playsInline = true;
    const tryPlay = () => void video.play().catch(() => { /* ignore */ });
    if (video.readyState >= 2) tryPlay();
    else video.addEventListener("loadeddata", tryPlay, { once: true });

    if (lowEnd) {
      // Hide the shader canvas; show only the video.
      canvas.style.display = "none";
      return;
    }

    // ── Three.js setup ────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
      premultipliedAlpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uVideo: { value: videoTexture },
        uTime: { value: 0 },
        uDistortion: { value: distortion },
        uOpacity: { value: overlayOpacity },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    const resize = () => {
      const w = wrapper.clientWidth;
      const h = wrapper.clientHeight;
      renderer.setSize(w, h, false);
      material.uniforms.uResolution.value.set(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);

    let raf = 0;
    let running = true;
    const start = performance.now();

    const render = () => {
      material.uniforms.uTime.value = (performance.now() - start) * 0.001;
      renderer.render(scene, camera);
      if (running && !reduced) raf = requestAnimationFrame(render);
    };

    if (reduced) {
      // Static frame — no distortion loop, but keep video playing natively.
      material.uniforms.uDistortion.value = 0;
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(render);
    }

    // Pause when offscreen to save GPU.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          running = true;
          if (!raf && !reduced) raf = requestAnimationFrame(render);
          tryPlay();
        } else {
          running = false;
          if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
          video.pause();
        }
      },
      { threshold: 0 }
    );
    io.observe(wrapper);

    // Pause when tab hidden.
    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
        video.pause();
      } else {
        running = true;
        tryPlay();
        if (!raf && !reduced) raf = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      mesh.geometry.dispose();
      material.dispose();
      videoTexture.dispose();
      renderer.dispose();
    };
  }, [src, distortion, overlayOpacity]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Layer 1 — Video (base realism) */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Layer 2 — Shader overlay (subtle distortion) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ display: "block" }}
      />

      {/* Layer 3 — Readability gradient */}
      <div
        className={`absolute inset-0 ${gradient ?? ""}`}
        style={
          gradient
            ? undefined
            : {
                background:
                  "linear-gradient(to bottom, rgba(11,31,42,0.35) 0%, rgba(11,31,42,0.15) 35%, rgba(11,31,42,0.55) 75%, rgba(11,31,42,0.85) 100%)",
              }
        }
      />
    </div>
  );
}
