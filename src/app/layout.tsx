import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "city-up",
  description: "発信系副業挑戦者のための継続支援アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
