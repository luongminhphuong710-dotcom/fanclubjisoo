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
        title="Giới thiệu JISOO Vietnam Fanclub"
        text="Thông tin liên hệ, bản quyền và giới thiệu ngắn về website fanclub."
      />
      <AboutSection />
    </main>
  );
}
