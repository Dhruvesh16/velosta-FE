"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/utils/context";
import {
  authApi,
  ApiError,
  clearSession,
  type TotpSetupData,
  type PasskeyCredential,
} from "@/lib/api";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Design tokens ─────────────────────────────────────────────────────────────
const navy = "#0B1F2A";
const brand = "#D97757";
const cream = "#FBF8F3";

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-6 sm:p-8"
      style={{ background: "#fff", borderColor: "rgba(11,31,42,0.08)" }}
    >
      <div className="mb-6">
        <h2 className="text-[17px] font-semibold" style={{ color: navy }}>
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm" style={{ color: "rgba(11,31,42,0.55)" }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function PrimaryBtn({
  loading,
  disabled,
  children,
  onClick,
  type = "button",
}: {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={loading || disabled}
      onClick={onClick}
      className="inline-flex h-10 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
      style={{ background: brand }}
    >
      {loading ? "Saving…" : children}
    </button>
  );
}

// ── Avatar section ─────────────────────────────────────────────────────────────
function ProfileSection() {
  const { user, setUser, setAccessToken } = useUser();
  const [name, setName] = useState(user?.name || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = (user?.name || user?.email || "U")[0].toUpperCase();
  const displayAvatar = avatarPreview || user?.avatarUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let updatedUser = user;

      // Upload avatar first if a new file was selected
      if (pendingFile) {
        try {
          const res = await authApi.uploadAvatar(pendingFile);
          updatedUser = res.user;
        } catch (err: any) {
          // If upload endpoint not configured, just skip and save name only
          if (err?.code !== "not_configured") throw err;
          toast.info("Avatar upload is not yet enabled on this server.");
        }
      }

      // Save name
      const res = await authApi.updateProfile({ name: name.trim() || undefined });
      updatedUser = res.user;

      setUser(updatedUser as any);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("userData", JSON.stringify(updatedUser));
      }
      setPendingFile(null);
      toast.success("Profile updated.");
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard title="Profile" description="Your public display name and photo.">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
            style={{
              background: displayAvatar
                ? undefined
                : "linear-gradient(135deg, #D97757, #B85C3A)",
            }}
          >
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm"
            style={{ background: brand }}
            aria-label="Change photo"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Name field */}
        <div className="flex-1 w-full">
          <Label htmlFor="display-name" className="text-sm font-medium mb-1.5 block" style={{ color: navy }}>
            Display name
          </Label>
          <div className="flex gap-3">
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={120}
              className="rounded-xl border"
              style={{ borderColor: "rgba(11,31,42,0.15)", color: navy }}
            />
            <PrimaryBtn loading={saving} onClick={handleSave}>
              Save
            </PrimaryBtn>
          </div>
          <p className="mt-2 text-xs" style={{ color: "rgba(11,31,42,0.45)" }}>
            {user?.email}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

// ── 2-FA section ───────────────────────────────────────────────────────────────
type TwoFaTab = "email_otp" | "totp" | "passkey";

function PasskeyTabContent({ userId }: { userId: string }) {
  const [credentials, setCredentials] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    authApi.passkeyList()
      .then((res) => setCredentials(res.credentials))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRegister = async () => {
    if (!window.PublicKeyCredential) {
      toast.error("This browser or device does not support passkeys.");
      return;
    }
    setRegistering(true);
    try {
      const { startRegistration } = await import("@simplewebauthn/browser");
      const { sessionId, options } = await authApi.passkeyRegisterBegin();
      const credential = await startRegistration({ optionsJSON: options as any });
      const result = await authApi.passkeyRegisterComplete({
        session_id: sessionId,
        credential: credential as unknown as Record<string, unknown>,
        name: newName.trim() || "Passkey",
      });
      setCredentials(result.credentials);
      setNewName("");
      toast.success("Passkey registered! You can now sign in with it.");
    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        toast.error("Passkey registration was cancelled.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not register passkey.");
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await authApi.passkeyDelete(id);
      setCredentials(result.credentials);
      toast.success("Passkey removed.");
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove passkey.");
    }
  };

  const handleRename = async (id: string) => {
    try {
      const result = await authApi.passkeyRename(id, editName.trim());
      setCredentials((prev) => prev.map((c) => (c.id === id ? result.credential : c)));
      setEditingId(null);
      toast.success("Passkey renamed.");
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Could not rename.");
    }
  };

  const KeyIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
      <circle cx="16.5" cy="7.5" r=".5" />
    </svg>
  );

  return (
    <div className="space-y-5">
      {/* Explainer */}
      <div
        className="flex items-start gap-3 rounded-xl p-4"
        style={{ background: cream, border: "1px solid rgba(11,31,42,0.07)" }}
      >
        <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center" style={{ background: "rgba(217,119,87,0.1)" }}>
          <KeyIcon />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: navy }}>Sign in without a password</p>
          <p className="mt-1 text-sm" style={{ color: "rgba(11,31,42,0.55)" }}>
            Passkeys use your device's biometrics (Face ID, Touch ID, Windows Hello) or PIN.
            They work with <strong>1Password</strong>, <strong>Proton Pass</strong>, <strong>iCloud Keychain</strong>, and any FIDO2-compatible manager.
          </p>
        </div>
      </div>

      {/* Existing passkeys */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(11,31,42,0.5)" }}>
          <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: brand }} />
          Loading passkeys…
        </div>
      ) : credentials.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(11,31,42,0.4)" }}>
            Registered passkeys
          </p>
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ border: "1px solid rgba(11,31,42,0.09)", background: "#fff" }}
            >
              <div className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.1)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {editingId === cred.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 rounded-lg text-sm py-0"
                      style={{ borderColor: "rgba(11,31,42,0.15)" }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(cred.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(cred.id)}
                      className="text-xs font-semibold"
                      style={{ color: brand }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium truncate" style={{ color: navy }}>
                      {cred.name || "Passkey"}
                    </p>
                    <p className="text-xs" style={{ color: "rgba(11,31,42,0.45)" }}>
                      {cred.deviceType === "multiDevice" ? "Synced passkey" : "Device-bound"} ·{" "}
                      {new Date(cred.createdAt).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {editingId !== cred.id && (
                  <button
                    type="button"
                    onClick={() => { setEditingId(cred.id); setEditName(cred.name || ""); }}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                    style={{ color: "rgba(11,31,42,0.4)" }}
                    aria-label="Rename"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: "rgba(220,38,38,0.7)" }}
                      aria-label="Remove passkey"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove passkey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{cred.name || "Passkey"}" will be removed. You can always register a new one.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(cred.id)}
                        className="rounded-full bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "rgba(11,31,42,0.5)" }}>
          No passkeys registered yet.
        </p>
      )}

      {/* Register new passkey */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ border: "1px dashed rgba(11,31,42,0.15)", background: "#fafaf9" }}
      >
        <p className="text-sm font-medium" style={{ color: navy }}>
          {credentials.length > 0 ? "Add another passkey" : "Register a passkey"}
        </p>
        <div className="flex gap-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. 1Password on MacBook"
            maxLength={120}
            className="rounded-xl flex-1"
            style={{ borderColor: "rgba(11,31,42,0.15)", color: navy }}
          />
          <PrimaryBtn loading={registering} onClick={handleRegister}>
            {credentials.length > 0 ? "Add passkey" : "Register"}
          </PrimaryBtn>
        </div>
        <p className="text-xs" style={{ color: "rgba(11,31,42,0.45)" }}>
          Your browser will prompt you to use Face ID, Touch ID, Windows Hello, or your password manager.
        </p>
      </div>
    </div>
  );
}

function TwoFaSection() {
  const { user, setUser } = useUser();
  const [activeTab, setActiveTab] = useState<TwoFaTab>("email_otp");

  // TOTP setup state
  const [totpData, setTotpData] = useState<TotpSetupData | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [enablingTotp, setEnablingTotp] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const currentMethod = (user?.twoFaMethod || "email_otp") as TwoFaTab;

  const tabs: { id: TwoFaTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "email_otp",
      label: "Email OTP",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    {
      id: "totp",
      label: "Authenticator",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M12 18h.01" />
        </svg>
      ),
    },
    {
      id: "passkey",
      label: "Passkey",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 18v3c0 .6.4 1 1 1h4v-3h3v-3h2l1.4-1.4a6.5 6.5 0 1 0-4-4Z" />
          <circle cx="16.5" cy="7.5" r=".5" />
        </svg>
      ),
    },
  ];

  const loadTotpSetup = async () => {
    setLoadingSetup(true);
    try {
      const data = await authApi.totpSetup();
      setTotpData(data);
      setTotpCode("");
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Could not load setup.");
    } finally {
      setLoadingSetup(false);
    }
  };

  const handleTabClick = (tab: TwoFaTab) => {
    setActiveTab(tab);
    if (tab === "totp" && currentMethod !== "totp" && !totpData) {
      loadTotpSetup();
    }
  };

  const handleEnableTotp = async () => {
    if (!totpData || totpCode.length !== 6) return;
    setEnablingTotp(true);
    try {
      const res = await authApi.totpEnable({ secret: totpData.secret, code: totpCode });
      setUser(res.user as any);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("userData", JSON.stringify(res.user));
      }
      toast.success("Authenticator app enabled! Future logins will use your app.");
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Could not enable authenticator.");
    } finally {
      setEnablingTotp(false);
    }
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      const res = await authApi.twoFaDisable();
      setUser(res.user as any);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("userData", JSON.stringify(res.user));
      }
      setTotpData(null);
      setTotpCode("");
      toast.success("Switched back to email OTP.");
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Could not disable.");
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    if (!totpData) return;
    navigator.clipboard.writeText(totpData.secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  return (
    <SectionCard
      title="Sign-in Methods"
      description="Choose how you verify your identity when signing in."
    >
      {/* Current method badge */}
      <div className="mb-5 flex items-center gap-2">
        <span className="text-sm" style={{ color: "rgba(11,31,42,0.55)" }}>Active:</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: currentMethod === "email_otp" ? "rgba(217,119,87,0.1)" : "rgba(34,197,94,0.1)",
            color: currentMethod === "email_otp" ? brand : "#16a34a",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {currentMethod === "email_otp" ? "Email OTP" : currentMethod === "totp" ? "Authenticator App" : "Passkey"}
        </span>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl p-1 mb-6" style={{ background: cream }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 px-2 text-xs sm:text-sm font-medium transition-all duration-200"
            style={{
              background: activeTab === tab.id ? "#fff" : "transparent",
              color: activeTab === tab.id ? navy : "rgba(11,31,42,0.5)",
              boxShadow: activeTab === tab.id ? "0 1px 4px rgba(11,31,42,0.08)" : undefined,
            }}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Email OTP tab ── */}
      {activeTab === "email_otp" && (
        <div className="space-y-4">
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: cream, border: "1px solid rgba(11,31,42,0.07)" }}
          >
            <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center" style={{ background: "rgba(217,119,87,0.12)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: navy }}>
                Email OTP {currentMethod === "email_otp" && <span className="ml-2 text-xs font-normal" style={{ color: brand }}>✓ Active</span>}
              </p>
              <p className="mt-1 text-sm" style={{ color: "rgba(11,31,42,0.55)" }}>
                A one-time code is emailed to <strong>{user?.email}</strong> on every sign-in. No extra setup needed.
              </p>
            </div>
          </div>
          {currentMethod === "totp" && (
            <button type="button" onClick={handleDisable} disabled={disabling} className="text-sm font-medium underline underline-offset-2 disabled:opacity-60" style={{ color: brand }}>
              {disabling ? "Switching…" : "Switch back to Email OTP"}
            </button>
          )}
        </div>
      )}

      {/* ── Authenticator tab ── */}
      {activeTab === "totp" && (
        <div className="space-y-5">
          {currentMethod === "totp" ? (
            <div className="flex items-start gap-3 rounded-xl p-4" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)" }}>
              <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center bg-green-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800">Authenticator app is active</p>
                <p className="mt-1 text-sm text-green-700">You're protected with a TOTP app. Remove it below to switch methods.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm" style={{ color: "rgba(11,31,42,0.6)" }}>
                Use Google Authenticator, Authy, or any TOTP-compatible app. Scan the QR or enter the secret manually.
              </p>
              {loadingSetup ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-7 w-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: brand }} />
                </div>
              ) : totpData ? (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="shrink-0 rounded-2xl p-3 border" style={{ background: "#fff", borderColor: "rgba(11,31,42,0.1)" }}>
                      <img src={totpData.qrDataUri} alt="TOTP QR" width={160} height={160} className="rounded-lg" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(11,31,42,0.4)" }}>Secret key</p>
                      <div className="flex items-center gap-2 rounded-xl p-3" style={{ background: cream, border: "1px solid rgba(11,31,42,0.1)" }}>
                        <code className="flex-1 text-sm font-mono break-all select-all" style={{ color: navy }}>{totpData.secret}</code>
                        <button type="button" onClick={copySecret} className="shrink-0 rounded-lg p-1.5" style={{ color: secretCopied ? "#16a34a" : brand }} aria-label="Copy">
                          {secretCopied
                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                          }
                        </button>
                      </div>
                      <p className="text-xs" style={{ color: "rgba(11,31,42,0.45)" }}>After scanning, enter the 6-digit code to verify and enable.</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block" style={{ color: navy }}>Verification code</Label>
                    <div className="flex gap-3">
                      <Input value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} inputMode="numeric" className="rounded-xl font-mono text-center text-xl tracking-[0.5em] max-w-[160px]" style={{ borderColor: "rgba(11,31,42,0.15)", color: navy }} />
                      <PrimaryBtn loading={enablingTotp} disabled={totpCode.length !== 6} onClick={handleEnableTotp}>Enable</PrimaryBtn>
                    </div>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={loadTotpSetup} className="text-sm underline" style={{ color: brand }}>Load setup</button>
              )}
            </>
          )}
          {currentMethod === "totp" && (
            <button type="button" onClick={handleDisable} disabled={disabling} className="text-sm font-medium underline underline-offset-2 disabled:opacity-60" style={{ color: "rgba(11,31,42,0.5)" }}>
              {disabling ? "Disabling…" : "Remove authenticator app"}
            </button>
          )}
        </div>
      )}

      {/* ── Passkey tab ── */}
      {activeTab === "passkey" && user && <PasskeyTabContent userId={user.id} />}
    </SectionCard>
  );
}

// ── Delete account section ─────────────────────────────────────────────────────
function DeleteSection() {
  const { user, setUser, setAccessToken } = useUser();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const isOAuth = user?.hasPassword === false;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await authApi.deleteAccount(isOAuth ? "" : password);
      clearSession();
      setUser(null);
      setAccessToken(null);
      toast.success("Your account has been deleted.");
      router.replace("/");
    } catch (err: any) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete account.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SectionCard title="Danger Zone">
      <div
        className="rounded-xl p-5"
        style={{ border: "1.5px solid rgba(220,38,38,0.2)", background: "rgba(254,242,242,0.5)" }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Delete account</p>
            <p className="mt-0.5 text-sm text-red-600/80">
              Permanently remove your account and all associated data. This cannot be undone.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="shrink-0 h-9 rounded-full px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "rgb(220,38,38)" }}
              >
                Delete account
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is permanent. Your account, trips, and all personal data will be deleted immediately and cannot be recovered.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {!isOAuth && (
                <div className="py-2">
                  <Label className="text-sm font-medium mb-1.5 block" style={{ color: navy }}>
                    Confirm your password
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="rounded-xl"
                    style={{ borderColor: "rgba(220,38,38,0.3)" }}
                  />
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting || (!isOAuth && !password)}
                  className="rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? "Deleting…" : "Yes, delete my account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────────────
export default function ProfileSettingsPage() {
  const { user, accessToken } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (accessToken === null && user === null) {
      router.replace("/sign-in?next=/profile/settings");
    }
  }, [accessToken, user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: cream }}>
        <div className="h-7 w-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: brand }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: cream }}>
      <ToastContainer position="top-right" theme="light" />

      {/* Header */}
      <div
        className="border-b px-4 sm:px-8 py-5"
        style={{ borderColor: "rgba(11,31,42,0.07)", background: "#fff" }}
      >
        <div className="mx-auto max-w-2xl">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm mb-3"
            style={{ color: "rgba(11,31,42,0.45)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back
          </a>
          <h1 className="text-[22px] font-bold" style={{ color: navy }}>
            Account Settings
          </h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(11,31,42,0.5)" }}>
            Manage your profile, security, and account preferences.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 sm:px-8 py-8 space-y-6">
        <ProfileSection />
        {/* Sign-in methods only make sense for password-based accounts */}
        {user.hasPassword && <TwoFaSection />}
        <DeleteSection />
      </div>
    </div>
  );
}
