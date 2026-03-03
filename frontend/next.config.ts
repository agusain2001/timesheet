import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker multi-stage builds (copies only necessary files)
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/**",
      },
    ],
  },

  async rewrites() {
    // In Docker, NEXT_PUBLIC_API_URL points to the backend container.
    // In local dev, falls back to localhost:8000.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${apiUrl}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
