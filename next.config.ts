import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating Next.js dev badge. It only renders in development, but it
  // sits over the bottom-left corner and lands in every screenshot and demo,
  // where it reads as part of the product rather than the toolchain.
  devIndicators: false,
};

export default nextConfig;
