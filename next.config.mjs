/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    largePageDataBytes: 128 * 1024,
  },
};

export default nextConfig;
