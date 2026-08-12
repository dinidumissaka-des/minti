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

## iOS app

The iOS app is the same web bundle running in a native shell via [Capacitor](https://capacitorjs.com). The web build is unaffected — `npm run build` still produces a normal server build for Vercel.

```bash
npm run ios:sync   # static-export the app and copy it into the Xcode project
npm run ios:open   # open ios/App in Xcode (macOS only)
```

`ios:sync` runs `next build` with `BUILD_TARGET=mobile`, which switches on `output: "export"` and writes a fully static bundle to `out/`. Because `NEXT_PUBLIC_*` values are inlined at build time, your real Supabase credentials must be present in the environment when you run it — the bundle ships with whatever was set.

Requirements: macOS with Xcode 16+, an Apple Developer account for device builds and submission. Capacitor 8 uses Swift Package Manager, so there is no CocoaPods step. Deployment target is iOS 15.

`ios/App/App/public/` is generated on every sync and is git-ignored; edit the Next.js source, not the copied bundle.

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
