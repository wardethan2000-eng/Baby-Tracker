"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon } from "lucide-react";

interface InviteData {
  childName: string;
  ownerName: string;
  email: string;
  role: string;
  expired: boolean;
}

function InviteContent({ token }: { token: string }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error("Invalid or expired invite");
          router.push("/login");
        } else {
          setInviteData(data);
        }
      })
      .catch(() => toast.error("Failed to load invite"))
      .finally(() => setLoading(false));
  }, [token, router]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: "POST" });
      if (res.ok) {
        toast.success("Access granted!");
        router.push("/");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to accept invite");
      }
    } catch {
      toast.error("Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  const handleLoginAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      email: inviteData?.email,
      password,
      redirect: false,
    });
    if (result?.ok) {
      await handleAccept();
    } else {
      toast.error("Invalid credentials");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-text-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!inviteData) return null;

  if (status === "authenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <Moon className="text-primary mb-4" size={48} />
        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Accept Invitation</h1>
        <p className="text-text-secondary mb-2">
          {inviteData.ownerName} has invited you to track {inviteData.childName}
        </p>
        <p className="text-text-muted text-sm mb-6">
          Role: {inviteData.role === "CAREGIVER" ? "Caregiver (can log events)" : "Viewer (read-only)"}
        </p>
        <div className="flex gap-3">
          <Button variant="primary" onClick={handleAccept} disabled={accepting}>
            {accepting ? "Accepting..." : "Accept Invitation"}
          </Button>
          <Button variant="ghost" onClick={() => router.push("/")}>Decline</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="flex items-center gap-2 mb-8">
        <Moon className="text-primary" size={32} />
        <h1 className="font-display text-3xl font-bold text-primary">CribNotes</h1>
      </div>
      <p className="text-text-secondary mb-8">
        Sign in to accept the invitation for {inviteData.childName}
      </p>

      <form onSubmit={handleLoginAndAccept} className="w-full max-w-sm space-y-4">
        <Input label="Email" type="email" value={inviteData.email} readOnly />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        <Button type="submit" full>Sign In & Accept</Button>
      </form>

      <p className="mt-4 text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <a href={`/signup?invite=${token}`} className="text-secondary hover:underline">Sign up</a>
      </p>
    </div>
  );
}

export default function InvitePage({ params }: { params: { token: string } }) {
  return (
    <Suspense>
      <InviteContent token={params.token} />
    </Suspense>
  );
}