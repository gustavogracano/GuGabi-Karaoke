import os from "os";

function getAllowedOrigins() {
  const origins = [
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
  ];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4") {
        origins.push(iface.address);
        origins.push(`${iface.address}:3000`);
      }
    }
  }
  return Array.from(new Set(origins));
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
    ],
  },
  // Permite conexões dos celulares e computadores pela rede Wi-Fi local sem bloqueio de scripts
  allowedDevOrigins: getAllowedOrigins(),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
