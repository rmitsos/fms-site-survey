import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only: lets `next dev` accept requests (including Server Action form posts) addressed to
  // 127.0.0.1, not just localhost - needed for headless/CI testing against the dev server.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
