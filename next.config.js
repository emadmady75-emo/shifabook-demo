/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    webpackBuildWorker: false,
    workerThreads: false,
    cpus: 1
  }
};

module.exports = nextConfig;
