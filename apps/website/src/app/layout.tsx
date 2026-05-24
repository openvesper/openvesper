import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenVesper",
  description: "Local-first agent framework. Bring your own LLM and API keys. Runs on your machine.",
  keywords: ["ai agent", "agent framework", "local first", "self hosted", "open source", "llm"],
  authors: [{ name: "OpenVesper" }],
  openGraph: {
    title: "OpenVesper",
    description: "Local-first agent framework. Bring your own LLM and API keys. Runs on your machine.",
    type: "website",
    url: "https://openvesper.com",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenVesper",
    description: "Local-first agent framework. Bring your own LLM and API keys. Runs on your machine.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
