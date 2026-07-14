import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "./components/ui/toaster";
import { IosInstallPrompt } from "./features/pwa/IosInstallPrompt";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { applyTheme, useTheme } from "./lib/theme";

export default function App() {
  const theme = useTheme((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
        <IosInstallPrompt />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
