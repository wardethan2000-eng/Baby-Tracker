"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { Bell, Pencil, Trash2, Plus, Download, UserPlus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { getPushDiagnostics, isPushSupported, subscribeToPush } from "@/lib/push-client";
import { formatChildAge, formatDate } from "@/lib/utils";

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
  const [exportRange, setExportRange] = useState("last30");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [notificationDebug, setNotificationDebug] = useState<string | null>(null);
  const [feedInterval, setFeedInterval] = useState(120);

  useEffect(() => {
    setNotificationPermission(isPushSupported() ? Notification.permission : "unsupported");
  }, []);

  useEffect(() => {
    if (notificationPreferences?.feedReminderIntervalMinutes) {
      setFeedInterval(notificationPreferences.feedReminderIntervalMinutes);
    }
  }, [notificationPreferences?.feedReminderIntervalMinutes]);

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

    setIsSubscribing(true);
    setNotificationDebug(null);
    try {
      const subscription = await subscribeToPush(vapid.publicKey);
      await api("/api/notifications/subscribe", "POST", subscription.toJSON());
      setNotificationPermission(Notification.permission);
      queryClient.invalidateQueries({ queryKey: ["notifications", "preferences"] });
      toast.success("Notifications enabled on this device");
    } catch (error: any) {
      const diagnostic = await getPushDiagnostics().catch(() => null);
      if (diagnostic) {
        setNotificationDebug([
          `Supported: ${diagnostic.supported}`,
          `Permission: ${diagnostic.notificationPermission}`,
          `Installed mode: ${diagnostic.standalone}`,
          `Controller: ${diagnostic.hasController}`,
          `Active: ${diagnostic.activeState || "none"}`,
          `Waiting: ${diagnostic.waitingState || "none"}`,
          `Installing: ${diagnostic.installingState || "none"}`,
        ].join(" | "));
      }
      toast.error(error.message || "Could not enable notifications");
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleExport = async (childId: string, childName: string) => {
    setExportingChild(childId);
    try {
      let from: Date | undefined;
      let to: Date | undefined;
      const now = new Date();
      if (exportRange === "last30") {
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (exportRange === "month") {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      const params = new URLSearchParams();
      if (from) params.set("from", from.toISOString());
      if (to) params.set("to", to.toISOString());

      const data = await api(`/api/export/${childId}?${params.toString()}`);
      const ExcelJS = await import("exceljs");

      const wb = new ExcelJS.Workbook();

      const summarySheet = wb.addWorksheet("Summary");
      summarySheet.addRow(["CribNotes — " + childName + " Export"]);
      summarySheet.addRow(["Generated: " + now.toLocaleDateString()]);
      summarySheet.addRow([]);
      summarySheet.addRow(["Metric", "Value"]);
      summarySheet.addRow(["Total Feeds", data.summary.totalFeeds]);
      summarySheet.addRow(["Total Volume", data.summary.totalVolume + " oz"]);
      summarySheet.addRow(["Avg Feeds/Day", data.summary.avgFeedsPerDay?.toFixed(1) || "0"]);
      summarySheet.addRow(["Diaper Changes", data.summary.totalDiapers]);
      summarySheet.addRow(["Wake Events", data.summary.totalWakes]);

      const addSheet = (name: string, headers: string[], rows: any[][]) => {
        const ws = wb.addWorksheet(name);
        ws.addRow(headers);
        rows.forEach((r) => ws.addRow(r));
      };

      addSheet("Feed Log", ["Date", "Time", "Amount", "Unit", "Feed Type", "Notes", "Logged By"],
        data.feeds.map((l: any) => [
          new Date(l.occurredAt).toLocaleDateString(),
          new Date(l.occurredAt).toLocaleTimeString(),
          l.feedAmount || "",
          l.feedUnit || "",
          l.feedType || "",
          l.notes || "",
          l.userName || "",
        ]));

      addSheet("Diaper Log", ["Date", "Time", "Type", "Notes", "Logged By"],
        data.diapers.map((l: any) => [
          new Date(l.occurredAt).toLocaleDateString(),
          new Date(l.occurredAt).toLocaleTimeString(),
          l.diaperType === "PEE" ? "Pee" : l.diaperType === "POOP" ? "Poop" : l.diaperType === "BOTH" ? "Pee + poop" : "",
          l.notes || "",
          l.userName || "",
        ]));

      addSheet("Wake Events", ["Date", "Time", "Notes", "Logged By"],
        data.wakes.map((l: any) => [
          new Date(l.occurredAt).toLocaleDateString(),
          new Date(l.occurredAt).toLocaleTimeString(),
          l.notes || "",
          l.userName || "",
        ]));

      addSheet("Nursing Log", ["Date", "Time", "Duration (min)", "Side", "Notes", "Logged By"],
        data.nurses.map((l: any) => [
          new Date(l.occurredAt).toLocaleDateString(),
          new Date(l.occurredAt).toLocaleTimeString(),
          l.nurseDuration || "",
          l.nurseSide || "",
          l.notes || "",
          l.userName || "",
        ]));

      addSheet("Pump Log", ["Date", "Time", "Amount", "Unit", "Notes", "Logged By"],
        data.pumps.map((l: any) => [
          new Date(l.occurredAt).toLocaleDateString(),
          new Date(l.occurredAt).toLocaleTimeString(),
          l.pumpAmount || "",
          l.pumpUnit || "",
          l.notes || "",
          l.userName || "",
        ]));

      addSheet("Sleep Log", ["Date", "Time", "Notes", "Logged By"],
        (data.sleeps || []).map((l: any) => [
          new Date(l.occurredAt).toLocaleDateString(),
          new Date(l.occurredAt).toLocaleTimeString(),
          l.notes || "",
          l.userName || "",
        ]));

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cribnotes-${childName}-${exportRange}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
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
            <Button
              size="sm"
              variant="secondary"
              onClick={enableNotifications}
              disabled={isSubscribing || notificationPermission === "unsupported" || !vapid?.configured}
            >
              <Bell size={16} className="mr-1" /> {isSubscribing ? "Enabling..." : "Enable"}
            </Button>
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
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "All Time" },
              { key: "month", label: "This Month" },
              { key: "last30", label: "Last 30 Days" },
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
          <Button full onClick={() => exportingChild && handleExport(exportingChild, children.find((c: any) => c.id === exportingChild)?.name || "child")}>
            Export
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

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-text-secondary">Sharing</p>
        {isOwner && (
          <button onClick={onInvite} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            <UserPlus size={14} /> Invite
          </button>
        )}
      </div>
      {shares.length === 0 && !isOwner ? (
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
              {isOwner && (
                <button onClick={() => onRevoke(share.id)} className="text-xs text-danger hover:underline">Revoke</button>
              )}
            </div>
          ))}
          {shares.length === 0 && isOwner && (
            <p className="text-xs text-text-muted">No one else has access yet</p>
          )}
        </div>
      )}
    </div>
  );
}
