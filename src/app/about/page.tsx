import { AboutSection } from "@/components/AboutSection";
import { HeroBanner } from "@/components/HeroBanner";
import { SiteToolbar } from "@/components/SiteToolbar";

export default function AboutPage() {
  return (
    <main className="shell">
      <SiteToolbar />
      <HeroBanner
        compact
        eyebrow="Giới thiệu"
        title="Giới thiệu JISOO Fanclub"
        text="Tổng quan về mục tiêu, nội dung và định hướng phát triển cộng đồng fan JISOO."
      />
      <AboutSection />
    </main>
  );
}
