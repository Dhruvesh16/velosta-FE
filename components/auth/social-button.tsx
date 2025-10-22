"use client";

import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface SocialButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

export function SocialButton({ icon, label, onClick }: SocialButtonProps) {
  return (
    <Button
      variant="outline"
      className="w-full h-11 rounded-lg border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2 bg-transparent"
      onClick={onClick}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </Button>
  );
}
