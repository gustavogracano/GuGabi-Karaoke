import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GuGabi Karaoke - Karaokê Colaborativo",
  description: "Cante, vote, jogue tomates e envie fofocas em tempo real!",
  referrer: "origin-when-cross-origin",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GuGabi Karaoke",
  },
  themeColor: "#0f172a",
  icons: {
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#07070f] text-white antialiased selection:bg-pink-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
