"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth/use-auth";
import { ApiError } from "@/lib/api-client";
import { ToastStateProvider } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Don't retry auth/permission errors.
              if (error instanceof ApiError && [400, 401, 403, 404].includes(error.status)) {
                return false;
              }
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <ToastStateProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ToastStateProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
