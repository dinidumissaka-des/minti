import type { CapacitorConfig } from "@capacitor/cli";
import { BRAND } from "./lib/brand";

const config: CapacitorConfig = {
  appId: "com.minti.app",
  appName: "Minti",
  webDir: "out",
  ios: {
    contentInset: "never",
    backgroundColor: BRAND.backgroundDark,
  },
};

export default config;
