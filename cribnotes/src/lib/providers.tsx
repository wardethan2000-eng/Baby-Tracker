"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { useState } from "react";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";
import { useSSE } from "@/lib/useSSE";
import { useAppStore } from "@/lib/store";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={(resolvedTheme as "light" | "dark" | "system") || "system"}
      position="top-center"
      richColors
    />
  );
}

function SSEConnector() {
  const selectedChildId = useAppStore((s) => s.selectedChildId);
  useSSE(selectedChildId);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ServiceWorkerRegister />
          <SSEConnector />
          {children}
          <ThemedToaster />
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
