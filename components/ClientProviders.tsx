"use client";

import { PrivacyProvider } from "@/components/PrivacyContext";
import { ThemeProvider } from "@/components/ThemeContext";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PrivacyProvider>{children}</PrivacyProvider>
    </ThemeProvider>
  );
}
