import type { Metadata, Viewport } from "next";
import { Manrope, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import InstallPrompt from "@/components/InstallPrompt";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import NativeAuthListener from "@/components/NativeAuthListener";
import AppLock from "@/components/AppLock";
import ClientProviders from "@/components/ClientProviders";
import AppBackground from "@/components/background/AppBackground";

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("minti_theme");
    if (!t) t = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    if (t === "light") document.documentElement.classList.add("light");
  } catch (e) {}
})();
`;

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#060e03",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  title: "Minti | Personal expense tracker",
  description: "Track your daily expenses and subscriptions, set budgets, and stay on top of your spending — all in one place.",
  openGraph: {
    title: "Minti | Personal expense tracker",
    description: "Track your daily expenses and subscriptions, set budgets, and stay on top of your spending — all in one place.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  other: {
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${fraunces.variable}`}>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:z-[200] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-accent-fill focus:text-[#163300] focus:rounded-lg focus:font-semibold focus:text-sm"
        >
          Skip to main content
        </a>
        <ClientProviders>
          <AppBackground />
          {children}
          <InstallPrompt />
          <ServiceWorkerRegistration />
          <NativeAuthListener />
          <AppLock />
        </ClientProviders>
      </body>
    </html>
  );
}
