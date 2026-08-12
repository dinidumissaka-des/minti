import { LocalNotifications } from "@capacitor/local-notifications";
import { Preferences } from "@capacitor/preferences";
import { formatAmount } from "@/lib/currencies";
import { isNative } from "@/lib/platform";
import type { Subscription } from "@/types";

const ENABLED_KEY = "minti_billing_reminders";

export async function areRemindersEnabled(): Promise<boolean> {
  if (!isNative()) return false;
  const { value } = await Preferences.get({ key: ENABLED_KEY });
  return value === "1";
}

export async function setRemindersEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: ENABLED_KEY, value: enabled ? "1" : "0" });
}

export async function requestPermission(): Promise<boolean> {
  if (!isNative()) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === "granted";
}

function notificationId(subscriptionId: string): number {
  let hash = 0;
  for (let i = 0; i < subscriptionId.length; i++) {
    hash = (hash * 31 + subscriptionId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2147483647;
}

async function cancelAll(): Promise<void> {
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length > 0) await LocalNotifications.cancel({ notifications });
}

export async function syncBillingReminders(
  subscriptions: Subscription[],
  currency: string
): Promise<void> {
  if (!isNative()) return;

  await cancelAll();
  if (!(await areRemindersEnabled())) return;

  const { display } = await LocalNotifications.checkPermissions();
  if (display !== "granted") return;
  if (subscriptions.length === 0) return;

  await LocalNotifications.schedule({
    notifications: subscriptions.map((sub) => ({
      id: notificationId(sub.id),
      title: `${sub.name} renews today`,
      body: `${formatAmount(Number(sub.amount), currency)} is due.`,
      schedule: { on: { day: sub.billing_day, hour: 9, minute: 0 }, allowWhileIdle: true },
    })),
  });
}
