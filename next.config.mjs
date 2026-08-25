/** @type {import('next').NextConfig} */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = SUPABASE_URL ? new URL(SUPABASE_URL).origin : "";

// NEXT_PUBLIC_* is inlined at build time, so a missing value here would ship a
// CSP that blocks every Supabase call at runtime. Say so rather than failing
// silently in the browser.
if (!supabaseOrigin && process.env.BUILD_TARGET !== "mobile") {
  console.warn(
    "\nwarn  NEXT_PUBLIC_SUPABASE_URL is not set - the CSP will omit the Supabase origin and API calls will be blocked in the browser.\n"
  );
}

// Supabase talks to its REST/auth/realtime endpoints; the converter reads
// open.er-api.com. next/font self-hosts Google Fonts at build time, so no font
// host is needed at runtime. 'unsafe-inline' on style-src is required by
// styled-jsx and inline style attributes; script-src needs 'unsafe-inline' for
// the theme-init script and 'unsafe-eval' only in dev for React Refresh.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")} https://open.er-api.com`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

// The mobile target is a static export copied into the Capacitor shell; it has
// no server to send headers, and `headers()` is rejected outright by `output:
// "export"`.
const nextConfig =
  process.env.BUILD_TARGET === "mobile"
    ? { output: "export", images: { unoptimized: true } }
    : {
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      };

export default nextConfig;
