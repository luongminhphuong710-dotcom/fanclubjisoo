import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "JISOO Fanclub",
    template: "%s | JISOO Fanclub"
  },
  description:
    "Fanclub dành cho ca sĩ JISOO với tin tức #JISOO, bảng xếp hạng âm nhạc, movie và cộng đồng fan.",
  keywords: ["JISOO", "BLACKPINK JISOO", "JISOO Fanclub", "JISOO news", "JISOO music", "JISOO movie"],
  openGraph: {
    title: "JISOO Fanclub",
    description:
      "Tin tức #JISOO, bảng xếp hạng âm nhạc, movie và cộng đồng fan dành cho người hâm mộ JISOO.",
    type: "website",
    locale: "vi_VN"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
