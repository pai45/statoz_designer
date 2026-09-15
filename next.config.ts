import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["esbuild", "playwright"],
  poweredByHeader: false,
  devIndicators: false,
  outputFileTracingExcludes: { "/*": ["./storage/**/*", "./test-results/**/*", "./.studio/**/*"] },
};
export default config;
