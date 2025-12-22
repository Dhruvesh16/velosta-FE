"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function VelostaBotInterface() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[color:var(--color-cream)]">
      {/* Subtle grain texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Elegant geometric background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large subtle gradient circles using brand colors */}
        <div 
          className="absolute -right-[20%] -top-[30%] w-[800px] h-[800px] rounded-full opacity-[0.08]"
          style={{
            background: "radial-gradient(circle, var(--color-brand) 0%, transparent 70%)",
          }}
        />
        <div 
          className="absolute -left-[15%] -bottom-[25%] w-[600px] h-[600px] rounded-full opacity-[0.05]"
          style={{
            background: "radial-gradient(circle, var(--color-navy) 0%, transparent 70%)",
          }}
        />
        
        {/* Thin decorative lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" preserveAspectRatio="none">
          <line x1="20%" y1="0" x2="20%" y2="100%" className="stroke-[color:var(--color-navy)]" strokeWidth="1" />
          <line x1="80%" y1="0" x2="80%" y2="100%" className="stroke-[color:var(--color-navy)]" strokeWidth="1" />
          <line x1="0" y1="30%" x2="100%" y2="30%" className="stroke-[color:var(--color-navy)]" strokeWidth="1" />
          <line x1="0" y1="70%" x2="100%" y2="70%" className="stroke-[color:var(--color-navy)]" strokeWidth="1" />
        </svg>
      </div>

      {/* Main content */}
      <div className={`relative z-10 flex flex-col items-center px-8 text-center max-w-xl transition-all duration-1000 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        
        {/* Minimal logo mark */}
        <div className="mb-12">
          <div className="relative w-20 h-20">
            {/* Animated circular progress */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                className="stroke-neutral-200"
                strokeWidth="1"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                className="stroke-[color:var(--color-brand)]"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray="226"
                strokeDashoffset="60"
                style={{ animation: "progress 2s ease-out forwards" }}
              />
            </svg>
            {/* Center icon - minimal airplane */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="stroke-[color:var(--color-navy)]" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Brand name */}
        <div className="mb-8">
          <p className="text-[11px] tracking-[0.3em] text-neutral-500 uppercase mb-3 font-medium">
            Velosta AI
          </p>
          <h1 className="text-[color:var(--color-navy)] text-4xl md:text-5xl font-light tracking-tight leading-tight">
            Elevating Your
            <br />
            <span className="font-normal">Travel Experience</span>
          </h1>
        </div>

        {/* Minimal divider with brand color */}
        <div className="w-12 h-0.5 bg-[color:var(--color-brand)] mb-8 rounded-full" />

        {/* Message */}
        <p className="text-neutral-600 text-base leading-relaxed max-w-sm mb-10 font-light">
          We&apos;re refining our AI to craft even more thoughtful, 
          personalized journeys. Thank you for your patience.
        </p>

        {/* Status indicator */}
        <div className="flex items-center gap-3 mb-10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--color-brand)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--color-brand)]"></span>
          </span>
          <span className="text-xs tracking-wide text-neutral-500 uppercase font-medium">
            Currently upgrading
          </span>
        </div>

        {/* CTA - Using brand gradient */}
        <Link
          href="/"
          className="group relative inline-flex items-center justify-center px-8 py-3.5 rounded-full overflow-hidden shadow-lg shadow-[color:var(--color-brand)]/20 hover:shadow-xl hover:shadow-[color:var(--color-brand)]/30 transition-all duration-300"
          style={{
            background: "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
          }}
        >
          {/* Arrow icon */}
          <svg 
            className="relative w-4 h-4 mr-3 text-white/90 group-hover:-translate-x-1 transition-transform duration-300" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          
          {/* Text */}
          <span className="relative text-sm tracking-wide font-semibold text-[color:var(--color-brand-contrast)]">
            Return Home
          </span>
        </Link>

        {/* Bottom decorative element */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 opacity-30">
          <div className="w-1 h-1 rounded-full bg-[color:var(--color-navy)]" />
          <div className="w-1 h-1 rounded-full bg-[color:var(--color-brand)]" />
          <div className="w-1 h-1 rounded-full bg-[color:var(--color-navy)]" />
        </div>
      </div>

      {/* Corner accents with brand color touch */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l border-t border-[color:var(--color-navy)]/10" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r border-t border-[color:var(--color-brand)]/20" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l border-b border-[color:var(--color-brand)]/20" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r border-b border-[color:var(--color-navy)]/10" />

      {/* Custom animations */}
      <style jsx>{`
        @keyframes progress {
          0% { stroke-dashoffset: 226; }
          100% { stroke-dashoffset: 60; }
        }
      `}</style>
    </div>
  );
}
