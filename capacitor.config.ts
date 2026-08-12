import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.minti.app",
  appName: "Minti",
  webDir: "out",
  ios: {
    contentInset: "never",
    backgroundColor: "#060e03",
  },
};

export default config;
