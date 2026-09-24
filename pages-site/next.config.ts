import type { NextConfig } from "next";

const basePath = "/statoz_designer";
const config: NextConfig = {
  output: "export",
  basePath,
  assetPrefix: basePath,
  trailingSlash: true,
  poweredByHeader: false,
  devIndicators: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
export default config;
