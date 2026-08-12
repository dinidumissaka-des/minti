import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNative } from "@/lib/platform";

function run(native: () => Promise<unknown>, fallbackMs: number) {
  if (isNative()) {
    native().catch(() => {});
    return;
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(fallbackMs);
}

export function hapticTap() {
  run(() => Haptics.impact({ style: ImpactStyle.Light }), 8);
}

export function hapticBump() {
  run(() => Haptics.impact({ style: ImpactStyle.Medium }), 18);
}

export function hapticSuccess() {
  run(() => Haptics.notification({ type: NotificationType.Success }), 18);
}

export function hapticError() {
  run(() => Haptics.notification({ type: NotificationType.Error }), 40);
}
