"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Flag,
  LogOut,
  RefreshCw,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

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
  const [tab, setTab] = useState<"pending" | "resolved" | "all">("pending");
  const [loading, setLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    report: Report;
    action: "takedown" | "keep";
  } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReports = useCallback(
    async (statusFilter: string) => {
      if (!token) return;
      setLoading(true);
      try {
        const params =
          statusFilter !== "all" ? `?status=${statusFilter}` : "";
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/travel-blog/admin/reports${params}`,
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
        `${process.env.NEXT_PUBLIC_URL}/api/travel-blog/admin/reports/${actionDialog.report.id}/action`,
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
          ? "Post taken down successfully."
          : "Post kept — report resolved."
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

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  if (!token) return null;

  return (
    <div className="min-h-screen bg-[color:var(--color-cream)]">
      {/* Floating toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg text-sm font-medium ${
            toast.type === "ok"
              ? "bg-[color:var(--color-navy)] text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "ok" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[color:var(--color-brand)] flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-[color:var(--color-navy)] text-sm">
                Velosta Admin
              </span>
              <p className="text-xs text-muted-foreground">
                Content moderation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchReports(tab)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                localStorage.removeItem("adminToken");
                router.replace("/admin/login");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-3">
          <Card className="border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[color:var(--color-navy)]">
                    {reports.filter((r) => r.status === "pending").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[color:var(--color-navy)]">
                    {
                      reports.filter((r) => r.adminAction === "takedown")
                        .length
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">Taken down</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border sm:block hidden">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[color:var(--color-navy)]">
                    {reports.filter((r) => r.adminAction === "keep").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Kept</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter tabs */}
        <div className="mb-6">
          <Tabs
            value={tab}
            onValueChange={(v) =>
              setTab(v as "pending" | "resolved" | "all")
            }
          >
            <TabsList className="bg-[color:var(--color-sand)]">
              <TabsTrigger value="pending">
                Pending
                {pendingCount > 0 && (
                  <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-brand)] text-white text-xs font-bold">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 border-2 border-[color:var(--color-brand)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-20">
            <Flag className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No reports found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <ReportCard
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
          </div>
        )}
      </main>

      {/* Action confirmation dialog */}
      <Dialog
        open={!!actionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setActionDialog(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              className={
                actionDialog?.action === "takedown"
                  ? "text-red-600"
                  : "text-green-700"
              }
            >
              {actionDialog?.action === "takedown"
                ? "Take down this post"
                : "Keep this post"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === "takedown"
                ? "The post will be hidden from all users immediately. All other pending reports for this post will also be resolved."
                : "The post will remain visible. The report will be marked as resolved."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <div className="rounded-lg bg-[color:var(--color-sand)] px-4 py-3 text-sm">
              <p className="font-medium text-[color:var(--color-navy)] line-clamp-2">
                {actionDialog?.report.blogTitle ?? "Untitled"}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Reported for:{" "}
                {REASON_LABELS[actionDialog?.report.reason ?? ""] ??
                  actionDialog?.report.reason}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-note" className="text-sm">
                Internal note{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="admin-note"
                placeholder="Add a note for audit purposes..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                maxLength={500}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setActionDialog(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading}
              className={
                actionDialog?.action === "takedown"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : actionDialog?.action === "takedown" ? (
                "Take down post"
              ) : (
                "Keep post"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReportCard({
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

  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-0">
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Blog title */}
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[color:var(--color-navy)] truncate text-sm">
                  {report.blogTitle ?? "Untitled post"}
                </p>
                {report.blogAuthorName && (
                  <span className="text-xs text-muted-foreground">
                    by {report.blogAuthorName}
                  </span>
                )}
                <a
                  href={`/how-not-travel/${report.blogId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-[color:var(--color-brand)] transition-colors"
                  title="Open post"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Reason + date */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  variant="secondary"
                  className="text-xs bg-[color:var(--color-sand)] text-[color:var(--color-navy)]"
                >
                  <Flag className="h-3 w-3 mr-1" />
                  {REASON_LABELS[report.reason] ?? report.reason}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(report.createdAt).toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {!isPending && (
                  <Badge
                    className={`text-xs ${
                      report.adminAction === "takedown"
                        ? "bg-red-100 text-red-700 border-red-200"
                        : "bg-green-100 text-green-700 border-green-200"
                    }`}
                    variant="outline"
                  >
                    {report.adminAction === "takedown"
                      ? "Taken down"
                      : "Kept"}
                  </Badge>
                )}
                {isPending && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                  >
                    Pending review
                  </Badge>
                )}
              </div>
            </div>

            {/* Action buttons for pending reports */}
            {isPending && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onKeep}
                  className="text-green-700 border-green-200 hover:bg-green-50 text-xs h-8"
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Keep
                </Button>
                <Button
                  size="sm"
                  onClick={onTakedown}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Take down
                </Button>
              </div>
            )}
          </div>

          {/* Expand for details */}
          {(report.description || report.adminNote) && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}
        </div>

        {expanded &&
          (report.description || report.adminNote) && (
            <>
              <Separator />
              <div className="px-5 py-4 space-y-3 bg-[color:var(--color-sand)]/30">
                {report.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Reporter note
                    </p>
                    <p className="text-sm text-foreground">{report.description}</p>
                  </div>
                )}
                {report.adminNote && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Admin note
                    </p>
                    <p className="text-sm text-foreground">{report.adminNote}</p>
                  </div>
                )}
              </div>
            </>
          )}
      </CardContent>
    </Card>
  );
}
