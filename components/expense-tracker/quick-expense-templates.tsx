"use client";

import { Button } from "@/components/ui/button";
import { Utensils, Car, Bed, Ticket, Coffee, ShoppingBag, Plane, Train, Zap } from "lucide-react";

interface QuickExpenseTemplate {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: string;
  description: string;
}

const quickTemplates: QuickExpenseTemplate[] = [
  { id: "food", label: "Food", icon: <Utensils className="h-4 w-4" />, category: "Food & Dining", description: "Meal or snack" },
  { id: "coffee", label: "Coffee", icon: <Coffee className="h-4 w-4" />, category: "Food & Dining", description: "Coffee or drinks" },
  { id: "taxi", label: "Taxi", icon: <Car className="h-4 w-4" />, category: "Transportation", description: "Taxi or ride" },
  { id: "hotel", label: "Hotel", icon: <Bed className="h-4 w-4" />, category: "Accommodation", description: "Hotel stay" },
  { id: "flight", label: "Flight", icon: <Plane className="h-4 w-4" />, category: "Transportation", description: "Flight ticket" },
  { id: "train", label: "Train", icon: <Train className="h-4 w-4" />, category: "Transportation", description: "Train ticket" },
  { id: "shopping", label: "Shopping", icon: <ShoppingBag className="h-4 w-4" />, category: "Shopping", description: "Shopping items" },
  { id: "activity", label: "Activity", icon: <Ticket className="h-4 w-4" />, category: "Entertainment", description: "Tour or activity" },
];

interface QuickExpenseTemplatesProps {
  onSelectTemplate: (template: QuickExpenseTemplate) => void;
}

export function QuickExpenseTemplates({ onSelectTemplate }: QuickExpenseTemplatesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-navy)]/70">Quick Add</h3>
        <span className="text-xs text-[var(--color-navy)]/40">Tap to add</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-4 gap-2">
        {quickTemplates.map((template) => (
          <Button
            key={template.id}
            type="button"
            variant="outline"
            onClick={() => onSelectTemplate(template)}
            className="h-16 sm:h-20 flex-col gap-1.5 rounded-xl border-black/10 hover:border-[var(--color-brand)]/30 hover:bg-[var(--color-brand)]/5 transition-all group"
          >
            <div className="text-[var(--color-brand)] group-hover:scale-110 transition-transform">
              {template.icon}
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-[var(--color-navy)]/70">
              {template.label}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}

