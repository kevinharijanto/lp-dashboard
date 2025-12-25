/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.debank.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
