/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    largePageDataBytes: 128 * 1024,
  },
};

export default nextConfig;