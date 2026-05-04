"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { Bell, Pencil, Trash2, Plus, Download, UserPlus, Smartphone, Check, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { getPushDiagnostics, isPushSupported, subscribeToPush } from "@/lib/push-client";
import { formatChildAge, formatDate } from "@/lib/utils";
import { STRIPE_CONFIGURED } from "@/lib/stripe-client";

type PersonRole = "PARENT" | "CARETAKER" | "BABYSITTER";

const roleOptions: { value: PersonRole; label: string }[] = [
  { value: "PARENT", label: "Parent" },
  { value: "CARETAKER", label: "Caretaker" },
  { value: "BABYSITTER", label: "Babysitter" },
];

const roleLabels: Record<PersonRole, string> = {
  PARENT: "Parent",
  CARETAKER: "Caretaker",
  BABYSITTER: "Babysitter",
};

async function api(url: string, method = "GET", body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }
  return res.json();
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { selectedChildId, setSelectedChildId } = useAppStore();
  const { data: session, update: updateSession } = useSession();

  const { data: user } = useQuery({ queryKey: ["user"], queryFn: () => api("/api/user/me") });
  const { data: children = [] } = useQuery({ queryKey: ["children"], queryFn: () => api("/api/children") });
  const { data: vapid } = useQuery({ queryKey: ["notifications", "vapid"], queryFn: () => api("/api/notifications/vapid-key") });
  const { data: notificationPreferences } = useQuery({
    queryKey: ["notifications", "preferences", selectedChildId],
    queryFn: () => api(`/api/notifications/preferences?childId=${selectedChildId}`),
    enabled: !!selectedChildId,
  });

  const [editName, setEditName] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildDob, setNewChildDob] = useState("");
  const [editingChild, setEditingChild] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState("");
  const [editChildDob, setEditChildDob] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [accountDeleteConfirm, setAccountDeleteConfirm] = useState(false);
  const [showInvite, setShowInvite] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PersonRole>("CARETAKER");
  const [exportingChild, setExportingChild] = useState<string | null>(null);
  const [exportRange, setExportRange] = useState<string>("last30");
  const [exportFormat, setExportFormat] = useState<string>("xlsx");
  const [exportFrom, setExportFrom] = useState<string>("");
  const [exportTo, setExportTo] = useState<string>("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [notificationDebug, setNotificationDebug] = useState<string | null>(null);
  const [feedInterval, setFeedInterval] = useState(120);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    setNotificationPermission(isPushSupported() ? Notification.permission : "unsupported");
  }, []);

  useEffect(() => {
    if (notificationPreferences?.feedReminderIntervalMinutes) {
      setFeedInterval(notificationPreferences.feedReminderIntervalMinutes);
    }
  }, [notificationPreferences?.feedReminderIntervalMinutes]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      toast.success("Payment successful! Updating your account...");
      updateSession({});
      window.history.replaceState({}, "", "/settings");
    } else if (params.get("payment") === "cancel") {
      toast.error("Payment was cancelled.");
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const updateProfile = useMutation({
    mutationFn: (data: { name?: string; designation?: PersonRole; currentPassword?: string; password?: string }) => api("/api/user/me", "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Profile updated");
      setOldPassword("");
      setNewPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteAccount = useMutation({
    mutationFn: () => api("/api/user/me", "DELETE"),
    onSuccess: () => { signOut({ callbackUrl: "/login" }); },
    onError: (e) => toast.error(e.message),
  });

  const createChild = useMutation({
    mutationFn: (data: { name: string; birthDate: string }) => api("/api/children", "POST", data),
    onSuccess: (child) => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      if (!selectedChildId) setSelectedChildId(child.id);
      setShowAddChild(false);
      setNewChildName("");
      setNewChildDob("");
      toast.success("Child added!");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateChild = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; birthDate?: string }) => api(`/api/children/${id}`, "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      setEditingChild(null);
      toast.success("Child updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteChild = useMutation({
    mutationFn: (id: string) => api(`/api/children/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      setDeleteConfirm(null);
      toast.success("Child removed");
    },
    onError: (e) => toast.error(e.message),
  });

  const sendInvite = useMutation({
    mutationFn: ({ childId, email, role }: { childId: string; email: string; role: string }) =>
      api(`/api/children/${childId}/shares`, "POST", { email, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      setShowInvite(null);
      setInviteEmail("");
      toast.success("Invite sent!");
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeShare = useMutation({
    mutationFn: ({ childId, shareId }: { childId: string; shareId: string }) =>
      api(`/api/children/${childId}/shares/${shareId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shares"] });
      toast.success("Access revoked");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateNotificationPreferences = useMutation({
    mutationFn: (data: {
      childId: string;
      noteAttentionEnabled?: boolean;
      feedReminderEnabled?: boolean;
      feedReminderIntervalMinutes?: number;
    }) => api("/api/notifications/preferences", "PATCH", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
      toast.success("Notification settings updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const enableNotifications = async () => {
    if (!vapid?.configured || !vapid?.publicKey) {
      toast.error("Push notifications are not configured on the server");
      return;
    }

    const permissionPromise = Notification.requestPermission();

    setIsSubscribing(true);
    setNotificationDebug(null);
    try {
      const subscription = await subscribeToPush(vapid.publicKey, permissionPromise);
      await api("/api/notifications/subscribe", "POST", subscription.toJSON());
      setNotificationPermission(Notification.permission);
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
      toast.success("Notifications enabled on this device");
    } catch (error: any) {
      const diagnostic = await getPushDiagnostics().catch(() => null);
      if (diagnostic) {
        setNotificationDebug([
          `Registration: ${diagnostic.registrationExists || "none"}`,
          `Active: ${diagnostic.activeState || "none"}`,
          `Installing: ${diagnostic.installingState || "none"}`,
          `Waiting: ${diagnostic.waitingState || "none"}`,
          `Controller: ${diagnostic.controllerState || "none"}`,
          `Permission: ${diagnostic.notificationPermission || "none"}`,
        ].join(" | "));
      }
      toast.error(error.message || "Could not enable notifications");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to start checkout");
      }
    } catch (err: any) {
      toast.error(err.message || "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getExportDates = () => {
    const now = new Date();
    if (exportRange === "custom" && exportFrom) {
      return {
        from: new Date(exportFrom),
        to: exportTo ? new Date(new Date(exportTo).getTime() + 86400000) : undefined,
      };
    }
    if (exportRange === "last30") {
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), to: undefined };
    }
    if (exportRange === "month") {
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: undefined };
    }
    return { from: undefined, to: undefined };
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString();
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString();
  const fmtDiaper = (t: string | null) => t === "PEE" ? "Pee" : t === "POOP" ? "Poop" : t === "BOTH" ? "Pee + Poop" : "";
  const fmtSide = (s: string | null) => s === "LEFT" ? "Left" : s === "RIGHT" ? "Right" : s === "BOTH" ? "Both" : s || "";

  const handleExport = async (childId: string, childName: string) => {
    setExportingChild(childId);
    try {
      const { from, to } = getExportDates();
      const params = new URLSearchParams();
      if (from) params.set("from", from.toISOString());
      if (to) params.set("to", to.toISOString());

      const data = await api(`/api/export/${childId}?${params.toString()}`);

      const rangeLabel = exportRange === "custom" ? "custom" : exportRange === "month" ? "this-month" : exportRange === "last30" ? "last-30-days" : "all-time";

      if (exportFormat === "csv") {
        const rows: string[][] = [
          ["Date", "Time", "Type", "Amount", "Unit", "Side", "Food Name", "Diaper Type", "Duration (min)", "Notes", "Logged By"],
        ];
        const addRows = (items: any[], type: string, map: (l: any) => string[]) => {
          items.forEach((l) => rows.push(map(l)));
        };
        addRows(data.feeds, "Feed", (l: any) => [fmtDate(l.occurredAt), fmtTime(l.occurredAt), "Feed", l.feedAmount || "", l.feedUnit || "", "", l.foodName || "", "", "", l.notes || "", l.userName || ""]);
        addRows(data.diapers, "Diaper", (l: any) => [fmtDate(l.occurredAt), fmtTime(l.occurredAt), "Diaper", "", "", "", "", fmtDiaper(l.diaperType), "", l.notes || "", l.userName || ""]);
        addRows(data.wakes, "Wake", (l: any) => [fmtDate(l.occurredAt), fmtTime(l.occurredAt), "Wake", "", "", "", "", "", "", l.notes || "", l.userName || ""]);
        addRows(data.nurses, "Nurse", (l: any) => [fmtDate(l.occurredAt), fmtTime(l.occurredAt), "Nurse", "", "", fmtSide(l.nurseSide), "", "", String(l.nurseDuration || ""), l.notes || "", l.userName || ""]);
        addRows(data.pumps, "Pump", (l: any) => [fmtDate(l.occurredAt), fmtTime(l.occurredAt), "Pump", l.pumpAmount || "", l.pumpUnit || "", fmtSide(l.pumpSide), "", "", "", l.notes || "", l.userName || ""]);
        addRows(data.sleeps || [], "Sleep", (l: any) => [fmtDate(l.occurredAt), fmtTime(l.occurredAt), "Sleep", "", "", "", "", "", l.durationMinutes != null ? String(l.durationMinutes) : "", l.notes || "", l.userName || ""]);
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cribnotes-${childName}-${rangeLabel}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();

        const summarySheet = wb.addWorksheet("Summary");
        summarySheet.addRow(["CribNotes — " + childName + " Export"]);
        summarySheet.addRow(["Generated: " + new Date().toLocaleDateString()]);
        summarySheet.addRow(["Date Range: " + (data.summary.dateRange || "All time")]);
        summarySheet.addRow([]);
        summarySheet.addRow(["Metric", "Value"]);
        summarySheet.addRow(["Total Feeds", data.summary.totalFeeds]);
        summarySheet.addRow(["Total Volume", data.summary.totalVolume + " oz"]);
        summarySheet.addRow(["Avg Feeds/Day", data.summary.avgFeedsPerDay?.toFixed(1) || "0"]);
        summarySheet.addRow(["Avg Feed Volume", (data.summary.avgFeedVolume || 0) + " oz"]);
        summarySheet.addRow(["Diaper Changes", data.summary.totalDiapers]);
        summarySheet.addRow(["Wake Events", data.summary.totalWakes]);
        summarySheet.addRow(["Nursing Sessions", data.summary.totalNurses]);
        summarySheet.addRow(["Total Nurse Minutes", data.summary.totalNurseMinutes]);
        summarySheet.addRow(["Avg Nurse Duration", (data.summary.avgNurseMinutes || 0).toFixed(1) + " min"]);
        summarySheet.addRow(["Pump Sessions", data.summary.totalPumps]);
        summarySheet.addRow(["Total Pump Volume", data.summary.totalPumpVolume + " oz"]);
        summarySheet.addRow(["Sleep Entries", data.summary.totalSleeps]);
        summarySheet.addRow(["Total Sleep (hrs)", data.summary.totalSleepHours]);
        for (let i = 1; i <= 4; i++) {
          const row = summarySheet.getRow(i);
          if (i <= 3) row.font = { bold: true, size: 13 };
        }
        for (let i = 5; i <= 17; i++) {
          const row = summarySheet.getRow(i);
          if (row.getCell(1).value) row.getCell(1).font = { bold: true };
        }
        summarySheet.getColumn(1).width = 22;
        summarySheet.getColumn(2).width = 18;

        const styleHeaders = (ws: any) => {
          const headerRow = ws.getRow(1);
          headerRow.font = { bold: true };
          headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0FE" } };
          ws.columns.forEach((col: any) => {
            if (col.values) col.width = Math.max(14, String(col.values[0] || "").length + 4);
          });
        };

        const addSheet = (name: string, headers: string[], rows: any[][]) => {
          const ws = wb.addWorksheet(name);
          ws.addRow(headers);
          rows.forEach((r) => ws.addRow(r));
          styleHeaders(ws);
        };

        addSheet("Feed Log", ["Date", "Time", "Amount", "Unit", "Feed Type", "Food Name", "Notes", "Logged By"],
          data.feeds.map((l: any) => [
            fmtDate(l.occurredAt), fmtTime(l.occurredAt), l.feedAmount || "", l.feedUnit || "", l.feedType || "", l.foodName || "", l.notes || "", l.userName || "",
          ]));

        addSheet("Diaper Log", ["Date", "Time", "Type", "Notes", "Logged By"],
          data.diapers.map((l: any) => [
            fmtDate(l.occurredAt), fmtTime(l.occurredAt), fmtDiaper(l.diaperType), l.notes || "", l.userName || "",
          ]));

        addSheet("Wake Events", ["Date", "Time", "Notes", "Logged By"],
          data.wakes.map((l: any) => [
            fmtDate(l.occurredAt), fmtTime(l.occurredAt), l.notes || "", l.userName || "",
          ]));

        addSheet("Nursing Log", ["Date", "Time", "Duration (min)", "Side", "Notes", "Logged By"],
          data.nurses.map((l: any) => [
            fmtDate(l.occurredAt), fmtTime(l.occurredAt), l.nurseDuration || "", fmtSide(l.nurseSide), l.notes || "", l.userName || "",
          ]));

        addSheet("Pump Log", ["Date", "Time", "Amount", "Unit", "Side", "Notes", "Logged By"],
          data.pumps.map((l: any) => [
            fmtDate(l.occurredAt), fmtTime(l.occurredAt), l.pumpAmount || "", l.pumpUnit || "", fmtSide(l.pumpSide), l.notes || "", l.userName || "",
          ]));

        addSheet("Sleep Log", ["Date", "Time", "Duration (min)", "Notes", "Logged By"],
          (data.sleeps || []).map((l: any) => [
            fmtDate(l.occurredAt), fmtTime(l.occurredAt), l.durationMinutes != null ? l.durationMinutes : "", l.notes || "", l.userName || "",
          ]));

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cribnotes-${childName}-${rangeLabel}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success("Export downloaded!");
    } catch {
      toast.error("Export failed");
    } finally {
      setExportingChild(null);
    }
  };

  const { canInstall, isIos, isAndroid, isInstalled, install } = usePwaInstall();

  return (
    <div className="p-4 space-y-8 pb-24">
      <h1 className="font-display text-2xl font-bold text-text-primary">Settings</h1>

      {!isInstalled && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-text-primary">Install App</h2>
          <div className="bg-surface rounded-2xl p-4">
            {canInstall ? (
              <>
                <p className="text-sm text-text-secondary mb-3">Install CribNotes on your device for quick access and offline support.</p>
                <Button full onClick={install}>
                  <Smartphone size={16} className="mr-2" /> Install App
                </Button>
              </>
            ) : isIos ? (
              <div className="text-sm text-text-secondary space-y-2">
                <p>To install CribNotes on your iPhone:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open this page in <strong>Safari</strong></li>
                  <li>Tap the <strong>Share</strong> button at the bottom</li>
                  <li>Tap <strong>Add to Home Screen</strong></li>
                </ol>
              </div>
            ) : isAndroid ? (
              <div className="text-sm text-text-secondary space-y-2">
                <p>To install CribNotes on your Android phone:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the <strong>three-dot menu</strong> in Chrome</li>
                  <li>Tap <strong>Add to Home Screen</strong></li>
                </ol>
              </div>
            ) : (
              <div className="text-sm text-text-secondary space-y-2">
                <p>To install CribNotes:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Use your browser&apos;s menu to <strong>Add to Home Screen</strong></li>
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">Notifications</h2>
        <div className="bg-surface rounded-2xl p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-text-primary">This device</p>
              <p className="text-sm text-text-secondary mt-1">
                {notificationPermission === "unsupported"
                  ? "Push notifications are not supported in this browser."
                  : notificationPreferences?.hasSubscription
                    ? "Push notifications are enabled on this account."
                    : "Enable alerts for notes and feeding reminders."}
              </p>
              {isIos && !isInstalled && (
                <p className="text-xs text-text-muted mt-2">On iPhone or iPad, install CribNotes to your Home Screen first, then enable notifications from the installed app.</p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationPermission === "granted" && !!notificationPreferences?.hasSubscription}
              disabled={isSubscribing || notificationPermission === "unsupported" || !vapid?.configured}
              onClick={enableNotifications}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                notificationPermission === "granted" && notificationPreferences?.hasSubscription
                  ? "bg-primary"
                  : "bg-elevated border-border"
              } ${isSubscribing ? "opacity-50" : ""}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                notificationPermission === "granted" && notificationPreferences?.hasSubscription
                  ? "translate-x-5"
                  : "translate-x-0"
              }`} />
            </button>
          </div>

          {!vapid?.configured && (
            <p className="text-xs text-warning">Server VAPID keys are missing. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY before push can be enabled.</p>
          )}
          {notificationDebug && (
            <p className="text-xs text-warning break-words">{notificationDebug}</p>
          )}

          {selectedChildId ? (
            <div className="space-y-4 pt-4 border-t border-border">
              <p className="text-sm font-medium text-text-secondary">
                Settings for {children.find((child: any) => child.id === selectedChildId)?.name || "selected child"}
              </p>

              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium text-text-primary">Notes for my attention</span>
                  <span className="block text-xs text-text-muted">Alert me when a note is addressed to my name or email.</span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-primary"
                  checked={notificationPreferences?.noteAttentionEnabled ?? true}
                  onChange={(e) => updateNotificationPreferences.mutate({
                    childId: selectedChildId,
                    noteAttentionEnabled: e.target.checked,
                  })}
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium text-text-primary">Feeding reminders</span>
                  <span className="block text-xs text-text-muted">Alert me when the latest feeding is older than the selected interval.</span>
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-primary"
                  checked={notificationPreferences?.feedReminderEnabled ?? false}
                  onChange={(e) => updateNotificationPreferences.mutate({
                    childId: selectedChildId,
                    feedReminderEnabled: e.target.checked,
                    feedReminderIntervalMinutes: feedInterval,
                  })}
                />
              </label>

              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <Input
                  label="Feeding interval, minutes"
                  type="number"
                  min="15"
                  max="720"
                  step="15"
                  value={String(feedInterval)}
                  onChange={(e) => setFeedInterval(Number(e.target.value))}
                />
                <Button
                  variant="secondary"
                  onClick={() => updateNotificationPreferences.mutate({
                    childId: selectedChildId,
                    feedReminderIntervalMinutes: feedInterval,
                  })}
                >
                  Save
                </Button>
              </div>
              <p className="text-xs text-text-muted">Example: enter 120 to send a reminder two hours after the most recent feed log.</p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Select or add a child to configure notification rules.</p>
          )}
        </div>
      </section>

      {STRIPE_CONFIGURED && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-text-primary">Billing</h2>
          <div className="bg-surface rounded-2xl p-4">
            {session?.user?.paidAt ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                  <Check size={16} className="text-success" />
                </div>
                <div>
                  <p className="font-medium text-text-primary">Lifetime Access</p>
                  <p className="text-sm text-text-secondary">Paid on {new Date(session.user.paidAt).toLocaleDateString()}</p>
                </div>
              </div>
            ) : session?.user?.trialEndsAt ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-text-primary">
                    {new Date(session.user.trialEndsAt) > new Date() ? "Free Trial" : "Trial Expired"}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {new Date(session.user.trialEndsAt) > new Date()
                      ? `${Math.max(0, Math.ceil((new Date(session.user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days remaining`
                      : "Your 30-day trial has ended. Upgrade to continue using CribNotes."}
                  </p>
                </div>
                <Button full onClick={handleCheckout} disabled={checkoutLoading}>
                  {checkoutLoading ? <Loader2 size={18} className="animate-spin" /> : <><CreditCard size={16} className="mr-1" /> Pay $15 — Lifetime Access</>}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Loading billing info...</p>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">My Profile</h2>
        <div className="bg-surface rounded-2xl p-4 space-y-3">
          <Input
            label="Name"
            value={editName || user?.name || ""}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Your name"
          />
          <p className="text-sm text-text-secondary">{user?.email}</p>
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Your designation</p>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => updateProfile.mutate({ designation: role.value })}
                  className={`px-3 py-2 rounded-2xl text-sm font-medium ${
                    user?.designation === role.value ? "bg-primary text-base" : "bg-elevated text-text-secondary"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-2">
              You default to Parent when you add a child. Change this if your role is caretaker or babysitter.
            </p>
          </div>
          <Button variant="secondary" onClick={() => updateProfile.mutate({ name: editName })}>
            Save Profile
          </Button>
        </div>

        <button
          onClick={() => setShowPasswordSection(!showPasswordSection)}
          className="text-primary text-sm"
        >
          {showPasswordSection ? "Hide" : "Change Password"}
        </button>
        {showPasswordSection && (
          <div className="bg-surface rounded-2xl p-4 space-y-3">
            <Input label="Current Password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Button variant="secondary" onClick={() => updateProfile.mutate({ currentPassword: oldPassword, password: newPassword })}>
              Update Password
            </Button>
          </div>
        )}

        <Button variant="danger" size="sm" onClick={() => setAccountDeleteConfirm(true)}>
          Delete Account
        </Button>
        <Modal open={accountDeleteConfirm} onClose={() => setAccountDeleteConfirm(false)} title="Delete Account?">
          <p className="text-text-secondary mb-4">This will permanently delete your account and all data. This cannot be undone.</p>
          <Button variant="danger" onClick={() => deleteAccount.mutate()}>Confirm Delete</Button>
        </Modal>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">My Children</h2>
        {children.map((child: any) => {
          const isOwner = child.ownerId === user?.id;
          return (
          <div key={child.id} className="bg-surface rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-text-primary">{child.name}</p>
                <p className="text-sm text-text-secondary">
                  Born {formatDate(new Date(child.birthDate))} · {formatChildAge(new Date(child.birthDate))}
                </p>
                {!isOwner && child.owner && (
                  <p className="text-xs text-text-muted mt-0.5">Shared by {child.owner.name}</p>
                )}
              </div>
              {isOwner && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingChild(child.id); setEditChildName(child.name); setEditChildDob(child.birthDate.split("T")[0]); }}
                    className="p-2 text-text-secondary hover:text-primary rounded-lg"
                  >
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeleteConfirm(child.id)} className="p-2 text-text-secondary hover:text-danger rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <SharesSection childId={child.id} ownerId={child.ownerId} currentUserId={user?.id} onInvite={() => { setShowInvite(child.id); setInviteEmail(""); setInviteRole("CARETAKER"); }} onRevoke={(shareId) => revokeShare.mutate({ childId: child.id, shareId })} />

            <div className="mt-2">
              <button onClick={() => { setExportingChild(child.id); setExportRange("last30"); }} className="text-sm text-secondary flex items-center gap-1">
                <Download size={14} /> Export Data
              </button>
            </div>
          </div>
          );
        })}
        <Button variant="secondary" onClick={() => setShowAddChild(true)}>
          <Plus size={16} className="mr-1" /> Add Child
        </Button>
      </section>

      <Modal open={showAddChild} onClose={() => setShowAddChild(false)} title="Add Child">
        <div className="space-y-3">
          <Input label="Child's Name" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} placeholder="Name" />
          <Input label="Date of Birth" type="date" value={newChildDob} onChange={(e) => setNewChildDob(e.target.value)} />
          <Button full onClick={() => createChild.mutate({ name: newChildName, birthDate: newChildDob })}>Add Child</Button>
        </div>
      </Modal>

      <Modal open={!!editingChild} onClose={() => setEditingChild(null)} title="Edit Child">
        <div className="space-y-3">
          <Input label="Name" value={editChildName} onChange={(e) => setEditChildName(e.target.value)} />
          <Input label="Date of Birth" type="date" value={editChildDob} onChange={(e) => setEditChildDob(e.target.value)} />
          <Button full onClick={() => editingChild && updateChild.mutate({ id: editingChild, name: editChildName, birthDate: editChildDob })}>Save</Button>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Child?">
        <p className="text-text-secondary mb-4">This will remove the child and all their logs. This cannot be undone.</p>
        <Button variant="danger" onClick={() => deleteConfirm && deleteChild.mutate(deleteConfirm)}>Delete</Button>
      </Modal>

      <Modal open={!!showInvite} onClose={() => setShowInvite(null)} title="Invite Someone">
        <div className="space-y-3">
          <Input label="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="partner@email.com" />
          <div>
            <p className="text-sm text-text-secondary mb-2">Role</p>
            <div className="grid grid-cols-3 gap-2">
              {roleOptions.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setInviteRole(role.value)}
                  className={`px-3 py-2 rounded-2xl text-sm ${inviteRole === role.value ? "bg-primary text-base" : "bg-surface text-text-secondary"}`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
          <Button full onClick={() => showInvite && sendInvite.mutate({ childId: showInvite, email: inviteEmail, role: inviteRole })}>
            <UserPlus size={16} className="mr-1" /> Send Invite
          </Button>
        </div>
      </Modal>

      <Modal open={!!exportingChild} onClose={() => setExportingChild(null)} title="Export Data">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Format</p>
            <div className="flex gap-2">
              {[
                { key: "xlsx", label: "Excel (.xlsx)" },
                { key: "csv", label: "CSV (.csv)" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setExportFormat(f.key)}
                  className={`px-3 py-1.5 rounded-full text-sm ${exportFormat === f.key ? "bg-primary text-base" : "bg-surface text-text-secondary"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-text-secondary mb-2">Date Range</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "all", label: "All Time" },
                { key: "month", label: "This Month" },
                { key: "last30", label: "Last 30 Days" },
                { key: "custom", label: "Custom" },
              ].map((r) => (
                <button
                  key={r.key}
                  onClick={() => setExportRange(r.key)}
                  className={`px-3 py-1.5 rounded-full text-sm ${exportRange === r.key ? "bg-primary text-base" : "bg-surface text-text-secondary"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {exportRange === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="From" type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
              <Input label="To" type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
            </div>
          )}

          <Button
            full
            disabled={exportRange === "custom" && !exportFrom}
            onClick={() => exportingChild && handleExport(exportingChild, children.find((c: any) => c.id === exportingChild)?.name || "child")}
          >
            <Download size={16} className="mr-1" /> Export
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function SharesSection({ childId, ownerId, currentUserId, onInvite, onRevoke }: { childId: string; ownerId: string; currentUserId: string; onInvite: () => void; onRevoke: (shareId: string) => void }) {
  const { data: shares = [] } = useQuery({
    queryKey: ["shares", childId],
    queryFn: () => api(`/api/children/${childId}/shares`),
  });

  const isOwner = ownerId === currentUserId;
  const isParent = isOwner || shares.some((s: any) => s.user?.id === currentUserId && s.accepted && s.role === "PARENT");
  const canInvite = isParent;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-text-secondary">Sharing</p>
        {canInvite && (
          <button onClick={onInvite} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            <UserPlus size={14} /> Invite
          </button>
        )}
      </div>
      {shares.length === 0 && !canInvite ? (
        <p className="text-xs text-text-muted">No one else has access</p>
      ) : (
        <div className="space-y-2">
          {shares.map((share: any) => (
            <div key={share.id} className="flex items-center justify-between text-sm bg-elevated rounded-xl px-3 py-2">
              <div>
                <p className="text-text-primary">{share.user?.name || share.email}</p>
                <p className="flex items-center gap-2">
                  <span className="text-primary">
                    {roleLabels[share.role as PersonRole] || share.role}
                  </span>
                  <span className={share.accepted ? "text-success" : "text-warning"}>
                    {share.accepted ? "Active" : "Pending"}
                  </span>
                </p>
              </div>
              {canInvite && (
                <button onClick={() => onRevoke(share.id)} className="text-xs text-danger hover:underline">Revoke</button>
              )}
            </div>
          ))}
          {shares.length === 0 && canInvite && (
            <p className="text-xs text-text-muted">No one else has access yet</p>
          )}
        </div>
      )}
    </div>
  );
}
