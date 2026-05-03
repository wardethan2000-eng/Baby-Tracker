"use client";

import { useState, useEffect } from "react";
import { Moon, Baby, UserPlus, Check, Smartphone, Share, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { formatChildAge } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type PersonRole = "PARENT" | "CARETAKER" | "BABYSITTER";

const roleOptions: { value: PersonRole; label: string }[] = [
  { value: "PARENT", label: "Parent" },
  { value: "CARETAKER", label: "Caretaker" },
  { value: "BABYSITTER", label: "Babysitter" },
];

interface OnboardingFlowProps {
  userName: string;
}

export function OnboardingFlow({ userName }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [childName, setChildName] = useState("");
  const [childDob, setChildDob] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PersonRole>("PARENT");
  const [createdChildId, setCreatedChildId] = useState<string | null>(null);
  const router = useRouter();
  const { update } = useSession();
  const { setSelectedChildId, setOnboarded } = useAppStore();

  const totalSteps = 5;

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: childName, birthDate: childDob }),
      });
      if (!res.ok) throw new Error("Failed");
      const child = await res.json();
      setCreatedChildId(child.id);
      setSelectedChildId(child.id);
      toast.success("Child added!");
      setStep(3);
    } catch {
      toast.error("Failed to add child");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !createdChildId) {
      setStep(4);
      return;
    }
    try {
      const res = await fetch(`/api/children/${createdChildId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Invite sent!");
    } catch {
      toast.error("Failed to send invite");
    }
    setStep(4);
  };

  const finishOnboarding = async () => {
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingDone: true }),
      });
      if (!res.ok) throw new Error("Failed");
      setOnboarded(true);
      await update();
      router.replace("/home");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("other");
  }, []);

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full flex-1 transition-colors ${
                s <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          {step === 1 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Moon className="text-primary" size={32} />
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Welcome to CribNotes</h1>
              <p className="text-text-secondary mb-6">Track your baby&apos;s activity, effortlessly</p>
              <Button full onClick={() => setStep(2)}>Let&apos;s get started</Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleAddChild}>
              <h2 className="font-display text-xl font-bold text-text-primary mb-1">Add Your Child</h2>
              <p className="text-text-secondary mb-6">Tell us about your little one</p>
              <div className="space-y-4">
                <Input label="Child's Name" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Name" required />
                <Input label="Date of Birth" type="date" value={childDob} onChange={(e) => setChildDob(e.target.value)} required />
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button type="submit" full>Add Child</Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleInvite}>
              <h2 className="font-display text-xl font-bold text-text-primary mb-1">Invite Someone</h2>
              <p className="text-text-secondary mb-6">Share access with a parent, caretaker, or babysitter</p>
              <div className="space-y-4">
                <Input label="Email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="partner@email.com" />
                <div>
                  <p className="text-sm text-text-secondary mb-2">Role</p>
                  <div className="grid grid-cols-3 gap-2">
                    {roleOptions.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setInviteRole(role.value)}
                        className={`px-3 py-2 rounded-2xl text-sm ${inviteRole === role.value ? "bg-primary text-base" : "bg-elevated text-text-secondary"}`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button type="submit" full>
                  <UserPlus size={16} className="mr-1" /> Send Invite
                </Button>
              </div>
              <button type="button" onClick={() => setStep(4)} className="text-sm text-text-muted mt-3 block mx-auto hover:text-text-secondary">
                Skip for now
              </button>
            </form>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="text-secondary" size={32} />
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary mb-2">Install the App</h2>
              <p className="text-text-secondary mb-6">Add CribNotes to your home screen for quick, full-screen access.</p>

              {platform === "ios" && (
                <div className="bg-elevated rounded-2xl p-4 text-left space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">1</span>
                    <p className="text-sm text-text-primary">Tap the <strong className="text-primary">Share</strong> button at the bottom of Safari</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">2</span>
                    <p className="text-sm text-text-primary">Scroll down and tap <strong className="text-primary">Add to Home Screen</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">3</span>
                    <p className="text-sm text-text-primary">Tap <strong className="text-primary">Add</strong> in the top right</p>
                  </div>
                </div>
              )}

              {platform === "android" && (
                <div className="bg-elevated rounded-2xl p-4 text-left space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">1</span>
                    <p className="text-sm text-text-primary">Tap the <strong className="text-primary">three-dot menu</strong> in the top right of Chrome</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">2</span>
                    <p className="text-sm text-text-primary">Tap <strong className="text-primary">Add to Home Screen</strong></p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">3</span>
                    <p className="text-sm text-text-primary">Tap <strong className="text-primary">Add</strong> to confirm</p>
                  </div>
                </div>
              )}

              {platform === "other" && (
                <div className="bg-elevated rounded-2xl p-4 text-left space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">1</span>
                    <p className="text-sm text-text-primary">Open your browser&apos;s menu or settings</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">2</span>
                    <p className="text-sm text-text-primary">Look for <strong className="text-primary">Add to Home Screen</strong> or <strong className="text-primary">Install App</strong></p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(3)}>Back</Button>
                <Button full onClick={() => setStep(5)}>Next</Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Check className="text-success" size={32} />
              </div>
              <h2 className="font-display text-xl font-bold text-text-primary mb-4">You&apos;re all set, {userName}!</h2>

              <div className="space-y-3 mb-6">
                <div className="bg-elevated rounded-2xl p-4 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Baby className="text-primary" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">{childName}</p>
                    <p className="text-sm text-text-secondary">
                      {childDob ? formatChildAge(new Date(childDob)) : ""}
                    </p>
                  </div>
                </div>

                <div className="bg-elevated rounded-2xl p-4 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                    <Share className="text-secondary" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-text-primary font-medium">Share anytime from Settings</p>
                    <p className="text-xs text-text-muted">You can always invite more people or manage sharing in Settings</p>
                  </div>
                </div>
              </div>

              <Button full onClick={finishOnboarding}>Start Tracking</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
