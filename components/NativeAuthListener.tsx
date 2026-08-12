"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { completeNativeOAuth } from "@/lib/supabase";
import { isNative } from "@/lib/platform";

export default function NativeAuthListener() {
  useEffect(() => {
    if (!isNative()) return;

    const handle = App.addListener("appUrlOpen", ({ url }) => {
      if (!url.startsWith("com.minti.app://auth/callback")) return;
      completeNativeOAuth(url).catch(() => {});
    });

    return () => {
      handle.then((h) => h.remove());
    };
  }, []);

  return null;
}
