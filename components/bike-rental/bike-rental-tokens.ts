/** Velosta bike rental — aligned with main site brand tokens (globals.css) */
export const VT = {
  bg: "#FBF8F3",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardMuted: "#F5EFE6",
  heroBand: "#F5EFE6",
  accent: "#D97757",
  accentHover: "#B85F44",
  accentSoft: "#FFF4EE",
  accentStart: "#E89378",
  teal: "#2F6F73",
  text: "#0B1F2A",
  textMuted: "#5C6B73",
  textSecondary: "#3D4F58",
  border: "#D9E2E1",
  borderStrong: "#C5D0CF",
  success: "#2F6F73",
  footerBg: "#0B1F2A",
  footerText: "rgba(245,239,230,0.6)",
  footerSand: "#F5EFE6",
  shadow: "0 4px 24px -4px rgba(11, 31, 42, 0.08)",
  shadowLg: "0 16px 48px -12px rgba(11, 31, 42, 0.12)",
} as const;

export const HERO_BANNER = "/images/bike-rental/velosta-bike3.png";
export const BIKE_RENTALS_SHOWCASE = "/images/bike-rental/bike-rentals.png";

export const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM",
] as const;

export const VT_SECTION = "mx-auto max-w-[1200px] px-4 sm:px-6";

export const WIDGET_INPUT =
  "h-11 w-full rounded-lg border bg-white px-3 text-sm shadow-none placeholder:text-[#94A3B8] focus-visible:border-[#D97757] focus-visible:ring-1 focus-visible:ring-[#D97757]/35";

export const WIDGET_LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5C6B73]";

/** Calendar popover — Velosta coral selection */
export const CALENDAR_CLASS =
  "[&_[data-selected-single=true]]:bg-[#D97757] [&_[data-selected-single=true]]:text-white [&_[data-selected-single=true]]:hover:bg-[#B85F44] [&_[data-selected-single=true]]:hover:text-white";
