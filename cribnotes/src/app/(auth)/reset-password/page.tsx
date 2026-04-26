"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon } from "lucide-react";

const resetFormSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof resetFormSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(resetFormSchema),
  });

  const onSubmit = async (data: FormValues) => {
    if (!token) {
      toast.error("Invalid reset token");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      if (res.ok) {
        toast.success("Password reset successful!");
        router.push("/login");
      } else {
        const err = await res.json();
        toast.error(err.error || "Reset failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <h1 className="font-display text-2xl font-bold text-danger mb-4">Invalid Request</h1>
        <p className="text-text-secondary mb-6">Reset token is missing or invalid.</p>
        <Link href="/login"><Button>Back to Login</Button></Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="flex items-center gap-2 mb-8">
        <Moon className="text-primary" size={32} />
        <h1 className="font-display text-3xl font-bold text-primary">CribNotes</h1>
      </div>
      <p className="text-text-secondary mb-8">Enter your new password</p>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
        <Input label="New Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
        <Button type="submit" full disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset Password"}
        </Button>
      </form>

      <Link href="/login" className="mt-6 text-sm text-secondary hover:underline">Back to Login</Link>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}