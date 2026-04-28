"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import { ChevronDown, ExternalLink, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const playfair = Playfair_Display({ subsets: ["latin"] });

type Report = {
  id: string;
  blogId: string;
  blogTitle: string | null;
  blogAuthorName: string | null;
  reporterUserId: string;
  reason: string;
  description: string | null;
  status: "pending" | "resolved";
  adminAction: "takedown" | "keep" | null;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

const REASON_LABELS: Record<string, string> = {
  misleading: "Misleading",
  sexual_content: "Sexual content",
  hate_speech: "Hate speech",
  spam: "Spam",
  violence: "Violence",
  misinformation: "Misinformation",
  other: "Other",
};

type Tab = "pending" | "resolved" | "all";

function useAdminToken() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t =
      typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
    if (!t) {
      router.replace("/admin/login");
    } else {
      setToken(t);
    }
  }, [router]);

  return token;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const token = useAdminToken();

  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    report: Report;
    action: "takedown" | "keep";
  } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(
    null
  );

  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const takedownCount = reports.filter(
    (r) => r.adminAction === "takedown"
  ).length;
  const keptCount = reports.filter((r) => r.adminAction === "keep").length;

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReports = useCallback(
    async (statusFilter: string) => {
      if (!token) return;
      setLoading(true);
      try {
        const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/travel-blog/admin/reports${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.status === 401) {
          localStorage.removeItem("adminToken");
          router.replace("/admin/login");
          return;
        }
        const json = await res.json();
        setReports(json?.data?.reports ?? json?.reports ?? []);
      } catch {
        showToast("Failed to load reports.", "err");
      } finally {
        setLoading(false);
      }
    },
    [token, router]
  );

  useEffect(() => {
    if (token) fetchReports(tab);
  }, [token, tab, fetchReports]);

  const handleAction = async () => {
    if (!actionDialog || !token) return;
    setActionLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/travel-blog/admin/reports/${actionDialog.report.id}/action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: actionDialog.action,
            note: adminNote.trim() || null,
          }),
        }
      );
      if (!res.ok) throw new Error();
      showToast(
        actionDialog.action === "takedown"
          ? "Post taken down."
          : "Report resolved — post kept."
      );
      setActionDialog(null);
      setAdminNote("");
      fetchReports(tab);
    } catch {
      showToast("Action failed. Please try again.", "err");
    } finally {
      setActionLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium border"
          style={{
            backgroundColor:
              toast.type === "ok" ? "var(--color-navy)" : "#8B2E1A",
            color: "var(--color-cream)",
            borderColor: "transparent",
            boxShadow: "0 12px 32px -16px rgba(11,31,42,0.4)",
          }}
          role="status"
        >
          {toast.msg}
        </div>
      )}

      {/* Header pill — matches main navbar */}
      <header className="sticky top-0 z-40 px-4 sm:px-6 pt-4">
        <div
          className="mx-auto max-w-6xl flex items-center justify-between rounded-full border px-5 py-2.5 backdrop-blur-md"
          style={{
            backgroundColor: "rgba(245,239,230,0.78)",
            borderColor: "rgba(11,31,42,0.06)",
            boxShadow: "0 1px 2px rgba(11,31,42,0.04)",
          }}
        >
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={`${playfair.className} text-[22px] tracking-tight leading-none`}
              style={{ color: "var(--color-navy)" }}
            >
              Velosta
            </Link>
            <span
              className="hidden sm:inline-block h-4 w-px"
              style={{ backgroundColor: "rgba(11,31,42,0.15)" }}
              aria-hidden
            />
            <span
              className="hidden sm:inline-block text-[10px] uppercase tracking-[0.22em] font-medium"
              style={{ color: "var(--color-teal)" }}
            >
              Administration
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fetchReports(tab)}
              disabled={loading}
              aria-label="Refresh"
              className="h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-50"
              style={{ color: "rgba(11,31,42,0.6)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "rgba(11,31,42,0.05)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("adminToken");
                router.replace("/admin/login");
              }}
              className="h-8 inline-flex items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors"
              style={{ color: "rgba(11,31,42,0.65)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(11,31,42,0.05)";
                e.currentTarget.style.color = "var(--color-navy)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "rgba(11,31,42,0.65)";
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-16">
        <div className="mb-10">
          <span
            className="text-[10px] uppercase tracking-[0.24em] font-medium"
            style={{ color: "var(--color-teal)" }}
          >
            Moderation queue
          </span>
          <h1
            className={`${playfair.className} text-[40px] sm:text-[48px] leading-[1.1] tracking-tight mt-2`}
            style={{ color: "var(--color-navy)" }}
          >
            Reported stories
          </h1>
          <p
            className="text-[14px] mt-3 max-w-xl leading-relaxed"
            style={{ color: "rgba(11,31,42,0.6)" }}
          >
            Review traveller-submitted reports and decide whether each story
            stays published or is taken down. All decisions are logged.
          </p>
        </div>

        {/* Stat strip */}
        <div
          className="grid grid-cols-3 gap-px rounded-2xl border overflow-hidden mb-10"
          style={{
            borderColor: "rgba(11,31,42,0.08)",
            backgroundColor: "rgba(11,31,42,0.06)",
          }}
        >
          <Stat label="Pending" value={pendingCount} accent="brand" />
          <Stat label="Taken down" value={takedownCount} accent="navy" />
          <Stat label="Kept" value={keptCount} accent="teal" />
        </div>

        {/* Segmented filter */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div
            className="inline-flex items-center rounded-full border p-1"
            style={{
              borderColor: "rgba(11,31,42,0.1)",
              backgroundColor: "rgba(255,255,255,0.6)",
            }}
            role="tablist"
          >
            {(
              [
                { value: "pending", label: "Pending", count: pendingCount },
                { value: "resolved", label: "Resolved", count: null },
                { value: "all", label: "All", count: null },
              ] as { value: Tab; label: string; count: number | null }[]
            ).map((t) => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.value)}
                  className="h-8 px-4 rounded-full text-[12px] font-medium tracking-wide transition-colors flex items-center gap-2"
                  style={{
                    backgroundColor: active
                      ? "var(--color-navy)"
                      : "transparent",
                    color: active
                      ? "var(--color-cream)"
                      : "rgba(11,31,42,0.6)",
                  }}
                >
                  {t.label}
                  {t.count !== null && t.count > 0 && (
                    <span
                      className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: active
                          ? "var(--color-brand)"
                          : "rgba(11,31,42,0.08)",
                        color: active
                          ? "var(--color-cream)"
                          : "var(--color-navy)",
                      }}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div
              className="h-7 w-7 border-2 rounded-full animate-spin"
              style={{
                borderColor: "rgba(11,31,42,0.15)",
                borderTopColor: "var(--color-navy)",
              }}
            />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onTakedown={() => {
                  setAdminNote("");
                  setActionDialog({ report, action: "takedown" });
                }}
                onKeep={() => {
                  setAdminNote("");
                  setActionDialog({ report, action: "keep" });
                }}
              />
            ))}
          </ul>
        )}
      </main>

      <Dialog
        open={!!actionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md border-[rgba(11,31,42,0.08)]"
          style={{ backgroundColor: "var(--color-cream)" }}
        >
          <DialogHeader>
            <DialogTitle
              className={`${playfair.className} text-[22px] leading-tight`}
              style={{ color: "var(--color-navy)" }}
            >
              {actionDialog?.action === "takedown"
                ? "Take down this story?"
                : "Keep this story published?"}
            </DialogTitle>
            <DialogDescription
              className="text-[13px] leading-relaxed"
              style={{ color: "rgba(11,31,42,0.6)" }}
            >
              {actionDialog?.action === "takedown"
                ? "The story will be hidden from all readers immediately, and any other pending reports for it will be auto-resolved."
                : "The story stays published. This report will be marked resolved with no action taken."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <div
              className="rounded-lg border px-4 py-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.7)",
                borderColor: "rgba(11,31,42,0.08)",
              }}
            >
              <p
                className="text-[14px] font-medium leading-snug line-clamp-2"
                style={{ color: "var(--color-navy)" }}
              >
                {actionDialog?.report.blogTitle ?? "Untitled story"}
              </p>
              <p
                className="text-[11px] uppercase tracking-[0.18em] mt-2 font-medium"
                style={{ color: "var(--color-teal)" }}
              >
                Reason ·{" "}
                {REASON_LABELS[actionDialog?.report.reason ?? ""] ??
                  actionDialog?.report.reason}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="admin-note"
                className="text-[12px] font-medium"
                style={{ color: "rgba(11,31,42,0.7)" }}
              >
                Internal note{" "}
                <span style={{ color: "rgba(11,31,42,0.4)" }}>(optional)</span>
              </Label>
              <Textarea
                id="admin-note"
                placeholder="Reasoning for audit log…"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                maxLength={500}
                rows={2}
                className="resize-none bg-white border-[rgba(11,31,42,0.12)] focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-0 text-[13px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setActionDialog(null)}
              disabled={actionLoading}
              className="rounded-full h-10 px-5 border-[rgba(11,31,42,0.15)] bg-transparent hover:bg-[rgba(11,31,42,0.04)]"
              style={{ color: "rgba(11,31,42,0.7)" }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading}
              className="rounded-full h-10 px-5 font-medium disabled:opacity-60"
              style={{
                backgroundColor:
                  actionDialog?.action === "takedown"
                    ? "var(--color-brand-dark)"
                    : "var(--color-navy)",
                color: "var(--color-cream)",
              }}
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing
                </span>
              ) : actionDialog?.action === "takedown" ? (
                "Take down"
              ) : (
                "Keep published"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────── Sub-components ─────────── */

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "brand" | "navy" | "teal";
}) {
  const accentColor =
    accent === "brand"
      ? "var(--color-brand)"
      : accent === "teal"
        ? "var(--color-teal)"
        : "var(--color-navy)";

  return (
    <div
      className="px-6 py-5 sm:px-7 sm:py-6"
      style={{ backgroundColor: "var(--color-cream)" }}
    >
      <div className="flex items-baseline gap-2">
        <span
          className="text-[32px] sm:text-[36px] font-semibold leading-none tracking-tight"
          style={{ color: "var(--color-navy)" }}
        >
          {value}
        </span>
        <span
          className="h-1 w-1 rounded-full inline-block"
          style={{ backgroundColor: accentColor }}
          aria-hidden
        />
      </div>
      <p
        className="text-[10px] uppercase tracking-[0.22em] font-medium mt-2"
        style={{ color: "rgba(11,31,42,0.55)" }}
      >
        {label}
      </p>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const message =
    tab === "pending"
      ? "Nothing awaiting review. The queue is clear."
      : tab === "resolved"
        ? "No resolved reports yet."
        : "No reports on record.";
  return (
    <div
      className="rounded-2xl border py-20 px-6 text-center"
      style={{
        borderColor: "rgba(11,31,42,0.08)",
        borderStyle: "dashed",
        backgroundColor: "rgba(255,255,255,0.4)",
      }}
    >
      <p
        className={`${playfair.className} text-[20px] leading-tight`}
        style={{ color: "var(--color-navy)" }}
      >
        All quiet
      </p>
      <p className="text-[13px] mt-2" style={{ color: "rgba(11,31,42,0.55)" }}>
        {message}
      </p>
    </div>
  );
}

function ReportRow({
  report,
  onTakedown,
  onKeep,
}: {
  report: Report;
  onTakedown: () => void;
  onKeep: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = report.status === "pending";
  const hasDetails = !!(report.description || report.adminNote);

  return (
    <li
      className="rounded-2xl border bg-white overflow-hidden transition-shadow"
      style={{
        borderColor: "rgba(11,31,42,0.08)",
        boxShadow: "0 1px 2px rgba(11,31,42,0.03)",
      }}
    >
      <div className="px-5 sm:px-6 py-5">
        <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <StatusPill report={report} />
              <ReasonPill reason={report.reason} />
              <span
                className="text-[11px]"
                style={{ color: "rgba(11,31,42,0.45)" }}
              >
                {new Date(report.createdAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`${playfair.className} text-[18px] leading-snug truncate`}
                style={{ color: "var(--color-navy)" }}
              >
                {report.blogTitle ?? "Untitled story"}
              </h3>
              <a
                href={`/how-not-travel/${report.blogId}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open story in new tab"
                className="inline-flex items-center justify-center h-6 w-6 rounded-full transition-colors"
                style={{ color: "rgba(11,31,42,0.45)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(11,31,42,0.05)";
                  e.currentTarget.style.color = "var(--color-navy)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "rgba(11,31,42,0.45)";
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            {report.blogAuthorName && (
              <p
                className="text-[12px] mt-1"
                style={{ color: "rgba(11,31,42,0.55)" }}
              >
                by {report.blogAuthorName}
              </p>
            )}
          </div>

          {isPending && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={onKeep}
                className="h-9 px-4 rounded-full text-[12px] font-medium tracking-wide border transition-colors"
                style={{
                  borderColor: "rgba(11,31,42,0.15)",
                  color: "var(--color-navy)",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(11,31,42,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                Keep
              </button>
              <button
                type="button"
                onClick={onTakedown}
                className="h-9 px-4 rounded-full text-[12px] font-medium tracking-wide transition-colors"
                style={{
                  backgroundColor: "var(--color-brand-dark)",
                  color: "var(--color-cream)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#9C4D34")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--color-brand-dark)")
                }
              >
                Take down
              </button>
            </div>
          )}
        </div>

        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] font-medium mt-4 transition-colors"
            style={{ color: "rgba(11,31,42,0.5)" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--color-navy)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(11,31,42,0.5)")
            }
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
            {expanded ? "Hide details" : "Show details"}
          </button>
        )}
      </div>

      {expanded && hasDetails && (
        <>
          <Separator style={{ backgroundColor: "rgba(11,31,42,0.06)" }} />
          <div
            className="px-5 sm:px-6 py-5 space-y-4"
            style={{ backgroundColor: "rgba(245,239,230,0.4)" }}
          >
            {report.description && (
              <DetailBlock label="Reporter note" content={report.description} />
            )}
            {report.adminNote && (
              <DetailBlock label="Admin note" content={report.adminNote} />
            )}
          </div>
        </>
      )}
    </li>
  );
}

function StatusPill({ report }: { report: Report }) {
  const isPending = report.status === "pending";
  const isTakedown = report.adminAction === "takedown";

  let bg = "rgba(217,119,87,0.1)";
  let fg = "var(--color-brand-dark)";
  let label = "Pending review";

  if (!isPending) {
    if (isTakedown) {
      bg = "rgba(11,31,42,0.85)";
      fg = "var(--color-cream)";
      label = "Taken down";
    } else {
      bg = "rgba(47,111,115,0.1)";
      fg = "var(--color-teal)";
      label = "Kept";
    }
  }

  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-full text-[10px] uppercase tracking-[0.16em] font-semibold"
      style={{ backgroundColor: bg, color: fg }}
    >
      {label}
    </span>
  );
}

function ReasonPill({ reason }: { reason: string }) {
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium"
      style={{
        backgroundColor: "var(--color-sand)",
        color: "var(--color-navy)",
      }}
    >
      {REASON_LABELS[reason] ?? reason}
    </span>
  );
}

function DetailBlock({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-1.5"
        style={{ color: "var(--color-teal)" }}
      >
        {label}
      </p>
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "rgba(11,31,42,0.85)" }}
      >
        {content}
      </p>
    </div>
  );
}
