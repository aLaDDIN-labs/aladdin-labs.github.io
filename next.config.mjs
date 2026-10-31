// Static export for GitHub Pages.
// - User/organization site or custom domain (aladdin-labs.ai): leave BASE_PATH unset.
// - Project site (https://<user>.github.io/<repo>): set BASE_PATH=/<repo> in the deploy workflow.
const basePath = process.env.BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  assetPrefix: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
