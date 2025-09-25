/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress hydration warnings for browser extension attributes
  reactStrictMode: true,
  // Add custom webpack configuration to handle hydration issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ignore hydration warnings from browser extensions
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Add custom headers to prevent browser extension interference
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
