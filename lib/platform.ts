import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOSNative(): boolean {
  return Capacitor.getPlatform() === "ios";
}
