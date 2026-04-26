"use client";

export { Toaster } from "sonner";

import { toast } from "sonner";

const defaultToastOptions = {
  theme: "dark",
  position: "top-center",
  richColors: true,
} as const;

export { toast, defaultToastOptions };