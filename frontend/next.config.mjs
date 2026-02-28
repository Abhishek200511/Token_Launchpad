/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    // Suppress build errors for demo
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
