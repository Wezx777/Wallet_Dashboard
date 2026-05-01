/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent ethers from being bundled by webpack (avoids SSR/prerender conflicts)
  serverExternalPackages: ['ethers'],
  images: {
    domains: ['assets.coingecko.com', 'coin-images.coingecko.com'],
  },
};

module.exports = nextConfig;
