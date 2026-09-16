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
      {
        protocol: "https",
        hostname: "d3adbm7ictuj27.cloudfront.net",
        pathname: "/**",
      },
    ],
  },
  /*
   * CeFlix web has moved to KingsSpace. Every ceflix.org URL is sent, path and
   * query intact, to the same URL on kingsspace.online - the two sites share
   * one route tree, so /videos/watch/<id>, /ceclips/<id>, /channel/<id> and
   * the rest all land on the matching page.
   *
   * Keyed on the request host so this only fires on the production domain;
   * local development and any other hostname keep serving the site.
   */
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "(www\\.)?ceflix\\.org" }],
        destination: "https://kingsspace.online/:path*",
        permanent: true,
      },
    ];
  },
  typescript: {
    // ❗ This lets production builds succeed even if there are TS errors
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
