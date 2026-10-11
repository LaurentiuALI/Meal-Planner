import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // libsql are binding nativ; nu se împachetează.
  serverExternalPackages: ["@libsql/client", "libsql"],
  devIndicators: { position: "top-right" },
};

export default nextConfig;
