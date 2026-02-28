import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["better-sqlite3"],
    experimental: {
        // Allow streaming from server actions
    },
};

export default nextConfig;
