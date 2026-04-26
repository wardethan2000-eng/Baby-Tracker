"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon } from "lucide-react";

const signupFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success("Check your email to verify your account");
        router.push("/login");
      } else {
        const err = await res.json();
        toast.error(err.error || "Signup failed");
      }
    } catch {
      toast.error("Something went wrong");
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
      <p className="text-text-secondary mb-8">Create an account to get started</p>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
        <Input label="Name" type="text" placeholder="Your name" error={errors.name?.message} {...register("name")} />
        <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register("email")} />
        <Input label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register("password")} />
        <Button type="submit" full disabled={isLoading}>
          {isLoading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-secondary hover:underline">Sign in</Link>
      </p>
    </div>
  );
}