import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development", // Mantemos desligado em desenvolvimento
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurações base do Next.js
};

export default withPWA(nextConfig);