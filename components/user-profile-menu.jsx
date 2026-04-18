"use client";

import { useState, useRef, useEffect, useContext } from "react";
import { MapPin, LayoutDashboard, LogOut } from "lucide-react";
import { useUser } from "@/app/utils/context";

export function UserProfileMenu({ isLoggedIn = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const { user, setUser, setAccessToken } = useUser();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  if (!isLoggedIn || !user) return null;

  // Logout function
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userData");
    setUser(null);
    setAccessToken(null);
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Name Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 inline-flex items-center gap-2 rounded-full pl-1.5 pr-4 text-sm font-semibold text-[color:var(--color-brand-contrast)] shadow-sm hover:shadow-md transition-shadow"
        style={{
          background:
            "linear-gradient(180deg, var(--color-brand-start), var(--color-brand))",
        }}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <span className="h-7 w-7 rounded-full bg-white/25 backdrop-blur flex items-center justify-center text-[color:var(--color-brand-contrast)] font-semibold text-xs">
          {user.name ? user.name[0].toUpperCase() : "U"}
        </span>
        <span className="max-w-[140px] truncate">
          {user.name ? user.name.split(" ")[0] : "Account"}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[var(--color-brand-start)] to-[var(--color-brand)] flex items-center justify-center text-white font-semibold">
                {user.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 truncate">
                  {user.name || "User"}
                </p>
                <p className="text-xs text-neutral-600 truncate">
                  {user.email || "No email"}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-neutral-700 hover:bg-neutral-50 transition-colors text-sm font-medium"
            >
              <MapPin
                className="h-4 w-4"
                style={{ color: "var(--color-brand)" }}
              />
              <span>My Trips</span>
            </button>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-neutral-700 hover:bg-neutral-50 transition-colors text-sm font-medium"
            >
              <LayoutDashboard
                className="h-4 w-4"
                style={{ color: "var(--color-brand)" }}
              />
              <span>Dashboard</span>
            </button> */}

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full px-4 py-2.5 flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium border-t border-neutral-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
