import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Developer Playground — Dynamic API Integration Sandbox",
  description:
    "Create and test mock APIs, response rules, webhooks and credentials for third-party integrations.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#6366F1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
