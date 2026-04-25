"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Download, ChevronDown, ChevronUp, UserPlus, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { usePwaInstall } from "@/lib/usePwaInstall";
import { formatChildAge, formatDate } from "@/lib/utils";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedChildId, setSelectedChildId } = useAppStore();

  const { data: user } = useQuery({ queryKey: ["user"], queryFn: () => api("/api/user/me") });
  const { data: children = [] } = useQuery({ queryKey: ["children"], queryFn: () => api("/api/children") });

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
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"CAREGIVER" | "VIEWER">("CAREGIVER");
  const [exportingChild, setExportingChild] = useState<string | null>(null);
  const [exportRange, setExportRange] = useState("last30");

  const updateProfile = useMutation({
    mutationFn: (data: { name?: string; password?: string }) => api("/api/user/me", "PATCH", data),
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
      const XLSX = await import("xlsx");

      const wb = XLSX.utils.book_new();

      const summaryData = [
        ["NightWatch — " + childName + " Export"],
        ["Generated: " + now.toLocaleDateString()],
        [""],
        ["Metric", "Value"],
        ["Total Feeds", data.summary.totalFeeds],
        ["Total Volume", data.summary.totalVolume + " oz"],
        ["Avg Feeds/Day", data.summary.avgFeedsPerDay?.toFixed(1) || "0"],
        ["Diaper Changes", data.summary.totalDiapers],
        ["Wake Events", data.summary.totalWakes],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, "Summary");

      const feedHeaders = ["Date", "Time", "Amount", "Unit", "Feed Type", "Notes", "Logged By"];
      const feedRows = data.feeds.map((l: any) => [
        new Date(l.occurredAt).toLocaleDateString(),
        new Date(l.occurredAt).toLocaleTimeString(),
        l.feedAmount || "",
        l.feedUnit || "",
        l.feedType || "",
        l.notes || "",
        l.userName || "",
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([feedHeaders, ...feedRows]);
      XLSX.utils.book_append_sheet(wb, ws2, "Feed Log");

      const diaperHeaders = ["Date", "Time", "Type", "Notes", "Logged By"];
      const diaperRows = data.diapers.map((l: any) => [
        new Date(l.occurredAt).toLocaleDateString(),
        new Date(l.occurredAt).toLocaleTimeString(),
        l.diaperType === "PEE" ? "Pee" : l.diaperType === "POOP" ? "Poop" : l.diaperType === "BOTH" ? "Pee + poop" : "",
        l.notes || "",
        l.userName || "",
      ]);
      const ws3 = XLSX.utils.aoa_to_sheet([diaperHeaders, ...diaperRows]);
      XLSX.utils.book_append_sheet(wb, ws3, "Diaper Log");

      const wakeHeaders = ["Date", "Time", "Notes", "Logged By"];
      const wakeRows = data.wakes.map((l: any) => [
        new Date(l.occurredAt).toLocaleDateString(),
        new Date(l.occurredAt).toLocaleTimeString(),
        l.notes || "",
        l.userName || "",
      ]);
      const ws4 = XLSX.utils.aoa_to_sheet([wakeHeaders, ...wakeRows]);
      XLSX.utils.book_append_sheet(wb, ws4, "Wake Events");

      XLSX.writeFile(wb, `nightwatch-${childName}-${exportRange}.xlsx`);
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
                <p className="text-sm text-text-secondary mb-3">Install NightWatch on your device for quick access and offline support.</p>
                <Button full onClick={install}>
                  <Smartphone size={16} className="mr-2" /> Install App
                </Button>
              </>
            ) : isIos ? (
              <div className="text-sm text-text-secondary space-y-2">
                <p>To install NightWatch on your iPhone:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open this page in <strong>Safari</strong></li>
                  <li>Tap the <strong>Share</strong> button at the bottom</li>
                  <li>Tap <strong>Add to Home Screen</strong></li>
                </ol>
              </div>
            ) : isAndroid ? (
              <div className="text-sm text-text-secondary space-y-2">
                <p>To install NightWatch on your Android phone:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the <strong>three-dot menu</strong> in Chrome</li>
                  <li>Tap <strong>Add to Home Screen</strong></li>
                </ol>
              </div>
            ) : (
              <div className="text-sm text-text-secondary space-y-2">
                <p>To install NightWatch:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Use your browser&apos;s menu to <strong>Add to Home Screen</strong></li>
                </ol>
              </div>
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
            <Button variant="secondary" onClick={() => updateProfile.mutate({ password: newPassword })}>
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

            <button
              onClick={() => setExpandedChild(expandedChild === child.id ? null : child.id)}
              className="text-sm text-primary mt-2 flex items-center gap-1"
            >
              Sharing {expandedChild === child.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expandedChild === child.id && (
              <SharesSection childId={child.id} ownerId={child.ownerId} currentUserId={user?.id} onInvite={() => { setShowInvite(child.id); setInviteEmail(""); setInviteRole("CAREGIVER"); }} onRevoke={(shareId) => revokeShare.mutate({ childId: child.id, shareId })} />
            )}

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
            <div className="flex gap-2">
              <button
                onClick={() => setInviteRole("CAREGIVER")}
                className={`px-4 py-2 rounded-full text-sm ${inviteRole === "CAREGIVER" ? "bg-primary text-base" : "bg-surface text-text-secondary"}`}
              >
                Caregiver
              </button>
              <button
                onClick={() => setInviteRole("VIEWER")}
                className={`px-4 py-2 rounded-full text-sm ${inviteRole === "VIEWER" ? "bg-secondary text-base" : "bg-surface text-text-secondary"}`}
              >
                Viewer
              </button>
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
    <div className="mt-2 space-y-2">
      {shares.map((share: any) => (
        <div key={share.id} className="flex items-center justify-between text-sm bg-elevated rounded-xl px-3 py-2">
          <div>
            <p className="text-text-primary">{share.user?.name || share.email}</p>
            <p className="flex items-center gap-2">
              <span className={share.role === "CAREGIVER" ? "text-primary" : "text-secondary"}>
                {share.role === "CAREGIVER" ? "Caregiver" : "Viewer"}
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
      {/* Also show child owner as a share entry */}
      {isOwner && (
        <button onClick={onInvite} className="text-sm text-primary flex items-center gap-1">
          <UserPlus size={14} /> Invite Someone
        </button>
      )}
    </div>
  );
}
