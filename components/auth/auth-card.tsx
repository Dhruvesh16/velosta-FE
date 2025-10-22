"use client";

import type { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <div className="mb-8 text-center">
          <h1
            className="text-3xl font-bold"
            style={{ color: "var(--color-navy)" }}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-gray-600 text-sm">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
