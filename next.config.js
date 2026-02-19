const createNextPluginPreval = require("next-plugin-preval/config");
const withNextPluginPreval = createNextPluginPreval();

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  reactStrictMode: false,
};

module.exports = withNextPluginPreval(nextConfig);
