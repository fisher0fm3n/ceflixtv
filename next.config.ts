// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Either use domains:
    domains: ["res.cloudinary.com", "cdnvideos.ceflix.org", "d3adbm7ictuj27.cloudfront.net", "d3c5pcohbexzc4.cloudfront.net", "ceflixwebusergen-6923f64a.s3.amazonaws.com"],

    // or, if you want to be more explicit:
    // remotePatterns: [
    //   {
    //     protocol: "https",
    //     hostname: "res.cloudinary.com",
    //   },
    //   {
    //     protocol: "https",
    //     hostname: "cdnvideos.ceflix.org",
    //   },
    // ],
  },
};

module.exports = nextConfig;
