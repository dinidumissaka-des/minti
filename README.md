This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication

Sign-in is passwordless by default. The order of the ladder is deliberate: OAuth
first, an emailed code as the fallback that always works, and password kept only
so existing accounts are not locked out.

| Path | How it works |
| --- | --- |
| Google | OAuth, both platforms |
| Apple | OAuth. Native always; on web only when `NEXT_PUBLIC_APPLE_WEB_AUTH=true` |
| Email code | `signInWithOtp` sends a 6-digit code, `verifyOtp` redeems it. One call covers sign-in and sign-up |
| Password | Reachable behind *Use a password instead*, no longer advertised |

All of it lives in `lib/auth.ts`, which is the only module that touches
`supabase.auth`. `lib/supabase.ts` exports `getClient()` and holds the data
queries alone, so a new credential type is a change to one file.

### Supabase dashboard setup

Three things must be configured or the email code path silently keeps sending
links instead:

1. **Email template.** Under *Authentication → Email Templates → Magic Link*,
   the body must contain `{{ .Token }}`. Supabase only sends a code if the
   template asks for one; the stock template uses `{{ .ConfirmationURL }}` and
   produces a link, which is exactly the hand-off to a browser this flow exists
   to avoid.
2. **Leave "Confirm email" on.** Supabase automatically links Google, email-code
   and password identities that share an address into one account, but only for
   *verified* addresses — that check is what blocks pre-account-takeover. A code
   verifies the address inherently, so nothing is lost by keeping it on.
3. **Custom SMTP.** The built-in mailer allows only a handful of sends per hour.
   Email delivery is now on the critical path of every sign-in, not just signup,
   so point *Project Settings → Authentication → SMTP* at a real sender and add
   SPF/DKIM records for the domain.

**Apple on the web** additionally needs a Services ID and key under
*Authentication → Providers → Apple*. Native uses the bundle ID and needs none
of that, which is why the web button is behind an env flag — without the
Services ID it can only return a 400.

## iOS app

The iOS app is the same web bundle running in a native shell via [Capacitor](https://capacitorjs.com). The web build is unaffected — `npm run build` still produces a normal server build for Vercel.

```bash
npm run ios:sync   # static-export the app and copy it into the Xcode project
npm run ios:open   # open ios/App in Xcode (macOS only)
```

`ios:sync` runs `next build` with `BUILD_TARGET=mobile`, which switches on `output: "export"` and writes a fully static bundle to `out/`. Because `NEXT_PUBLIC_*` values are inlined at build time, your real Supabase credentials must be present in the environment when you run it — the bundle ships with whatever was set.

Requirements: macOS with Xcode 16+, an Apple Developer account for device builds and submission. Capacitor 8 uses Swift Package Manager, so there is no CocoaPods step. Deployment target is iOS 15.

`ios/App/App/public/` is generated on every sync and is git-ignored; edit the Next.js source, not the copied bundle.

### Native differences

The same source runs on both targets and branches on `isNative()` (`lib/platform.ts`) where the platforms genuinely differ:

| Concern | Web | iOS |
| --- | --- | --- |
| Auth session storage | `localStorage` | `@capacitor/preferences` (survives iOS storage eviction) |
| OAuth flow | implicit, redirect to origin | PKCE, in-app browser returning to `com.minti.app://auth/callback` |
| CSV export | `<a download>` blob | file written to cache, handed to the iOS share sheet |
| Service worker / install prompt | active | skipped |
| Haptics | `navigator.vibrate` (no-op on iOS Safari) | Taptic Engine |
| Face ID lock, billing reminders | unavailable | opt-in from the Menu drawer |

**Before Google sign-in works on device**, add `com.minti.app://auth/callback` to the redirect allow-list in the Supabase dashboard under *Authentication → URL Configuration → Redirect URLs*. Without it Supabase refuses the callback and the in-app browser dead-ends on an error page.

Billing reminders schedule one repeating local notification per subscription, firing at 09:00 on each subscription's `billing_day`. They are rescheduled from scratch whenever the subscription list or currency changes, and cancelled when the setting is turned off.

### Home screen widget

`MintiWidget` is a second Xcode target showing month-to-date spend and budget progress. Data reaches it through the `group.com.minti.app` App Group:

1. `lib/widget.ts` writes a JSON snapshot into Capacitor Preferences whenever the current month's totals change (older months are skipped — the widget always shows the live month).
2. Preferences lands in `UserDefaults.standard`, which an extension cannot read, so `WidgetSync.swift` mirrors it into the App Group container when the app resigns active or backgrounds, then reloads the widget timeline.
3. The widget reads the App Group and re-renders. It also refreshes itself hourly as a fallback.

The widget therefore updates when you leave the app, not while you are typing in it.

**The App Group must exist in your Apple Developer account** before either target will build with these entitlements: register `group.com.minti.app` under *Certificates, Identifiers & Profiles → Identifiers → App Groups*, then enable it on both the `com.minti.app` and `com.minti.app.MintiWidget` identifiers. Xcode's automatic signing can create these for you when you first select your team on each target.

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
