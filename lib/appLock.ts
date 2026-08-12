import { BiometricAuth, BiometryType } from "@aparajita/capacitor-biometric-auth";
import { Preferences } from "@capacitor/preferences";
import { isNative } from "@/lib/platform";

const ENABLED_KEY = "minti_app_lock";

export async function isBiometryAvailable(): Promise<boolean> {
  if (!isNative()) return false;
  const info = await BiometricAuth.checkBiometry();
  return info.isAvailable && info.biometryType !== BiometryType.none;
}

export async function isAppLockEnabled(): Promise<boolean> {
  if (!isNative()) return false;
  const { value } = await Preferences.get({ key: ENABLED_KEY });
  return value === "1";
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: ENABLED_KEY, value: enabled ? "1" : "0" });
}

export async function authenticate(): Promise<boolean> {
  try {
    await BiometricAuth.authenticate({
      reason: "Unlock Minti",
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use passcode",
    });
    return true;
  } catch {
    return false;
  }
}
