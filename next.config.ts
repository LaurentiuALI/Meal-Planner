import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libsql are binding nativ; nu se împachetează.
  serverExternalPackages: ["@libsql/client", "libsql"],
  devIndicators: false,
};

export default nextConfig;
