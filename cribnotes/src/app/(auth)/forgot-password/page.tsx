"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/validations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon } from "lucide-react";

type FormValues = {
  email: string;
};

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setIsSubmitted(true);
      } else {
        toast.error("Something went wrong");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <Moon className="text-primary mb-4" size={48} />
        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Email Sent</h1>
        <p className="text-text-secondary text-center mb-6">
          If an account exists with that email, we&apos;ve sent reset instructions.
        </p>
        <Link href="/login">
          <Button>Back to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="flex items-center gap-2 mb-8">
        <Moon className="text-primary" size={32} />
        <h1 className="font-display text-3xl font-bold text-primary">CribNotes</h1>
      </div>
      <p className="text-text-secondary mb-8">Enter your email to reset your password</p>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
        <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <Button type="submit" full disabled={isLoading}>
          {isLoading ? "Sending..." : "Send Reset Instructions"}
        </Button>
      </form>

      <Link href="/login" className="mt-6 text-sm text-secondary hover:underline">
        Back to Login
      </Link>
    </div>
  );
}