"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validations";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon } from "lucide-react";

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else if (result?.ok) {
        router.push("/");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="flex items-center gap-2 mb-8">
        <Moon className="text-primary" size={32} />
        <h1 className="font-display text-3xl font-bold text-primary">CribNotes</h1>
      </div>
      <p className="text-text-secondary mb-8">Sign in to track your baby&apos;s night</p>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" full disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <Link href="/forgot-password" className="text-sm text-secondary hover:underline block">
          Forgot password?
        </Link>
        <p className="text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-secondary hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}