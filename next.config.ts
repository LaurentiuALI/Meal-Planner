import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone doar în imaginea Docker (Linux); pe Windows copierea lui eșuează (symlink-uri).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // libsql are binding nativ; nu se împachetează.
  serverExternalPackages: ["@libsql/client", "libsql"],
  devIndicators: false,
};

export default nextConfig;
