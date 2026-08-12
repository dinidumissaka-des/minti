import { Preferences } from "@capacitor/preferences";
import { isNative } from "@/lib/platform";

const PAYLOAD_KEY = "minti_widget";

export type WidgetPayload = {
  spent: number;
  budget: number | null;
  currency: string;
  month: string;
  updatedAt: number;
};

export async function publishWidgetSnapshot(
  snapshot: Omit<WidgetPayload, "updatedAt">
): Promise<void> {
  if (!isNative()) return;
  const payload: WidgetPayload = { ...snapshot, updatedAt: Date.now() };
  await Preferences.set({ key: PAYLOAD_KEY, value: JSON.stringify(payload) });
}
