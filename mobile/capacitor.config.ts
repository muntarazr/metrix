import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.metrix.app",
  appName: "METRIX",
  webDir: "www",
  server: {
    hostname: "localhost",
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#060606",
  },
  plugins: {
    Browser: {
      preferredContentMode: "external",
    },
  },
};

export default config;
