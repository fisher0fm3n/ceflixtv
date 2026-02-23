// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "healingstreams.tv", pathname: "/**" },
      {
        protocol: "https",
        hostname: "d1zx0zj5kmre28.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "d3c5pcohbexzc4.cloudfront.net",
        pathname: "/**",
      },
      { protocol: "https", hostname: "cdnvideos.ceflix.org", pathname: "/**" },
      { protocol: "https", hostname: "webapi.ceflix.org", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
  typescript: {
    // ❗ This lets production builds succeed even if there are TS errors
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
